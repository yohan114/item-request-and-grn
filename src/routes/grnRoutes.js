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
  createValidation,
  updateValidation
} = require('../controllers/grnController');

// All routes require authentication
router.use(authenticate);

// POST /api/grns - Create (Store Keeper, Manager, Admin)
router.post(
  '/',
  authorize('Store Keeper', 'Manager', 'Admin'),
  validate(createValidation),
  create
);

// GET /api/grns - List (all authenticated users)
router.get(
  '/',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  list
);

// GET /api/grns/:id - Get by ID (all authenticated users)
router.get(
  '/:id',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  getById
);

// PUT /api/grns/:id - Update (Store Keeper, Manager, Admin)
router.put(
  '/:id',
  authorize('Store Keeper', 'Manager', 'Admin'),
  validate(updateValidation),
  update
);

// DELETE /api/grns/:id - Delete (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  remove
);

module.exports = router;
