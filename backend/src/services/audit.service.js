/**
 * Audit log writes for government accountability.
 */

const { prisma } = require('../database/prisma');

async function logAudit({ actorUserId, action, entityType, entityId, payload, ip }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        payloadJson: JSON.stringify(payload ?? {}),
        ip: ip ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to log:', err.message);
  }
}

async function auditFromReq(req, action, entityType, entityId, payload = {}) {
  await logAudit({
    actorUserId: req.user?.id,
    action,
    entityType,
    entityId,
    payload,
    ip: req.ip || req.headers['x-forwarded-for'],
  });
}

module.exports = { logAudit, auditFromReq };
