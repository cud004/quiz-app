const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedOption: {
      type: Number
    },
    isCorrect: {
      type: Boolean
    }
  }],
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number,  // In minutes
    required: true
  },
  topicPerformance: [{
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    correctCount: {
      type: Number,
    },
    totalCount: {
      type: Number,
    }
  }],
  completed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
QuizAttemptSchema.index({ user: 1 });
QuizAttemptSchema.index({ exam: 1 });
module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);