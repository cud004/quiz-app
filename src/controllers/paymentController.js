const Joi = require('joi'); // Import Joi
const paymentService = require('../services/paymentService'); // Import service

// Joi schema for creating a payment
const createPaymentSchema = Joi.object({
  user: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required',
  }),
  exams: Joi.array().items(Joi.string().required()).min(1).required().messages({
    'array.min': 'At least one exam ID is required',
    'any.required': 'Exams are required',
  }),
  paymentMethod: Joi.string().valid('vnpay', 'momo', 'other').required().messages({
    'any.only': 'Payment method must be one of [vnpay, momo, other]',
    'any.required': 'Payment method is required',
  }),
  transactionId: Joi.string().required().messages({
    'string.empty': 'Transaction ID is required',
    'any.required': 'Transaction ID is required',
  }),
});

// Joi schema for validating query parameters in getPayments
const getPaymentsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.min': 'Limit must be at least 1',
  }),
  user: Joi.string().optional(),
  status: Joi.string().valid('pending', 'completed', 'failed', 'refunded').optional(),
  paymentMethod: Joi.string().valid('vnpay', 'momo', 'other').optional(),
});

// Joi schema for updating payment status
const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'completed', 'failed', 'refunded').required().messages({
    'any.only': 'Status must be one of [pending, completed, failed, refunded]',
    'any.required': 'Status is required',
  }),
});

// Create a new payment
exports.createPayment = async (req, res) => {
  try {
    const { error } = createPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { user, exams, paymentMethod, transactionId } = req.body;

    const payment = await paymentService.createPayment({
      user,
      exams,
      paymentMethod,
      transactionId,
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ errorCode: error.errorCode || 'UNKNOWN_ERROR', message: error.message });
  }
};

// Get all payments
exports.getPayments = async (req, res) => {
  try {
    const { error, value } = getPaymentsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { page, limit, user, status, paymentMethod } = value;
    const filters = { user, status, paymentMethod };

    const payments = await paymentService.getPayments(page, limit, filters);

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await paymentService.getPaymentById(id);

    res.status(200).json(payment);
  } catch (error) {
    res.status(404).json({ errorCode: error.errorCode || 'UNKNOWN_ERROR', message: error.message });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = updatePaymentStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { status } = req.body;

    const payment = await paymentService.updatePaymentStatus(id, status);

    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ errorCode: error.errorCode || 'UNKNOWN_ERROR', message: error.message });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await paymentService.processRefund(id);

    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ errorCode: error.errorCode || 'UNKNOWN_ERROR', message: error.message });
  }
};