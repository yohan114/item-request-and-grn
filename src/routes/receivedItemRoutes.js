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
} = require('../controllers/receivedItemController');

// Middleware to parse item_details JSON string from multipart form data
const parseItemDetailsField = (req, res, next) => {
  if (req.body.item_details && typeof req.body.item_details === 'string') {
    try {
      req.body.item_details = JSON.parse(req.body.item_details);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item_details format'
      });
    }
  }
  next();
};

// All routes require authentication
router.use(authenticate);

// POST /api/received-items - Create (Store Keeper, Manager, Admin)
router.post(
  '/',
  authorize('Store Keeper', 'Manager', 'Admin'),
  upload.single('image'),
  parseItemDetailsField,
  validate(createValidation),
  create
);

// GET /api/received-items - List (all authenticated users)
router.get(
  '/',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  list
);

// GET /api/received-items/:id - Get by ID (all authenticated users)
router.get(
  '/:id',
  authorize('Admin', 'Manager', 'Store Keeper', 'Viewer'),
  getById
);

// PUT /api/received-items/:id - Update (Store Keeper, Manager, Admin)
router.put(
  '/:id',
  authorize('Store Keeper', 'Manager', 'Admin'),
  upload.single('image'),
  parseItemDetailsField,
  validate(updateValidation),
  update
);

// DELETE /api/received-items/:id - Delete (Admin only)
router.delete(
  '/:id',
  authorize('Admin'),
  remove
);

module.exports = router;
