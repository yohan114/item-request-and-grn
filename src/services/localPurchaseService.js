const { LocalPurchase } = require('../models');

const MAX_RETRIES = 3;

const generateMRN = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRN-${dateStr}-`;

  const lastRecord = await LocalPurchase.findOne({
    where: {},
    order: [['created_at', 'DESC']],
    attributes: ['mrn_number']
  });

  let sequence = 1;
  if (lastRecord && lastRecord.mrn_number) {
    const lastSeq = parseInt(lastRecord.mrn_number.split('-').pop(), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const generateGRN = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `GRN-${dateStr}-`;

  const lastRecord = await LocalPurchase.findOne({
    where: {},
    order: [['created_at', 'DESC']],
    attributes: ['grn_number']
  });

  let sequence = 1;
  if (lastRecord && lastRecord.grn_number) {
    const lastSeq = parseInt(lastRecord.grn_number.split('-').pop(), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const calculateTotalAmount = (quantity, unit_price) => {
  return parseFloat(quantity) * parseFloat(unit_price);
};

const createWithRetry = async (purchaseData) => {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const mrn_number = await generateMRN();
      const grn_number = await generateGRN();

      const purchase = await LocalPurchase.create({
        ...purchaseData,
        mrn_number,
        grn_number
      });

      return purchase;
    } catch (error) {
      lastError = error;
      if (error.name === 'SequelizeUniqueConstraintError') {
        // Retry with a new sequence number
        continue;
      }
      throw error;
    }
  }

  throw lastError;
};

module.exports = {
  generateMRN,
  generateGRN,
  calculateTotalAmount,
  createWithRetry
};
