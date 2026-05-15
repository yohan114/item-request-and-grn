const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MRN = sequelize.define('MRN', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    mrn_number: {
      type: DataTypes.STRING,
      unique: true,
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
    purchase_category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    purchase_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Submitted', 'Purchased', 'Delivered', 'Completed'),
      defaultValue: 'Draft'
    },
    manual_mrn_reference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    received_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'mrns',
    underscored: true,
    hooks: {
      beforeValidate: (mrn) => {
        if (mrn.quantity && mrn.unit_price) {
          mrn.total_amount = parseFloat(mrn.quantity) * parseFloat(mrn.unit_price);
        }
      }
    }
  });

  return MRN;
};
