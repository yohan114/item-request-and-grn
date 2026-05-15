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
    invoice_attachment: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Inspection', 'Completed', 'Rejected'),
      defaultValue: 'Pending'
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
