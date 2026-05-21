const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const controller = require('../controllers/marketplace.controller');

// ── GET /api/marketplace/listings ────────────────────────────────────────────
router.get('/listings', controller.getListings);

// ── GET /api/marketplace/price-history/:species ─────────────────────────────
router.get('/price-history/:species', controller.getSpeciesPriceHistory);

// ── GET /api/marketplace/listings/:id ────────────────────────────────────────
router.get('/listings/:id', controller.getListing);

// ── GET /api/marketplace/stats ────────────────────────────────────────────────
router.get('/stats', controller.getStats);

// ── GET /api/marketplace/activity ────────────────────────────────────────────
router.get('/activity', controller.getActivity);

// ── POST /api/marketplace/orders ─────────────────────────────────────────────
router.post('/orders', authMiddleware, requireRole('buyer'), controller.placeOrder);

// ── GET /api/marketplace/orders ───────────────────────────────────────────────
router.get('/orders', authMiddleware, requireRole('buyer'), controller.getOrders);

module.exports = router;
