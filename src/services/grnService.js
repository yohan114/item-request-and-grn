const { GRN, MRN, sequelize } = require('../models');

const MAX_RETRIES = 3;

const generateGRNNumber = async (transaction) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `GRN-${dateStr}-`;

  const lastRecord = await GRN.findOne({
    where: {},
    order: [['grn_number', 'DESC']],
    attributes: ['grn_number'],
    ...(transaction ? { transaction } : {})
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

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await sequelize.transaction(async (transaction) => {
        const grn_number = await generateGRNNumber(transaction);

        const grn = await GRN.create({
          ...data,
          grn_number
        }, { transaction });

        return grn;
      });

      return result;
    } catch (error) {
      lastError = error;
      if (error.name === 'SequelizeUniqueConstraintError') {
        // Add small delay with jitter to avoid identical retries
        await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1) + Math.random() * 20));
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
