/**
 * Fisher compliance score — recalculated when violations change.
 */

const SEVERITY_PENALTY = { LOW: 5, MEDIUM: 10, HIGH: 20, CRITICAL: 35 };

function recalculateCompliance(db, fisherId) {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status IN ('OPEN','UNDER_REVIEW') THEN 1 ELSE 0 END), 0) as open_cnt,
      MAX(created_at) as last_at
    FROM violations WHERE fisher_id = ?
  `).get(fisherId);

  const penalties = db.prepare(`
    SELECT severity FROM violations WHERE fisher_id = ? AND status != 'DISMISSED'
  `).all(fisherId);

  let score = 100;
  penalties.forEach((v) => {
    score -= SEVERITY_PENALTY[v.severity] || 10;
  });
  score = Math.max(0, Math.min(100, score));

  const existing = db.prepare('SELECT fisher_id FROM fisher_compliance WHERE fisher_id = ?').get(fisherId);
  if (existing) {
    db.prepare(`
      UPDATE fisher_compliance
      SET score = ?, violations_count = ?, open_violations = ?,
          last_violation_at = ?, updated_at = datetime('now')
      WHERE fisher_id = ?
    `).run(score, stats.total, stats.open_cnt, stats.last_at, fisherId);
  } else {
    db.prepare(`
      INSERT INTO fisher_compliance (fisher_id, score, violations_count, open_violations, last_violation_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(fisherId, score, stats.total, stats.open_cnt, stats.last_at);
  }

  if (score < 50 && stats.open_cnt > 0) {
    const fisher = db.prepare('SELECT license_status FROM fishers WHERE id = ?').get(fisherId);
    if (fisher && fisher.license_status === 'VALID') {
      db.prepare(`UPDATE fishers SET license_status = 'SUSPENDED' WHERE id = ?`).run(fisherId);
    }
  }

  return { score, violations_count: stats.total, open_violations: stats.open_cnt };
}

function getCompliance(db, fisherId) {
  let row = db.prepare('SELECT * FROM fisher_compliance WHERE fisher_id = ?').get(fisherId);
  if (!row) {
    recalculateCompliance(db, fisherId);
    row = db.prepare('SELECT * FROM fisher_compliance WHERE fisher_id = ?').get(fisherId);
  }
  return row || { fisher_id: fisherId, score: 100, violations_count: 0, open_violations: 0 };
}

module.exports = { recalculateCompliance, getCompliance, SEVERITY_PENALTY };
