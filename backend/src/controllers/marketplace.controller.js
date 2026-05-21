const { Prisma } = require('@prisma/client');
const { prisma } = require('../database/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const priceHistoryService = require('../services/price-history.service');
const marketIntelService = require('../services/market-intel.service');

async function getListings(req, res) {
  const { species, location, min_price, max_price, available_only = 'true', page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);

  const parts = [Prisma.sql`ml.status = 'ACTIVE'`];
  if (species && species !== 'All Fish') parts.push(Prisma.sql`ml.species = ${species}`);
  if (location) parts.push(Prisma.sql`fz.name ILIKE ${`%${location}%`}`);
  if (min_price) parts.push(Prisma.sql`ml.price_per_kg >= ${Number(min_price)}`);
  if (max_price) parts.push(Prisma.sql`ml.price_per_kg <= ${Number(max_price)}`);
  if (available_only === 'true') parts.push(Prisma.sql`ml.quantity_available_kg > 0`);
  const where = Prisma.join(parts, ' AND ');

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt
    FROM marketplace_listings ml
    JOIN catch_submissions cs ON ml.catch_id = cs.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE ${where}
  `;
  const total = Number(totalRows[0]?.cnt ?? 0);

  const listings = await prisma.$queryRaw`
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
    LIMIT ${lim} OFFSET ${offset}
  `;

  const enriched = await Promise.all(
    listings.map(async (l) => ({
      ...l,
      shortage_flags: await marketIntelService.getShortageFlagsForSpecies(l.species),
      price_trend: await priceHistoryService.getSpeciesPriceTrend(l.species, 7),
    })),
  );

  res.json({ listings: enriched, total, page: Number(page), limit: Number(limit) });
}

async function getListing(req, res) {
  const rows = await prisma.$queryRaw`
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
    WHERE ml.id = ${Number(req.params.id)}
  `;
  const listing = rows[0];
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json({ listing });
}

async function getStats(req, res) {
  const today = new Date().toISOString().split('T')[0];

  const activeRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM marketplace_listings WHERE status = 'ACTIVE'
  `;
  const sellersRows = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT fisher_id)::int as cnt FROM marketplace_listings WHERE status = 'ACTIVE'
  `;
  const soldRows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(quantity_kg), 0) as total FROM orders WHERE status != 'CANCELLED'
  `;
  const avgRows = await prisma.$queryRaw`
    SELECT COALESCE(AVG(price_per_kg), 0) as avg FROM marketplace_listings WHERE status = 'ACTIVE'
  `;
  const todaySoldRows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(quantity_kg), 0) as total FROM orders WHERE ordered_at::date = ${today}::date
  `;

  const weeklyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const row = await prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_kg), 0) as kg FROM orders WHERE ordered_at::date = ${d}::date
    `;
    weeklyTrend.push({ date: d, kg: Number(row[0]?.kg ?? 0) });
  }

  res.json({
    activeListings: Number(activeRows[0]?.cnt ?? 0),
    totalSellers: Number(sellersRows[0]?.cnt ?? 0),
    fishSoldKg: Number(soldRows[0]?.total ?? 0),
    avgPrice: Math.round(Number(avgRows[0]?.avg ?? 0)),
    todaySoldKg: Number(todaySoldRows[0]?.total ?? 0),
    weeklyTrend,
  });
}

async function getActivity(req, res) {
  const activity = await prisma.$queryRaw`
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
  `;
  res.json({ activity });
}

async function placeOrder(req, res) {
  const { listing_id, quantity_kg } = req.body;
  if (!listing_id || !quantity_kg || quantity_kg <= 0) {
    return res.status(400).json({ error: 'listing_id and quantity_kg are required' });
  }

  const listingRows = await prisma.$queryRaw`
    SELECT * FROM marketplace_listings WHERE id = ${listing_id}
  `;
  const listing = listingRows[0];
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.status !== 'ACTIVE') return res.status(400).json({ error: 'Listing is not available' });
  if (quantity_kg > listing.quantity_available_kg) {
    return res.status(400).json({
      error: `Requested quantity (${quantity_kg} kg) exceeds available stock (${listing.quantity_available_kg} kg)`,
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const countRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM orders WHERE ordered_at::date = CURRENT_DATE
  `;
  const seqNum = String(Number(countRows[0]?.cnt ?? 0) + 1).padStart(4, '0');
  const orderRef = `ORD-${today}-${seqNum}`;
  const totalPrice = quantity_kg * listing.price_per_kg;
  const newQty = listing.quantity_available_kg - quantity_kg;

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        referenceId: orderRef,
        listingId: listing_id,
        buyerId: req.user.id,
        quantityKg: quantity_kg,
        pricePerKg: listing.price_per_kg,
        totalPrice,
        status: 'CONFIRMED',
      },
    });

    if (newQty <= 0) {
      await tx.marketplaceListing.update({
        where: { id: listing_id },
        data: { quantityAvailableKg: 0, status: 'SOLD_OUT' },
      });
    } else {
      await tx.marketplaceListing.update({
        where: { id: listing_id },
        data: { quantityAvailableKg: newQty },
      });
    }
  });

  const fisherRows = await prisma.$queryRaw`
    SELECT f.id as fisher_id, u.name as fisher_name
    FROM fishers f JOIN users u ON f.user_id = u.id
    WHERE f.id = ${listing.fisher_id}
  `;
  const fisher = fisherRows[0];
  const buyerRows = await prisma.$queryRaw`SELECT name FROM users WHERE id = ${req.user.id}`;
  const buyer = buyerRows[0];

  auditFromReq(req, 'order.placed', 'order', null, {
    order_reference: orderRef,
    listing_id,
    quantity_kg,
    total_price: totalPrice,
    species: listing.species,
  });

  await priceHistoryService.recordPrice({
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

async function getOrders(req, res) {
  const orders = await prisma.$queryRaw`
    SELECT o.*, ml.species, ml.price_per_kg as listing_price,
           fu.name as fisher_name
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.buyer_id = ${req.user.id}
    ORDER BY o.ordered_at DESC
  `;
  res.json({ orders });
}

async function getSpeciesPriceHistory(req, res) {
  const species = req.params.species;
  const days = Math.min(Number(req.query.days) || 7, 30);
  const history = await priceHistoryService.getListingPriceHistory(species, days);
  res.json({ species, history });
}

module.exports = {
  getListings: asyncHandler(getListings),
  getListing: asyncHandler(getListing),
  getStats: asyncHandler(getStats),
  getActivity: asyncHandler(getActivity),
  placeOrder: asyncHandler(placeOrder),
  getOrders: asyncHandler(getOrders),
  getSpeciesPriceHistory: asyncHandler(getSpeciesPriceHistory),
};
