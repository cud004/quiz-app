const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/auth');

// Lấy danh sách phương thức thanh toán
router.get('/methods', paymentController.getPaymentMethods);

// Routes cho người dùng đã đăng nhập
// Tạo phiên thanh toán mới (chung, sẽ điều hướng đến gateway tương ứng)
router.post('/create', protect, paymentController.createPaymentSession);

// Lấy lịch sử thanh toán
router.get('/history', protect, paymentController.getPaymentHistory);

// Truy vấn thông tin giao dịch
router.get('/query/:transactionId', protect, paymentController.queryTransaction);

// Lấy thông tin giao dịch theo ID
router.get('/:paymentId', protect, paymentController.getPaymentById);

module.exports = router; 