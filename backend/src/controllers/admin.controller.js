const { Prisma } = require('@prisma/client');
const { prisma } = require('../database/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const quotaService = require('../services/quota.service');
const notificationService = require('../services/notification.service');
const listingService = require('../services/listing.service');
const fleetService = require('../services/fleet.service');
const marketIntelService = require('../services/market-intel.service');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const regionService = require('../services/region.service');

function num(v) {
  return Number(v ?? 0);
}

function catchRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`AND EXISTS (
    SELECT 1 FROM fishing_zones fz_r WHERE fz_r.id = cs.zone_id AND fz_r.region_id = ${regionId}
  )`;
}

function fisherRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`AND EXISTS (
    SELECT 1 FROM fishing_zones fz_r WHERE fz_r.id = f.zone_id AND fz_r.region_id = ${regionId}
  )`;
}

function zoneRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`WHERE region_id = ${regionId}`;
}

function listingRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`AND EXISTS (
    SELECT 1 FROM fishers f_r
    JOIN fishing_zones fz_r ON f_r.zone_id = fz_r.id
    WHERE f_r.id = ml.fisher_id AND fz_r.region_id = ${regionId}
  )`;
}

function orderRegionSql(regionId) {
  if (regionId == null) return Prisma.empty;
  return Prisma.sql`AND EXISTS (
    SELECT 1 FROM marketplace_listings ml_r
    JOIN fishers f_r ON ml_r.fisher_id = f_r.id
    JOIN fishing_zones fz_r ON f_r.zone_id = fz_r.id
    WHERE ml_r.id = o.listing_id AND fz_r.region_id = ${regionId}
  )`;
}

async function listRegions(req, res) {
  const regions = await regionService.listRegions();
  res.json({ regions });
}

async function getRegionSummary(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const id = Number(req.params.id);
  if (regionId != null && id !== regionId) {
    return res.status(403).json({ error: 'Cannot view another region' });
  }
  const region = await prisma.region.findUnique({
    where: { id },
    select: { id: true, name: true, code: true, centerLat: true, centerLng: true },
  });
  if (!region) return res.status(404).json({ error: 'Region not found' });
  const summary = await regionService.getRegionSummary(id);
  res.json({ region, summary });
}

async function getDashboardStats(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const today = new Date().toISOString().split('T')[0];

  const [fishers, boats, todayCatch, listings, alerts, pending, sold] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM fishers f WHERE 1=1 ${fisherRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM boats b
      JOIN fishers f ON b.fisher_id = f.id WHERE 1=1 ${fisherRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_kg), 0) as total
      FROM catch_submissions cs
      WHERE fishing_date = ${today}::date AND status = 'VERIFIED' ${catchRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM marketplace_listings ml
      WHERE status = 'ACTIVE' ${listingRegionSql(regionId)}
    `,
    prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM alerts WHERE is_read = false`,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM catch_submissions cs
      WHERE status = 'PENDING' ${catchRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(o.quantity_kg), 0) as total
      FROM orders o WHERE o.ordered_at::date = ${today}::date ${orderRegionSql(regionId)}
    `,
  ]);

  res.json({
    totalFishers: num(fishers[0]?.cnt),
    totalBoats: num(boats[0]?.cnt),
    todayCatchKg: num(todayCatch[0]?.total),
    activeListings: num(listings[0]?.cnt),
    activeAlerts: num(alerts[0]?.cnt),
    pendingCatches: num(pending[0]?.cnt),
    fishSoldToday: num(sold[0]?.total),
  });
}

async function getCatchesOverTime(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const rows = await prisma.$queryRaw`
    SELECT fishing_date as date, COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions cs
    WHERE status = 'VERIFIED' AND fishing_date >= CURRENT_DATE - interval '6 days'
    ${catchRegionSql(regionId)}
    GROUP BY fishing_date ORDER BY fishing_date ASC
  `;

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const found = rows.find((r) => {
      const rd = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      return rd === d;
    });
    result.push({ date: d, total_kg: found ? num(found.total_kg) : 0 });
  }

  res.json({ data: result });
}

async function getSpeciesBreakdown(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const today = new Date().toISOString().split('T')[0];
  const rows = await prisma.$queryRaw`
    SELECT species, COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions cs
    WHERE status = 'VERIFIED' AND fishing_date = ${today}::date
    ${catchRegionSql(regionId)}
    GROUP BY species ORDER BY total_kg DESC
  `;
  res.json({ data: rows });
}

async function getCatches(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const { status, date, search, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);

  const parts = [Prisma.sql`1=1`];
  if (status && status !== 'ALL') parts.push(Prisma.sql`cs.status = ${status}`);
  if (date) parts.push(Prisma.sql`cs.fishing_date = ${date}::date`);
  if (search) {
    const like = `%${search}%`;
    parts.push(Prisma.sql`(u.name ILIKE ${like} OR cs.species ILIKE ${like} OR cs.reference_id ILIKE ${like})`);
  }
  if (regionId != null) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM fishing_zones fz_r WHERE fz_r.id = cs.zone_id AND fz_r.region_id = ${regionId}
    )`);
  }
  const where = Prisma.join(parts, ' AND ');

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    WHERE ${where}
  `;
  const total = num(totalRows[0]?.cnt);

  const catches = await prisma.$queryRaw`
    SELECT cs.*, u.name as fisher_name, f.license_number, f.license_status,
           fz.name as zone_name, fz.type as zone_type, b.boat_name
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE ${where}
    ORDER BY cs.submitted_at DESC
    LIMIT ${lim} OFFSET ${offset}
  `;

  res.json({ catches, total, page: Number(page), limit: Number(limit) });
}

async function getCatch(req, res) {
  const rows = await prisma.$queryRaw`
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
    WHERE cs.id = ${Number(req.params.id)}
  `;
  const catchRow = rows[0];
  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const quotaRows = await prisma.$queryRaw`
    SELECT * FROM species_quotas WHERE species = ${catchRow.species}
      AND month = ${currentMonth} AND year = ${currentYear}
  `;

  res.json({ catch: catchRow, quota: quotaRows[0] ?? null });
}

async function approveCatch(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const rows = await prisma.$queryRaw`
    SELECT * FROM catch_submissions WHERE id = ${Number(req.params.id)}
  `;
  const catchRow = rows[0];
  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });
  await regionService.assertCatchInRegion(catchRow.id, regionId);
  if (catchRow.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only pending catches can be approved' });
  }

  const quotaCheck = await quotaService.checkQuotaBeforeApprove(catchRow.species, catchRow.quantity_kg);
  if (!quotaCheck.allowed) {
    return res.status(409).json({ error: quotaCheck.message });
  }

  await prisma.catchSubmission.update({
    where: { id: catchRow.id },
    data: {
      status: 'VERIFIED',
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });

  const listing = await listingService.createListing(catchRow);
  await quotaService.updateQuota(catchRow.species, catchRow.quantity_kg);

  const fisherRows = await prisma.$queryRaw`SELECT * FROM fishers WHERE id = ${catchRow.fisher_id}`;
  const fisher = fisherRows[0];
  await notificationService.notifyFisher(
    fisher.user_id,
    'CATCH_APPROVED',
    'Catch Approved',
    `Your catch ${catchRow.reference_id} has been approved and is now listed in the marketplace.`,
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

  res.json({
    success: true,
    catch_id: catchRow.id,
    status: 'VERIFIED',
    listing_id: listing.id,
    fisher_notified: true,
  });
}

async function rejectCatch(req, res) {
  const { reason } = req.body;
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'A rejection reason is required' });
  }

  const { regionId } = await regionService.resolveRegionFilter(req);
  const rows = await prisma.$queryRaw`
    SELECT * FROM catch_submissions WHERE id = ${Number(req.params.id)}
  `;
  const catchRow = rows[0];
  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });
  await regionService.assertCatchInRegion(catchRow.id, regionId);
  if (catchRow.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only pending catches can be rejected' });
  }

  await prisma.catchSubmission.update({
    where: { id: catchRow.id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason.trim(),
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });

  const fisherRows = await prisma.$queryRaw`SELECT * FROM fishers WHERE id = ${catchRow.fisher_id}`;
  const fisher = fisherRows[0];
  await notificationService.notifyFisher(
    fisher.user_id,
    'CATCH_REJECTED',
    'Catch Not Approved',
    `Your catch ${catchRow.reference_id} was not approved. Reason: ${reason.trim()}`,
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

async function getFishers(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM fishers f WHERE 1=1 ${fisherRegionSql(regionId)}
  `;
  const total = num(totalRows[0]?.cnt);

  const fishers = await prisma.$queryRaw`
    SELECT f.*, u.name, u.email, u.phone,
           fz.name as zone_name,
           b.boat_name, b.registration_number,
           COALESCE(fc.score, 100) as compliance_score,
           COALESCE(fc.open_violations, 0) as open_violations,
           (SELECT COUNT(*)::int FROM catch_submissions cs WHERE cs.fisher_id = f.id) as total_catches,
           (SELECT COUNT(*)::int FROM catch_submissions cs WHERE cs.fisher_id = f.id AND cs.status = 'VERIFIED') as verified_catches
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    LEFT JOIN fisher_compliance fc ON fc.fisher_id = f.id
    WHERE 1=1 ${fisherRegionSql(regionId)}
    ORDER BY u.name ASC
    LIMIT ${lim} OFFSET ${offset}
  `;

  res.json({ fishers, total, page: Number(page), limit: Number(limit) });
}

async function getFisher(req, res) {
  const rows = await prisma.$queryRaw`
    SELECT f.*, u.name, u.email, u.phone,
           fz.name as zone_name, fz.type as zone_type,
           b.boat_name, b.registration_number, b.capacity_kg
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE f.id = ${Number(req.params.id)}
  `;
  const fisher = rows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const recentCatches = await prisma.$queryRaw`
    SELECT * FROM catch_submissions WHERE fisher_id = ${fisher.id}
    ORDER BY submitted_at DESC LIMIT 10
  `;

  res.json({ fisher, recentCatches });
}

async function getQuotas(req, res) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const quotas = await prisma.$queryRaw`
    SELECT *, ROUND((current_month_kg * 100.0 / monthly_limit_kg)::numeric, 1) as usage_pct
    FROM species_quotas WHERE month = ${currentMonth} AND year = ${currentYear}
    ORDER BY usage_pct DESC
  `;
  res.json({ quotas });
}

async function updateQuota(req, res) {
  const { monthly_limit_kg } = req.body;
  if (!monthly_limit_kg || monthly_limit_kg <= 0) {
    return res.status(400).json({ error: 'Valid monthly limit is required' });
  }
  await prisma.speciesQuota.update({
    where: { id: Number(req.params.id) },
    data: { monthlyLimitKg: monthly_limit_kg, updatedAt: new Date() },
  });
  auditFromReq(req, 'quota.updated', 'quota', Number(req.params.id), { monthly_limit_kg });
  res.json({ success: true });
}

async function getAlerts(req, res) {
  const alerts = await prisma.$queryRaw`
    SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50
  `;
  const unreadRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM alerts WHERE is_read = false
  `;
  res.json({ alerts, unreadCount: num(unreadRows[0]?.cnt) });
}

async function markAlertRead(req, res) {
  await prisma.alert.update({
    where: { id: Number(req.params.id) },
    data: { isRead: true },
  });
  res.json({ success: true });
}

async function markAllAlertsRead(req, res) {
  await prisma.alert.updateMany({ data: { isRead: true } });
  res.json({ success: true });
}

async function getZones(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const zones = await prisma.$queryRaw`
    SELECT fz.*,
      (SELECT COUNT(*)::int FROM catch_submissions cs
       WHERE cs.zone_id = fz.id AND cs.fishing_date = CURRENT_DATE) as today_submissions
    FROM fishing_zones fz
    ${regionId != null ? Prisma.sql`WHERE fz.region_id = ${regionId}` : Prisma.empty}
    ORDER BY fz.type, fz.name
  `;
  res.json({ zones });
}

async function getMonthlyReport(req, res) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [totalVerified, totalRejected, bySpecies, totalSales] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_kg), 0) as total, COUNT(*)::int as count
      FROM catch_submissions
      WHERE status = 'VERIFIED'
        AND EXTRACT(MONTH FROM fishing_date) = ${currentMonth}
        AND EXTRACT(YEAR FROM fishing_date) = ${currentYear}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM catch_submissions
      WHERE status = 'REJECTED'
        AND EXTRACT(MONTH FROM fishing_date) = ${currentMonth}
        AND EXTRACT(YEAR FROM fishing_date) = ${currentYear}
    `,
    prisma.$queryRaw`
      SELECT species, COALESCE(SUM(quantity_kg), 0) as total_kg, COUNT(*)::int as count
      FROM catch_submissions
      WHERE status = 'VERIFIED'
        AND EXTRACT(MONTH FROM fishing_date) = ${currentMonth}
        AND EXTRACT(YEAR FROM fishing_date) = ${currentYear}
      GROUP BY species ORDER BY total_kg DESC
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(total_price), 0) as revenue, COALESCE(SUM(quantity_kg), 0) as kg_sold
      FROM orders
      WHERE EXTRACT(MONTH FROM ordered_at) = ${currentMonth}
        AND EXTRACT(YEAR FROM ordered_at) = ${currentYear}
    `,
  ]);

  res.json({
    totalVerified: totalVerified[0],
    totalRejected: totalRejected[0],
    bySpecies,
    totalSales: totalSales[0],
    month: currentMonth,
    year: currentYear,
  });
}

async function getLiveStats(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const today = new Date().toISOString().split('T')[0];
  const oneHourAgo = new Date(Date.now() - 3600000);

  const [catchKg, pending, ordersHour, revenue, boats, listingsKg, fishers] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_kg), 0) as total
      FROM catch_submissions cs
      WHERE fishing_date = ${today}::date AND status = 'VERIFIED' ${catchRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM catch_submissions cs
      WHERE status = 'PENDING' ${catchRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM orders o
      WHERE ordered_at >= ${oneHourAgo} AND status != 'CANCELLED' ${orderRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM orders o
      WHERE ordered_at::date = ${today}::date AND status != 'CANCELLED' ${orderRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT bp.boat_id)::int as cnt FROM boat_positions bp
      JOIN boats b ON bp.boat_id = b.id
      JOIN fishers f ON b.fisher_id = f.id
      WHERE bp.status IN ('FISHING', 'RETURNING')
        AND bp.recorded_at >= NOW() - interval '30 minutes'
        ${fisherRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_available_kg), 0) as total
      FROM marketplace_listings ml
      WHERE status = 'ACTIVE' ${listingRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT fisher_id)::int as cnt FROM catch_submissions cs
      WHERE fishing_date = ${today}::date AND status IN ('PENDING', 'VERIFIED')
      ${catchRegionSql(regionId)}
    `,
  ]);

  res.json({
    catchKgToday: num(catchKg[0]?.total),
    pendingCatches: num(pending[0]?.cnt),
    ordersLastHour: num(ordersHour[0]?.cnt),
    revenueToday: num(revenue[0]?.total),
    activeBoats: num(boats[0]?.cnt),
    activeListingsKg: num(listingsKg[0]?.total),
    activeFishers: num(fishers[0]?.cnt),
    timestamp: new Date().toISOString(),
  });
}

async function getFleetPositions(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const boats = await prisma.$queryRaw`
    SELECT b.id as boat_id, b.boat_name, b.registration_number,
           f.id as fisher_id, u.name as fisher_name,
           bp.lat, bp.lng, bp.status, bp.recorded_at
    FROM boats b
    JOIN fishers f ON b.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE 1=1 ${fisherRegionSql(regionId)}
    ORDER BY b.boat_name
  `;
  res.json({ boats });
}

async function getMapLayers(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const zonesRaw = await prisma.$queryRaw`
    SELECT id, name, type, gps_lat, gps_lng, description, geo_polygon, region_id
    FROM fishing_zones fz
    ${regionId != null ? Prisma.sql`WHERE fz.region_id = ${regionId}` : Prisma.empty}
  `;
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

  const fleet = await prisma.$queryRaw`
    SELECT b.id as boat_id, b.boat_name, u.name as fisher_name,
           bp.lat, bp.lng, bp.status, bp.recorded_at
    FROM boats b
    JOIN fishers f ON b.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    WHERE bp.lat IS NOT NULL ${fisherRegionSql(regionId)}
  `;

  const catches = await prisma.$queryRaw`
    SELECT cs.id, cs.reference_id, cs.species, cs.quantity_kg, cs.status,
           cs.gps_lat, cs.gps_lng, cs.submitted_at,
           u.name as fisher_name, fz.name as zone_name
    FROM catch_submissions cs
    JOIN fishers f ON cs.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE cs.submitted_at >= NOW() - interval '24 hours'
      AND cs.gps_lat IS NOT NULL
      ${catchRegionSql(regionId)}
    ORDER BY cs.submitted_at DESC
    LIMIT 100
  `;

  res.json({ zones, fleet, catches });
}

async function getMarketOverview(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const today = new Date().toISOString().split('T')[0];

  const [revenue, orders, listings, topSpecies] = await Promise.all([
    prisma.$queryRaw`
      SELECT COALESCE(SUM(total_price), 0) as total FROM orders o
      WHERE ordered_at::date = ${today}::date AND status != 'CANCELLED' ${orderRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM orders o
      WHERE ordered_at::date = ${today}::date AND status != 'CANCELLED' ${orderRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_available_kg), 0) as total
      FROM marketplace_listings ml
      WHERE status = 'ACTIVE' ${listingRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT ml.species, COALESCE(SUM(o.quantity_kg), 0) as kg_sold,
             COALESCE(SUM(o.total_price), 0) as revenue
      FROM orders o
      JOIN marketplace_listings ml ON o.listing_id = ml.id
      WHERE o.status != 'CANCELLED' AND o.ordered_at::date >= CURRENT_DATE - interval '7 days'
      ${orderRegionSql(regionId)}
      GROUP BY ml.species ORDER BY kg_sold DESC LIMIT 5
    `,
  ]);

  res.json({
    revenueToday: num(revenue[0]?.total),
    ordersToday: num(orders[0]?.cnt),
    activeListingsKg: num(listings[0]?.total),
    topSpecies,
  });
}

async function getMarketBuyers(req, res) {
  const buyers = await prisma.$queryRaw`
    SELECT u.id, u.name, u.email, b.location,
           COUNT(o.id)::int as order_count,
           COALESCE(SUM(o.quantity_kg), 0) as total_kg,
           COALESCE(SUM(o.total_price), 0) as total_spend
    FROM users u
    JOIN buyers b ON b.user_id = u.id
    LEFT JOIN orders o ON o.buyer_id = u.id AND o.status != 'CANCELLED'
    WHERE u.role = 'buyer'
    GROUP BY u.id, u.name, u.email, b.location
    ORDER BY total_spend DESC
  `;
  res.json({ buyers });
}

async function getMarketSellers(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const sellers = await prisma.$queryRaw`
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
    WHERE 1=1 ${fisherRegionSql(regionId)}
    GROUP BY f.id, u.name, f.license_number
    ORDER BY revenue DESC
  `;
  res.json({ sellers });
}

async function getMarketSpeciesPrices(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const fromOrders = await prisma.$queryRaw`
    SELECT ml.species,
           ROUND(AVG(o.price_per_kg)::numeric, 2) as avg_order_price,
           COUNT(o.id)::int as order_count
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    WHERE o.status != 'CANCELLED' AND o.ordered_at >= NOW() - interval '7 days'
    ${orderRegionSql(regionId)}
    GROUP BY ml.species
  `;
  const fromListings = await prisma.$queryRaw`
    SELECT species, ROUND(AVG(price_per_kg)::numeric, 2) as avg_listing_price
    FROM marketplace_listings ml
    WHERE status = 'ACTIVE' ${listingRegionSql(regionId)}
    GROUP BY species
  `;
  const listingMap = Object.fromEntries(fromListings.map((r) => [r.species, r.avg_listing_price]));
  const data = fromOrders.map((r) => ({
    ...r,
    avg_listing_price: listingMap[r.species] ?? null,
  }));
  res.json({ data });
}

async function getMarketShortages(req, res) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const quotaShortages = await prisma.$queryRaw`
    SELECT species, monthly_limit_kg, current_month_kg,
           ROUND((current_month_kg * 100.0 / monthly_limit_kg)::numeric, 1) as usage_pct
    FROM species_quotas WHERE month = ${currentMonth} AND year = ${currentYear}
      AND (current_month_kg * 100.0 / monthly_limit_kg) >= 85
    ORDER BY usage_pct DESC
  `;

  const { regionId } = await regionService.resolveRegionFilter(req);
  const stockLow = await prisma.$queryRaw`
    SELECT species,
           COALESCE(SUM(quantity_available_kg), 0) as available_kg,
           COUNT(*)::int as listing_count
    FROM marketplace_listings ml
    WHERE status = 'ACTIVE' ${listingRegionSql(regionId)}
    GROUP BY species HAVING COALESCE(SUM(quantity_available_kg), 0) < 50
    ORDER BY available_kg ASC
  `;

  res.json({ quotaShortages, stockLow });
}

async function getMarketTransactions(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const transactions = await prisma.$queryRaw`
    SELECT o.id, o.reference_id, o.quantity_kg, o.price_per_kg, o.total_price, o.ordered_at,
           ml.species,
           bu.name as buyer_name,
           fu.name as seller_name
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN users bu ON o.buyer_id = bu.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.status != 'CANCELLED' ${orderRegionSql(regionId)}
    ORDER BY o.ordered_at DESC LIMIT ${limit}
  `;
  res.json({ transactions });
}

async function getMarketNetwork(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const edges = await prisma.$queryRaw`
    SELECT fu.name as seller, bu.name as buyer, ml.species,
           o.quantity_kg, o.total_price, o.ordered_at, o.reference_id
    FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
    JOIN users bu ON o.buyer_id = bu.id
    JOIN fishers f ON ml.fisher_id = f.id
    JOIN users fu ON f.user_id = fu.id
    WHERE o.status != 'CANCELLED' ${orderRegionSql(regionId)}
    ORDER BY o.ordered_at DESC LIMIT 50
  `;
  res.json({ edges });
}

async function getAuditLog(req, res) {
  const { action, entity_type, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);

  const parts = [Prisma.sql`1=1`];
  if (action) parts.push(Prisma.sql`a.action ILIKE ${`%${action}%`}`);
  if (entity_type) parts.push(Prisma.sql`a.entity_type = ${entity_type}`);
  const where = Prisma.join(parts, ' AND ');

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM audit_log a WHERE ${where}
  `;
  const total = num(totalRows[0]?.cnt);

  const entries = await prisma.$queryRaw`
    SELECT a.*, u.name as actor_name, u.email as actor_email
    FROM audit_log a
    LEFT JOIN users u ON a.actor_user_id = u.id
    WHERE ${where}
    ORDER BY a.created_at DESC
    LIMIT ${lim} OFFSET ${offset}
  `;

  const parsed = entries.map((e) => ({
    ...e,
    payload: JSON.parse(e.payload_json || '{}'),
  }));

  res.json({ entries: parsed, total, page: Number(page), limit: Number(limit) });
}

async function getFleet(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const boats = await fleetService.getFleetList(regionId);
  res.json({ boats });
}

async function getFleetHistory(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const boatId = Number(req.params.boatId);
  if (regionId != null) {
    const inRegion = await prisma.$queryRaw`
      SELECT b.id FROM boats b
      JOIN fishers f ON b.fisher_id = f.id
      WHERE b.id = ${boatId} ${fisherRegionSql(regionId)}
      LIMIT 1
    `;
    if (!inRegion.length) return res.status(403).json({ error: 'Boat not in selected region' });
  }
  const hours = Math.min(Number(req.query.hours) || 24, 72);
  const points = await fleetService.getBoatHistory(boatId, hours);
  res.json({ boat_id: boatId, points });
}

async function getActiveFleetTrips(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const trips = await prisma.$queryRaw`
    SELECT t.*, b.boat_name, u.name as fisher_name
    FROM boat_trips t
    JOIN boats b ON b.id = t.boat_id
    JOIN fishers f ON t.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    WHERE t.status = 'ACTIVE' ${fisherRegionSql(regionId)}
    ORDER BY t.started_at DESC
  `;
  res.json({ trips });
}

async function getIntelligenceOverview(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const overview = await marketIntelService.getIntelligenceOverview(regionId);
  res.json(overview);
}

async function refreshIntelligenceSnapshots(req, res) {
  await marketIntelService.refreshSnapshots(Number(req.body?.days) || 14);
  res.json({ success: true, message: 'Market snapshots refreshed' });
}

async function getSeasonRules(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const rules = await prisma.$queryRaw`
    SELECT r.*, fz.name as zone_name
    FROM zone_season_rules r
    JOIN fishing_zones fz ON r.zone_id = fz.id
    ${regionId != null ? Prisma.sql`WHERE fz.region_id = ${regionId}` : Prisma.empty}
    ORDER BY fz.name, r.species
  `;
  res.json({ rules });
}

async function createSeasonRule(req, res) {
  const { zone_id, species, season_start, season_end, rule_type, max_kg, notes } = req.body;
  if (!zone_id || !species || !season_start || !season_end || !rule_type) {
    return res.status(400).json({ error: 'zone_id, species, season_start, season_end, rule_type required' });
  }
  const created = await prisma.zoneSeasonRule.create({
    data: {
      zoneId: zone_id,
      species,
      seasonStart: season_start,
      seasonEnd: season_end,
      ruleType: rule_type,
      maxKg: max_kg ?? null,
      notes: notes ?? null,
    },
  });
  res.status(201).json({ id: created.id });
}

async function updateSeasonRule(req, res) {
  const { species, season_start, season_end, rule_type, max_kg, notes } = req.body;
  const existing = await prisma.zoneSeasonRule.findUnique({ where: { id: Number(req.params.id) } });
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  await prisma.zoneSeasonRule.update({
    where: { id: Number(req.params.id) },
    data: {
      species: species ?? undefined,
      seasonStart: season_start ?? undefined,
      seasonEnd: season_end ?? undefined,
      ruleType: rule_type ?? undefined,
      maxKg: max_kg ?? undefined,
      notes: notes ?? undefined,
    },
  });
  res.json({ success: true });
}

async function deleteSeasonRule(req, res) {
  await prisma.zoneSeasonRule.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
}

async function getRecentEvents(req, res) {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const events = await prisma.$queryRaw`
    SELECT id, event_type, payload_json, created_at FROM domain_events
    ORDER BY id DESC LIMIT ${limit}
  `;
  res.json({
    events: events.map((e) => ({
      type: e.event_type,
      payload: JSON.parse(e.payload_json || '{}'),
      timestamp: e.created_at,
    })),
  });
}

module.exports = {
  listRegions: asyncHandler(listRegions),
  getRegionSummary: asyncHandler(getRegionSummary),
  getDashboardStats: asyncHandler(getDashboardStats),
  getCatchesOverTime: asyncHandler(getCatchesOverTime),
  getSpeciesBreakdown: asyncHandler(getSpeciesBreakdown),
  getCatches: asyncHandler(getCatches),
  getCatch: asyncHandler(getCatch),
  approveCatch: asyncHandler(approveCatch),
  rejectCatch: asyncHandler(rejectCatch),
  getFishers: asyncHandler(getFishers),
  getFisher: asyncHandler(getFisher),
  getQuotas: asyncHandler(getQuotas),
  updateQuota: asyncHandler(updateQuota),
  getAlerts: asyncHandler(getAlerts),
  markAlertRead: asyncHandler(markAlertRead),
  markAllAlertsRead: asyncHandler(markAllAlertsRead),
  getZones: asyncHandler(getZones),
  getMonthlyReport: asyncHandler(getMonthlyReport),
  getLiveStats: asyncHandler(getLiveStats),
  getFleetPositions: asyncHandler(getFleetPositions),
  getFleet: asyncHandler(getFleet),
  getFleetHistory: asyncHandler(getFleetHistory),
  getActiveFleetTrips: asyncHandler(getActiveFleetTrips),
  getIntelligenceOverview: asyncHandler(getIntelligenceOverview),
  refreshIntelligenceSnapshots: asyncHandler(refreshIntelligenceSnapshots),
  getSeasonRules: asyncHandler(getSeasonRules),
  createSeasonRule: asyncHandler(createSeasonRule),
  updateSeasonRule: asyncHandler(updateSeasonRule),
  deleteSeasonRule: asyncHandler(deleteSeasonRule),
  getMapLayers: asyncHandler(getMapLayers),
  getMarketOverview: asyncHandler(getMarketOverview),
  getMarketBuyers: asyncHandler(getMarketBuyers),
  getMarketSellers: asyncHandler(getMarketSellers),
  getMarketSpeciesPrices: asyncHandler(getMarketSpeciesPrices),
  getMarketShortages: asyncHandler(getMarketShortages),
  getMarketTransactions: asyncHandler(getMarketTransactions),
  getMarketNetwork: asyncHandler(getMarketNetwork),
  getAuditLog: asyncHandler(getAuditLog),
  getRecentEvents: asyncHandler(getRecentEvents),
};
