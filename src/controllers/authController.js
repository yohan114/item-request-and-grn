const { body } = require('express-validator');
const { User } = require('../models');
const { hashPassword, comparePassword, generateToken } = require('../services/authService');
const { createAuditLog } = require('../utils/auditLogger');

const registerValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').optional().trim(),
  body('role').isIn(['Admin', 'Manager', 'Store Keeper', 'Viewer']).withMessage('Invalid role')
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    const existingUser = await User.findOne({
      where: { username }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const existingEmail = await User.findOne({
      where: { email }
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      full_name: full_name || null,
      role: role || 'Viewer'
    });

    await createAuditLog({
      user_id: req.user.id,
      action: 'CREATE_USER',
      entity_type: 'User',
      entity_id: user.id,
      new_values: { username, email, role: role || 'Viewer' },
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    await createAuditLog({
      user_id: user.id,
      action: 'LOGIN',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        is_active: req.user.is_active,
        created_at: req.user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { full_name, email } = req.body;
    const user = req.user;

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;

    await user.update(updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = req.user;

    const isValid = await comparePassword(current_password, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedPassword = await hashPassword(new_password);
    await user.update({ password: hashedPassword });

    await createAuditLog({
      user_id: user.id,
      action: 'CHANGE_PASSWORD',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  registerValidation,
  loginValidation,
  changePasswordValidation
};
