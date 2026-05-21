/**
 * Market snapshots and intelligence aggregations.
 */
const { getDb } = require('../database/db');

function buildDailySnapshot(db, dateStr) {
  const speciesList = db.prepare(`
    SELECT DISTINCT species FROM marketplace_listings
    UNION SELECT DISTINCT species FROM orders o
    JOIN marketplace_listings ml ON o.listing_id = ml.id
  `).all();

  const upsert = db.prepare(`
    INSERT INTO market_snapshots (snapshot_date, species, total_listed_kg, total_sold_kg, avg_price, order_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(snapshot_date, species) DO UPDATE SET
      total_listed_kg = excluded.total_listed_kg,
      total_sold_kg = excluded.total_sold_kg,
      avg_price = excluded.avg_price,
      order_count = excluded.order_count
  `);

  speciesList.forEach(({ species }) => {
    const listed = db.prepare(`
      SELECT COALESCE(SUM(quantity_available_kg), 0) as kg
      FROM marketplace_listings
      WHERE species = ? AND status = 'ACTIVE' AND date(listed_at) <= ?
    `).get(species, dateStr);

    const sold = db.prepare(`
      SELECT COALESCE(SUM(o.quantity_kg), 0) as kg,
             COALESCE(AVG(o.price_per_kg), 0) as avg_price,
             COUNT(*) as order_count
      FROM orders o
      JOIN marketplace_listings ml ON o.listing_id = ml.id
      WHERE ml.species = ? AND date(o.ordered_at) = ? AND o.status != 'CANCELLED'
    `).get(species, dateStr);

    upsert.run(
      dateStr,
      species,
      listed?.kg ?? 0,
      sold?.kg ?? 0,
      sold?.avg_price ?? null,
      sold?.order_count ?? 0,
    );
  });
}

function refreshSnapshots(db, days = 14) {
  for (let d = 0; d < days; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().split('T')[0];
    buildDailySnapshot(db, date);
  }
}

function getIntelligenceOverview(db) {
  const snapshots = db.prepare(`
    SELECT snapshot_date, species, total_listed_kg, total_sold_kg, avg_price, order_count
    FROM market_snapshots
    WHERE snapshot_date >= date('now', '-14 days')
    ORDER BY snapshot_date ASC, species
  `).all();

  const priceTrends = db.prepare(`
    SELECT species, date(recorded_at) as date, AVG(price_per_kg) as avg_price
    FROM price_history
    WHERE recorded_at >= datetime('now', '-7 days')
    GROUP BY species, date(recorded_at)
    ORDER BY date ASC
  `).all();

  const speciesSold7d = db.prepare(`
    SELECT species, SUM(total_sold_kg) as kg_sold
    FROM market_snapshots
    WHERE snapshot_date >= date('now', '-7 days')
    GROUP BY species
    ORDER BY kg_sold DESC
  `).all();

  const quotas = db.prepare(`
    SELECT species, monthly_limit_kg, current_month_kg,
           ROUND(current_month_kg * 100.0 / monthly_limit_kg, 1) as usage_pct
    FROM species_quotas
    WHERE month = CAST(strftime('%m', 'now') AS INTEGER)
      AND year = CAST(strftime('%Y', 'now') AS INTEGER)
  `).all();

  const quotaShortages = quotas.filter((q) => q.usage_pct >= 85);
  const stockLow = db.prepare(`
    SELECT species, SUM(quantity_available_kg) as available_kg
    FROM marketplace_listings WHERE status = 'ACTIVE'
    GROUP BY species HAVING available_kg < 10
  `).all();

  const avgPriceDelta = db.prepare(`
    SELECT
      (SELECT AVG(price_per_kg) FROM price_history WHERE recorded_at >= datetime('now', '-7 days')) as recent,
      (SELECT AVG(price_per_kg) FROM price_history
       WHERE recorded_at >= datetime('now', '-14 days') AND recorded_at < datetime('now', '-7 days')) as prior
  `).get();

  let priceDeltaPct = null;
  if (avgPriceDelta?.prior > 0 && avgPriceDelta?.recent) {
    priceDeltaPct = Math.round(((avgPriceDelta.recent - avgPriceDelta.prior) / avgPriceDelta.prior) * 100);
  }

  return {
    snapshots,
    priceTrends,
    speciesSold7d,
    quotaShortages,
    stockLow,
    priceDeltaPct,
    totalSoldKg7d: speciesSold7d.reduce((s, r) => s + (r.kg_sold || 0), 0),
    speciesCount: speciesSold7d.length,
  };
}

function getShortageFlagsForSpecies(db, species) {
  const quota = db.prepare(`
    SELECT ROUND(current_month_kg * 100.0 / monthly_limit_kg, 1) as usage_pct
    FROM species_quotas
    WHERE species = ? AND month = CAST(strftime('%m', 'now') AS INTEGER)
      AND year = CAST(strftime('%Y', 'now') AS INTEGER)
  `).get(species);

  const stock = db.prepare(`
    SELECT COALESCE(SUM(quantity_available_kg), 0) as kg
    FROM marketplace_listings WHERE species = ? AND status = 'ACTIVE'
  `).get(species);

  const flags = [];
  if (quota?.usage_pct >= 85) flags.push('quota');
  if ((stock?.kg ?? 0) < 10) flags.push('low_stock');
  return flags;
}

module.exports = {
  buildDailySnapshot,
  refreshSnapshots,
  getIntelligenceOverview,
  getShortageFlagsForSpecies,
};
