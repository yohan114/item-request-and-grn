/**
 * Initial database schema migration
 * Creates all 5 tables: users, local_purchases, attachments, approval_history, audit_logs
 */
require('dotenv').config();

const { sequelize } = require('../src/models');

const migrate = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  migrate();
}

module.exports = { migrate };
