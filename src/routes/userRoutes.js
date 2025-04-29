const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Routes chỉ dành cho admin
router.post('/', auth, adminAuth, userController.createUser);
router.get('/', auth, adminAuth, userController.getUsers);

// Routes có thể truy cập bởi người dùng đã xác thực
router.get('/:id', auth, userController.getUserById);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, adminAuth, userController.deleteUser);

module.exports = router;