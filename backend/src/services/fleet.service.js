/**
 * Boat trips and fleet position tracking.
 */
const eventBus = require('./eventBus');

function getBoatForFisher(db, fisherId) {
  return db.prepare('SELECT * FROM boats WHERE fisher_id = ? LIMIT 1').get(fisherId);
}

function getActiveTripForFisher(db, fisherId) {
  return db.prepare(`
    SELECT t.*, b.boat_name, b.registration_number
    FROM boat_trips t
    JOIN boats b ON b.id = t.boat_id
    WHERE t.fisher_id = ? AND t.status = 'ACTIVE'
    ORDER BY t.started_at DESC LIMIT 1
  `).get(fisherId);
}

function getActiveTripForBoat(db, boatId) {
  return db.prepare(`
    SELECT * FROM boat_trips WHERE boat_id = ? AND status = 'ACTIVE' LIMIT 1
  `).get(boatId);
}

function startTrip(db, fisherId) {
  const boat = getBoatForFisher(db, fisherId);
  if (!boat) return { error: 'No registered boat found', status: 400 };

  const existing = getActiveTripForBoat(db, boat.id);
  if (existing) {
    return { error: 'This boat already has an active trip', status: 409 };
  }

  const fisherTrip = getActiveTripForFisher(db, fisherId);
  if (fisherTrip) {
    return { error: 'You already have an active fishing trip', status: 409 };
  }

  const zone = db.prepare(`
    SELECT fz.gps_lat, fz.gps_lng FROM fishers f
    LEFT JOIN fishing_zones fz ON f.zone_id = fz.id
    WHERE f.id = ?
  `).get(fisherId);

  const lat = zone?.gps_lat ?? 11.75;
  const lng = zone?.gps_lng ?? 37.35;

  const result = db.prepare(`
    INSERT INTO boat_trips (boat_id, fisher_id, status, started_at)
    VALUES (?, ?, 'ACTIVE', datetime('now'))
  `).run(boat.id, fisherId);

  const tripId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO boat_positions (boat_id, trip_id, lat, lng, status, recorded_at)
    VALUES (?, ?, ?, ?, 'FISHING', datetime('now'))
  `).run(boat.id, tripId, lat, lng);

  const trip = db.prepare('SELECT * FROM boat_trips WHERE id = ?').get(tripId);
  const fisher = db.prepare(`
    SELECT u.name FROM fishers f JOIN users u ON f.user_id = u.id WHERE f.id = ?
  `).get(fisherId);

  eventBus.emit('boat.trip.started', {
    trip_id: tripId,
    boat_id: boat.id,
    boat_name: boat.boat_name,
    fisher_id: fisherId,
    fisher_name: fisher?.name,
  });

  return { trip, boat };
}

function endTrip(db, fisherId) {
  const trip = getActiveTripForFisher(db, fisherId);
  if (!trip) return { error: 'No active trip to end', status: 404 };

  db.prepare(`
    UPDATE boat_trips SET status = 'COMPLETED', ended_at = datetime('now') WHERE id = ?
  `).run(trip.id);

  db.prepare(`
    INSERT INTO boat_positions (boat_id, trip_id, lat, lng, status, recorded_at)
    SELECT boat_id, ?, lat, lng, 'DOCKED', datetime('now')
    FROM boat_positions WHERE boat_id = ? ORDER BY recorded_at DESC LIMIT 1
  `).run(trip.id, trip.boat_id);

  eventBus.emit('boat.trip.ended', {
    trip_id: trip.id,
    boat_id: trip.boat_id,
    fisher_id: fisherId,
  });

  return { trip: db.prepare('SELECT * FROM boat_trips WHERE id = ?').get(trip.id) };
}

function getFleetList(db) {
  return db.prepare(`
    SELECT b.id as boat_id, b.boat_name, b.registration_number,
           f.id as fisher_id, u.name as fisher_name,
           t.id as trip_id, t.status as trip_status, t.started_at as trip_started_at,
           bp.lat, bp.lng, bp.status as position_status, bp.recorded_at
    FROM boats b
    JOIN fishers f ON b.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boat_trips t ON t.id = (
      SELECT id FROM boat_trips WHERE boat_id = b.id AND status = 'ACTIVE' LIMIT 1
    )
    LEFT JOIN boat_positions bp ON bp.id = (
      SELECT id FROM boat_positions WHERE boat_id = b.id ORDER BY recorded_at DESC LIMIT 1
    )
    ORDER BY b.boat_name
  `).all();
}

function getBoatHistory(db, boatId, hours = 24) {
  return db.prepare(`
    SELECT lat, lng, status, recorded_at, trip_id
    FROM boat_positions
    WHERE boat_id = ?
      AND recorded_at >= datetime('now', '-' || ? || ' hours')
    ORDER BY recorded_at ASC
  `).all(boatId, hours);
}

function countTripsToday(db, fisherId) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT COUNT(*) as cnt FROM boat_trips
    WHERE fisher_id = ? AND date(started_at) = ?
  `).get(fisherId, today).cnt;
}

module.exports = {
  startTrip,
  endTrip,
  getActiveTripForFisher,
  getFleetList,
  getBoatHistory,
  countTripsToday,
  getBoatForFisher,
};
