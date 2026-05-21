const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const controller = require('../controllers/catches.controller');

const catchValidation = [
  body('species').notEmpty().withMessage('Species is required'),
  body('quantity_kg').isFloat({ min: 0.1, max: 500 }).withMessage('Quantity must be between 0.1 and 500 kg'),
  body('fishing_gear').notEmpty().withMessage('Fishing gear is required'),
  body('fishing_date').isDate().withMessage('Valid fishing date is required'),
  body('fishing_time').notEmpty().withMessage('Fishing time is required'),
  body('zone_id').isInt({ min: 1 }).withMessage('Fishing zone is required'),
];

// ── GET /api/zones — public, used by fisher app zone picker ──────────────────
router.get('/zones', authMiddleware, controller.getZones);

// ── GET /api/fisher/profile ───────────────────────────────────────────────────
router.get('/fisher/profile', authMiddleware, requireRole('fisher'), controller.getProfile);

// ── GET /api/fisher/catches ───────────────────────────────────────────────────
router.get('/fisher/catches', authMiddleware, requireRole('fisher'), controller.getCatches);

// ── GET /api/fisher/catches/:id ───────────────────────────────────────────────
router.get('/fisher/catches/:id', authMiddleware, requireRole('fisher'), controller.getCatch);

// ── POST /api/catches — submit a new catch ────────────────────────────────────
router.post('/catches', authMiddleware, requireRole('fisher'), catchValidation, controller.submitCatch);

// ── Fisher trips (Phase 3) ────────────────────────────────────────────────────
router.get('/fisher/trips/active', authMiddleware, requireRole('fisher'), controller.getActiveTrip);
router.post('/fisher/trips/start', authMiddleware, requireRole('fisher'), controller.startTrip);
router.post('/fisher/trips/end', authMiddleware, requireRole('fisher'), controller.endTrip);

// ── GET /api/notifications ────────────────────────────────────────────────────
router.get('/notifications', authMiddleware, controller.getNotifications);

// ── PUT /api/notifications/read-all ──────────────────────────────────────────
// Must be defined before /:id/read to avoid route conflict
router.put('/notifications/read-all', authMiddleware, controller.markAllNotificationsRead);

// ── PUT /api/notifications/:id/read ──────────────────────────────────────────
router.put('/notifications/:id/read', authMiddleware, controller.markNotificationRead);

module.exports = router;
