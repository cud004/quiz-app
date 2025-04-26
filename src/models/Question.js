const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    unique: true // Đảm bảo nội dung câu hỏi là duy nhất
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    }
  }],
  explanation: {
    type: String
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },
  tags: [{
    type: String
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  incorrectAttempts: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true
});

// Middleware kiểm tra tính hợp lệ của options
QuestionSchema.pre('save', function (next) {
  if (this.options.length < 2) {
    return next(new Error('Options must have at least two items'));
  }
  const hasCorrectOption = this.options.some(option => option.isCorrect);
  if (!hasCorrectOption) {
    return next(new Error('At least one option must be marked as correct'));
  }
  const optionTexts = this.options.map(option => option.text);
  if (new Set(optionTexts).size !== optionTexts.length) {
    return next(new Error('Duplicate option texts are not allowed'));
  }
  next();
});

// Middleware kiểm tra tính hợp lệ của tags
QuestionSchema.pre('save', function (next) {
  if (this.tags && new Set(this.tags).size !== this.tags.length) {
    return next(new Error('Duplicate tags are not allowed'));
  }
  next();
});

QuestionSchema.index({ topic: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ difficulty: 1 });

module.exports = mongoose.model('Question', QuestionSchema);