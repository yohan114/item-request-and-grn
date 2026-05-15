const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const localPurchaseRoutes = require('./localPurchaseRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/local-purchases', localPurchaseRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

module.exports = router;
