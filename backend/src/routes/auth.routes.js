const express = require('express');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth.middleware');
const authService = require('../services/auth.service');
const { prisma } = require('../database/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const { auditFromReq } = require('../services/audit.service');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

function mapFisherProfile(profile) {
  if (!profile) return null;
  const boat = profile.boats?.[0];
  return {
    id: profile.id,
    user_id: profile.userId,
    license_number: profile.licenseNumber,
    license_status: profile.licenseStatus,
    license_expiry: profile.licenseExpiry,
    zone_id: profile.zoneId,
    zone_name: profile.zone?.name,
    zone_type: profile.zone?.type,
    boat_name: boat?.boatName,
    registration_number: boat?.registrationNumber,
    capacity_kg: boat?.capacityKg,
    name: profile.user?.name,
  };
}

// POST /api/auth/login
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!process.env.JWT_SECRET) {
    req.log?.error('JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server authentication is not configured' });
  }

  const result = await authService.login(email, password);
  if (result.error) return res.status(result.status).json({ error: result.error });

  let profile = null;
  if (result.user.role === 'fisher') {
    const fisherProfile = await authService.getFisherProfile(result.user.id);
    profile = mapFisherProfile({ ...fisherProfile, user: { name: result.user.name } });
  }

  auditFromReq(req, 'auth.login', 'user', result.user.id, { email: result.user.email });

  res.json({
    token: result.accessToken,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      phone: result.user.phone,
      region_id: result.user.regionId ?? null,
      region_name: result.user.region?.name ?? null,
    },
    profile,
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.body.refresh_token;
  const result = await authService.refresh(refreshToken);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json({
    token: result.accessToken,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      phone: result.user.phone,
    },
  });
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.body.refresh_token;
  const userId = req.user?.id;
  await authService.logout(refreshToken, userId);
  res.json({ success: true });
}));

// GET /api/auth/me
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      regionId: true,
      createdAt: true,
      region: { select: { id: true, name: true, code: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  let profile = null;
  if (user.role === 'fisher') {
    const fisherProfile = await authService.getFisherProfile(user.id);
    profile = mapFisherProfile(fisherProfile);
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      region_id: user.regionId,
      region_name: user.region?.name ?? null,
      region_code: user.region?.code ?? null,
      created_at: user.createdAt,
    },
    profile,
  });
}));

module.exports = router;
