const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Please add a question content'],
    trim: true
  },
  options: [{
    label: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    }
  }],
  correctAnswer: {
    type: String,
    required: [true, 'Please specify the correct answer'],
    trim: true,
    validate: {
      validator: function(value) {
        // Kiểm tra correctAnswer phải là label của một trong các options
        return this.options.some(option => option.label === value);
      },
      message: 'Correct answer must match one of the option labels'
    }
  },
  explanation: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  points: {
    type: Number,
    default: 1,
    min: 1
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
    totalAttempts: {
      type: Number,
      default: 0
    },
    correctRate: {
      type: Number,
      default: 0
    },
    averageTimeSpent: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Thêm validator cho options
QuestionSchema.path('options').validate(function(options) {
  // Kiểm tra có ít nhất 2 options
  if (!options || options.length < 2) {
    return false;
  }
  
  // Kiểm tra label không được trùng nhau
  const labels = options.map(opt => opt.label);
  return labels.length === new Set(labels).size;
}, 'Question must have at least 2 unique options');

// Indexes
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ isActive: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ 'stats.correctRate': -1 });
QuestionSchema.index({ content: 'text' });

module.exports = mongoose.model('Question', QuestionSchema);