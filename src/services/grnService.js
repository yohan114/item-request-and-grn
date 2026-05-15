const { GRN, MRN } = require('../models');

const MAX_RETRIES = 3;

const generateGRNNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `GRN-${dateStr}-`;

  const lastRecord = await GRN.findOne({
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

const createGRNWithRetry = async (data) => {
  let lastError;

  // Validate mrn_id if provided
  if (data.mrn_id) {
    const mrn = await MRN.findByPk(data.mrn_id);
    if (!mrn) {
      const error = new Error('Referenced MRN not found');
      error.status = 400;
      throw error;
    }
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const grn_number = await generateGRNNumber();

      const grn = await GRN.create({
        ...data,
        grn_number
      });

      return grn;
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
  generateGRNNumber,
  createGRNWithRetry
};
