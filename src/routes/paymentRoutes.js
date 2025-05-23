const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/auth');

// Public routes cho FE
router.get('/methods', paymentController.getPaymentMethods);
router.get('/banks/:method', paymentController.getBanks); // FE lấy danh sách bank theo gateway
router.get('/result', paymentController.handlePaymentResult);

router.get('/vnpay/callback', paymentController.handleVnpayCallback);
router.post('/vnpay/ipn', paymentController.handleVnpayIPN);
// General payment routes
// router.get('/callback/:method', paymentController.handleCallback); // Tạm thời tắt route động để tránh match nhầm
router.post('/ipn/:method', paymentController.handleIPN);
router.get('/status/:method', paymentController.getPaymentStatus);

// VNPay specific routes (for gateway only)



// MoMo specific routes (for gateway only)
router.get('/momo/callback', paymentController.handleMomoCallback);
router.post('/momo/ipn', paymentController.handleMomoIPN);

// Protected routes
router.get('/callback/vnpay', paymentController.handleVnpayCallback);
router.use(protect);
router.post('/create', paymentController.createPaymentSession);
router.get('/history', paymentController.getPaymentHistory);
router.get('/:paymentId', paymentController.getPaymentById);
router.get('/query/:transactionId', paymentController.getPaymentByTransactionId);

module.exports = router; 