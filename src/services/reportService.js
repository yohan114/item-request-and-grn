const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const { LocalPurchase, User, sequelize } = require('../models');

const buildWhereClause = (filters) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.purchase_category) {
    where.purchase_category = filters.purchase_category;
  }
  if (filters.supplier_name) {
    where.supplier_name = { [Op.like]: `%${filters.supplier_name}%` };
  }
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) {
      where.created_at[Op.gte] = new Date(filters.date_from);
    }
    if (filters.date_to) {
      where.created_at[Op.lte] = new Date(filters.date_to + 'T23:59:59.999Z');
    }
  }

  return where;
};

const generateCSVReport = async (filters = {}) => {
  const where = buildWhereClause(filters);

  const records = await LocalPurchase.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'full_name'] }
    ],
    order: [['created_at', 'DESC']]
  });

  const headers = [
    'MRN Number', 'GRN Number', 'Supplier Name', 'Purchase Category',
    'Item Name', 'Quantity', 'Unit Price', 'Total Amount',
    'Status', 'Invoice Number', 'Invoice Date', 'Received Date',
    'Created By', 'Created At'
  ];

  let csv = headers.join(',') + '\n';

  for (const record of records) {
    const row = [
      record.mrn_number || '',
      record.grn_number || '',
      `"${(record.supplier_name || '').replace(/"/g, '""')}"`,
      `"${(record.purchase_category || '').replace(/"/g, '""')}"`,
      `"${(record.item_name || '').replace(/"/g, '""')}"`,
      record.quantity,
      record.unit_price,
      record.total_amount,
      record.status,
      record.invoice_number || '',
      record.invoice_date || '',
      record.received_date || '',
      record.creator ? record.creator.full_name : '',
      record.createdAt ? record.createdAt.toISOString() : ''
    ];
    csv += row.join(',') + '\n';
  }

  return csv;
};

const generatePDFReport = async (filters = {}) => {
  const where = buildWhereClause(filters);

  const records = await LocalPurchase.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'username', 'full_name'] }
    ],
    order: [['created_at', 'DESC']]
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Title
    doc.fontSize(16).text('Local Purchases Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();

    // Summary info
    doc.fontSize(10).text(`Total Records: ${records.length}`);
    doc.moveDown();

    // Table headers
    const tableTop = doc.y;
    const columns = [
      { header: 'MRN', width: 90 },
      { header: 'Supplier', width: 100 },
      { header: 'Item', width: 100 },
      { header: 'Qty', width: 40 },
      { header: 'Unit Price', width: 60 },
      { header: 'Total', width: 60 },
      { header: 'Status', width: 70 },
      { header: 'Date', width: 80 }
    ];

    let xPos = 30;
    doc.font('Helvetica-Bold').fontSize(8);
    for (const col of columns) {
      doc.text(col.header, xPos, tableTop, { width: col.width });
      xPos += col.width;
    }

    doc.moveDown();
    let yPos = doc.y;

    doc.font('Helvetica').fontSize(7);
    for (const record of records) {
      if (yPos > 550) {
        doc.addPage();
        yPos = 30;
      }

      xPos = 30;
      const rowData = [
        record.mrn_number || '-',
        (record.supplier_name || '').substring(0, 15),
        (record.item_name || '').substring(0, 15),
        String(record.quantity),
        String(record.unit_price),
        String(record.total_amount),
        record.status,
        record.createdAt ? record.createdAt.toISOString().split('T')[0] : ''
      ];

      for (let i = 0; i < columns.length; i++) {
        doc.text(rowData[i], xPos, yPos, { width: columns[i].width });
        xPos += columns[i].width;
      }

      yPos += 15;
    }

    doc.end();
  });
};

const getSummaryStats = async (filters = {}) => {
  const where = buildWhereClause(filters);

  const records = await LocalPurchase.findAll({ where });

  const total = records.length;
  const byStatus = {};
  const byCategory = {};
  let totalAmount = 0;

  for (const record of records) {
    // By status
    byStatus[record.status] = (byStatus[record.status] || 0) + 1;

    // By category
    byCategory[record.purchase_category] = (byCategory[record.purchase_category] || 0) + 1;

    // Total amount
    totalAmount += parseFloat(record.total_amount) || 0;
  }

  return {
    total_records: total,
    by_status: byStatus,
    by_category: byCategory,
    total_amount: totalAmount
  };
};

module.exports = {
  generateCSVReport,
  generatePDFReport,
  getSummaryStats
};
