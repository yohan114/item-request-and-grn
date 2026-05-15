const { generateCSVReport, generatePDFReport, getSummaryStats } = require('../services/reportService');

const exportReport = async (req, res, next) => {
  try {
    const { format = 'csv', status, purchase_category, supplier_name, date_from, date_to } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (purchase_category) filters.purchase_category = purchase_category;
    if (supplier_name) filters.supplier_name = supplier_name;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=local-purchases-report.pdf');
      return res.send(pdfBuffer);
    }

    // Default to CSV
    const csv = await generateCSVReport(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=local-purchases-report.csv');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

const summary = async (req, res, next) => {
  try {
    const { status, purchase_category, supplier_name, date_from, date_to } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (purchase_category) filters.purchase_category = purchase_category;
    if (supplier_name) filters.supplier_name = supplier_name;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    const stats = await getSummaryStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportReport,
  summary
};
