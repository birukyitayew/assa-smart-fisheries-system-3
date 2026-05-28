const { Prisma } = require('@prisma/client');
const { prisma } = require('../database/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const complianceService = require('../services/compliance.service');

async function violationRef() {
  const rows = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM violations`;
  const n = Number(rows[0]?.cnt ?? 0) + 1;
  return `VIO-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(n).padStart(4, '0')}`;
}

async function inspectionRef() {
  const rows = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM inspections`;
  const n = Number(rows[0]?.cnt ?? 0) + 1;
  return `INS-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(n).padStart(4, '0')}`;
}

async function getMyAssignments(req, res) {
  const { status } = req.query;
  const parts = [Prisma.sql`i.inspector_id = ${req.user.id}`];
  if (status) parts.push(Prisma.sql`i.status = ${status}`);
  const where = Prisma.join(parts, ' AND ');

  const assignments = await prisma.$queryRaw`
    SELECT i.*,
           u.name as fisher_name, f.license_number, f.license_status,
           fz.name as zone_name
    FROM inspections i
    LEFT JOIN fishers f ON i.fisher_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN fishing_zones fz ON i.zone_id = fz.id
    WHERE ${where}
    ORDER BY i.scheduled_at ASC, i.created_at DESC
  `;

  res.json({ assignments });
}

async function getAssignment(req, res) {
  const rows = await prisma.$queryRaw`
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
    WHERE i.id = ${Number(req.params.id)}
  `;
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  if (req.user.role === 'inspector' && row.inspector_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your assignment' });
  }

  const violations = row.fisher_id
    ? await prisma.$queryRaw`
        SELECT * FROM violations WHERE fisher_id = ${row.fisher_id}
        ORDER BY created_at DESC LIMIT 10
      `
    : [];

  const compliance = row.fisher_id ? await complianceService.getCompliance(row.fisher_id) : null;

  res.json({ inspection: row, violations, compliance });
}

async function startAssignment(req, res) {
  const rows = await prisma.$queryRaw`
    SELECT * FROM inspections WHERE id = ${Number(req.params.id)}
  `;
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  if (req.user.role === 'inspector' && row.inspector_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (row.status !== 'ASSIGNED') {
    return res.status(400).json({ error: 'Inspection is not in ASSIGNED status' });
  }

  await prisma.inspection.update({
    where: { id: row.id },
    data: { status: 'IN_PROGRESS' },
  });
  auditFromReq(req, 'inspection.started', 'inspection', row.id, {});
  res.json({ success: true, status: 'IN_PROGRESS' });
}

async function completeAssignment(req, res) {
  const { outcome, notes } = req.body;
  if (!outcome || !['PASS', 'WARNING', 'VIOLATION_FOUND'].includes(outcome)) {
    return res
      .status(400)
      .json({ error: 'Valid outcome required: PASS, WARNING, VIOLATION_FOUND' });
  }

  const rows = await prisma.$queryRaw`
    SELECT * FROM inspections WHERE id = ${Number(req.params.id)}
  `;
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Inspection not found' });
  if (req.user.role === 'inspector' && row.inspector_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.inspection.update({
    where: { id: row.id },
    data: {
      status: 'COMPLETED',
      outcome,
      notes: notes || null,
      completedAt: new Date(),
    },
  });

  auditFromReq(req, 'inspection.completed', 'inspection', row.id, { outcome });
  eventBus.emit('inspection.completed', { id: row.id, reference_id: row.reference_id, outcome });

  res.json({ success: true, status: 'COMPLETED', outcome });
}

async function createViolation(req, res) {
  const {
    fisher_id,
    boat_id,
    zone_id,
    catch_id,
    inspection_id,
    type,
    severity,
    description,
    lat,
    lng,
    evidence_urls,
    fine_amount,
  } = req.body;

  if (!fisher_id || !type || !severity || !description?.trim()) {
    return res
      .status(400)
      .json({ error: 'fisher_id, type, severity, and description are required' });
  }

  const fisher = await prisma.fisher.findUnique({ where: { id: fisher_id } });
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const ref = await violationRef();
  const created = await prisma.violation.create({
    data: {
      referenceId: ref,
      fisherId: fisher_id,
      boatId: boat_id || null,
      zoneId: zone_id || null,
      catchId: catch_id || null,
      inspectionId: inspection_id || null,
      type,
      severity,
      description: description.trim(),
      lat: lat || null,
      lng: lng || null,
      reportedByUserId: req.user.id,
      evidenceUrls: JSON.stringify(evidence_urls || []),
      fineAmount: fine_amount || null,
      fineStatus: fine_amount ? 'PENDING' : null,
    },
  });

  const compliance = await complianceService.recalculateCompliance(fisher_id);

  await prisma.alert.create({
    data: {
      type: 'VIOLATION',
      title: `Violation: ${type}`,
      message: `${description.trim().slice(0, 120)} (Fisher #${fisher_id})`,
      severity: severity === 'CRITICAL' ? 'CRITICAL' : severity === 'HIGH' ? 'WARNING' : 'INFO',
      relatedEntityType: 'violation',
      relatedEntityId: created.id,
    },
  });

  auditFromReq(req, 'violation.created', 'violation', created.id, { reference_id: ref, type });
  eventBus.emit('violation.created', {
    id: created.id,
    reference_id: ref,
    fisher_id,
    type,
    severity,
    compliance_score: compliance.score,
  });

  res.status(201).json({
    success: true,
    id: created.id,
    reference_id: ref,
    compliance,
  });
}

async function getViolations(req, res) {
  const { status, fisher_id, page = 1, limit = 30 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);

  const parts = [Prisma.sql`1=1`];
  if (status) parts.push(Prisma.sql`v.status = ${status}`);
  if (fisher_id) parts.push(Prisma.sql`v.fisher_id = ${Number(fisher_id)}`);
  const where = Prisma.join(parts, ' AND ');

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM violations v WHERE ${where}
  `;
  const total = Number(totalRows[0]?.cnt ?? 0);

  const violations = await prisma.$queryRaw`
    SELECT v.*, u.name as fisher_name, ru.name as reported_by_name
    FROM violations v
    JOIN fishers f ON v.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    JOIN users ru ON v.reported_by_user_id = ru.id
    WHERE ${where}
    ORDER BY v.created_at DESC
    LIMIT ${lim} OFFSET ${offset}
  `;

  res.json({
    violations: violations.map((v) => ({
      ...v,
      evidence_urls: JSON.parse(v.evidence_urls || '[]'),
    })),
    total,
    page: Number(page),
  });
}

async function getViolation(req, res) {
  const rows = await prisma.$queryRaw`
    SELECT v.*, u.name as fisher_name, u.email as fisher_email,
           f.license_number, ru.name as reported_by_name
    FROM violations v
    JOIN fishers f ON v.fisher_id = f.id
    JOIN users u ON f.user_id = u.id
    JOIN users ru ON v.reported_by_user_id = ru.id
    WHERE v.id = ${Number(req.params.id)}
  `;
  const v = rows[0];
  if (!v) return res.status(404).json({ error: 'Violation not found' });
  res.json({
    violation: { ...v, evidence_urls: JSON.parse(v.evidence_urls || '[]') },
    compliance: await complianceService.getCompliance(v.fisher_id),
  });
}

async function updateViolationFine(req, res) {
  const { fine_amount, fine_status, status } = req.body;
  const v = await prisma.violation.findUnique({ where: { id: Number(req.params.id) } });
  if (!v) return res.status(404).json({ error: 'Violation not found' });

  if (fine_amount != null) {
    await prisma.violation.update({
      where: { id: v.id },
      data: {
        fineAmount: fine_amount,
        fineStatus: fine_status || 'PENDING',
      },
    });
  }
  if (status) {
    await prisma.violation.update({
      where: { id: v.id },
      data: {
        status,
        resolvedAt: ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : undefined,
      },
    });
    await complianceService.recalculateCompliance(v.fisherId);
  }

  auditFromReq(req, 'violation.updated', 'violation', v.id, { fine_amount, fine_status, status });
  res.json({ success: true });
}

async function getSuspiciousFishers(req, res) {
  const fishers = await prisma.$queryRaw`
    SELECT f.id as fisher_id, u.name, f.license_number, f.license_status,
           COALESCE(fc.score, 100) as compliance_score,
           COALESCE(fc.open_violations, 0) as open_violations,
           (SELECT COUNT(*)::int FROM catch_submissions cs
            WHERE cs.fisher_id = f.id AND cs.zone_flag IN ('PROHIBITED_ZONE','RESTRICTED_ZONE')
              AND cs.submitted_at >= NOW() - interval '30 days') as flagged_catches_30d,
           (SELECT COUNT(*)::int FROM violations v WHERE v.fisher_id = f.id AND v.status IN ('OPEN','UNDER_REVIEW')) as active_violations
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fisher_compliance fc ON fc.fisher_id = f.id
    WHERE f.license_status != 'VALID'
       OR COALESCE(fc.score, 100) < 70
       OR COALESCE(fc.open_violations, 0) > 0
       OR EXISTS (
         SELECT 1 FROM catch_submissions cs
         WHERE cs.fisher_id = f.id AND cs.zone_flag = 'PROHIBITED_ZONE'
           AND cs.submitted_at >= NOW() - interval '14 days'
       )
    ORDER BY COALESCE(fc.score, 100) ASC, active_violations DESC
    LIMIT 30
  `;
  res.json({ fishers });
}

async function createInspection(req, res) {
  const { inspector_id, fisher_id, zone_id, title, instructions, scheduled_at } = req.body;
  if (!inspector_id || !title?.trim()) {
    return res.status(400).json({ error: 'inspector_id and title are required' });
  }

  const inspector = await prisma.user.findUnique({ where: { id: inspector_id } });
  if (!inspector || inspector.role !== 'inspector') {
    return res.status(400).json({ error: 'Invalid inspector user' });
  }

  const ref = await inspectionRef();
  const created = await prisma.inspection.create({
    data: {
      referenceId: ref,
      inspectorId: inspector_id,
      fisherId: fisher_id || null,
      zoneId: zone_id || null,
      title: title.trim(),
      instructions: instructions || null,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : new Date(),
      status: 'ASSIGNED',
    },
  });

  auditFromReq(req, 'inspection.assigned', 'inspection', created.id, {
    reference_id: ref,
    inspector_id,
  });
  eventBus.emit('inspection.assigned', {
    id: created.id,
    reference_id: ref,
    inspector_id,
    fisher_id,
    title: title.trim(),
  });

  res.status(201).json({ success: true, id: created.id, reference_id: ref });
}

async function getAllInspections(req, res) {
  const { status, inspector_id } = req.query;
  const parts = [Prisma.sql`1=1`];
  if (status) parts.push(Prisma.sql`i.status = ${status}`);
  if (inspector_id) parts.push(Prisma.sql`i.inspector_id = ${Number(inspector_id)}`);
  const where = Prisma.join(parts, ' AND ');

  const inspections = await prisma.$queryRaw`
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
  `;

  res.json({ inspections });
}

async function getFishersList(req, res) {
  const fishers = await prisma.$queryRaw`
    SELECT f.id, u.name, f.license_number, f.license_status,
           COALESCE(fc.score, 100) as compliance_score
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN fisher_compliance fc ON fc.fisher_id = f.id
    ORDER BY u.name LIMIT 100
  `;
  res.json({ fishers });
}

async function getInspectors(req, res) {
  const inspectors = await prisma.$queryRaw`
    SELECT u.id, u.name, u.email, u.phone,
           (SELECT COUNT(*)::int FROM inspections i WHERE i.inspector_id = u.id AND i.status IN ('ASSIGNED','IN_PROGRESS')) as active_assignments
    FROM users u WHERE u.role = 'inspector'
    ORDER BY u.name
  `;
  res.json({ inspectors });
}

async function verifyFisherLicense(req, res) {
  const idParam = req.params.id;
  const rows = await prisma.$queryRaw`
    SELECT f.*, u.name, u.email, u.phone, b.boat_name, b.registration_number
    FROM fishers f
    JOIN users u ON f.user_id = u.id
    LEFT JOIN boats b ON b.fisher_id = f.id
    WHERE f.id::text = ${idParam} OR f.license_number = ${idParam}
    LIMIT 1
  `;
  const fisher = rows[0];
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const compliance = await complianceService.getCompliance(fisher.id);
  const openViolations = await prisma.$queryRaw`
    SELECT reference_id, type, severity, status, created_at FROM violations
    WHERE fisher_id = ${fisher.id} AND status IN ('OPEN','UNDER_REVIEW')
    ORDER BY created_at DESC LIMIT 5
  `;

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
  getMyAssignments: asyncHandler(getMyAssignments),
  getAssignment: asyncHandler(getAssignment),
  startAssignment: asyncHandler(startAssignment),
  completeAssignment: asyncHandler(completeAssignment),
  createViolation: asyncHandler(createViolation),
  getViolations: asyncHandler(getViolations),
  getViolation: asyncHandler(getViolation),
  updateViolationFine: asyncHandler(updateViolationFine),
  getSuspiciousFishers: asyncHandler(getSuspiciousFishers),
  createInspection: asyncHandler(createInspection),
  getAllInspections: asyncHandler(getAllInspections),
  getInspectors: asyncHandler(getInspectors),
  getFishersList: asyncHandler(getFishersList),
  verifyFisherLicense: asyncHandler(verifyFisherLicense),
};
