const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Đăng ký người dùng mới
router.post('/register', authController.register);

// Đăng nhập
router.post('/login', authController.login);

// Đổi mật khẩu (yêu cầu xác thực)
router.post('/change-password', auth, authController.changePassword);

// Lấy thông tin người dùng hiện tại (yêu cầu xác thực)
router.get('/me', auth, authController.getCurrentUser);

module.exports = router;
