const { body } = require('express-validator');
const { User } = require('../models');
const { hashPassword } = require('../services/authService');
const { createAuditLog } = require('../utils/auditLogger');

const updateUserValidation = [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('full_name').optional().trim(),
  body('role').optional().isIn(['Admin', 'Manager', 'Store Keeper', 'Viewer']).withMessage('Invalid role'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
];

const listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { email, full_name, role, is_active, password } = req.body;
    const oldValues = {
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    };

    const updates = {};
    if (email !== undefined) updates.email = email;
    if (full_name !== undefined) updates.full_name = full_name;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    if (password) updates.password = await hashPassword(password);

    await user.update(updates);

    await createAuditLog({
      user_id: req.user.id,
      action: 'UPDATE_USER',
      entity_type: 'User',
      entity_id: user.id,
      old_values: oldValues,
      new_values: updates,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.update({ is_active: false });

    await createAuditLog({
      user_id: req.user.id,
      action: 'DELETE_USER',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserValidation
};
