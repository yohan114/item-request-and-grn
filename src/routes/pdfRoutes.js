const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMRNSheet, getGRNSheet, getMRNSheetFromMRN, getGRNSheetFromGRN } = require('../controllers/pdfController');

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

// Generate MRN Sheet from MRN model
router.get(
  '/mrns/:id/mrn-sheet',
  authenticate,
  getMRNSheetFromMRN
);

// Generate GRN Sheet from GRN model
router.get(
  '/grns/:id/grn-sheet',
  authenticate,
  getGRNSheetFromGRN
);

module.exports = router;
