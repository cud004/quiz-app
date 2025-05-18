const mongoose = require('mongoose');
// const ExamService = require('../services/exam/examService');

// Exam Question Schema (subdocument)
const examQuestionSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  points: {
    type: Number,
    required: true,
    min: 1
  },
  order: {
    type: Number,
    default: 0
  }
});

// Main Exam Schema
const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be longer than 1000 characters']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  instructions: {
    type: String,
    maxlength: [2000, 'Instructions cannot be longer than 2000 characters']
  },
  timeLimit: {
    type: Number,
    default: 60, // in minutes
    min: [1, 'Time limit must be at least 1 minute'],
    max: [300, 'Time limit cannot be longer than 300 minutes (5 hours)']
  },
  questions: [examQuestionSchema],
  totalPoints: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  allowReview: {
    type: Boolean,
    default: true
  },
  randomizeQuestions: {
    type: Boolean,
    default: false
  },
  attemptCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  accessLevel: {
    type: String,
    enum: ['free', 'premium', 'private'],
    default: 'free'
  },
  stats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    passRate: {
      type: Number,
      default: 0
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add text index for search
examSchema.index({ 
  title: 'text', 
  description: 'text' 
}, {
  weights: {
    title: 10,
    description: 5
  },
  name: 'exam_text_search'
});

// Add virtual for question count
examSchema.virtual('questionCount').get(function() {
  return this.questions ? this.questions.length : 0;
});

// Make sure totalPoints is calculated before saving
examSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  } else {
    this.totalPoints = 0;
  }
  next();
});

// Middleware kiểm tra số lượng câu hỏi
examSchema.pre('save', function (next) {
  try {
    // ExamService.validateQuestions(this.questions);
    next();
  } catch (err) {
    next(err);
  }
});

// Middleware cập nhật thống kê
examSchema.post('save', async function() {
  // await ExamService.updateExamStats(this);
});

// Index fields for efficient queries
examSchema.index({ topic: 1 });
examSchema.index({ createdBy: 1 });
examSchema.index({ tags: 1 });
examSchema.index({ isPublished: 1 });
examSchema.index({ accessLevel: 1 });
examSchema.index({ createdAt: -1 });
examSchema.index({ 'stats.totalAttempts': -1 });
examSchema.index({ 'stats.averageScore': -1 });

module.exports = mongoose.model('Exam', examSchema);