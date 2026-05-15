const { AuditLog } = require('../models');

const createAuditLog = async ({ user_id, action, entity_type, entity_id, old_values, new_values, ip_address }) => {
  try {
    await AuditLog.create({
      user_id,
      action,
      entity_type,
      entity_id,
      old_values: old_values || null,
      new_values: new_values || null,
      ip_address: ip_address || null
    });
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
  }
};

module.exports = { createAuditLog };
