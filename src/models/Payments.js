const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPackage'
    },
    duration: {
      type: Number,
      min: 1
    },
    price: {
      type: Number
    }
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['vnpay', 'momo'],
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionTime: {
    type: Date,
    default: Date.now
  },
  paymentDetails: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
PaymentSchema.index({ user: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ transactionId: 1 }, { unique: true });
PaymentSchema.index({ transactionTime: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);