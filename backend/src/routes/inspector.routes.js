const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const controller = require('../controllers/inspector.controller');

const isInspector = [authMiddleware, requireRole('inspector')];
const isEnforcement = [authMiddleware, requireRole('inspector', 'admin', 'superadmin')];
const isAdmin = [authMiddleware, requireRole('admin', 'superadmin')];

// Inspector field operations
router.get('/assignments', ...isInspector, controller.getMyAssignments);
router.get('/assignments/:id', ...isEnforcement, controller.getAssignment);
router.put('/assignments/:id/start', ...isEnforcement, controller.startAssignment);
router.put('/assignments/:id/complete', ...isEnforcement, controller.completeAssignment);

router.post('/violations', ...isEnforcement, controller.createViolation);
router.get('/violations', ...isEnforcement, controller.getViolations);
router.get('/violations/:id', ...isEnforcement, controller.getViolation);

router.get('/fishers', ...isEnforcement, controller.getFishersList);
router.get('/suspicious-fishers', ...isEnforcement, controller.getSuspiciousFishers);
router.get('/verify/:id', ...isEnforcement, controller.verifyFisherLicense);

// Admin enforcement management
router.get('/admin/inspections', ...isAdmin, controller.getAllInspections);
router.post('/admin/inspections', ...isAdmin, controller.createInspection);
router.get('/admin/inspectors', ...isAdmin, controller.getInspectors);
router.put('/admin/violations/:id', ...isAdmin, controller.updateViolationFine);

module.exports = router;
