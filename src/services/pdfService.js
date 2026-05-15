const PDFDocument = require('pdfkit');

const COMPANY_NAME = 'LOCAL PURCHASE MANAGEMENT SYSTEM';

const drawHeader = (doc, title) => {
  doc.fontSize(18).font('Helvetica-Bold').text(COMPANY_NAME, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
};

const drawField = (doc, label, value, x, y, width) => {
  doc.font('Helvetica-Bold').fontSize(10).text(`${label}:`, x, y, { width: width || 200 });
  doc.font('Helvetica').fontSize(10).text(value || 'N/A', x + (width || 120), y, { width: 200 });
};

const drawSignatureTable = (doc) => {
  const startY = doc.y + 20;
  const colWidths = [120, 150, 120, 100];
  const headers = ['Role', 'Name', 'Signature', 'Date'];
  const rows = ['Prepared By', 'Checked By', 'Approved By', 'Received By'];

  doc.moveDown(2);
  doc.fontSize(11).font('Helvetica-Bold').text('SIGNATURES', 50, startY, { align: 'left' });
  doc.moveDown(0.5);

  const tableTop = doc.y;
  let currentX = 50;

  // Draw header row
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, currentX + 5, tableTop + 5, { width: colWidths[i] - 10 });
    currentX += colWidths[i];
  });

  // Draw header bottom line
  doc.moveTo(50, tableTop + 20).lineTo(540, tableTop + 20).stroke();

  // Draw rows
  doc.font('Helvetica').fontSize(9);
  let rowY = tableTop + 25;
  rows.forEach((role) => {
    currentX = 50;
    doc.text(role, currentX + 5, rowY + 5, { width: colWidths[0] - 10 });
    currentX += colWidths[0];
    // Empty cells for Name, Signature, Date
    for (let i = 1; i < 4; i++) {
      doc.text('', currentX + 5, rowY + 5, { width: colWidths[i] - 10 });
      currentX += colWidths[i];
    }
    rowY += 35;
    doc.moveTo(50, rowY).lineTo(540, rowY).stroke();
  });

  // Draw vertical lines
  currentX = 50;
  doc.moveTo(50, tableTop).lineTo(50, rowY).stroke();
  colWidths.forEach((width) => {
    currentX += width;
    doc.moveTo(currentX, tableTop).lineTo(currentX, rowY).stroke();
  });
  // Top line
  doc.moveTo(50, tableTop).lineTo(540, tableTop).stroke();
};

const generateMRNSheet = (localPurchase) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      drawHeader(doc, 'MATERIAL RECEIPT NOTE');

      // Document info
      const infoY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`MRN Number: `, 50, infoY);
      doc.font('Helvetica').text(localPurchase.mrn_number || 'N/A', 140, infoY);

      doc.font('Helvetica-Bold').text('Date: ', 350, infoY);
      doc.font('Helvetica').text(
        localPurchase.received_date || new Date().toISOString().slice(0, 10),
        390,
        infoY
      );

      doc.moveDown(1.5);

      // Supplier details
      doc.font('Helvetica-Bold').fontSize(11).text('SUPPLIER DETAILS', 50, doc.y);
      doc.moveDown(0.5);
      const supplierY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).text('Supplier Name:', 50, supplierY);
      doc.font('Helvetica').text(localPurchase.supplier_name || 'N/A', 160, supplierY);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Category:', 50, doc.y);
      doc.font('Helvetica').text(localPurchase.purchase_category || 'N/A', 160, doc.y);
      doc.moveDown(1);

      // Item details
      doc.font('Helvetica-Bold').fontSize(11).text('ITEM DETAILS', 50, doc.y);
      doc.moveDown(0.5);

      // Item table header
      const itemTableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Item Name', 55, itemTableTop + 5, { width: 150 });
      doc.text('Description', 180, itemTableTop + 5, { width: 130 });
      doc.text('Quantity', 320, itemTableTop + 5, { width: 60 });
      doc.text('Unit Price', 390, itemTableTop + 5, { width: 70 });
      doc.text('Total', 470, itemTableTop + 5, { width: 70 });

      doc.moveTo(50, itemTableTop).lineTo(545, itemTableTop).stroke();
      doc.moveTo(50, itemTableTop + 20).lineTo(545, itemTableTop + 20).stroke();

      // Item row
      const itemRowY = itemTableTop + 25;
      doc.font('Helvetica').fontSize(9);
      doc.text(localPurchase.item_name || 'N/A', 55, itemRowY, { width: 120 });
      doc.text(localPurchase.item_description || 'N/A', 180, itemRowY, { width: 130 });
      doc.text(String(localPurchase.quantity || 0), 320, itemRowY, { width: 60 });
      doc.text(String(localPurchase.unit_price || 0), 390, itemRowY, { width: 70 });
      doc.text(String(localPurchase.total_amount || 0), 470, itemRowY, { width: 70 });

      doc.moveTo(50, itemRowY + 20).lineTo(545, itemRowY + 20).stroke();

      // Vertical lines for item table
      [50, 175, 315, 385, 465, 545].forEach(x => {
        doc.moveTo(x, itemTableTop).lineTo(x, itemRowY + 20).stroke();
      });

      doc.y = itemRowY + 40;

      // Received date and remarks
      doc.font('Helvetica-Bold').fontSize(10).text('Received Date:', 50, doc.y);
      doc.font('Helvetica').text(localPurchase.received_date || 'N/A', 160, doc.y);
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Purchase Reason / Remarks:', 50, doc.y);
      doc.font('Helvetica').text(localPurchase.remarks || 'N/A', 210, doc.y);

      // Signature table
      drawSignatureTable(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateGRNSheet = (localPurchase) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      drawHeader(doc, 'GOODS RECEIVED NOTE');

      // Document info
      const infoY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('GRN Number: ', 50, infoY);
      doc.font('Helvetica').text(localPurchase.grn_number || 'N/A', 140, infoY);

      doc.font('Helvetica-Bold').text('Date: ', 350, infoY);
      doc.font('Helvetica').text(
        localPurchase.received_date || new Date().toISOString().slice(0, 10),
        390,
        infoY
      );

      doc.moveDown(1.5);

      // Supplier details
      doc.font('Helvetica-Bold').fontSize(11).text('SUPPLIER DETAILS', 50, doc.y);
      doc.moveDown(0.5);
      const supplierY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).text('Supplier Name:', 50, supplierY);
      doc.font('Helvetica').text(localPurchase.supplier_name || 'N/A', 160, supplierY);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Category:', 50, doc.y);
      doc.font('Helvetica').text(localPurchase.purchase_category || 'N/A', 160, doc.y);
      doc.moveDown(1);

      // Item details
      doc.font('Helvetica-Bold').fontSize(11).text('ITEM DETAILS', 50, doc.y);
      doc.moveDown(0.5);

      // Item table header
      const itemTableTop = doc.y;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Item Name', 55, itemTableTop + 5, { width: 120 });
      doc.text('Description', 170, itemTableTop + 5, { width: 120 });
      doc.text('Quantity', 295, itemTableTop + 5, { width: 60 });
      doc.text('Unit Price', 360, itemTableTop + 5, { width: 70 });
      doc.text('Total', 435, itemTableTop + 5, { width: 70 });

      doc.moveTo(50, itemTableTop).lineTo(545, itemTableTop).stroke();
      doc.moveTo(50, itemTableTop + 20).lineTo(545, itemTableTop + 20).stroke();

      // Item row
      const itemRowY = itemTableTop + 25;
      doc.font('Helvetica').fontSize(9);
      doc.text(localPurchase.item_name || 'N/A', 55, itemRowY, { width: 115 });
      doc.text(localPurchase.item_description || 'N/A', 170, itemRowY, { width: 120 });
      doc.text(String(localPurchase.quantity || 0), 295, itemRowY, { width: 60 });
      doc.text(String(localPurchase.unit_price || 0), 360, itemRowY, { width: 70 });
      doc.text(String(localPurchase.total_amount || 0), 435, itemRowY, { width: 70 });

      doc.moveTo(50, itemRowY + 20).lineTo(545, itemRowY + 20).stroke();

      // Vertical lines for item table
      [50, 165, 290, 355, 430, 545].forEach(x => {
        doc.moveTo(x, itemTableTop).lineTo(x, itemRowY + 20).stroke();
      });

      doc.y = itemRowY + 40;

      // Goods received quantities
      doc.font('Helvetica-Bold').fontSize(11).text('GOODS RECEIVED DETAILS', 50, doc.y);
      doc.moveDown(0.5);

      const quantity = parseFloat(localPurchase.quantity) || 0;
      const receivedQty = localPurchase.received_quantity != null ? parseFloat(localPurchase.received_quantity) : quantity;
      const checkedQty = localPurchase.checked_quantity != null ? parseFloat(localPurchase.checked_quantity) : quantity;
      const acceptedQty = localPurchase.accepted_quantity != null ? parseFloat(localPurchase.accepted_quantity) : quantity;
      const rejectedQty = localPurchase.rejected_quantity != null ? parseFloat(localPurchase.rejected_quantity) : 0;
      doc.font('Helvetica-Bold').fontSize(10).text('Received Quantity:', 50, doc.y);
      doc.font('Helvetica').text(String(receivedQty), 200, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Checked Quantity:', 50, doc.y);
      doc.font('Helvetica').text(String(checkedQty), 200, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Accepted Quantity:', 50, doc.y);
      doc.font('Helvetica').text(String(acceptedQty), 200, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Rejected Quantity:', 50, doc.y);
      doc.font('Helvetica').text(String(rejectedQty), 200, doc.y);
      doc.moveDown(0.8);

      // Remarks
      doc.font('Helvetica-Bold').text('GRN Remarks:', 50, doc.y);
      doc.font('Helvetica').text(localPurchase.grn_remarks || localPurchase.remarks || 'N/A', 160, doc.y);

      // Signature table
      drawSignatureTable(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateMRNSheet, generateGRNSheet };
