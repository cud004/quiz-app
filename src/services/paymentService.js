const mongoose = require('mongoose');
const Exam = require('../models/Exam'); // Import Exam model
const Payment = require('../models/Payments'); // Import Payment model

// Create a new payment for multiple exams
exports.createPayment = async ({ user, exams, paymentMethod, transactionId }) => {
  const existingPayment = await Payment.findOne({ transactionId });
  if (existingPayment) {
    const error = new Error('Transaction ID already exists');
    error.errorCode = 'DUPLICATE_TRANSACTION';
    throw error;
  }

  const examDocs = await Exam.find({ _id: { $in: exams }, isActive: true });
  if (examDocs.length !== exams.length) {
    const error = new Error('Some exams are invalid or inactive');
    error.errorCode = 'INVALID_EXAMS';
    throw error;
  }

  const totalAmount = examDocs.reduce((sum, exam) => {
    if (exam.price === undefined || exam.price === null) {
      const error = new Error(`Exam "${exam.title}" does not have a price`);
      error.errorCode = 'MISSING_PRICE';
      throw error;
    }
    return sum + exam.price;
  }, 0);

  const payment = new Payment({
    user,
    exams,
    amount: totalAmount,
    paymentMethod,
    transactionId,
    status: 'pending',
  });

  await payment.save();

  return await Payment.findById(payment._id)
    .populate('user', 'name email')
    .populate('exams', 'title price');
};

// Get all payments
exports.getPayments = async (page, limit, filters) => {
    try {
      const skip = (page - 1) * limit;
  
      // Loại bỏ các trường undefined khỏi filters
      const query = {};
      if (filters.user) query.user = filters.user;
      if (filters.status) query.status = filters.status;
      if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
  
      const payments = await Payment.find(query)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('exams', 'title price');
  
      const total = await Payment.countDocuments(query);
  
      console.log({ query, skip, limit, payments });
      return { payments, total, page, limit };
    } catch (error) {
      console.error('Error in getPayments:', error);
      throw error;
    }
  };

// Get payment by ID
exports.getPaymentById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid payment ID');
    error.errorCode = 'INVALID_ID';
    throw error;
  }

  const payment = await Payment.findById(id)
    .populate('user', 'name email')
    .populate('exams', 'title price');

  if (!payment) {
    const error = new Error('Payment not found');
    error.errorCode = 'PAYMENT_NOT_FOUND';
    throw error;
  }

  return payment;
};

// Update payment status
exports.updatePaymentStatus = async (id, status) => {
  const payment = await Payment.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  ).populate('user', 'name email')
    .populate('exams', 'title price');

  if (!payment) {
    const error = new Error('Payment not found');
    error.errorCode = 'PAYMENT_NOT_FOUND';
    throw error;
  }

  return payment;
};

// Process refund
exports.processRefund = async (id) => {
  const payment = await Payment.findById(id);

  if (!payment) {
    const error = new Error('Payment not found');
    error.errorCode = 'PAYMENT_NOT_FOUND';
    throw error;
  }

  if (payment.status !== 'completed') {
    const error = new Error('Only completed payments can be refunded');
    error.errorCode = 'INVALID_REFUND';
    throw error;
  }

  payment.status = 'refunded';
  await payment.save();

  return payment;
};