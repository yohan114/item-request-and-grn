const { MRN, sequelize } = require('../models');

const MAX_RETRIES = 3;

const generateMRNNumber = async (transaction) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MRN-${dateStr}-`;

  const lastRecord = await MRN.findOne({
    where: {},
    order: [['mrn_number', 'DESC']],
    attributes: ['mrn_number'],
    ...(transaction ? { transaction } : {})
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

const createMRNWithRetry = async (data) => {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await sequelize.transaction(async (transaction) => {
        const mrn_number = await generateMRNNumber(transaction);

        const mrn = await MRN.create({
          ...data,
          mrn_number
        }, { transaction });

        return mrn;
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
  generateMRNNumber,
  createMRNWithRetry
};
