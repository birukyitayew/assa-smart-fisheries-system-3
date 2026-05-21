/**
 * Quota Service
 * Updates species quota after a catch is approved and creates alerts at thresholds.
 */

const eventBus = require('./eventBus');

function checkQuotaBeforeApprove(db, species, quantityKg) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const quota = db.prepare(`
    SELECT * FROM species_quotas WHERE species = ? AND month = ? AND year = ?
  `).get(species, currentMonth, currentYear);
  if (!quota) return { allowed: true };
  const projected = quota.current_month_kg + quantityKg;
  if (projected > quota.monthly_limit_kg) {
    return {
      allowed: false,
      message: `Approving this catch would exceed the monthly ${species} quota (${Math.round(projected)} / ${quota.monthly_limit_kg} kg).`,
      quota,
    };
  }
  return { allowed: true, quota };
}

function updateQuota(db, species, quantityKg) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  // Upsert quota row
  const existing = db.prepare(`
    SELECT * FROM species_quotas WHERE species = ? AND month = ? AND year = ?
  `).get(species, currentMonth, currentYear);

  if (!existing) {
    // Create with default limit if not seeded
    const defaults = {
      Tilapia: 5000, Catfish: 2000, 'Nile Perch': 2000, Carp: 1500, 'Barbus (Ganfo)': 1000,
    };
    db.prepare(`
      INSERT INTO species_quotas (species, monthly_limit_kg, current_month_kg, month, year)
      VALUES (?, ?, ?, ?, ?)
    `).run(species, defaults[species] || 2000, quantityKg, currentMonth, currentYear);
  } else {
    db.prepare(`
      UPDATE species_quotas
      SET current_month_kg = current_month_kg + ?, updated_at = datetime('now')
      WHERE species = ? AND month = ? AND year = ?
    `).run(quantityKg, species, currentMonth, currentYear);
  }

  // Re-fetch to check thresholds
  const quota = db.prepare(`
    SELECT * FROM species_quotas WHERE species = ? AND month = ? AND year = ?
  `).get(species, currentMonth, currentYear);

  if (!quota) return;

  const pct = (quota.current_month_kg / quota.monthly_limit_kg) * 100;

  // Check if a warning alert already exists for this species/month
  const existingAlert = db.prepare(`
    SELECT id FROM alerts
    WHERE type IN ('QUOTA_WARNING', 'QUOTA_EXCEEDED')
      AND related_entity_type = 'quota'
      AND related_entity_id = ?
      AND strftime('%m', created_at) = ?
      AND strftime('%Y', created_at) = ?
  `).get(quota.id, String(currentMonth).padStart(2, '0'), String(currentYear));

  if (pct >= 100 && !existingAlert) {
    db.prepare(`
      INSERT INTO alerts (type, title, message, severity, related_entity_type, related_entity_id)
      VALUES ('QUOTA_EXCEEDED', ?, ?, 'CRITICAL', 'quota', ?)
    `).run(
      `${species} Quota Exceeded`,
      `Monthly ${species} quota has been exceeded (${Math.round(quota.current_month_kg)} / ${quota.monthly_limit_kg} kg). No further catches should be approved.`,
      quota.id
    );
  } else if (pct >= 90 && !existingAlert) {
    db.prepare(`
      INSERT INTO alerts (type, title, message, severity, related_entity_type, related_entity_id)
      VALUES ('QUOTA_WARNING', ?, ?, 'WARNING', 'quota', ?)
    `).run(
      `${species} Quota at ${Math.round(pct)}%`,
      `Monthly ${species} quota has reached ${Math.round(pct)}% (${Math.round(quota.current_month_kg)} / ${quota.monthly_limit_kg} kg). Monitor closely.`,
      quota.id
    );
    eventBus.emit('quota.warning', {
      species,
      usage_pct: Math.round(pct),
      current_month_kg: quota.current_month_kg,
      monthly_limit_kg: quota.monthly_limit_kg,
      quota_id: quota.id,
    });
  }
}

module.exports = { updateQuota, checkQuotaBeforeApprove };
