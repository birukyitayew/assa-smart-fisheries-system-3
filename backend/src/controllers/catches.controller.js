const { validationResult } = require('express-validator');
const { getDb } = require('../database/db');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const geoService = require('../services/geo.service');

// GET /api/zones
function getZones(req, res) {
  const db = getDb();
  const zones = db.prepare('SELECT * FROM fishing_zones ORDER BY type, name').all();
  res.json({ zones });
}

// GET /api/fisher/profile
function getProfile(req, res) {
  const db = getDb();
  const profile = db.prepare(`
    SELECT f.*, u.name, u.email, u.phone,
           fz.name as zone_name, fz.type as zone_type,
           b.boat_name, b.registration_number, b.capacity_kg
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE f.user_id = ?
  `).get(req.user.id);

  if (!profile) return res.status(404).json({ error: 'Fisher profile not found' });

  const today = new Date().toISOString().split('T')[0];
  const fleetService = require('../services/fleet.service');
  const fishingTripsToday = fleetService.countTripsToday(db, profile.id);

  const todaySummary = db.prepare(`
    SELECT
      COUNT(*) as catches_today,
      COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN quantity_kg ELSE 0 END), 0) as verified_kg,
      COALESCE(SUM(quantity_kg), 0) as total_kg
    FROM catch_submissions
    WHERE fisher_id = ? AND fishing_date = ?
  `).get(profile.id, today);

  todaySummary.fishing_trips_today = fishingTripsToday;
  todaySummary.trips_today = fishingTripsToday;

  const activeTrip = fleetService.getActiveTripForFisher(db, profile.id);

  const complianceService = require('../services/compliance.service');
  const compliance = complianceService.getCompliance(db, profile.id);
  const openViolations = db.prepare(`
    SELECT reference_id, type, severity, description, status, fine_amount, created_at
    FROM violations WHERE fisher_id = ? AND status IN ('OPEN','UNDER_REVIEW')
    ORDER BY created_at DESC LIMIT 5
  `).all(profile.id);

  res.json({ profile, todaySummary, compliance, openViolations, activeTrip: activeTrip || null });
}

function startTrip(req, res) {
  const db = getDb();
  const fisher = db.prepare('SELECT id, license_status FROM fishers WHERE user_id = ?').get(req.user.id);
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });
  if (fisher.license_status !== 'VALID') {
    return res.status(403).json({ error: 'Valid license required to start a trip' });
  }

  const fleetService = require('../services/fleet.service');
  const result = fleetService.startTrip(db, fisher.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ trip: result.trip, boat: result.boat });
}

function endTrip(req, res) {
  const db = getDb();
  const fisher = db.prepare('SELECT id FROM fishers WHERE user_id = ?').get(req.user.id);
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const fleetService = require('../services/fleet.service');
  const result = fleetService.endTrip(db, fisher.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ trip: result.trip });
}

function getActiveTrip(req, res) {
  const db = getDb();
  const fisher = db.prepare('SELECT id FROM fishers WHERE user_id = ?').get(req.user.id);
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const fleetService = require('../services/fleet.service');
  const trip = fleetService.getActiveTripForFisher(db, fisher.id);
  res.json({ trip: trip || null });
}

// GET /api/fisher/catches
function getCatches(req, res) {
  const db = getDb();
  const fisher = db.prepare('SELECT id FROM fishers WHERE user_id = ?').get(req.user.id);
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const catches = db.prepare(`
    SELECT cs.*, fz.name as zone_name, fz.type as zone_type,
           u.name as reviewed_by_name
    FROM catch_submissions cs
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    LEFT JOIN users u ON cs.reviewed_by = u.id
    WHERE cs.fisher_id = ?
    ORDER BY cs.submitted_at DESC
  `).all(fisher.id);

  res.json({ catches });
}

// GET /api/fisher/catches/:id
function getCatch(req, res) {
  const db = getDb();
  const fisher = db.prepare('SELECT id FROM fishers WHERE user_id = ?').get(req.user.id);
  const catchRow = db.prepare(`
    SELECT cs.*, fz.name as zone_name, fz.type as zone_type
    FROM catch_submissions cs
    LEFT JOIN fishing_zones fz ON cs.zone_id = fz.id
    WHERE cs.id = ? AND cs.fisher_id = ?
  `).get(req.params.id, fisher.id);

  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });
  res.json({ catch: catchRow });
}

// POST /api/catches
function submitCatch(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const db = getDb();

  const fisher = db.prepare(`
    SELECT f.*, u.name FROM fishers f JOIN users u ON f.user_id = u.id WHERE f.user_id = ?
  `).get(req.user.id);

  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });
  if (fisher.license_status !== 'VALID') {
    return res.status(403).json({ error: 'Your license is not valid. You cannot submit catches.' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (req.body.fishing_date > today) {
    return res.status(400).json({ error: 'Fishing date cannot be in the future' });
  }

  const zone = db.prepare('SELECT * FROM fishing_zones WHERE id = ?').get(req.body.zone_id);
  if (!zone) return res.status(400).json({ error: 'Invalid fishing zone' });

  const dateStr = req.body.fishing_date;
  const countToday = db.prepare(
    'SELECT COUNT(*) as cnt FROM catch_submissions WHERE fishing_date = ?'
  ).get(dateStr);
  const seqNum = String(countToday.cnt + 1).padStart(4, '0');
  const referenceId = `CATCH-${dateStr}-${seqNum}`;

  const gpsLat = req.body.gps_lat != null ? Number(req.body.gps_lat) : zone.gps_lat;
  const gpsLng = req.body.gps_lng != null ? Number(req.body.gps_lng) : zone.gps_lng;
  const geo = geoService.validateCatchLocation(zone, gpsLat, gpsLng);
  const zoneFlag = geo.zone_flag;

  const photoUrls = req.body.photo_urls || [];

  const result = db.prepare(`
    INSERT INTO catch_submissions
      (reference_id, fisher_id, species, quantity_kg, number_of_fish, fishing_gear,
       fishing_date, fishing_time, zone_id, gps_lat, gps_lng, photo_urls, zone_flag, status, submitted_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'))
  `).run(
    referenceId, fisher.id, req.body.species, req.body.quantity_kg,
    req.body.number_of_fish || null, req.body.fishing_gear,
    req.body.fishing_date, req.body.fishing_time,
    req.body.zone_id, gpsLat, gpsLng,
    JSON.stringify(photoUrls), zoneFlag
  );

  if (geo.flags.includes('GPS_MISMATCH')) {
    db.prepare(`
      INSERT INTO alerts (type, title, message, severity, related_entity_type, related_entity_id)
      VALUES ('GPS_MISMATCH', 'GPS Location Mismatch',
              'Fisher ' || ? || ' catch GPS is far from selected zone ' || ? || ' (distance ~' || ? || ' km).',
              'WARNING', 'catch', ?)
    `).run(fisher.name, zone.name, Math.round(geo.distance_km || 0), result.lastInsertRowid);
  }

  if (zoneFlag === 'RESTRICTED_ZONE') {
    db.prepare(`
      INSERT INTO alerts (type, title, message, severity, related_entity_type, related_entity_id)
      VALUES ('ZONE_RESTRICTION', 'Restricted Zone Activity',
              'Fisher ' || ? || ' submitted a catch from ' || ? || ', a restricted zone. Review required.',
              'WARNING', 'catch', ?)
    `).run(fisher.name, zone.name, result.lastInsertRowid);
  }
  if (zoneFlag === 'PROHIBITED_ZONE') {
    db.prepare(`
      INSERT INTO alerts (type, title, message, severity, related_entity_type, related_entity_id)
      VALUES ('ZONE_VIOLATION', 'Prohibited Zone Catch Detected',
              'Fisher ' || ? || ' submitted a catch from ' || ? || ' (Prohibited Zone). Immediate review required.',
              'CRITICAL', 'catch', ?)
    `).run(fisher.name, zone.name, result.lastInsertRowid);
  }

  const catchId = result.lastInsertRowid;
  auditFromReq(req, 'catch.submitted', 'catch', catchId, {
    reference_id: referenceId,
    species: req.body.species,
    quantity_kg: req.body.quantity_kg,
    fisher_id: fisher.id,
  });

  eventBus.emit('catch.submitted', {
    id: catchId,
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
    id: catchId,
    reference_id: referenceId,
    status: 'PENDING',
    submitted_at: new Date().toISOString(),
    zone_flag: zoneFlag,
  });
}

// GET /api/notifications
function getNotifications(req, res) {
  const db = getDb();
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  const unreadCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ notifications, unreadCount: unreadCount.cnt });
}

// PUT /api/notifications/:id/read
function markNotificationRead(req, res) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ success: true });
}

// PUT /api/notifications/read-all
function markAllNotificationsRead(req, res) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
}

module.exports = {
  getZones,
  getProfile,
  getCatches,
  getCatch,
  submitCatch,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  startTrip,
  endTrip,
  getActiveTrip,
};
