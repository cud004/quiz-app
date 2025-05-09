const mongoose = require('mongoose');
const ExamService = require('../services/exam/examService');

const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  timeLimit: {
    type: Number,
    default: 45,
    min: 0,
    max: 180
  },
  accessLevel: {
    type: String,
    enum: ['free', 'premium', 'pro'],
    required: true,
    default: 'free'
  },
  passingScore: {
    type: Number,
    default: 5,
    min: 0,
    max: 10
  },
  retryLimit: {
    type: Number,
    default: 3,
    min: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    required: true
  },
  examType: {
    type: String,
    enum: ['practice', 'midterm', 'final', 'custom'],
    default: 'practice'
  },
  recommendedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPersonal: {
    type: Boolean,
    default: false
  },
  stats: {
    totalAttempts: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  lastAttempt: {
    type: Date
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Middleware kiểm tra số lượng câu hỏi
ExamSchema.pre('save', function (next) {
  try {
    ExamService.validateQuestions(this.questions);
    next();
  } catch (err) {
    next(err);
  }
});

// Middleware cập nhật thống kê
ExamSchema.post('save', async function() {
  await ExamService.updateExamStats(this);
});

// Indexes
ExamSchema.index({ topics: 1 });
ExamSchema.index({ accessLevel: 1 });
ExamSchema.index({ difficulty: 1 });
ExamSchema.index({ createdBy: 1, isPersonal: 1 });
ExamSchema.index({ status: 1 });
ExamSchema.index({ examType: 1 });
ExamSchema.index({ isActive: 1 });
ExamSchema.index({ accessLevel: 1, difficulty: 1 });
ExamSchema.index({ createdAt: -1 });
ExamSchema.index({ 'stats.totalAttempts': -1 });
ExamSchema.index({ 'stats.completionRate': -1 });
ExamSchema.index({ tags: 1 });
ExamSchema.index({ isPublic: 1 });
ExamSchema.index({ 'stats.viewCount': -1 });
ExamSchema.index({ 'stats.rating': -1 });
ExamSchema.index({ lastAttempt: -1 });

// Text index cho tìm kiếm
ExamSchema.index({ 
  title: 'text', 
  description: 'text' 
}, {
  weights: {
    title: 10,
    description: 5
  },
  name: 'exam_text_search'
});

module.exports = mongoose.model('Exam', ExamSchema);