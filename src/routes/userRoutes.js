const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserValidation
} = require('../controllers/userController');

router.get('/', authenticate, authorize('Admin'), listUsers);
router.get('/:id', authenticate, authorize('Admin'), getUserById);
router.put('/:id', authenticate, authorize('Admin'), validate(updateUserValidation), updateUser);
router.delete('/:id', authenticate, authorize('Admin'), deleteUser);

module.exports = router;
