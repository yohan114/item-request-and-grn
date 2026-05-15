const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');
const {
  uploadAttachment,
  listAttachments,
  downloadAttachment,
  deleteAttachment
} = require('../controllers/attachmentController');

// Upload attachment - Store Keeper, Manager, Admin
router.post(
  '/local-purchases/:id/attachments',
  authenticate,
  authorize('Admin', 'Manager', 'Store Keeper'),
  upload.single('file'),
  uploadAttachment
);

// List attachments for a record - all authenticated users
router.get(
  '/local-purchases/:id/attachments',
  authenticate,
  listAttachments
);

// Download attachment - all authenticated users
router.get(
  '/attachments/:id/download',
  authenticate,
  downloadAttachment
);

// Delete attachment - Admin and Manager only
router.delete(
  '/attachments/:id',
  authenticate,
  authorize('Admin', 'Manager'),
  deleteAttachment
);

module.exports = router;
