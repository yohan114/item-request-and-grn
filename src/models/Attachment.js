const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attachment = sequelize.define('Attachment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    local_purchase_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    attachment_type: {
      type: DataTypes.ENUM('MRN', 'GRN', 'Invoice', 'Delivery Note', 'Quotation', 'Payment Proof', 'Signed MRN Sheet', 'Signed GRN Sheet', 'Other'),
      allowNull: false
    },
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'attachments',
    underscored: true,
    updatedAt: false
  });

  return Attachment;
};
