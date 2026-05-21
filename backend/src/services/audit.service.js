/**
 * Audit log writes for government accountability.
 */

const { getDb } = require('../database/db');

function logAudit({ actorUserId, action, entityType, entityId, payload, ip }) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, payload_json, ip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      actorUserId ?? null,
      action,
      entityType ?? null,
      entityId ?? null,
      JSON.stringify(payload ?? {}),
      ip ?? null,
    );
  } catch (err) {
    console.error('[audit] failed to log:', err.message);
  }
}

function auditFromReq(req, action, entityType, entityId, payload = {}) {
  logAudit({
    actorUserId: req.user?.id,
    action,
    entityType,
    entityId,
    payload,
    ip: req.ip || req.headers['x-forwarded-for'],
  });
}

module.exports = { logAudit, auditFromReq };
