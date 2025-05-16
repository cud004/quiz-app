const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpayController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');
const { createPaymentSessionSchema, vnpayResponseSchema } = require('../validations/paymentValidation');

// Routes công khai - Callbacks từ VNPay
// Các route này được truy cập từ /api/payments/vnpay/...
router.get('/return', validateRequest(vnpayResponseSchema, 'query'), vnpayController.handleVNPayReturn);
router.post('/ipn', validateRequest(vnpayResponseSchema, 'query'), vnpayController.handleVNPayIPN);

// Lấy danh sách ngân hàng VNPay hỗ trợ
router.get('/banks', vnpayController.getBanks);

// Routes cho người dùng đã đăng nhập
// Tạo phiên thanh toán mới (dành riêng cho VNPay)
router.post('/create', 
  protect, 
  validateRequest(createPaymentSessionSchema), 
  vnpayController.createPayment
);

// Truy vấn thông tin giao dịch (dành riêng cho VNPay)
router.get('/query/:transactionId', protect, vnpayController.queryTransaction);

// Yêu cầu hoàn tiền (dành riêng cho VNPay)
router.post('/:paymentId/refund', protect, vnpayController.requestRefund);

module.exports = router; 