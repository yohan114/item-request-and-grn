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
    supplier_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    project_name: {
      type: DataTypes.STRING,
      allowNull: true
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
      type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Received Pending', 'Partially Received', 'Fully Received', 'Closed'),
      defaultValue: 'Draft'
    },
    approval_status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      defaultValue: 'Pending'
    },
    approved_by: {
      type: DataTypes.UUID,
      allowNull: true
    },
    approval_remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    approval_history: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('approval_history');
        if (!rawValue) return [];
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return [];
        }
      },
      set(value) {
        this.setDataValue('approval_history', typeof value === 'string' ? value : JSON.stringify(value));
      }
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
