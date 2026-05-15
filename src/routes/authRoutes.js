const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  registerValidation,
  loginValidation,
  changePasswordValidation
} = require('../controllers/authController');

router.post('/register', authenticate, authorize('Admin'), validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, validate(changePasswordValidation), changePassword);

module.exports = router;
