const mongoose = require('mongoose');

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
    type: Number,  // In minutes
    default: 45,
    min: 0,        // Tối thiểu 1 phút
    max: 180       // Tối đa 180 phút (3 giờ)
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    default: 0
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
  isActive: { // Trường để đánh dấu trạng thái
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
  }
  
}, {
  timestamps: true
});
ExamSchema.index({ topics: 1 });
ExamSchema.index({ isPremium: 1 });
ExamSchema.index({ difficulty: 1 });
ExamSchema.index({ createdBy: 1, isPersonal: 1 });
module.exports = mongoose.model('Exam', ExamSchema);