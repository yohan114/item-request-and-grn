const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReceivedItem = sequelize.define('ReceivedItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ri_number: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    mrn_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    mrn_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    item_details: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('item_details');
        if (!rawValue) return {};
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return {};
        }
      },
      set(value) {
        this.setDataValue('item_details', typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
    received_qty: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Verified', 'Rejected'),
      defaultValue: 'Pending'
    },
    grn_status: {
      type: DataTypes.ENUM('Pending', 'GRN Created', 'GRN Approved'),
      defaultValue: 'Pending'
    },
    grn_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'received_items',
    underscored: true
  });

  return ReceivedItem;
};
