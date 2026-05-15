const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  create,
  list,
  getById,
  update,
  remove,
  createValidation,
  updateValidation
} = require('../controllers/grnController');

// Middleware to parse items JSON string from multipart form data
const parseItemsField = (req, res, next) => {
  if (req.body.items && typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format'
      });
    }
  }
  next();
};

// All routes require authentication
router.use(authenticate);

// POST /api/grns - Create (Store Keeper, Manager, Admin)
router.post(
  '/',
  authorize('Store Keeper', 'Manager', 'Admin'),
  upload.single('invoice_file'),
  parseItemsField,
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
  upload.single('invoice_file'),
  parseItemsField,
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
