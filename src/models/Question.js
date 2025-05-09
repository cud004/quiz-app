const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  options: [{
    type: String,
    required: true
  }],
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  points: {
    type: Number,
    default: 1,
    min: 1
  },
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  stats: {
    totalAttempts: { type: Number, default: 0 },
    correctRate: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
QuestionSchema.index({ topics: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ isActive: 1 });
QuestionSchema.index({ usageCount: -1 });
QuestionSchema.index({ 'stats.correctRate': 1 });
QuestionSchema.index({ 'stats.totalAttempts': -1 });

// Text index cho tìm kiếm
QuestionSchema.index({ 
  content: 'text',
  explanation: 'text'
}, {
  weights: {
    content: 10,
    explanation: 5
  },
  name: 'question_text_search'
});

module.exports = mongoose.model('Question', QuestionSchema);