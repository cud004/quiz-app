const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const AuthService = require('../services/auth/authService');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  profileImage: {
    type: String,
    validate: {
      validator: function (v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/.test(v);
      },
      message: 'Invalid profile image URL',
    },
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'banned'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  deleted: {
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastActive: {
    type: Date,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      examReminders: { type: Boolean, default: true },
      studyReminders: { type: Boolean, default: true },
      achievementAlerts: { type: Boolean, default: true },
      subscriptionAlerts: { type: Boolean, default: true }
    },
    language: {
      type: String,
      enum: ['en', 'vi'],
      default: 'vi'
    }
  },
  subscription: {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPackage'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'inactive'],
      default: 'inactive'
    },
    paymentHistory: [{
      amount: Number,
      date: Date,
      transactionId: String
    }]
  },
  oauthProvider: {
    type: String,
    enum: ['google', 'github'],
    default: null
  },
  oauthId: {
    type: String,
    default: null
  },
  learningStats: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    weakTopics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
    strongTopics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
    lastStudyDate: Date,
    studyStreak: { type: Number, default: 0 }
  },
  examHistory: [{
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam'
    },
    lastAttempt: Date,
    bestScore: Number,
    attemptCount: Number
  }],
  favoriteExams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  }],
  progressHistory: [{
    date: { type: Date, default: Date.now },
    score: { type: Number },
    attemptCount: { type: Number },
    topics: [{
      topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
      score: Number
    }]
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ 'subscription.status': 1 });
UserSchema.index({ 'learningStats.lastStudyDate': 1 });
UserSchema.index({ 'subscription.status': 1, 'subscription.endDate': 1 });
UserSchema.index({ 'learningStats.lastStudyDate': -1 });
UserSchema.index({ 'learningStats.studyStreak': -1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ 'examHistory.lastAttempt': -1 });
UserSchema.index({ 'deleted.isDeleted': 1 });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    this.password = await AuthService.hashPassword(this.password);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await AuthService.comparePassword(enteredPassword, this.password);
};

// Add method to soft delete user
UserSchema.methods.softDelete = async function() {
  this.deleted.isDeleted = true;
  this.deleted.deletedAt = Date.now();
  this.isActive = false;
  this.status = 'inactive';
  return this.save();
};

// Add method to restore user
UserSchema.methods.restore = async function() {
  this.deleted.isDeleted = false;
  this.deleted.deletedAt = null;
  this.isActive = true;
  this.status = 'active';
  return this.save();
};

// Modify find queries to exclude deleted users by default
UserSchema.pre('find', function() {
  // Only apply the filter if we're not explicitly querying for deleted users
  if (!this.getQuery().hasOwnProperty('deleted.isDeleted')) {
    this.where({ 'deleted.isDeleted': false });
  }
});

UserSchema.pre('findOne', function() {
  // Only apply the filter if we're not explicitly querying for deleted users
  if (!this.getQuery().hasOwnProperty('deleted.isDeleted')) {
    this.where({ 'deleted.isDeleted': false });
  }
});

module.exports = mongoose.model('User', UserSchema);