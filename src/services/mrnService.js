const { MRN } = require('../models');

const MAX_RETRIES = 3;

const generateMRNNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRN-${dateStr}-`;

  const lastRecord = await MRN.findOne({
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

const calculateTotalAmount = (quantity, unit_price) => {
  return parseFloat(quantity) * parseFloat(unit_price);
};

const createMRNWithRetry = async (data) => {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const mrn_number = await generateMRNNumber();

      const mrn = await MRN.create({
        ...data,
        mrn_number
      });

      return mrn;
    } catch (error) {
      lastError = error;
      if (error.name === 'SequelizeUniqueConstraintError') {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
};

module.exports = {
  generateMRNNumber,
  calculateTotalAmount,
  createMRNWithRetry
};
