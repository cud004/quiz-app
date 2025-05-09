const mongoose = require('mongoose');

const SubscriptionPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['free', 'premium', 'pro']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number, // Số tháng
    required: true,
    min: 1
  },
  features: [{
    type: String,
    required: true
  }],
  examAccess: {
    type: String,
    enum: ['limited', 'unlimited'],
    required: true
  },
  maxExamsPerMonth: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
SubscriptionPackageSchema.index({ name: 1 }, { unique: true });
SubscriptionPackageSchema.index({ isActive: 1 });

module.exports = mongoose.model('SubscriptionPackage', SubscriptionPackageSchema); 