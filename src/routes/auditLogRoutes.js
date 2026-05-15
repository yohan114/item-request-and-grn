const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { list, getByEntity } = require('../controllers/auditLogController');

// All routes require authentication
router.use(authenticate);

// GET /api/audit-logs - List audit logs (Admin/Manager only)
router.get(
  '/',
  authorize('Admin', 'Manager'),
  list
);

// GET /api/audit-logs/:entity_type/:entity_id - Get logs for specific entity
router.get(
  '/:entity_type/:entity_id',
  authorize('Admin', 'Manager'),
  getByEntity
);

module.exports = router;
