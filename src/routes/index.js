const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const localPurchaseRoutes = require('./localPurchaseRoutes');
const attachmentRoutes = require('./attachmentRoutes');
const pdfRoutes = require('./pdfRoutes');
const approvalRoutes = require('./approvalRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const reportRoutes = require('./reportRoutes');
const mrnRoutes = require('./mrnRoutes');
const grnRoutes = require('./grnRoutes');
const receivedItemRoutes = require('./receivedItemRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/local-purchases', localPurchaseRoutes);
router.use('/local-purchases', approvalRoutes);
router.use('/', attachmentRoutes);
router.use('/', pdfRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/reports', reportRoutes);
router.use('/mrns', mrnRoutes);
router.use('/grns', grnRoutes);
router.use('/received-items', receivedItemRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

module.exports = router;
