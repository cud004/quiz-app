const express = require('express');
const router = express.Router();
const momoController = require('../controllers/momoController');
const { protect } = require('../middleware/auth');

// Routes công khai - Callbacks từ MoMo
router.post('/notify', momoController.handleMomoReturn);
router.get('/return', momoController.handleMomoRedirect);

// Routes cho người dùng đã đăng nhập
// Tạo phiên thanh toán mới (dành riêng cho MoMo)
router.post('/create', protect, momoController.createPayment);

// Truy vấn thông tin giao dịch (dành riêng cho MoMo)
router.get('/query/:transactionId', protect, momoController.queryTransaction);

// Yêu cầu hoàn tiền (dành riêng cho MoMo)
router.post('/:paymentId/refund', protect, momoController.requestRefund);

module.exports = router; 