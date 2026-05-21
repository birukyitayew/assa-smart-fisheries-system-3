const { getDb } = require('../database/db');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const complianceService = require('../services/compliance.service');

function violationRef(db) {
  const n = db.prepare('SELECT COUNT(*) as cnt FROM violations').get().cnt + 1;
  return `VIO-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(n).padStart(4, '0')}`;
}

function inspectionRef(db) {
  const n = db.prepare('SELECT COUNT(*) as cnt FROM inspections').get().cnt + 1;
  return `INS-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(n).padStart(4, '0')}`;
}

// ── Inspector: my assignments ─────────────────────────────────────────────────
function getMyAssignments(req, res) {
  const db = getDb();
  const { status } = req.query;
  let where = 'i.inspector_id = ?';
  const params = [req.user.id];
  if (status) { where += ' AND i.status = ?'; params.push(status); }

  const assignments = db.prepare(`
    SELECT i.*,
           u.name as fisher_name, f.license_number, f.license_status,
           fz.name as zone_name
    FROM inspections i
    LEFT JOIN fishers f ON i.fisher_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON i.zone_id = fz.id
    WHERE ${where}
    ORDER BY i.scheduled_at ASC, i.created_at DESC
  `).all(...params);

  res.json({ assignments });
}

function getAssignment(req, res) {
  const db = getDb();
  const row = db.prepare(`
    SELECT i.*,
           u.name as fisher_name, u.phone as fisher_phone,
           f.license_number, f.license_status, f.license_expiry,
           fz.name as zone_name, fz.type as zone_type,
           iu.name as inspector_name
    FROM inspections i
    LEFT JOIN fishers f ON i.fisher_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON i.zone_id = fz.id
    JOIN users iu ON i.inspector_id = iu.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  if (req.user.role === 'inspector' && row.inspector_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your assignment' });
  }

  const violations = row.fisher_id
    ? db.prepare(`
        SELECT * FROM violations WHERE fisher_id = ? ORDER BY created_at DESC LIMIT 10
      `).all(row.fisher_id)
    : [];

  const compliance = row.fisher_id
    ? complianceService.getCompliance(db, row.fisher_id)
    : null;

  res.json({ inspection: row, violations, compliance });
}

function startAssignment(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  if (req.user.role === 'inspector' && row.inspector_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (row.status !== 'ASSIGNED') {
    return res.status(400).json({ error: 'Inspection is not in ASSIGNED status' });
  }

  db.prepare(`UPDATE inspections SET status = 'IN_PROGRESS' WHERE id = ?`).run(row.id);
  auditFromReq(req, 'inspection.started', 'inspection', row.id, {});
  res.json({ success: true, status: 'IN_PROGRESS' });
}

function completeAssignment(req, res) {
  const { outcome, notes } = req.body;
  if (!outcome || !['PASS', 'WARNING', 'VIOLATION_FOUND'].includes(outcome)) {
    return res.status(400).json({ error: 'Valid outcome required: PASS, WARNING, VIOLATION_FOUND' });
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  if (req.user.role === 'inspector' && row.inspector_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.prepare(`
    UPDATE inspections
    SET status = 'COMPLETED', outcome = ?, notes = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(outcome, notes || null, row.id);

  auditFromReq(req, 'inspection.completed', 'inspection', row.id, { outcome });
  eventBus.emit('inspection.completed', { id: row.id, reference_id: row.reference_id, outcome });

  res.json({ success: true, status: 'COMPLETED', outcome });
}

// ── Violations ────────────────────────────────────────────────────────────────
function createViolation(req, res) {
  const {
    fisher_id, boat_id, zone_id, catch_id, inspection_id,
    type, severity, description, lat, lng, evidence_urls, fine_amount,
  } = req.body;

  if (!fisher_id || !type || !severity || !description?.trim()) {
    return res.status(400).json({ error: 'fisher_id, type, severity, and description are required' });
  }

  const db = getDb();
  const fisher = db.prepare('SELECT id FROM fishers WHERE id = ?').get(fisher_id);
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const ref = violationRef(db);
  const result = db.prepare(`
    INSERT INTO violations
      (reference_id, fisher_id, boat_id, zone_id, catch_id, inspection_id,
       type, severity, description, lat, lng, reported_by_user_id, evidence_urls, fine_amount, fine_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ref, fisher_id, boat_id || null, zone_id || null, catch_id || null, inspection_id || null,
    type, severity, description.trim(), lat || null, lng || null, req.user.id,
    JSON.stringify(evidence_urls || []),
    fine_amount || null,
    fine_amount ? 'PENDING' : null,
  );

  const compliance = complianceService.recalculateCompliance(db, fisher_id);

  db.prepare(`
    INSERT INTO alerts (type, title, message, severity, related_entity_type, related_entity_id)
    VALUES ('VIOLATION', ?, ?, ?, 'violation', ?)
  `).run(
    `Violation: ${type}`,
    `${description.trim().slice(0, 120)} (Fisher #${fisher_id})`,
    severity === 'CRITICAL' ? 'CRITICAL' : severity === 'HIGH' ? 'WARNING' : 'INFO',
    result.lastInsertRowid,
  );

  auditFromReq(req, 'violation.created', 'violation', result.lastInsertRowid, { reference_id: ref, type });
  eventBus.emit('violation.created', {
    id: result.lastInsertRowid,
    reference_id: ref,
    fisher_id,
    type,
    severity,
    compliance_score: compliance.score,
  });

  res.status(201).json({
    success: true,
    id: result.lastInsertRowid,
    reference_id: ref,
    compliance,
  });
}

function getViolations(req, res) {
  const db = getDb();
  const { status, fisher_id, page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  let where = '1=1';
  const params = [];
  if (status) { where += ' AND v.status = ?'; params.push(status); }
  if (fisher_id) { where += ' AND v.fisher_id = ?'; params.push(fisher_id); }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM violations v WHERE ${where}`).get(...params).cnt;
  const violations = db.prepare(`
    SELECT v.*, u.name as fisher_name, ru.name as reported_by_name
    FROM violations v
    JOIN fishers f ON v.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    JOIN users ru ON v.reported_by_user_id = ru.id
    WHERE ${where}
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    violations: violations.map((v) => ({
      ...v,
      evidence_urls: JSON.parse(v.evidence_urls || '[]'),
    })),
    total,
    page: Number(page),
  });
}

function getViolation(req, res) {
  const db = getDb();
  const v = db.prepare(`
    SELECT v.*, u.name as fisher_name, u.email as fisher_email,
           f.license_number, ru.name as reported_by_name
    FROM violations v
    JOIN fishers f ON v.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    JOIN users ru ON v.reported_by_user_id = ru.id
    WHERE v.id = ?
  `).get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Violation not found' });
  res.json({
    violation: { ...v, evidence_urls: JSON.parse(v.evidence_urls || '[]') },
    compliance: complianceService.getCompliance(db, v.fisher_id),
  });
}

function updateViolationFine(req, res) {
  const { fine_amount, fine_status, status } = req.body;
  const db = getDb();
  const v = db.prepare('SELECT * FROM violations WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Violation not found' });

  if (fine_amount != null) {
    db.prepare('UPDATE violations SET fine_amount = ?, fine_status = ? WHERE id = ?')
      .run(fine_amount, fine_status || 'PENDING', req.params.id);
  }
  if (status) {
    db.prepare(`
      UPDATE violations SET status = ?, resolved_at = CASE WHEN ? IN ('RESOLVED','DISMISSED') THEN datetime('now') ELSE resolved_at END
      WHERE id = ?
    `).run(status, status, req.params.id);
    complianceService.recalculateCompliance(db, v.fisher_id);
  }

  auditFromReq(req, 'violation.updated', 'violation', v.id, { fine_amount, fine_status, status });
  res.json({ success: true });
}

// ── Suspicious fishers ────────────────────────────────────────────────────────
function getSuspiciousFishers(req, res) {
  const db = getDb();
  const fishers = db.prepare(`
    SELECT f.id as fisher_id, u.name, f.license_number, f.license_status,
           COALESCE(fc.score, 100) as compliance_score,
           COALESCE(fc.open_violations, 0) as open_violations,
           (SELECT COUNT(*) FROM catch_submissions cs
            WHERE cs.fisher_id = f.id AND cs.zone_flag IN ('PROHIBITED_ZONE','RESTRICTED_ZONE')
              AND cs.submitted_at >= datetime('now', '-30 days')) as flagged_catches_30d,
           (SELECT COUNT(*) FROM violations v WHERE v.fisher_id = f.id AND v.status IN ('OPEN','UNDER_REVIEW')) as active_violations
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fisher_compliance fc ON fc.fisher_id = f.id
    WHERE f.license_status != 'VALID'
       OR COALESCE(fc.score, 100) < 70
       OR COALESCE(fc.open_violations, 0) > 0
       OR EXISTS (
         SELECT 1 FROM catch_submissions cs
         WHERE cs.fisher_id = f.id AND cs.zone_flag = 'PROHIBITED_ZONE'
           AND cs.submitted_at >= datetime('now', '-14 days')
       )
    ORDER BY COALESCE(fc.score, 100) ASC, active_violations DESC
    LIMIT 30
  `).all();
  res.json({ fishers });
}

// ── Admin: assign inspection ──────────────────────────────────────────────────
function createInspection(req, res) {
  const { inspector_id, fisher_id, zone_id, title, instructions, scheduled_at } = req.body;
  if (!inspector_id || !title?.trim()) {
    return res.status(400).json({ error: 'inspector_id and title are required' });
  }

  const db = getDb();
  const inspector = db.prepare('SELECT id, role FROM users WHERE id = ?').get(inspector_id);
  if (!inspector || inspector.role !== 'inspector') {
    return res.status(400).json({ error: 'Invalid inspector user' });
  }

  const ref = inspectionRef(db);
  const result = db.prepare(`
    INSERT INTO inspections
      (reference_id, inspector_id, fisher_id, zone_id, title, instructions, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ASSIGNED')
  `).run(
    ref, inspector_id, fisher_id || null, zone_id || null,
    title.trim(), instructions || null, scheduled_at || new Date().toISOString(),
  );

  auditFromReq(req, 'inspection.assigned', 'inspection', result.lastInsertRowid, { reference_id: ref, inspector_id });
  eventBus.emit('inspection.assigned', {
    id: result.lastInsertRowid,
    reference_id: ref,
    inspector_id,
    fisher_id,
    title: title.trim(),
  });

  res.status(201).json({ success: true, id: result.lastInsertRowid, reference_id: ref });
}

function getAllInspections(req, res) {
  const db = getDb();
  const { status, inspector_id } = req.query;
  let where = '1=1';
  const params = [];
  if (status) { where += ' AND i.status = ?'; params.push(status); }
  if (inspector_id) { where += ' AND i.inspector_id = ?'; params.push(inspector_id); }

  const inspections = db.prepare(`
    SELECT i.*,
           iu.name as inspector_name,
           fu.name as fisher_name,
           fz.name as zone_name
    FROM inspections i
    JOIN users iu ON i.inspector_id = iu.id
    LEFT JOIN fishers f ON i.fisher_id = f.id
    LEFT JOIN users fu ON f.user_id = fu.id
    LEFT JOIN fishing_zones fz ON i.zone_id = fz.id
    WHERE ${where}
    ORDER BY i.created_at DESC
    LIMIT 100
  `).all(...params);

  res.json({ inspections });
}

function getFishersList(req, res) {
  const db = getDb();
  const fishers = db.prepare(`
    SELECT f.id, u.name, f.license_number, f.license_status,
           COALESCE(fc.score, 100) as compliance_score
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fisher_compliance fc ON fc.fisher_id = f.id
    ORDER BY u.name LIMIT 100
  `).all();
  res.json({ fishers });
}

function getInspectors(req, res) {
  const db = getDb();
  const inspectors = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone,
           (SELECT COUNT(*) FROM inspections i WHERE i.inspector_id = u.id AND i.status IN ('ASSIGNED','IN_PROGRESS')) as active_assignments
    FROM users u WHERE u.role = 'inspector'
    ORDER BY u.name
  `).all();
  res.json({ inspectors });
}

function verifyFisherLicense(req, res) {
  const db = getDb();
  const fisher = db.prepare(`
    SELECT f.*, u.name, u.email, u.phone, b.boat_name, b.registration_number
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE f.id = ? OR f.license_number = ?
  `).get(req.params.id, req.params.id);

  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const compliance = complianceService.getCompliance(db, fisher.id);
  const openViolations = db.prepare(`
    SELECT reference_id, type, severity, status, created_at FROM violations
    WHERE fisher_id = ? AND status IN ('OPEN','UNDER_REVIEW') ORDER BY created_at DESC LIMIT 5
  `).all(fisher.id);

  const valid = fisher.license_status === 'VALID' && new Date(fisher.license_expiry) >= new Date();

  res.json({
    valid,
    fisher,
    compliance,
    open_violations: openViolations,
    verified_at: new Date().toISOString(),
  });
}

module.exports = {
  getMyAssignments,
  getAssignment,
  startAssignment,
  completeAssignment,
  createViolation,
  getViolations,
  getViolation,
  updateViolationFine,
  getSuspiciousFishers,
  createInspection,
  getAllInspections,
  getInspectors,
  getFishersList,
  verifyFisherLicense,
};
