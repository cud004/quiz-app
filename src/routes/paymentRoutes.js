const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// User routes (protected by auth)
router.post('/', auth, paymentController.createUserPayment);
router.get('/my-payments', auth, paymentController.getUserPayments);
router.get('/:id', auth, paymentController.getPaymentById);

// Admin routes (protected by auth and adminAuth)
// Tạm thởi comment các routes chưa có controller function
// router.post('/admin', auth, adminAuth, paymentController.createPayment);
// router.get('/admin/all', auth, adminAuth, paymentController.getPayments);
router.put('/admin/:id/status', auth, adminAuth, paymentController.updatePaymentStatus);
// router.post('/admin/:id/refund', auth, adminAuth, paymentController.refundPayment);
router.post('/admin/:id/refund', auth, adminAuth, paymentController.processRefund);

module.exports = router;