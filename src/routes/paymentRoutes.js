const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create a new payment
router.post('/', paymentController.createPayment);

// Get all payments
router.get('/', paymentController.getPayments);

// Get payment by ID
router.get('/:id', paymentController.getPaymentById);

// Update payment status
router.patch('/:id/status', paymentController.updatePaymentStatus);

// Process refund
router.post('/:id/refund', paymentController.processRefund);

module.exports = router;