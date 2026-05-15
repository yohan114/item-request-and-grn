const { Sequelize } = require('sequelize');
const config = require('../../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

let sequelize;

if (dbConfig.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbConfig.storage,
    logging: dbConfig.logging,
    define: dbConfig.define
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: dbConfig.logging,
      define: dbConfig.define,
      pool: dbConfig.pool
    }
  );
}

// Import models
const User = require('./User')(sequelize);
const LocalPurchase = require('./LocalPurchase')(sequelize);
const Attachment = require('./Attachment')(sequelize);
const ApprovalHistory = require('./ApprovalHistory')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const MRN = require('./MRN')(sequelize);
const GRN = require('./GRN')(sequelize);
const ReceivedItem = require('./ReceivedItem')(sequelize);

// Define associations
User.hasMany(LocalPurchase, { foreignKey: 'created_by', as: 'purchases' });
LocalPurchase.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

LocalPurchase.hasMany(Attachment, { foreignKey: 'local_purchase_id', as: 'attachments' });
Attachment.belongsTo(LocalPurchase, { foreignKey: 'local_purchase_id', as: 'purchase' });

User.hasMany(Attachment, { foreignKey: 'uploaded_by', as: 'uploadedAttachments' });
Attachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

LocalPurchase.hasMany(ApprovalHistory, { foreignKey: 'local_purchase_id', as: 'approvalHistory' });
ApprovalHistory.belongsTo(LocalPurchase, { foreignKey: 'local_purchase_id', as: 'purchase' });

User.hasMany(ApprovalHistory, { foreignKey: 'action_by', as: 'approvalActions' });
ApprovalHistory.belongsTo(User, { foreignKey: 'action_by', as: 'actor' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// MRN associations
User.hasMany(MRN, { foreignKey: 'created_by', as: 'mrns' });
MRN.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// MRN approval associations
User.hasMany(MRN, { foreignKey: 'approved_by', as: 'approvedMrns' });
MRN.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// GRN associations
User.hasMany(GRN, { foreignKey: 'created_by', as: 'grns' });
GRN.belongsTo(User, { foreignKey: 'created_by', as: 'grnCreator' });

// MRN-GRN relationship
MRN.hasMany(GRN, { foreignKey: 'mrn_id', as: 'grns' });
GRN.belongsTo(MRN, { foreignKey: 'mrn_id', as: 'mrn' });

// MRN/GRN attachments
MRN.hasMany(Attachment, { foreignKey: 'mrn_id', as: 'attachments' });
Attachment.belongsTo(MRN, { foreignKey: 'mrn_id', as: 'mrnRecord' });

GRN.hasMany(Attachment, { foreignKey: 'grn_id', as: 'attachments' });
Attachment.belongsTo(GRN, { foreignKey: 'grn_id', as: 'grnRecord' });

// ReceivedItem associations
User.hasMany(ReceivedItem, { foreignKey: 'created_by', as: 'receivedItems' });
ReceivedItem.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
MRN.hasMany(ReceivedItem, { foreignKey: 'mrn_id', as: 'receivedItems' });
ReceivedItem.belongsTo(MRN, { foreignKey: 'mrn_id', as: 'mrn' });

const db = {
  sequelize,
  Sequelize,
  User,
  LocalPurchase,
  Attachment,
  ApprovalHistory,
  AuditLog,
  MRN,
  GRN,
  ReceivedItem
};

module.exports = db;
