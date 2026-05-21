/**
 * Record market price observations for intelligence charts.
 */

function recordPrice(db, { species, zoneId = null, pricePerKg, source }) {
  if (!species || pricePerKg == null) return;
  db.prepare(`
    INSERT INTO price_history (species, zone_id, price_per_kg, source, recorded_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(species, zoneId, pricePerKg, source);
}

function getPriceSeries(db, species, days = 7) {
  return db.prepare(`
    SELECT date(recorded_at) as date, AVG(price_per_kg) as avg_price, source
    FROM price_history
    WHERE species = ? AND recorded_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(recorded_at), source
    ORDER BY date ASC
  `).all(species, days);
}

function getSpeciesPriceTrend(db, species, days = 7) {
  return db.prepare(`
    SELECT date(recorded_at) as date, AVG(price_per_kg) as price
    FROM price_history
    WHERE species = ? AND recorded_at >= datetime('now', '-' || ? || ' days')
    GROUP BY date(recorded_at)
    ORDER BY date ASC
  `).all(species, days);
}

function getListingPriceHistory(db, species, days = 7) {
  return db.prepare(`
    SELECT recorded_at, price_per_kg
    FROM price_history
    WHERE species = ? AND source IN ('listing', 'order')
      AND recorded_at >= datetime('now', '-' || ? || ' days')
    ORDER BY recorded_at ASC
  `).all(species, days);
}

module.exports = {
  recordPrice,
  getPriceSeries,
  getSpeciesPriceTrend,
  getListingPriceHistory,
};
