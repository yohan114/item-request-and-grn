const { LocalPurchase } = require('../models');
const { generateMRNSheet, generateGRNSheet } = require('../services/pdfService');

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

module.exports = { getMRNSheet, getGRNSheet };
