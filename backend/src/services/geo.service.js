/**
 * Geospatial helpers — distance checks for zone validation (MVP; GeoJSON in Phase 3).
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Max distance (km) device GPS may be from zone center while still considered in-zone */
const ZONE_MATCH_RADIUS_KM = 25;

function pointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return null;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function parsePolygon(zone) {
  if (!zone?.geo_polygon) return null;
  try {
    return JSON.parse(zone.geo_polygon);
  } catch {
    return null;
  }
}

function validateCatchLocation(zone, gpsLat, gpsLng) {
  const flags = [];
  if (zone.type === 'RESTRICTED') flags.push('RESTRICTED_ZONE');
  if (zone.type === 'PROHIBITED') flags.push('PROHIBITED_ZONE');

  if (gpsLat != null && gpsLng != null) {
    const polygon = parsePolygon(zone);
    if (polygon) {
      const insideSelected = pointInPolygon(gpsLat, gpsLng, polygon);
      if (insideSelected === false) {
        flags.push('GPS_MISMATCH');
      }
    } else if (zone.gps_lat != null && zone.gps_lng != null) {
      const dist = haversineKm(gpsLat, gpsLng, zone.gps_lat, zone.gps_lng);
      if (dist > ZONE_MATCH_RADIUS_KM) {
        flags.push('GPS_MISMATCH');
      }
    }
  }

  return {
    zone_flag: flags.find((f) => f !== 'GPS_MISMATCH') || flags[0] || null,
    flags,
    distance_km:
      gpsLat != null && zone.gps_lat != null
        ? haversineKm(gpsLat, gpsLng, zone.gps_lat, zone.gps_lng)
        : null,
  };
}

module.exports = {
  haversineKm,
  validateCatchLocation,
  ZONE_MATCH_RADIUS_KM,
  pointInPolygon,
  parsePolygon,
};

