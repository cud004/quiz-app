const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID là bắt buộc']
  },
  subscription: {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPackage',
      required: [true, 'Package ID là bắt buộc']
    },
    duration: {
      type: Number,
      min: [1, 'Thời hạn gói tối thiểu là 1 tháng'],
      required: [true, 'Thời hạn gói là bắt buộc']
    },
    price: {
      type: Number,
      min: [0, 'Giá gói không được âm'],
      required: [true, 'Giá gói là bắt buộc']
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Tổng số tiền là bắt buộc'],
    min: [0, 'Tổng số tiền không được âm']
  },
  paymentMethod: {
    type: String,
    enum: {
      values: ['vnpay', 'momo'],
      message: 'Phương thức thanh toán {VALUE} không được hỗ trợ'
    },
    required: [true, 'Phương thức thanh toán là bắt buộc']
  },
  transactionId: {
    type: String,
    required: [true, 'Mã giao dịch là bắt buộc'],
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      message: 'Trạng thái {VALUE} không hợp lệ'
    },
    default: 'pending'
  },
  paymentDetails: {
    description: String,
    returnUrl: String,
    ipAddress: String,
    bankCode: String,
    responseCode: String,
    orderInfo: String,
    requestId: String,
    transactionNo: String,
    bankTranNo: String,
    cardType: String,
    payDate: Date,
    gatewayResponse: Object,
    error: String,
    refundInfo: {
      type: Object,
      required: false,
      default: null,
      amount: Number,
      reason: String,
      requestDate: Date,
      status: String
    }
  },
  transactionTime: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ status: 1 });

PaymentSchema.index({ transactionTime: -1 });
PaymentSchema.index({ 'paymentDetails.bankTranNo': 1 });

// Middleware trước khi lưu
PaymentSchema.pre('save', function(next) {
  // Cập nhật thời gian theo trạng thái
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'completed':
        this.completedAt = now;
        break;
      case 'failed':
        this.failedAt = now;
        break;
      case 'refunded':
        this.refundedAt = now;
        break;
      case 'cancelled':
        this.cancelledAt = now;
        break;
    }
  }
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema); 