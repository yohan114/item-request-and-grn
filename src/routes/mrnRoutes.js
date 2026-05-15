const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  create,
  list,
  getById,
  update,
  remove,
  approveMRN,
  rejectMRN,
  createValidation,
  updateValidation
} = require('../controllers/mrnController');

// All routes require authentication
router.use(authenticate);

// POST /api/mrns - Create (Store Keeper, Manager, Admin)
router.post(
  '/',
  authorize('Store Keeper', 'Manager', 'Admin'),
  validate(createValidation),
  create
);

// GET /api/mrns - List (all authenticated users)
router.get(
  '/',
  authorize('Admin', 'Manager', 'Engineer', 'Store Keeper', 'Viewer'),
  list
);

// GET /api/mrns/:id - Get by ID (all authenticated users)
router.get(
  '/:id',
  authorize('Admin', 'Manager', 'Engineer', 'Store Keeper', 'Viewer'),
  getById
);

// POST /api/mrns/:id/approve - Approve MRN (Engineer, Manager, Admin)
router.post(
  '/:id/approve',
  authorize('Engineer', 'Manager', 'Admin'),
  approveMRN
);

// POST /api/mrns/:id/reject - Reject MRN (Engineer, Manager, Admin)
router.post(
  '/:id/reject',
  authorize('Engineer', 'Manager', 'Admin'),
  rejectMRN
);

// PUT /api/mrns/:id - Update (Store Keeper, Manager, Admin)
router.put(
  '/:id',
  authorize('Store Keeper', 'Manager', 'Admin'),
  validate(updateValidation),
  update
);

// DELETE /api/mrns/:id - Delete (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  remove
);

module.exports = router;
