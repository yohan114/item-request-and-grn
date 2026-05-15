const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { exportReport, summary } = require('../controllers/reportController');

// All routes require authentication
router.use(authenticate);

// GET /api/reports/local-purchases - Export report (Manager/Admin only)
router.get(
  '/local-purchases',
  authorize('Manager', 'Admin'),
  exportReport
);

// GET /api/reports/summary - Get summary stats (Manager/Admin only)
router.get(
  '/summary',
  authorize('Manager', 'Admin'),
  summary
);

module.exports = router;
