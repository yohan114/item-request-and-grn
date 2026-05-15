const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApprovalHistory = sequelize.define('ApprovalHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    local_purchase_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    action_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'approval_history',
    underscored: true,
    updatedAt: false
  });

  return ApprovalHistory;
};
