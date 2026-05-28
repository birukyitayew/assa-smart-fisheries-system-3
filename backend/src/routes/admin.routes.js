const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const controller = require('../controllers/admin.controller');
const inspectorController = require('../controllers/inspector.controller');

const isAdmin = [authMiddleware, requireRole('admin', 'superadmin', 'regional_admin')];
const isSuperAdmin = [authMiddleware, requireRole('superadmin')];

// ── Regions (Phase 5) ─────────────────────────────────────────────────────────
router.get('/regions', ...isAdmin, controller.listRegions);
router.get('/regions/:id/summary', ...isAdmin, controller.getRegionSummary);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard/stats', ...isAdmin, controller.getDashboardStats);
router.get('/dashboard/catches-over-time', ...isAdmin, controller.getCatchesOverTime);
router.get('/dashboard/species-breakdown', ...isAdmin, controller.getSpeciesBreakdown);

// ── Catches ───────────────────────────────────────────────────────────────────
router.get('/catches', ...isAdmin, controller.getCatches);
router.get('/catches/:id', ...isAdmin, controller.getCatch);
router.put('/catches/:id/approve', ...isAdmin, controller.approveCatch);
router.put('/catches/:id/reject', ...isAdmin, controller.rejectCatch);

// ── Fishers ───────────────────────────────────────────────────────────────────
router.get('/fishers', ...isAdmin, controller.getFishers);
router.get('/fishers/:id', ...isAdmin, controller.getFisher);

// ── Quotas ────────────────────────────────────────────────────────────────────
router.get('/quotas', ...isAdmin, controller.getQuotas);
router.put('/quotas/:id', ...isAdmin, controller.updateQuota);

// ── Alerts ────────────────────────────────────────────────────────────────────
// read-all must come before /:id/read to avoid route conflict
router.put('/alerts/read-all', ...isAdmin, controller.markAllAlertsRead);
router.get('/alerts', ...isAdmin, controller.getAlerts);
router.put('/alerts/:id/read', ...isAdmin, controller.markAlertRead);

// ── Zones ─────────────────────────────────────────────────────────────────────
router.get('/zones', ...isAdmin, controller.getZones);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports/monthly', ...isAdmin, controller.getMonthlyReport);

// ── Command Center ────────────────────────────────────────────────────────────
router.get('/command/live-stats', ...isAdmin, controller.getLiveStats);
router.get('/fleet', ...isAdmin, controller.getFleet);
router.get('/fleet/trips', ...isAdmin, controller.getActiveFleetTrips);
router.get('/fleet/positions', ...isAdmin, controller.getFleetPositions);
router.get('/fleet/:boatId/history', ...isAdmin, controller.getFleetHistory);
router.get('/map/layers', ...isAdmin, controller.getMapLayers);

router.get('/intelligence/overview', ...isAdmin, controller.getIntelligenceOverview);
router.post('/intelligence/refresh-snapshots', ...isAdmin, controller.refreshIntelligenceSnapshots);

router.get('/season-rules', ...isAdmin, controller.getSeasonRules);
router.post('/season-rules', ...isAdmin, controller.createSeasonRule);
router.put('/season-rules/:id', ...isAdmin, controller.updateSeasonRule);
router.delete('/season-rules/:id', ...isSuperAdmin, controller.deleteSeasonRule);
router.get('/events/recent', ...isAdmin, controller.getRecentEvents);

// ── Market Monitor ────────────────────────────────────────────────────────────
router.get('/market/overview', ...isAdmin, controller.getMarketOverview);
router.get('/market/buyers', ...isAdmin, controller.getMarketBuyers);
router.get('/market/sellers', ...isAdmin, controller.getMarketSellers);
router.get('/market/species-prices', ...isAdmin, controller.getMarketSpeciesPrices);
router.get('/market/shortages', ...isAdmin, controller.getMarketShortages);
router.get('/market/transactions', ...isAdmin, controller.getMarketTransactions);
router.get('/market/network', ...isAdmin, controller.getMarketNetwork);

// ── Audit ─────────────────────────────────────────────────────────────────────
router.get('/audit', ...isAdmin, controller.getAuditLog);

// ── Enforcement (Phase 2) ─────────────────────────────────────────────────────
router.get('/inspections', ...isAdmin, inspectorController.getAllInspections);
router.post('/inspections', ...isAdmin, inspectorController.createInspection);
router.get('/inspectors', ...isAdmin, inspectorController.getInspectors);
router.get('/violations', ...isAdmin, inspectorController.getViolations);
router.get('/violations/:id', ...isAdmin, inspectorController.getViolation);
router.put('/violations/:id', ...isAdmin, inspectorController.updateViolationFine);
router.get('/enforcement/suspicious-fishers', ...isAdmin, inspectorController.getSuspiciousFishers);

// ── User Management ───────────────────────────────────────────────────────────
router.post('/users', ...isAdmin, controller.createUser);

module.exports = router;
