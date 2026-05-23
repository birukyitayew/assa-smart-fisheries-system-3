const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../database/prisma');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '30m';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccess(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES, algorithm: 'HS256' },
  );
}

async function issueTokens(user) {
  const accessToken = signAccess(user);
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000);

  // Cap active refresh token sessions to 5 per user to prevent unbounded DB growth
  const activeTokens = await prisma.refreshToken.findMany({
    where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
  });

  if (activeTokens.length >= 5) {
    // Revoke the oldest tokens so we keep at most 4 active ones before inserting the new one
    const toRevoke = activeTokens.slice(0, activeTokens.length - 4);
    const tokenIdsToRevoke = toRevoke.map((t) => t.id);
    await prisma.refreshToken.updateMany({
      where: { id: { in: tokenIdsToRevoke } },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim() },
    include: { region: { select: { id: true, name: true, code: true } } },
  });
  if (!user) return { error: 'Invalid credentials', status: 401 };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: 'Account temporarily locked. Try again later.', status: 423 };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const count = user.failedLoginCount + 1;
    const lockedUntil =
      count >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: count, lockedUntil },
    });
    return { error: 'Invalid credentials', status: 401 };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const tokens = await issueTokens(user);
  return { user, ...tokens };
}

async function refresh(refreshToken) {
  if (!refreshToken) return { error: 'Refresh token required', status: 401 };

  const hash = hashToken(refreshToken);
  const row = await prisma.refreshToken.findFirst({
    where: { tokenHash: hash, revokedAt: null },
    include: { user: true },
  });

  if (!row || row.expiresAt < new Date()) {
    return { error: 'Invalid or expired refresh token', status: 401 };
  }

  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(row.user);
  return { user: row.user, ...tokens };
}

async function logout(refreshToken, userId) {
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else if (userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return { success: true };
}

async function getFisherProfile(userId) {
  return prisma.fisher.findFirst({
    where: { userId },
    include: {
      zone: true,
      boats: { take: 1 },
    },
  });
}

module.exports = {
  login,
  refresh,
  logout,
  getFisherProfile,
  signAccess,
};
