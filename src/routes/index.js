const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const localPurchaseRoutes = require('./localPurchaseRoutes');
const attachmentRoutes = require('./attachmentRoutes');
const pdfRoutes = require('./pdfRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/local-purchases', localPurchaseRoutes);
router.use('/', attachmentRoutes);
router.use('/', pdfRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

module.exports = router;
