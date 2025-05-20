const mongoose = require('mongoose');
const { paymentRecordSchema } = require('../validations/paymentValidation');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPackage',
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
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
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  paymentDetails: {
    description: String,
    returnUrl: String,
    cancelUrl: String,
    ipAddress: String,
    bankCode: String,
    gatewayResponse: Object,
    error: String
  },
  completedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtuals
paymentSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

paymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'SUCCESS' && this.completedAt;
});

// Methods
paymentSchema.methods.complete = async function(gatewayData) {
  this.status = 'SUCCESS';
  this.completedAt = new Date();
  this.paymentDetails.gatewayResponse = gatewayData;
  return this.save();
};

paymentSchema.methods.fail = async function(error) {
  this.status = 'FAILED';
  this.paymentDetails.error = error.message || error;
  return this.save();
};

paymentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.isExpired = this.isExpired;
  obj.isCompleted = this.isCompleted;
  return obj;
};

// Statics
paymentSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId })
    .populate('user', 'name email')
    .populate('subscription.package');
};

paymentSchema.statics.findPendingPayments = function() {
  return this.find({
    status: 'PENDING',
    expiresAt: { $gt: new Date() }
  }).populate('user', 'name email');
};

paymentSchema.statics.findExpiredPayments = function() {
  return this.find({
    status: 'PENDING',
    expiresAt: { $lte: new Date() }
  }).populate('user', 'name email');
};

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  }
  next();
});
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 