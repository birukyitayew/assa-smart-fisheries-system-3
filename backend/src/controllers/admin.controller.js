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

function reportWindow(period = 'monthly') {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'weekly') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'monthly') {
    start.setDate(1);
  } else if (period === 'yearly') {
    start.setMonth(0, 1);
  }

  return { start, end };
}

function previousReportWindow(period = 'monthly', start) {
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setHours(0, 0, 0, 0);

  if (period === 'weekly') {
    previousStart.setDate(previousStart.getDate() - 6);
  } else if (period === 'monthly') {
    previousStart.setDate(1);
  } else if (period === 'yearly') {
    previousStart.setMonth(0, 1);
  }

  return { start: previousStart, end: previousEnd };
}

function trendPct(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function reportTitle(period) {
  const labels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  return labels[period] || labels.monthly;
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
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const tomorrow = new Date(today.getTime() + 86400000);

  const regionFilter = regionId != null ? { zone: { regionId } } : {};
  const fisherRegionFilter = regionId != null ? { fisher: { zone: { regionId } } } : {};
  const catchRegionFilter = regionId != null ? { zone: { regionId } } : {};
  const listingRegionFilter = regionId != null ? { fisher: { zone: { regionId } } } : {};
  const orderRegionFilter = regionId != null ? { listing: { fisher: { zone: { regionId } } } } : {};

  const [
    totalFishers,
    totalBoats,
    todayCatch,
    activeListings,
    activeAlerts,
    pendingCatches,
    sold,
    todayPendingCatch,
  ] = await Promise.all([
    prisma.fisher.count({ where: regionFilter }),
    prisma.boat.count({ where: fisherRegionFilter }),
    prisma.catchSubmission.aggregate({
      where: {
        fishingDate: today,
        status: 'VERIFIED',
        ...catchRegionFilter,
      },
      _sum: { quantityKg: true },
    }),
    prisma.marketplaceListing.count({
      where: {
        status: 'ACTIVE',
        ...listingRegionFilter,
      },
    }),
    prisma.alert.count({ where: { isRead: false } }),
    prisma.catchSubmission.count({
      where: {
        status: 'PENDING',
        ...catchRegionFilter,
      },
    }),
    prisma.order.aggregate({
      where: {
        orderedAt: {
          gte: today,
          lt: tomorrow,
        },
        ...orderRegionFilter,
      },
      _sum: { quantityKg: true },
    }),
    prisma.catchSubmission.aggregate({
      where: {
        fishingDate: today,
        status: 'PENDING',
        ...catchRegionFilter,
      },
      _sum: { quantityKg: true },
    }),
  ]);

  res.json({
    totalFishers,
    totalBoats,
    todayCatchKg: num(todayCatch._sum.quantityKg),
    todayPendingKg: num(todayPendingCatch._sum.quantityKg),
    activeListings,
    activeAlerts,
    pendingCatches,
    fishSoldToday: num(sold._sum.quantityKg),
  });
}

async function getCatchesOverTime(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const rows = await prisma.$queryRaw`
    SELECT 
      fishing_date as date,
      COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN quantity_kg ELSE 0 END), 0) as verified_kg,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN quantity_kg ELSE 0 END), 0) as pending_kg
    FROM catch_submissions cs
    WHERE status IN ('VERIFIED', 'PENDING') AND fishing_date >= CURRENT_DATE - interval '6 days'
    ${catchRegionSql(regionId)}
    GROUP BY fishing_date ORDER BY fishing_date ASC
  `;

  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const found = rows.find((r) => {
      const rd =
        r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      return rd === d;
    });
    result.push({
      date: d,
      verified_kg: found ? num(found.verified_kg) : 0,
      pending_kg: found ? num(found.pending_kg) : 0,
      total_kg: found ? num(found.verified_kg) + num(found.pending_kg) : 0,
    });
  }

  res.json({ data: result });
}

async function getSpeciesBreakdown(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const today = new Date().toISOString().split('T')[0];
  const rows = await prisma.$queryRaw`
    SELECT 
      species, 
      COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN quantity_kg ELSE 0 END), 0) as verified_kg,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN quantity_kg ELSE 0 END), 0) as pending_kg,
      COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions cs
    WHERE status IN ('VERIFIED', 'PENDING') AND fishing_date = ${today}::date
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
    parts.push(
      Prisma.sql`(u.name ILIKE ${like} OR cs.species ILIKE ${like} OR cs.reference_id ILIKE ${like})`,
    );
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
  const catchRowRaw = await prisma.catchSubmission.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!catchRowRaw) return res.status(404).json({ error: 'Catch not found' });

  // Map to snake_case structure to keep existing service logic fully backward compatible
  const catchRow = {
    id: catchRowRaw.id,
    reference_id: catchRowRaw.referenceId,
    fisher_id: catchRowRaw.fisherId,
    species: catchRowRaw.species,
    quantity_kg: catchRowRaw.quantityKg,
    numberOfFish: catchRowRaw.numberOfFish,
    fishingGear: catchRowRaw.fishingGear,
    fishingDate: catchRowRaw.fishingDate,
    fishingTime: catchRowRaw.fishingTime,
    zoneId: catchRowRaw.zoneId,
    gpsLat: catchRowRaw.gpsLat,
    gpsLng: catchRowRaw.gpsLng,
    photoUrls: catchRowRaw.photoUrls,
    zoneFlag: catchRowRaw.zoneFlag,
    status: catchRowRaw.status,
    rejectionReason: catchRowRaw.rejectionReason,
    reviewedBy: catchRowRaw.reviewedBy,
    reviewedAt: catchRowRaw.reviewedAt,
    submittedAt: catchRowRaw.submittedAt,
  };

  await regionService.assertCatchInRegion(catchRow.id, regionId);
  if (catchRow.status !== 'PENDING') {
    return res.status(400).json({ error: 'Only pending catches can be approved' });
  }

  const quotaCheck = await quotaService.checkQuotaBeforeApprove(
    catchRow.species,
    catchRow.quantity_kg,
  );
  if (!quotaCheck.allowed) {
    return res.status(409).json({ error: quotaCheck.message });
  }

  // Execute database writes atomically in a transaction
  const listing = await prisma.$transaction(async (tx) => {
    await tx.catchSubmission.update({
      where: { id: catchRow.id },
      data: {
        status: 'VERIFIED',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
    });

    const newListing = await listingService.createListing(catchRow, tx);
    await quotaService.updateQuota(catchRow.species, catchRow.quantity_kg, tx);
    return newListing;
  });

  const fisher = await prisma.fisher.findUnique({
    where: { id: catchRow.fisher_id },
    select: { userId: true },
  });

  if (fisher) {
    await notificationService.notifyFisher(
      fisher.userId,
      'CATCH_APPROVED',
      'Catch Approved',
      `Your catch ${catchRow.reference_id} has been approved and is now listed in the marketplace.`,
    );
  }

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
  const catchRowRaw = await prisma.catchSubmission.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!catchRowRaw) return res.status(404).json({ error: 'Catch not found' });

  // Map to snake_case structure
  const catchRow = {
    id: catchRowRaw.id,
    reference_id: catchRowRaw.referenceId,
    fisher_id: catchRowRaw.fisherId,
    species: catchRowRaw.species,
    quantity_kg: catchRowRaw.quantityKg,
    status: catchRowRaw.status,
  };

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

  const fisher = await prisma.fisher.findUnique({
    where: { id: catchRow.fisher_id },
    select: { userId: true },
  });

  if (fisher) {
    await notificationService.notifyFisher(
      fisher.userId,
      'CATCH_REJECTED',
      'Catch Not Approved',
      `Your catch ${catchRow.reference_id} was not approved. Reason: ${reason.trim()}`,
    );
  }

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
  const rows = await prisma.speciesQuota.findMany({
    where: { month: currentMonth, year: currentYear },
  });

  const quotas = rows
    .map((q) => {
      const usage_pct =
        q.monthlyLimitKg > 0 ? Number(((q.currentMonthKg * 100) / q.monthlyLimitKg).toFixed(1)) : 0;
      return {
        id: q.id,
        species: q.species,
        monthly_limit_kg: q.monthlyLimitKg,
        current_month_kg: q.currentMonthKg,
        month: q.month,
        year: q.year,
        updated_at: q.updatedAt,
        usage_pct,
      };
    })
    .sort((a, b) => b.usage_pct - a.usage_pct);

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
  const alertsRaw = await prisma.alert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.alert.count({
    where: { isRead: false },
  });

  const alerts = alertsRaw.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    message: a.message,
    severity: a.severity,
    is_read: a.isRead,
    related_entity_type: a.relatedEntityType,
    related_entity_id: a.relatedEntityId,
    created_at: a.createdAt,
  }));

  res.json({ alerts, unreadCount });
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

async function getProfessionalReport(req, res) {
  const { regionId, region } = await regionService.resolveRegionFilter(req);
  const requestedPeriod = String(req.query.period || 'monthly').toLowerCase();
  const allowedPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
  const period = allowedPeriods.includes(requestedPeriod) ? requestedPeriod : 'monthly';
  const { start, end } = reportWindow(period);
  const previous = previousReportWindow(period, start);

  const [
    catchTotals,
    previousCatchTotals,
    salesTotals,
    previousSalesTotals,
    speciesMix,
    zonePerformance,
    quotaStatus,
    compliance,
    marketPrices,
    fleet,
    activeAlerts,
    openViolations,
    recentCatches,
  ] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(quantity_kg), 0) as total_kg,
        COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN quantity_kg ELSE 0 END), 0) as verified_kg,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN quantity_kg ELSE 0 END), 0) as pending_kg,
        COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN quantity_kg ELSE 0 END), 0) as rejected_kg,
        COUNT(*)::int as submissions,
        COUNT(*) FILTER (WHERE status = 'VERIFIED')::int as verified_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int as pending_count,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int as rejected_count
      FROM catch_submissions cs
      WHERE fishing_date BETWEEN ${start}::date AND ${end}::date ${catchRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN quantity_kg ELSE 0 END), 0) as verified_kg
      FROM catch_submissions cs
      WHERE fishing_date BETWEEN ${previous.start}::date AND ${previous.end}::date ${catchRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(total_price), 0) as revenue,
        COALESCE(SUM(quantity_kg), 0) as kg_sold,
        COUNT(*)::int as orders,
        COALESCE(AVG(price_per_kg), 0) as avg_price
      FROM orders o
      WHERE status != 'CANCELLED' AND ordered_at BETWEEN ${start} AND ${end} ${orderRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT COALESCE(SUM(total_price), 0) as revenue
      FROM orders o
      WHERE status != 'CANCELLED' AND ordered_at BETWEEN ${previous.start} AND ${previous.end}
      ${orderRegionSql(regionId)}
    `,
    prisma.$queryRaw`
      SELECT species,
             COALESCE(SUM(quantity_kg), 0) as total_kg,
             COUNT(*)::int as submissions,
             COUNT(*) FILTER (WHERE status = 'VERIFIED')::int as verified_count
      FROM catch_submissions cs
      WHERE fishing_date BETWEEN ${start}::date AND ${end}::date ${catchRegionSql(regionId)}
      GROUP BY species ORDER BY total_kg DESC LIMIT 8
    `,
    prisma.$queryRaw`
      SELECT fz.name as zone_name,
             COALESCE(SUM(cs.quantity_kg), 0) as total_kg,
             COUNT(cs.id)::int as submissions,
             COUNT(cs.id) FILTER (WHERE cs.status = 'VERIFIED')::int as verified_count,
             COUNT(cs.id) FILTER (WHERE cs.status = 'REJECTED')::int as rejected_count
      FROM catch_submissions cs
      JOIN fishing_zones fz ON cs.zone_id = fz.id
      WHERE cs.fishing_date BETWEEN ${start}::date AND ${end}::date ${catchRegionSql(regionId)}
      GROUP BY fz.name ORDER BY total_kg DESC LIMIT 6
    `,
    prisma.$queryRaw`
      SELECT species, monthly_limit_kg, current_month_kg,
             ROUND((current_month_kg * 100.0 / NULLIF(monthly_limit_kg, 0))::numeric, 1) as usage_pct
      FROM species_quotas
      WHERE month = ${start.getMonth() + 1} AND year = ${start.getFullYear()}
      ORDER BY usage_pct DESC NULLS LAST LIMIT 8
    `,
    prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('OPEN','UNDER_REVIEW'))::int as open_cases,
        COUNT(*) FILTER (WHERE severity IN ('HIGH','CRITICAL') AND status IN ('OPEN','UNDER_REVIEW'))::int
          as high_risk_cases,
        COALESCE(SUM(CASE WHEN fine_status = 'PENDING' THEN fine_amount ELSE 0 END), 0) as pending_fines
      FROM violations v
      WHERE created_at BETWEEN ${start} AND ${end}
      ${regionId != null ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM fishing_zones fz_r WHERE fz_r.id = v.zone_id AND fz_r.region_id = ${regionId}
      )` : Prisma.empty}
    `,
    prisma.$queryRaw`
      SELECT ml.species,
             COALESCE(SUM(o.quantity_kg), 0) as kg_sold,
             COALESCE(SUM(o.total_price), 0) as revenue,
             COALESCE(AVG(o.price_per_kg), 0) as avg_price
      FROM orders o
      JOIN marketplace_listings ml ON o.listing_id = ml.id
      WHERE o.status != 'CANCELLED' AND o.ordered_at BETWEEN ${start} AND ${end}
      ${orderRegionSql(regionId)}
      GROUP BY ml.species ORDER BY revenue DESC LIMIT 8
    `,
    fleetService.getFleetList(regionId),
    prisma.alert.count({
      where: {
        isRead: false,
      },
    }),
    prisma.$queryRaw`
      SELECT COUNT(*)::int as count
      FROM violations v
      WHERE status IN ('OPEN','UNDER_REVIEW')
      ${regionId != null ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM fishing_zones fz_r WHERE fz_r.id = v.zone_id AND fz_r.region_id = ${regionId}
      )` : Prisma.empty}
    `,
    prisma.$queryRaw`
      SELECT cs.reference_id, cs.species, cs.quantity_kg, cs.status, cs.fishing_date,
             u.name as fisher_name, fz.name as zone_name
      FROM catch_submissions cs
      JOIN fishers f ON cs.fisher_id = f.id
      JOIN users u ON f.user_id = u.id
      JOIN fishing_zones fz ON cs.zone_id = fz.id
      WHERE cs.fishing_date BETWEEN ${start}::date AND ${end}::date ${catchRegionSql(regionId)}
      ORDER BY cs.submitted_at DESC LIMIT 8
    `,
  ]);

  const totals = catchTotals[0] || {};
  const sales = salesTotals[0] || {};
  const previousVerifiedKg = num(previousCatchTotals[0]?.verified_kg);
  const previousRevenue = num(previousSalesTotals[0]?.revenue);
  const activeBoats = fleet.filter((boat) => boat.status === 'ACTIVE').length;

  res.json({
    title: `${reportTitle(period)} Fisheries Performance Report`,
    period,
    periodLabel: reportTitle(period),
    generatedAt: new Date().toISOString(),
    region: region ? { id: region.id, name: region.name, code: region.code } : null,
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
      previousStart: previous.start.toISOString(),
      previousEnd: previous.end.toISOString(),
    },
    executiveSummary: {
      catchTrendPct: trendPct(num(totals.verified_kg), previousVerifiedKg),
      revenueTrendPct: trendPct(num(sales.revenue), previousRevenue),
      verificationRatePct: totals.submissions
        ? Number(((num(totals.verified_count) / num(totals.submissions)) * 100).toFixed(1))
        : 0,
      riskLevel: num(compliance[0]?.high_risk_cases) > 2 ? 'High' : activeAlerts > 0 ? 'Moderate' : 'Normal',
    },
    kpis: {
      totalCatchKg: num(totals.total_kg),
      verifiedCatchKg: num(totals.verified_kg),
      pendingCatchKg: num(totals.pending_kg),
      rejectedCatchKg: num(totals.rejected_kg),
      submissions: num(totals.submissions),
      verifiedCount: num(totals.verified_count),
      pendingCount: num(totals.pending_count),
      rejectedCount: num(totals.rejected_count),
      revenue: num(sales.revenue),
      kgSold: num(sales.kg_sold),
      orders: num(sales.orders),
      avgPrice: num(sales.avg_price),
      activeBoats,
      totalBoats: fleet.length,
      unreadAlerts: activeAlerts,
      openViolations: num(openViolations[0]?.count),
      pendingFines: num(compliance[0]?.pending_fines),
      highRiskCases: num(compliance[0]?.high_risk_cases),
    },
    speciesMix: speciesMix.map((row) => ({
      species: row.species,
      total_kg: num(row.total_kg),
      submissions: num(row.submissions),
      verified_count: num(row.verified_count),
    })),
    zonePerformance: zonePerformance.map((row) => ({
      zone_name: row.zone_name,
      total_kg: num(row.total_kg),
      submissions: num(row.submissions),
      verified_count: num(row.verified_count),
      rejected_count: num(row.rejected_count),
    })),
    quotaStatus: quotaStatus.map((row) => ({
      species: row.species,
      monthly_limit_kg: num(row.monthly_limit_kg),
      current_month_kg: num(row.current_month_kg),
      usage_pct: num(row.usage_pct),
    })),
    marketPrices: marketPrices.map((row) => ({
      species: row.species,
      kg_sold: num(row.kg_sold),
      revenue: num(row.revenue),
      avg_price: num(row.avg_price),
    })),
    recentCatches: recentCatches.map((row) => ({
      reference_id: row.reference_id,
      fisher_name: row.fisher_name,
      species: row.species,
      quantity_kg: num(row.quantity_kg),
      status: row.status,
      fishing_date: row.fishing_date,
      zone_name: row.zone_name,
    })),
  });
}

async function getLiveStats(req, res) {
  const { regionId } = await regionService.resolveRegionFilter(req);
  const today = new Date().toISOString().split('T')[0];
  const oneHourAgo = new Date(Date.now() - 3600000);

  const [catchKg, pending, ordersHour, revenue, boats, listingsKg, fishers, pendingKgTodayResult] =
    await Promise.all([
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
      prisma.$queryRaw`
      SELECT COALESCE(SUM(quantity_kg), 0) as total
      FROM catch_submissions cs
      WHERE fishing_date = ${today}::date AND status = 'PENDING' ${catchRegionSql(regionId)}
    `,
    ]);

  res.json({
    catchKgToday: num(catchKg[0]?.total),
    pendingCatches: num(pending[0]?.cnt),
    pendingKgToday: num(pendingKgTodayResult[0]?.total),
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

  const formattedTopSpecies = topSpecies.map((s) => ({
    species: s.species,
    kg_sold: num(s.kg_sold),
    revenue: num(s.revenue),
  }));

  res.json({
    revenueToday: num(revenue[0]?.total),
    ordersToday: num(orders[0]?.cnt),
    activeListingsKg: num(listings[0]?.total),
    topSpecies: formattedTopSpecies,
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

  const formattedBuyers = buyers.map((b) => ({
    ...b,
    order_count: num(b.order_count),
    total_kg: num(b.total_kg),
    total_spend: num(b.total_spend),
  }));

  res.json({ buyers: formattedBuyers });
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

  const formattedSellers = sellers.map((s) => ({
    ...s,
    verified_kg: num(s.verified_kg),
    listed_kg: num(s.listed_kg),
    revenue: num(s.revenue),
  }));

  res.json({ sellers: formattedSellers });
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

  // Combine both sets of species to ensure complete visibility even if no orders exist yet
  const speciesSet = new Set([
    ...fromOrders.map((r) => r.species),
    ...fromListings.map((r) => r.species),
  ]);

  const listingMap = Object.fromEntries(
    fromListings.map((r) => [r.species, num(r.avg_listing_price)]),
  );
  const orderMap = Object.fromEntries(fromOrders.map((r) => [r.species, r]));

  const data = Array.from(speciesSet).map((species) => {
    const oRow = orderMap[species];
    return {
      species,
      avg_order_price: oRow ? num(oRow.avg_order_price) : null,
      avg_listing_price: listingMap[species] ?? null,
      order_count: oRow ? num(oRow.order_count) : 0,
    };
  });

  res.json({ data });
}

async function getMarketShortages(req, res) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Safeguard against division by zero with monthly_limit_kg > 0
  const quotaShortages = await prisma.$queryRaw`
    SELECT species, monthly_limit_kg, current_month_kg,
           ROUND((current_month_kg * 100.0 / monthly_limit_kg)::numeric, 1) as usage_pct
    FROM species_quotas WHERE month = ${currentMonth} AND year = ${currentYear}
      AND monthly_limit_kg > 0
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

  const formattedQuotaShortages = quotaShortages.map((q) => ({
    ...q,
    monthly_limit_kg: num(q.monthly_limit_kg),
    current_month_kg: num(q.current_month_kg),
    usage_pct: num(q.usage_pct),
  }));

  const formattedStockLow = stockLow.map((s) => ({
    ...s,
    available_kg: num(s.available_kg),
    listing_count: num(s.listing_count),
  }));

  res.json({ quotaShortages: formattedQuotaShortages, stockLow: formattedStockLow });
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

  const formattedTransactions = transactions.map((t) => ({
    ...t,
    quantity_kg: num(t.quantity_kg),
    price_per_kg: num(t.price_per_kg),
    total_price: num(t.total_price),
  }));

  res.json({ transactions: formattedTransactions });
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

  const formattedEdges = edges.map((e) => ({
    ...e,
    quantity_kg: num(e.quantity_kg),
    total_price: num(e.total_price),
  }));

  res.json({ edges: formattedEdges });
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
    return res
      .status(400)
      .json({ error: 'zone_id, species, season_start, season_end, rule_type required' });
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
  const events = await prisma.domainEvent.findMany({
    orderBy: { id: 'desc' },
    take: limit,
  });

  res.json({
    events: events.map((e) => ({
      type: e.eventType,
      payload: JSON.parse(e.payloadJson || '{}'),
      timestamp: e.createdAt,
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
  getProfessionalReport: asyncHandler(getProfessionalReport),
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
  createUser: asyncHandler(createUser),
};

const ALLOWED_ROLES = ['admin', 'regional_admin', 'inspector', 'fisher', 'buyer'];

async function createUser(req, res) {
  const {
    name,
    email,
    password,
    role,
    phone,
    licenseNumber,
    location,
    boatName,
    registrationNumber,
    capacityKg,
  } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create main User record
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        phone,
      },
    });

    // 2. Create specific profile based on role
    if (role === 'fisher') {
      const fisher = await tx.fisher.create({
        data: {
          userId: user.id,
          licenseNumber: licenseNumber || `LIC-${Date.now().toString().slice(-6)}`,
          licenseStatus: 'ACTIVE',
          licenseExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1 year expiry
        },
      });

      // Also create a default boat for the fisher
      await tx.boat.create({
        data: {
          fisherId: fisher.id,
          boatName: boatName || `${name}'s Boat`,
          registrationNumber: registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
          capacityKg: Number(capacityKg) || 500,
        },
      });
    } else if (role === 'buyer') {
      await tx.buyer.create({
        data: {
          userId: user.id,
          location: location || 'Bahir Dar',
        },
      });
    }

    return user;
  });

  auditFromReq(req, 'user.created', 'user', result.id, { email, role });

  res.status(201).json({
    success: true,
    message: `User created successfully with role ${role}.`,
    user: {
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      phone: result.phone,
    },
  });
}
