const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { approve, reject, complete, history } = require('../controllers/approvalController');

// All routes require authentication
router.use(authenticate);

// POST /api/local-purchases/:id/approve - Approve (Manager/Admin)
router.post(
  '/:id/approve',
  authorize('Manager', 'Admin'),
  approve
);

// POST /api/local-purchases/:id/reject - Reject (Manager/Admin, remarks required)
router.post(
  '/:id/reject',
  authorize('Manager', 'Admin'),
  reject
);

// POST /api/local-purchases/:id/complete - Complete (Manager/Admin)
router.post(
  '/:id/complete',
  authorize('Manager', 'Admin'),
  complete
);

// GET /api/local-purchases/:id/approval-history - Get approval history
router.get(
  '/:id/approval-history',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  history
);

module.exports = router;
