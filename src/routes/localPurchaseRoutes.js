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
} = require('../controllers/localPurchaseController');

// All routes require authentication
router.use(authenticate);

// POST /api/local-purchases - Create (Store Keeper, Manager, Admin)
router.post(
  '/',
  authorize('Store Keeper', 'Manager', 'Admin'),
  validate(createValidation),
  create
);

// GET /api/local-purchases - List (all authenticated users)
router.get(
  '/',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  list
);

// GET /api/local-purchases/:id - Get by ID (all authenticated users)
router.get(
  '/:id',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  getById
);

// PUT /api/local-purchases/:id - Update (Store Keeper, Manager, Admin)
router.put(
  '/:id',
  authorize('Store Keeper', 'Manager', 'Admin'),
  validate(updateValidation),
  update
);

// DELETE /api/local-purchases/:id - Delete (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  remove
);

module.exports = router;
