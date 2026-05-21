const { getDb } = require('../database/db');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const priceHistoryService = require('../services/price-history.service');
const marketIntelService = require('../services/market-intel.service');

// GET /api/marketplace/listings
function getListings(req, res) {
  const db = getDb();
  const { species, location, min_price, max_price, available_only = 'true', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = "ml.status = 'ACTIVE'";
  const params = [];

  if (species && species !== 'All Fish') { where += ' AND ml.species = ?'; params.push(species); }
  if (location) { where += ' AND fz.name LIKE ?'; params.push(`%${location}%`); }
  if (min_price) { where += ' AND ml.price_per_kg >= ?'; params.push(Number(min_price)); }
  if (max_price) { where += ' AND ml.price_per_kg <= ?'; params.push(Number(max_price)); }
  if (available_only === 'true') { where += ' AND ml.quantity_available_kg > 0'; }

  const total = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM marketplace_listings ml
    JOIN catch_submissions cs ON ml.catch_id = cs.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE ${where}
  `).get(...params).cnt;

  const listings = db.prepare(`
    SELECT ml.*,
           u.name as fisher_name, f.license_number, f.license_status,
           cs.fishing_date, cs.fishing_gear, cs.reference_id as catch_reference,
           cs.reviewed_at as verified_at,
           fz.name as zone_name
    FROM marketplace_listings ml
    JOIN catch_submissions cs ON ml.catch_id = cs.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE ${where}
    ORDER BY ml.listed_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const enriched = listings.map((l) => ({
    ...l,
    shortage_flags: marketIntelService.getShortageFlagsForSpecies(db, l.species),
    price_trend: priceHistoryService.getSpeciesPriceTrend(db, l.species, 7),
  }));

  res.json({ listings: enriched, total, page: Number(page), limit: Number(limit) });
}

// GET /api/marketplace/listings/:id
function getListing(req, res) {
  const db = getDb();
  const listing = db.prepare(`
    SELECT ml.*,
           u.name as fisher_name, u.phone as fisher_phone,
           f.license_number, f.license_status, f.license_expiry,
           cs.fishing_date, cs.fishing_gear, cs.reference_id as catch_reference,
           cs.submitted_at, cs.reviewed_at as verified_at,
           cs.number_of_fish, cs.photo_urls,
           fz.name as zone_name, fz.type as zone_type
    FROM marketplace_listings ml
    JOIN catch_submissions cs ON ml.catch_id = cs.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE ml.id = ?
  `).get(req.params.id);

  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json({ listing });
}

// GET /api/marketplace/stats
function getStats(req, res) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const activeListings = db.prepare(`
    SELECT COUNT(*) as cnt FROM marketplace_listings WHERE status = 'ACTIVE'
  `).get().cnt;

  const totalSellers = db.prepare(`
    SELECT COUNT(DISTINCT fisher_id) as cnt FROM marketplace_listings WHERE status = 'ACTIVE'
  `).get().cnt;

  const fishSoldKg = db.prepare(`
    SELECT COALESCE(SUM(quantity_kg), 0) as total FROM orders WHERE status != 'CANCELLED'
  `).get().total;

  const avgPrice = db.prepare(`
    SELECT COALESCE(AVG(price_per_kg), 0) as avg FROM marketplace_listings WHERE status = 'ACTIVE'
  `).get().avg;

  const todaySoldKg = db.prepare(`
    SELECT COALESCE(SUM(quantity_kg), 0) as total FROM orders WHERE DATE(ordered_at) = ?
  `).get(today).total;

  const weeklyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const row = db.prepare(`
      SELECT COALESCE(SUM(quantity_kg), 0) as kg FROM orders WHERE DATE(ordered_at) = ?
    `).get(d);
    weeklyTrend.push({ date: d, kg: row.kg });
  }

  res.json({ activeListings, totalSellers, fishSoldKg, avgPrice: Math.round(avgPrice), todaySoldKg, weeklyTrend });
}

// GET /api/marketplace/activity
function getActivity(req, res) {
  const db = getDb();
  const activity = db.prepare(`
    SELECT o.reference_id, o.quantity_kg, o.total_price, o.ordered_at,
           ml.species, ml.price_per_kg,
           u.name as buyer_name,
           fu.name as fisher_name
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN users u ON o.buyer_id = u.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.status != 'CANCELLED'
    ORDER BY o.ordered_at DESC
    LIMIT 10
  `).all();
  res.json({ activity });
}

// POST /api/marketplace/orders
function placeOrder(req, res) {
  const { listing_id, quantity_kg } = req.body;
  if (!listing_id || !quantity_kg || quantity_kg <= 0) {
    return res.status(400).json({ error: 'listing_id and quantity_kg are required' });
  }

  const db = getDb();
  const listing = db.prepare('SELECT * FROM marketplace_listings WHERE id = ?').get(listing_id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'ACTIVE') return res.status(400).json({ error: 'Listing is not available' });
  if (quantity_kg > listing.quantity_available_kg) {
    return res.status(400).json({
      error: `Requested quantity (${quantity_kg} kg) exceeds available stock (${listing.quantity_available_kg} kg)`,
    });
  }

  const today = new Date().toISOString().split('T')[0].replace(/-/g, '-');
  const countToday = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE DATE(ordered_at) = DATE('now')").get();
  const seqNum = String(countToday.cnt + 1).padStart(4, '0');
  const orderRef = `ORD-${today}-${seqNum}`;

  const totalPrice = quantity_kg * listing.price_per_kg;

  db.prepare(`
    INSERT INTO orders (reference_id, listing_id, buyer_id, quantity_kg, price_per_kg, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED')
  `).run(orderRef, listing_id, req.user.id, quantity_kg, listing.price_per_kg, totalPrice);

  const newQty = listing.quantity_available_kg - quantity_kg;
  if (newQty <= 0) {
    db.prepare("UPDATE marketplace_listings SET quantity_available_kg = 0, status = 'SOLD_OUT' WHERE id = ?").run(listing_id);
  } else {
    db.prepare('UPDATE marketplace_listings SET quantity_available_kg = ? WHERE id = ?').run(newQty, listing_id);
  }

  const fisher = db.prepare(`
    SELECT f.id as fisher_id, u.name as fisher_name
    FROM fishers f JOIN users u ON f.user_id = u.id
    WHERE f.id = ?
  `).get(listing.fisher_id);

  const buyer = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

  auditFromReq(req, 'order.placed', 'order', null, {
    order_reference: orderRef,
    listing_id,
    quantity_kg,
    total_price: totalPrice,
    species: listing.species,
  });

  priceHistoryService.recordPrice(db, {
    species: listing.species,
    pricePerKg: listing.price_per_kg,
    source: 'order',
  });

  eventBus.emit('order.placed', {
    order_reference: orderRef,
    listing_id,
    buyer_id: req.user.id,
    buyer_name: buyer?.name,
    fisher_id: listing.fisher_id,
    fisher_name: fisher?.fisher_name,
    species: listing.species,
    quantity_kg,
    total_price: totalPrice,
    price_per_kg: listing.price_per_kg,
  });

  res.status(201).json({
    success: true,
    order_reference: orderRef,
    total_price: totalPrice,
    listing_updated: true,
    quantity_remaining: Math.max(0, newQty),
  });
}

// GET /api/marketplace/orders
function getOrders(req, res) {
  const db = getDb();
  const orders = db.prepare(`
    SELECT o.*, ml.species, ml.price_per_kg as listing_price,
           fu.name as fisher_name
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.buyer_id = ?
    ORDER BY o.ordered_at DESC
  `).all(req.user.id);
  res.json({ orders });
}

function getSpeciesPriceHistory(req, res) {
  const db = getDb();
  const species = req.params.species;
  const days = Math.min(Number(req.query.days) || 7, 30);
  const history = priceHistoryService.getListingPriceHistory(db, species, days);
  res.json({ species, history });
}

module.exports = {
  getListings,
  getListing,
  getStats,
  getActivity,
  placeOrder,
  getOrders,
  getSpeciesPriceHistory,
};
