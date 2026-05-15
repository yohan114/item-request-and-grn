const { LocalPurchase, MRN, GRN } = require('../models');
const { generateMRNSheet, generateGRNSheet, generateMRNSheetFromMRN, generateGRNSheetFromGRN } = require('../services/pdfService');

const getMRNSheet = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchase = await LocalPurchase.findByPk(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    const pdfBuffer = await generateMRNSheet(purchase);

    const filename = `MRN_${purchase.mrn_number || 'draft'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

const getGRNSheet = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchase = await LocalPurchase.findByPk(id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Local purchase record not found'
      });
    }

    const pdfBuffer = await generateGRNSheet(purchase);

    const filename = `GRN_${purchase.grn_number || 'draft'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

const getMRNSheetFromMRN = async (req, res, next) => {
  try {
    const { id } = req.params;

    const mrn = await MRN.findByPk(id);
    if (!mrn) {
      return res.status(404).json({
        success: false,
        message: 'MRN record not found'
      });
    }

    const pdfBuffer = await generateMRNSheetFromMRN(mrn);

    const filename = `MRN_${mrn.mrn_number || 'draft'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

const getGRNSheetFromGRN = async (req, res, next) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findByPk(id);
    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found'
      });
    }

    const pdfBuffer = await generateGRNSheetFromGRN(grn);

    const filename = `GRN_${grn.grn_number || 'draft'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getMRNSheet, getGRNSheet, getMRNSheetFromMRN, getGRNSheetFromGRN };
