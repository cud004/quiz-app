const Joi = require('joi'); // Import Joi
const paymentService = require('../services/paymentService'); // Import service

// Joi schema for creating a payment
const createPaymentSchema = Joi.object({
  exams: Joi.array().items(Joi.string()).required(),
  amount: Joi.number().min(0).required(),
  paymentMethod: Joi.string().required(),
  transactionId: Joi.string().optional()
});

// Joi schema for updating payment status
const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'completed', 'failed', 'refunded').required()
});

// User: Tạo thanh toán cho chính mình
exports.createUserPayment = async (req, res) => {
  const { error } = createPaymentSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const paymentData = {
      ...req.body,
      user: req.user._id, // Đảm bảo thanh toán chỉ được tạo cho người dùng hiện tại
      status: 'pending'
    };
    const payment = await paymentService.createPayment(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    if (error.errorCode) {
      return res.status(400).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// User: Lấy các thanh toán của người dùng hiện tại
exports.getUserPayments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const filters = {
    user: req.user._id,
    ...req.query
  };

  try {
    const payments = await paymentService.getPayments(page, limit, filters);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Lấy chi tiết một thanh toán
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    // Kiểm tra quyền truy cập nếu không phải admin
    if (req.user.role !== 'admin' && payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        errorCode: 'FORBIDDEN', 
        message: 'You do not have permission to access this payment' 
      });
    }
    
    res.json(payment);
  } catch (error) {
    if (error.errorCode === 'PAYMENT_NOT_FOUND') {
      return res.status(404).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// User: Cập nhật trạng thái thanh toán
exports.updatePaymentStatus = async (req, res) => {
  const { error } = updatePaymentStatusSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    // Kiểm tra quyền truy cập nếu không phải admin
    if (req.user.role !== 'admin' && payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        errorCode: 'FORBIDDEN', 
        message: 'You do not have permission to access this payment' 
      });
    }
    
    const updatedPayment = await paymentService.updatePaymentStatus(req.params.id, req.body.status);
    res.json(updatedPayment);
  } catch (error) {
    if (error.errorCode === 'PAYMENT_NOT_FOUND') {
      return res.status(404).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// User: Hoàn tiền
exports.processRefund = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    // Kiểm tra quyền truy cập nếu không phải admin
    if (req.user.role !== 'admin' && payment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        errorCode: 'FORBIDDEN', 
        message: 'You do not have permission to access this payment' 
      });
    }
    
    const refundedPayment = await paymentService.processRefund(req.params.id);
    res.json(refundedPayment);
  } catch (error) {
    if (error.errorCode === 'PAYMENT_NOT_FOUND' || error.errorCode === 'PAYMENT_ALREADY_REFUNDED') {
      return res.status(400).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};