const { Op } = require('sequelize');
const { ReceivedItem, sequelize } = require('../models');

const MAX_RETRIES = 3;

const generateRINumber = async (transaction) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RI-${dateStr}-`;

  const lastRecord = await ReceivedItem.findOne({
    where: { ri_number: { [Op.like]: `${prefix}%` } },
    order: [['ri_number', 'DESC']],
    attributes: ['ri_number'],
    ...(transaction ? { transaction } : {})
  });

  let sequence = 1;
  if (lastRecord && lastRecord.ri_number) {
    const lastSeq = parseInt(lastRecord.ri_number.split('-').pop(), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const createReceivedItemWithRetry = async (data) => {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await sequelize.transaction(async (transaction) => {
        const ri_number = await generateRINumber(transaction);

        const receivedItem = await ReceivedItem.create({
          ...data,
          ri_number
        }, { transaction });

        return receivedItem;
      });

      return result;
    } catch (error) {
      lastError = error;
      if (error.name === 'SequelizeUniqueConstraintError') {
        await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1) + Math.random() * 20));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
};

module.exports = {
  generateRINumber,
  createReceivedItemWithRetry
};
