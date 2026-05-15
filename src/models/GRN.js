const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GRN = sequelize.define('GRN', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    grn_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    mrn_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    supplier_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    item_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    received_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    checked_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    accepted_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    rejected_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    store_confirmation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    received_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Inspection', 'Completed', 'Rejected'),
      defaultValue: 'Pending'
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    invoice_attached: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'grns',
    underscored: true
  });

  return GRN;
};
