const { validationResult } = require('express-validator');
const { prisma } = require('../database/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const geoService = require('../services/geo.service');
const fleetService = require('../services/fleet.service');
const complianceService = require('../services/compliance.service');

async function getZones(req, res) {
  const zones = await prisma.$queryRaw`
    SELECT * FROM fishing_zones ORDER BY type, name
  `;
  res.json({ zones });
}

async function getProfile(req, res) {
  const rows = await prisma.$queryRaw`
    SELECT f.*, u.name, u.email, u.phone,
           fz.name as zone_name, fz.type as zone_type,
           b.boat_name, b.registration_number, b.capacity_kg
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE f.user_id = ${req.user.id}
  `;
  const profile = rows[0];
  if (!profile) return res.status(404).json({ error: 'Fisher profile not found' });

  const today = new Date().toISOString().split('T')[0];
  const fishingTripsToday = await fleetService.countTripsToday(profile.id);

  const summaryRows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int as catches_today,
      COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN quantity_kg ELSE 0 END), 0) as verified_kg,
      COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions
    WHERE fisher_id = ${profile.id} AND fishing_date = ${today}::date
  `;
  const todaySummary = summaryRows[0] || { catches_today: 0, verified_kg: 0, total_kg: 0 };
  todaySummary.fishing_trips_today = fishingTripsToday;
  todaySummary.trips_today = fishingTripsToday;

  const activeTrip = await fleetService.getActiveTripForFisher(profile.id);
  const compliance = await complianceService.getCompliance(profile.id);
  const openViolations = await prisma.$queryRaw`
    SELECT reference_id, type, severity, description, status, fine_amount, created_at
    FROM violations WHERE fisher_id = ${profile.id} AND status IN ('OPEN','UNDER_REVIEW')
    ORDER BY created_at DESC LIMIT 5
  `;

  res.json({ profile, todaySummary, compliance, openViolations, activeTrip: activeTrip || null });
}

async function startTrip(req, res) {
  const fisherRows = await prisma.$queryRaw`
    SELECT id, license_status FROM fishers WHERE user_id = ${req.user.id}
  `;
  const fisher = fisherRows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });
  if (fisher.license_status !== 'VALID') {
    return res.status(403).json({ error: 'Valid license required to start a trip' });
  }

  const result = await fleetService.startTrip(fisher.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ trip: result.trip, boat: result.boat });
}

async function endTrip(req, res) {
  const fisherRows = await prisma.$queryRaw`
    SELECT id FROM fishers WHERE user_id = ${req.user.id}
  `;
  const fisher = fisherRows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const result = await fleetService.endTrip(fisher.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ trip: result.trip });
}

async function getActiveTrip(req, res) {
  const fisherRows = await prisma.$queryRaw`
    SELECT id FROM fishers WHERE user_id = ${req.user.id}
  `;
  const fisher = fisherRows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const trip = await fleetService.getActiveTripForFisher(fisher.id);
  res.json({ trip: trip || null });
}

async function getCatches(req, res) {
  const fisherRows = await prisma.$queryRaw`
    SELECT id FROM fishers WHERE user_id = ${req.user.id}
  `;
  const fisher = fisherRows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const catches = await prisma.$queryRaw`
    SELECT cs.*, fz.name as zone_name, fz.type as zone_type,
           u.name as reviewed_by_name
    FROM catch_submissions cs
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    LEFT JOIN users u ON cs.reviewed_by = u.id
    WHERE cs.fisher_id = ${fisher.id}
    ORDER BY cs.submitted_at DESC
  `;

  res.json({ catches });
}

async function getCatch(req, res) {
  const fisherRows = await prisma.$queryRaw`
    SELECT id FROM fishers WHERE user_id = ${req.user.id}
  `;
  const fisher = fisherRows[0];
  const rows = await prisma.$queryRaw`
    SELECT cs.*, fz.name as zone_name, fz.type as zone_type
    FROM catch_submissions cs
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE cs.id = ${Number(req.params.id)} AND cs.fisher_id = ${fisher?.id ?? -1}
  `;
  const catchRow = rows[0];
  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });
  res.json({ catch: catchRow });
}

async function submitCatch(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const fisherRows = await prisma.$queryRaw`
    SELECT f.*, u.name FROM fishers f JOIN users u ON f.user_id = u.id WHERE f.user_id = ${req.user.id}
  `;
  const fisher = fisherRows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });
  if (fisher.license_status !== 'VALID') {
    return res.status(403).json({ error: 'Your license is not valid. You cannot submit catches.' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (req.body.fishing_date > today) {
    return res.status(400).json({ error: 'Fishing date cannot be in the future' });
  }

  const zoneRows = await prisma.$queryRaw`
    SELECT * FROM fishing_zones WHERE id = ${req.body.zone_id}
  `;
  const zone = zoneRows[0];
  if (!zone) return res.status(400).json({ error: 'Invalid fishing zone' });

  const dateStr = req.body.fishing_date;
  const countRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM catch_submissions WHERE fishing_date = ${dateStr}::date
  `;
  const seqNum = String(Number(countRows[0]?.cnt ?? 0) + 1).padStart(4, '0');
  const referenceId = `CATCH-${dateStr}-${seqNum}`;

  const gpsLat = req.body.gps_lat != null ? Number(req.body.gps_lat) : zone.gps_lat;
  const gpsLng = req.body.gps_lng != null ? Number(req.body.gps_lng) : zone.gps_lng;
  const geo = geoService.validateCatchLocation(zone, gpsLat, gpsLng);
  const zoneFlag = geo.zone_flag;
  const photoUrls = req.body.photo_urls || [];

  const created = await prisma.catchSubmission.create({
    data: {
      referenceId,
      fisherId: fisher.id,
      species: req.body.species,
      quantityKg: req.body.quantity_kg,
      numberOfFish: req.body.number_of_fish || null,
      fishingGear: req.body.fishing_gear,
      fishingDate: new Date(`${dateStr}T00:00:00.000Z`),
      fishingTime: req.body.fishing_time,
      zoneId: req.body.zone_id,
      gpsLat,
      gpsLng,
      photoUrls: JSON.stringify(photoUrls),
      zoneFlag,
      status: 'PENDING',
    },
  });

  if (geo.flags.includes('GPS_MISMATCH')) {
    await prisma.alert.create({
      data: {
        type: 'GPS_MISMATCH',
        title: 'GPS Location Mismatch',
        message: `Fisher ${fisher.name} catch GPS is far from selected zone ${zone.name} (distance ~${Math.round(geo.distance_km || 0)} km).`,
        severity: 'WARNING',
        relatedEntityType: 'catch',
        relatedEntityId: created.id,
      },
    });
  }

  if (zoneFlag === 'RESTRICTED_ZONE') {
    await prisma.alert.create({
      data: {
        type: 'ZONE_RESTRICTION',
        title: 'Restricted Zone Activity',
        message: `Fisher ${fisher.name} submitted a catch from ${zone.name}, a restricted zone. Review required.`,
        severity: 'WARNING',
        relatedEntityType: 'catch',
        relatedEntityId: created.id,
      },
    });
  }
  if (zoneFlag === 'PROHIBITED_ZONE') {
    await prisma.alert.create({
      data: {
        type: 'ZONE_VIOLATION',
        title: 'Prohibited Zone Catch Detected',
        message: `Fisher ${fisher.name} submitted a catch from ${zone.name} (Prohibited Zone). Immediate review required.`,
        severity: 'CRITICAL',
        relatedEntityType: 'catch',
        relatedEntityId: created.id,
      },
    });
  }

  auditFromReq(req, 'catch.submitted', 'catch', created.id, {
    reference_id: referenceId,
    species: req.body.species,
    quantity_kg: req.body.quantity_kg,
    fisher_id: fisher.id,
  });

  eventBus.emit('catch.submitted', {
    id: created.id,
    reference_id: referenceId,
    fisher_id: fisher.id,
    fisher_name: fisher.name,
    species: req.body.species,
    quantity_kg: req.body.quantity_kg,
    zone_name: zone.name,
    zone_flag: zoneFlag,
    status: 'PENDING',
  });

  res.status(201).json({
    success: true,
    id: created.id,
    reference_id: referenceId,
    status: 'PENDING',
    submitted_at: created.submittedAt.toISOString(),
    zone_flag: zoneFlag,
  });
}

async function getNotifications(req, res) {
  const notifications = await prisma.$queryRaw`
    SELECT * FROM notifications WHERE user_id = ${req.user.id} ORDER BY created_at DESC LIMIT 50
  `;
  const unreadRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM notifications WHERE user_id = ${req.user.id} AND is_read = false
  `;
  res.json({ notifications, unreadCount: Number(unreadRows[0]?.cnt ?? 0) });
}

async function markNotificationRead(req, res) {
  await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
}

async function markAllNotificationsRead(req, res) {
  await prisma.notification.updateMany({
    where: { userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
}

module.exports = {
  getZones: asyncHandler(getZones),
  getProfile: asyncHandler(getProfile),
  getCatches: asyncHandler(getCatches),
  getCatch: asyncHandler(getCatch),
  submitCatch: asyncHandler(submitCatch),
  getNotifications: asyncHandler(getNotifications),
  markNotificationRead: asyncHandler(markNotificationRead),
  markAllNotificationsRead: asyncHandler(markAllNotificationsRead),
  startTrip: asyncHandler(startTrip),
  endTrip: asyncHandler(endTrip),
  getActiveTrip: asyncHandler(getActiveTrip),
};
