const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMRNSheet, getGRNSheet } = require('../controllers/pdfController');

// Generate and download MRN Sheet - all authenticated users
router.get(
  '/local-purchases/:id/mrn-sheet',
  authenticate,
  getMRNSheet
);

// Generate and download GRN Sheet - all authenticated users
router.get(
  '/local-purchases/:id/grn-sheet',
  authenticate,
  getGRNSheet
);

module.exports = router;
