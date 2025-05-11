const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpayController');
const { protect } = require('../middleware/auth');

// Routes công khai - Callbacks từ VNPay
router.get('/return', vnpayController.handleVNPayReturn);

// Lấy danh sách ngân hàng VNPay hỗ trợ
router.get('/banks', vnpayController.getBanks);

// Routes cho người dùng đã đăng nhập
// Tạo phiên thanh toán mới (dành riêng cho VNPay)
router.post('/create', protect, vnpayController.createPayment);

// Truy vấn thông tin giao dịch (dành riêng cho VNPay)
router.get('/query/:transactionId', protect, vnpayController.queryTransaction);

// Yêu cầu hoàn tiền (dành riêng cho VNPay)
router.post('/:paymentId/refund', protect, vnpayController.requestRefund);

module.exports = router; 