const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const vnpayController = require('../controllers/vnpayController');
const momoController = require('../controllers/momoController');
const { protect, admin } = require('../middleware/auth');

// Routes công khai - Callbacks từ cổng thanh toán
router.get('/result', paymentController.handlePaymentResult);
router.get('/vnpay/return', vnpayController.handleVNPayReturn);
router.post('/vnpay/ipn', vnpayController.handleVNPayIPN);
router.get('/momo/return', momoController.handleMomoRedirect);
router.post('/momo/notify', momoController.handleMomoNotify);

// Routes cho người dùng đã đăng nhập
// Tạo phiên thanh toán mới (chung, sẽ điều hướng đến gateway tương ứng)
router.post('/create', protect, paymentController.createPaymentSession);

// Lấy danh sách phương thức thanh toán
router.get('/methods', paymentController.getPaymentMethods);

// Lấy lịch sử thanh toán
router.get('/history', protect, paymentController.getPaymentHistory);

// Truy vấn thông tin giao dịch
router.get('/query/:transactionId', protect, paymentController.queryTransaction);

// Lấy thông tin giao dịch theo ID
router.get('/:paymentId', protect, paymentController.getPaymentById);

module.exports = router; 