const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { exportReport, summary, mrnSummary, grnSummary } = require('../controllers/reportController');

// All routes require authentication
router.use(authenticate);

// GET /api/reports/mrn-summary - Get MRN summary stats (all authenticated users)
router.get(
  '/mrn-summary',
  mrnSummary
);

// GET /api/reports/grn-summary - Get GRN summary stats (all authenticated users)
router.get(
  '/grn-summary',
  grnSummary
);

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
