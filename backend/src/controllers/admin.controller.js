const { getDb } = require('../database/db');
const quotaService = require('../services/quota.service');
const notificationService = require('../services/notification.service');
const listingService = require('../services/listing.service');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');

// GET /api/admin/dashboard/stats
function getDashboardStats(req, res) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const totalFishers   = db.prepare('SELECT COUNT(*) as cnt FROM fishers').get().cnt;
  const totalBoats     = db.prepare('SELECT COUNT(*) as cnt FROM boats').get().cnt;
  const todayCatchKg   = db.prepare(`
    SELECT COALESCE(SUM(quantity_kg), 0) as total
    FROM catch_submissions WHERE fishing_date = ? AND status = 'VERIFIED'
  `).get(today).total;
  const activeListings = db.prepare(`
    SELECT COUNT(*) as cnt FROM marketplace_listings WHERE status = 'ACTIVE'
  `).get().cnt;
  const activeAlerts   = db.prepare(`
    SELECT COUNT(*) as cnt FROM alerts WHERE is_read = 0
  `).get().cnt;
  const pendingCatches = db.prepare(`
    SELECT COUNT(*) as cnt FROM catch_submissions WHERE status = 'PENDING'
  `).get().cnt;
  const fishSoldToday  = db.prepare(`
    SELECT COALESCE(SUM(o.quantity_kg), 0) as total
    FROM orders o WHERE DATE(o.ordered_at) = ?
  `).get(today).total;

  res.json({ totalFishers, totalBoats, todayCatchKg, activeListings, activeAlerts, pendingCatches, fishSoldToday });
}

// GET /api/admin/dashboard/catches-over-time
function getCatchesOverTime(req, res) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT fishing_date as date, COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions
    WHERE status = 'VERIFIED' AND fishing_date >= DATE('now', '-6 days')
    GROUP BY fishing_date ORDER BY fishing_date ASC
  `).all();

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const found = rows.find((r) => r.date === d);
    result.push({ date: d, total_kg: found ? found.total_kg : 0 });
  }

  res.json({ data: result });
}

// GET /api/admin/dashboard/species-breakdown
function getSpeciesBreakdown(req, res) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT species, COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions
    WHERE status = 'VERIFIED' AND fishing_date = ?
    GROUP BY species ORDER BY total_kg DESC
  `).all(today);
  res.json({ data: rows });
}

// GET /api/admin/catches
function getCatches(req, res) {
  const db = getDb();
  const { status, date, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = '1=1';
  const params = [];

  if (status && status !== 'ALL') { where += ' AND cs.status = ?'; params.push(status); }
  if (date)   { where += ' AND cs.fishing_date = ?'; params.push(date); }
  if (search) {
    where += ' AND (u.name LIKE ? OR cs.species LIKE ? OR cs.reference_id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    WHERE ${where}
  `).get(...params).cnt;

  const catches = db.prepare(`
    SELECT cs.*, u.name as fisher_name, f.license_number, f.license_status,
           fz.name as zone_name, fz.type as zone_type, b.boat_name
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE ${where}
    ORDER BY cs.submitted_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({ catches, total, page: Number(page), limit: Number(limit) });
}

// GET /api/admin/catches/:id
function getCatch(req, res) {
  const db = getDb();
  const catchRow = db.prepare(`
    SELECT cs.*,
           u.name as fisher_name, u.email as fisher_email, u.phone as fisher_phone,
           f.license_number, f.license_status, f.license_expiry,
           fz.name as zone_name, fz.type as zone_type,
           b.boat_name, b.registration_number,
           ru.name as reviewed_by_name
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    LEFT JOIN users ru ON cs.reviewed_by = ru.id
    WHERE cs.id = ?
  `).get(req.params.id);

  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();
  const quota = db.prepare(`
    SELECT * FROM species_quotas WHERE species = ? AND month = ? AND year = ?
  `).get(catchRow.species, currentMonth, currentYear);

  res.json({ catch: catchRow, quota });
}

// PUT /api/admin/catches/:id/approve
function approveCatch(req, res) {
  const db = getDb();
  const catchRow = db.prepare('SELECT * FROM catch_submissions WHERE id = ?').get(req.params.id);
  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });
  if (catchRow.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only pending catches can be approved' });
  }

  const quotaCheck = quotaService.checkQuotaBeforeApprove(db, catchRow.species, catchRow.quantity_kg);
  if (!quotaCheck.allowed) {
    return res.status(409).json({ error: quotaCheck.message });
  }

  db.prepare(`
    UPDATE catch_submissions
    SET status = 'VERIFIED', reviewed_by = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, catchRow.id);

  const listing = listingService.createListing(db, catchRow);
  quotaService.updateQuota(db, catchRow.species, catchRow.quantity_kg);

  const fisher = db.prepare('SELECT * FROM fishers WHERE id = ?').get(catchRow.fisher_id);
  notificationService.notifyFisher(db, fisher.user_id, 'CATCH_APPROVED',
    'Catch Approved',
    `Your catch ${catchRow.reference_id} has been approved and is now listed in the marketplace.`
  );

  auditFromReq(req, 'catch.approved', 'catch', catchRow.id, {
    reference_id: catchRow.reference_id,
    listing_id: listing.id,
  });

  eventBus.emit('catch.approved', {
    id: catchRow.id,
    reference_id: catchRow.reference_id,
    fisher_id: catchRow.fisher_id,
    species: catchRow.species,
    quantity_kg: catchRow.quantity_kg,
    listing_id: listing.id,
  });

  res.json({ success: true, catch_id: catchRow.id, status: 'VERIFIED', listing_id: listing.id, fisher_notified: true });
}

// PUT /api/admin/catches/:id/reject
function rejectCatch(req, res) {
  const { reason } = req.body;
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'A rejection reason is required' });
  }

  const db = getDb();
  const catchRow = db.prepare('SELECT * FROM catch_submissions WHERE id = ?').get(req.params.id);
  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });
  if (catchRow.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only pending catches can be rejected' });
  }

  db.prepare(`
    UPDATE catch_submissions
    SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).run(reason.trim(), req.user.id, catchRow.id);

  const fisher = db.prepare('SELECT * FROM fishers WHERE id = ?').get(catchRow.fisher_id);
  notificationService.notifyFisher(db, fisher.user_id, 'CATCH_REJECTED',
    'Catch Not Approved',
    `Your catch ${catchRow.reference_id} was not approved. Reason: ${reason.trim()}`
  );

  auditFromReq(req, 'catch.rejected', 'catch', catchRow.id, { reason: reason.trim() });
  eventBus.emit('catch.rejected', {
    id: catchRow.id,
    reference_id: catchRow.reference_id,
    fisher_id: catchRow.fisher_id,
    reason: reason.trim(),
  });

  res.json({ success: true, catch_id: catchRow.id, status: 'REJECTED', fisher_notified: true });
}

// GET /api/admin/fishers
function getFishers(req, res) {
  const db = getDb();
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as cnt FROM fishers').get().cnt;
  const fishers = db.prepare(`
    SELECT f.*, u.name, u.email, u.phone,
           fz.name as zone_name,
           b.boat_name, b.registration_number,
           COALESCE(fc.score, 100) as compliance_score,
           COALESCE(fc.open_violations, 0) as open_violations,
           (SELECT COUNT(*) FROM catch_submissions cs WHERE cs.fisher_id = f.id) as total_catches,
           (SELECT COUNT(*) FROM catch_submissions cs WHERE cs.fisher_id = f.id AND cs.status = 'VERIFIED') as verified_catches
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    LEFT JOIN fisher_compliance fc ON fc.fisher_id = f.id
    ORDER BY u.name ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({ fishers, total, page: Number(page), limit: Number(limit) });
}

// GET /api/admin/fishers/:id
function getFisher(req, res) {
  const db = getDb();
  const fisher = db.prepare(`
    SELECT f.*, u.name, u.email, u.phone,
           fz.name as zone_name, fz.type as zone_type,
           b.boat_name, b.registration_number, b.capacity_kg
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE f.id = ?
  `).get(req.params.id);

  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const recentCatches = db.prepare(`
    SELECT * FROM catch_submissions WHERE fisher_id = ? ORDER BY submitted_at DESC LIMIT 10
  `).all(req.params.id);

  res.json({ fisher, recentCatches });
}

// GET /api/admin/quotas
function getQuotas(req, res) {
  const db = getDb();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();
  const quotas = db.prepare(`
    SELECT *, ROUND((current_month_kg * 100.0 / monthly_limit_kg), 1) as usage_pct
    FROM species_quotas WHERE month = ? AND year = ?
    ORDER BY usage_pct DESC
  `).all(currentMonth, currentYear);
  res.json({ quotas });
}

// PUT /api/admin/quotas/:id
function updateQuota(req, res) {
  const { monthly_limit_kg } = req.body;
  if (!monthly_limit_kg || monthly_limit_kg <= 0) {
    return res.status(400).json({ error: 'Valid monthly limit is required' });
  }
  const db = getDb();
  db.prepare(`
    UPDATE species_quotas SET monthly_limit_kg = ?, updated_at = datetime('now') WHERE id = ?
  `).run(monthly_limit_kg, req.params.id);
  auditFromReq(req, 'quota.updated', 'quota', Number(req.params.id), { monthly_limit_kg });
  res.json({ success: true });
}

// GET /api/admin/alerts
function getAlerts(req, res) {
  const db = getDb();
  const alerts = db.prepare(`
    SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50
  `).all();
  const unreadCount = db.prepare('SELECT COUNT(*) as cnt FROM alerts WHERE is_read = 0').get().cnt;
  res.json({ alerts, unreadCount });
}

// PUT /api/admin/alerts/:id/read
function markAlertRead(req, res) {
  const db = getDb();
  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
}

// PUT /api/admin/alerts/read-all
function markAllAlertsRead(req, res) {
  const db = getDb();
  db.prepare('UPDATE alerts SET is_read = 1').run();
  res.json({ success: true });
}

// GET /api/admin/zones
function getZones(req, res) {
  const db = getDb();
  const zones = db.prepare(`
    SELECT fz.*,
      (SELECT COUNT(*) FROM catch_submissions cs WHERE cs.zone_id = fz.id AND cs.fishing_date = DATE('now')) as today_submissions
    FROM fishing_zones fz
    ORDER BY fz.type, fz.name
  `).all();
  res.json({ zones });
}

// GET /api/admin/reports/monthly
function getMonthlyReport(req, res) {
  const db = getDb();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  const totalVerified = db.prepare(`
    SELECT COALESCE(SUM(quantity_kg), 0) as total, COUNT(*) as count
    FROM catch_submissions
    WHERE status = 'VERIFIED'
      AND strftime('%m', fishing_date) = ? AND strftime('%Y', fishing_date) = ?
  `).get(String(currentMonth).padStart(2, '0'), String(currentYear));

  const totalRejected = db.prepare(`
    SELECT COUNT(*) as count FROM catch_submissions
    WHERE status = 'REJECTED'
      AND strftime('%m', fishing_date) = ? AND strftime('%Y', fishing_date) = ?
  `).get(String(currentMonth).padStart(2, '0'), String(currentYear));

  const bySpecies = db.prepare(`
    SELECT species, COALESCE(SUM(quantity_kg), 0) as total_kg, COUNT(*) as count
    FROM catch_submissions
    WHERE status = 'VERIFIED'
      AND strftime('%m', fishing_date) = ? AND strftime('%Y', fishing_date) = ?
    GROUP BY species ORDER BY total_kg DESC
  `).all(String(currentMonth).padStart(2, '0'), String(currentYear));

  const totalSales = db.prepare(`
    SELECT COALESCE(SUM(total_price), 0) as revenue, COALESCE(SUM(quantity_kg), 0) as kg_sold
    FROM orders WHERE strftime('%m', ordered_at) = ? AND strftime('%Y', ordered_at) = ?
  `).get(String(currentMonth).padStart(2, '0'), String(currentYear));

  res.json({ totalVerified, totalRejected, bySpecies, totalSales, month: currentMonth, year: currentYear });
}

// GET /api/admin/command/live-stats
function getLiveStats(req, res) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const catchKgToday = db.prepare(`
    SELECT COALESCE(SUM(quantity_kg), 0) as total
    FROM catch_submissions WHERE fishing_date = ? AND status = 'VERIFIED'
  `).get(today).total;

  const pendingCatches = db.prepare(`
    SELECT COUNT(*) as cnt FROM catch_submissions WHERE status = 'PENDING'
  `).get().cnt;

  const ordersLastHour = db.prepare(`
    SELECT COUNT(*) as cnt FROM orders WHERE ordered_at >= ? AND status != 'CANCELLED'
  `).get(oneHourAgo).cnt;

  const revenueToday = db.prepare(`
    SELECT COALESCE(SUM(total_price), 0) as total
    FROM orders WHERE DATE(ordered_at) = ? AND status != 'CANCELLED'
  `).get(today).total;

  const activeBoats = db.prepare(`
    SELECT COUNT(DISTINCT boat_id) as cnt FROM boat_positions
    WHERE status IN ('FISHING', 'RETURNING')
      AND recorded_at >= datetime('now', '-30 minutes')
  `).get().cnt;

  const activeListingsKg = db.prepare(`
    SELECT COALESCE(SUM(quantity_available_kg), 0) as total
    FROM marketplace_listings WHERE status = 'ACTIVE'
  `).get().total;

  const activeFishers = db.prepare(`
    SELECT COUNT(DISTINCT fisher_id) as cnt FROM catch_submissions
    WHERE fishing_date = ? AND status IN ('PENDING', 'VERIFIED')
  `).get(today).cnt;

  res.json({
    catchKgToday,
    pendingCatches,
    ordersLastHour,
    revenueToday,
    activeBoats,
    activeListingsKg,
    activeFishers,
    timestamp: new Date().toISOString(),
  });
}

// GET /api/admin/fleet/positions
function getFleetPositions(req, res) {
  const db = getDb();
  const boats = db.prepare(`
    SELECT b.id as boat_id, b.boat_name, b.registration_number,
           f.id as fisher_id, u.name as fisher_name,
           bp.lat, bp.lng, bp.status, bp.recorded_at
    FROM boats b
    JOIN fishers f ON b.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    ORDER BY b.boat_name
  `).all();
  res.json({ boats });
}

// GET /api/admin/map/layers
function getMapLayers(req, res) {
  const db = getDb();
  const zonesRaw = db.prepare('SELECT id, name, type, gps_lat, gps_lng, description, geo_polygon FROM fishing_zones').all();
  const zones = zonesRaw.map((z) => {
    let geo_polygon = null;
    if (z.geo_polygon) {
      try {
        geo_polygon = JSON.parse(z.geo_polygon);
      } catch {
        geo_polygon = null;
      }
    }
    return { ...z, geo_polygon };
  });
  const fleet = db.prepare(`
    SELECT b.id as boat_id, b.boat_name, u.name as fisher_name,
           bp.lat, bp.lng, bp.status, bp.recorded_at
    FROM boats b
    JOIN fishers f ON b.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE bp.lat IS NOT NULL
  `).all();
  const catches = db.prepare(`
    SELECT cs.id, cs.reference_id, cs.species, cs.quantity_kg, cs.status,
           cs.gps_lat, cs.gps_lng, cs.submitted_at,
           u.name as fisher_name, fz.name as zone_name
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE cs.submitted_at >= datetime('now', '-24 hours')
      AND cs.gps_lat IS NOT NULL
    ORDER BY cs.submitted_at DESC
    LIMIT 100
  `).all();
  res.json({ zones, fleet, catches });
}

// GET /api/admin/market/overview
function getMarketOverview(req, res) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const revenueToday = db.prepare(`
    SELECT COALESCE(SUM(total_price), 0) as total FROM orders
    WHERE DATE(ordered_at) = ? AND status != 'CANCELLED'
  `).get(today).total;

  const ordersToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM orders WHERE DATE(ordered_at) = ? AND status != 'CANCELLED'
  `).get(today).cnt;

  const activeListingsKg = db.prepare(`
    SELECT COALESCE(SUM(quantity_available_kg), 0) as total
    FROM marketplace_listings WHERE status = 'ACTIVE'
  `).get().total;

  const topSpecies = db.prepare(`
    SELECT ml.species, COALESCE(SUM(o.quantity_kg), 0) as kg_sold,
           COALESCE(SUM(o.total_price), 0) as revenue
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    WHERE o.status != 'CANCELLED' AND DATE(o.ordered_at) >= DATE('now', '-7 days')
    GROUP BY ml.species ORDER BY kg_sold DESC LIMIT 5
  `).all();

  res.json({ revenueToday, ordersToday, activeListingsKg, topSpecies });
}

// GET /api/admin/market/buyers
function getMarketBuyers(req, res) {
  const db = getDb();
  const buyers = db.prepare(`
    SELECT u.id, u.name, u.email, b.location,
           COUNT(o.id) as order_count,
           COALESCE(SUM(o.quantity_kg), 0) as total_kg,
           COALESCE(SUM(o.total_price), 0) as total_spend
    FROM users u
    JOIN buyers b ON b.user_id = u.id
    LEFT JOIN orders o ON o.buyer_id = u.id AND o.status != 'CANCELLED'
    WHERE u.role = 'buyer'
    GROUP BY u.id ORDER BY total_spend DESC
  `).all();
  res.json({ buyers });
}

// GET /api/admin/market/sellers
function getMarketSellers(req, res) {
  const db = getDb();
  const sellers = db.prepare(`
    SELECT f.id as fisher_id, u.name, f.license_number,
           COALESCE(SUM(CASE WHEN cs.status = 'VERIFIED' THEN cs.quantity_kg ELSE 0 END), 0) as verified_kg,
           COALESCE(SUM(ml.quantity_available_kg), 0) as listed_kg,
           COALESCE((
             SELECT SUM(o.total_price) FROM orders o
             JOIN marketplace_listings ml2 ON o.listing_id = ml2.id
             WHERE ml2.fisher_id = f.id AND o.status != 'CANCELLED'
           ), 0) as revenue
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN catch_submissions cs ON cs.fisher_id = f.id
    LEFT JOIN marketplace_listings ml ON ml.fisher_id = f.id AND ml.status = 'ACTIVE'
    GROUP BY f.id ORDER BY revenue DESC
  `).all();
  res.json({ sellers });
}

// GET /api/admin/market/species-prices
function getMarketSpeciesPrices(req, res) {
  const db = getDb();
  const fromOrders = db.prepare(`
    SELECT ml.species,
           ROUND(AVG(o.price_per_kg), 2) as avg_order_price,
           COUNT(o.id) as order_count
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    WHERE o.status != 'CANCELLED' AND o.ordered_at >= datetime('now', '-7 days')
    GROUP BY ml.species
  `).all();
  const fromListings = db.prepare(`
    SELECT species, ROUND(AVG(price_per_kg), 2) as avg_listing_price
    FROM marketplace_listings WHERE status = 'ACTIVE'
    GROUP BY species
  `).all();
  const listingMap = Object.fromEntries(fromListings.map((r) => [r.species, r.avg_listing_price]));
  const data = fromOrders.map((r) => ({
    ...r,
    avg_listing_price: listingMap[r.species] ?? null,
  }));
  res.json({ data });
}

// GET /api/admin/market/shortages
function getMarketShortages(req, res) {
  const db = getDb();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const quotaShortages = db.prepare(`
    SELECT species, monthly_limit_kg, current_month_kg,
           ROUND((current_month_kg * 100.0 / monthly_limit_kg), 1) as usage_pct
    FROM species_quotas WHERE month = ? AND year = ?
      AND (current_month_kg * 100.0 / monthly_limit_kg) >= 85
    ORDER BY usage_pct DESC
  `).all(currentMonth, currentYear);

  const stockLow = db.prepare(`
    SELECT species,
           COALESCE(SUM(quantity_available_kg), 0) as available_kg,
           COUNT(*) as listing_count
    FROM marketplace_listings WHERE status = 'ACTIVE'
    GROUP BY species HAVING available_kg < 50
    ORDER BY available_kg ASC
  `).all();

  res.json({ quotaShortages, stockLow });
}

// GET /api/admin/market/transactions
function getMarketTransactions(req, res) {
  const db = getDb();
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const transactions = db.prepare(`
    SELECT o.id, o.reference_id, o.quantity_kg, o.price_per_kg, o.total_price, o.ordered_at,
           ml.species,
           bu.name as buyer_name,
           fu.name as seller_name
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN users bu ON o.buyer_id = bu.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.status != 'CANCELLED'
    ORDER BY o.ordered_at DESC LIMIT ?
  `).all(limit);
  res.json({ transactions });
}

// GET /api/admin/market/network
function getMarketNetwork(req, res) {
  const db = getDb();
  const edges = db.prepare(`
    SELECT fu.name as seller, bu.name as buyer, ml.species,
           o.quantity_kg, o.total_price, o.ordered_at, o.reference_id
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN users bu ON o.buyer_id = bu.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.status != 'CANCELLED'
    ORDER BY o.ordered_at DESC LIMIT 50
  `).all();
  res.json({ edges });
}

// GET /api/admin/audit
function getAuditLog(req, res) {
  const db = getDb();
  const { action, entity_type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  let where = '1=1';
  const params = [];
  if (action) { where += ' AND a.action LIKE ?'; params.push(`%${action}%`); }
  if (entity_type) { where += ' AND a.entity_type = ?'; params.push(entity_type); }

  const total = db.prepare(`
    SELECT COUNT(*) as cnt FROM audit_log a WHERE ${where}
  `).get(...params).cnt;

  const entries = db.prepare(`
    SELECT a.*, u.name as actor_name, u.email as actor_email
    FROM audit_log a
    LEFT JOIN users u ON a.actor_user_id = u.id
    WHERE ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const parsed = entries.map((e) => ({
    ...e,
    payload: JSON.parse(e.payload_json || '{}'),
  }));

  res.json({ entries: parsed, total, page: Number(page), limit: Number(limit) });
}

// GET /api/admin/events/recent (for activity feed without SSE)
function getFleet(req, res) {
  const fleetService = require('../services/fleet.service');
  const boats = fleetService.getFleetList(getDb());
  res.json({ boats });
}

function getFleetHistory(req, res) {
  const hours = Math.min(Number(req.query.hours) || 24, 72);
  const fleetService = require('../services/fleet.service');
  const points = fleetService.getBoatHistory(getDb(), Number(req.params.boatId), hours);
  res.json({ boat_id: Number(req.params.boatId), points });
}

function getActiveFleetTrips(req, res) {
  const db = getDb();
  const trips = db.prepare(`
    SELECT t.*, b.boat_name, u.name as fisher_name
    FROM boat_trips t
    JOIN boats b ON b.id = t.boat_id
    JOIN fishers f ON t.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    WHERE t.status = 'ACTIVE'
    ORDER BY t.started_at DESC
  `).all();
  res.json({ trips });
}

function getIntelligenceOverview(req, res) {
  const marketIntel = require('../services/market-intel.service');
  res.json(marketIntel.getIntelligenceOverview(getDb()));
}

function refreshIntelligenceSnapshots(req, res) {
  const marketIntel = require('../services/market-intel.service');
  const db = getDb();
  marketIntel.refreshSnapshots(db, Number(req.body?.days) || 14);
  res.json({ success: true, message: 'Market snapshots refreshed' });
}

function getSeasonRules(req, res) {
  const db = getDb();
  const rules = db.prepare(`
    SELECT r.*, fz.name as zone_name
    FROM zone_season_rules r
    JOIN fishing_zones fz ON r.zone_id = fz.id
    ORDER BY fz.name, r.species
  `).all();
  res.json({ rules });
}

function createSeasonRule(req, res) {
  const { zone_id, species, season_start, season_end, rule_type, max_kg, notes } = req.body;
  if (!zone_id || !species || !season_start || !season_end || !rule_type) {
    return res.status(400).json({ error: 'zone_id, species, season_start, season_end, rule_type required' });
  }
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO zone_season_rules (zone_id, species, season_start, season_end, rule_type, max_kg, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(zone_id, species, season_start, season_end, rule_type, max_kg ?? null, notes ?? null);
  res.status(201).json({ id: result.lastInsertRowid });
}

function updateSeasonRule(req, res) {
  const { species, season_start, season_end, rule_type, max_kg, notes } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM zone_season_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rule not found' });
  db.prepare(`
    UPDATE zone_season_rules
    SET species = COALESCE(?, species),
        season_start = COALESCE(?, season_start),
        season_end = COALESCE(?, season_end),
        rule_type = COALESCE(?, rule_type),
        max_kg = COALESCE(?, max_kg),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(species, season_start, season_end, rule_type, max_kg, notes, req.params.id);
  res.json({ success: true });
}

function deleteSeasonRule(req, res) {
  const db = getDb();
  db.prepare('DELETE FROM zone_season_rules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
}

function getRecentEvents(req, res) {
  const db = getDb();
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const events = db.prepare(`
    SELECT id, event_type, payload_json, created_at FROM domain_events
    ORDER BY id DESC LIMIT ?
  `).all(limit);
  res.json({
    events: events.map((e) => ({
      type: e.event_type,
      payload: JSON.parse(e.payload_json || '{}'),
      timestamp: e.created_at,
    })),
  });
}

module.exports = {
  getDashboardStats,
  getCatchesOverTime,
  getSpeciesBreakdown,
  getCatches,
  getCatch,
  approveCatch,
  rejectCatch,
  getFishers,
  getFisher,
  getQuotas,
  updateQuota,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
  getZones,
  getMonthlyReport,
  getLiveStats,
  getFleetPositions,
  getFleet,
  getFleetHistory,
  getActiveFleetTrips,
  getIntelligenceOverview,
  refreshIntelligenceSnapshots,
  getSeasonRules,
  createSeasonRule,
  updateSeasonRule,
  deleteSeasonRule,
  getMapLayers,
  getMarketOverview,
  getMarketBuyers,
  getMarketSellers,
  getMarketSpeciesPrices,
  getMarketShortages,
  getMarketTransactions,
  getMarketNetwork,
  getAuditLog,
  getRecentEvents,
};
