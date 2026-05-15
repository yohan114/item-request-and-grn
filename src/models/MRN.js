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
    request_for: {
      type: DataTypes.STRING,
      allowNull: false
    },
    items: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('items');
        if (!rawValue) return [];
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('items', typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
    request_person_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    request_person_designation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    approval_person_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    approval_person_designation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Draft', 'Submitted', 'Purchased', 'Delivered', 'Completed'),
      defaultValue: 'Draft'
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    tableName: 'mrns',
    underscored: true
  });

  return MRN;
};
