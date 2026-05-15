const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LocalPurchase = sequelize.define('LocalPurchase', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    supplier_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    purchase_category: {
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
    mrn_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    grn_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    received_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('MRN Created', 'MRN Uploaded', 'Item Purchased', 'Goods Received at Stores', 'GRN Pending', 'Invoice Attached', 'GRN Completed', 'Pending Approval', 'Approved', 'Rejected', 'Completed'),
      defaultValue: 'MRN Created'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    store_received: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    invoice_attached: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    grn_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    manual_mrn_reference: {
      type: DataTypes.STRING,
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
    grn_remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'local_purchases',
    underscored: true,
    hooks: {
      beforeValidate: (purchase) => {
        if (purchase.quantity && purchase.unit_price) {
          purchase.total_amount = parseFloat(purchase.quantity) * parseFloat(purchase.unit_price);
        }
      }
    }
  });

  return LocalPurchase;
};
