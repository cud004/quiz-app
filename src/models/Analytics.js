const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  users: {
    total: Number,
    active: Number,
    new: Number,
    byRole: {
      user: Number,
      admin: Number
    },
    byStatus: {
      active: Number,
      inactive: Number,
      suspended: Number,
      banned: Number
    }
  },
  exams: {
    total: Number,
    published: Number,
    new: Number,
    byDifficulty: {
      easy: Number,
      medium: Number,
      hard: Number
    },
    byType: {
      practice: Number,
      midterm: Number,
      final: Number,
      custom: Number
    },
    mostPopular: [{
      exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam'
      },
      title: String,
      attempts: Number
    }]
  },
  questions: {
    total: Number,
    new: Number,
    byDifficulty: {
      easy: Number,
      medium: Number,
      hard: Number
    },
    mostDifficult: [{
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      content: String,
      correctRate: Number
    }]
  },
  quizAttempts: {
    total: Number,
    completed: Number,
    abandoned: Number,
    averageScore: Number,
    averageTimeSpent: Number
  },
  revenue: {
    total: Number,
    byPackage: [{
      package: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionPackage'
      },
      name: String,
      amount: Number,
      count: Number
    }],
    byPaymentMethod: {
      vnpay: Number,
      momo: Number
    }
  },
  topics: {
    total: Number,
    mostPopular: [{
      topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
      },
      name: String,
      attemptCount: Number
    }]
  },
  systemPerformance: {
    avgResponseTime: Number,
    errorRate: Number,
    activeSessionsMax: Number,
    aiRequestCount: Number
  }
}, {
  timestamps: true
});

// Indexes
AnalyticsSchema.index({ date: 1, period: 1 }, { unique: true });
AnalyticsSchema.index({ period: 1 });
AnalyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema); 