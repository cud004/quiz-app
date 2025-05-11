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
  score: {
    type: Number,
    required: true,
    min: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  timeSpent: {
    type: Number, // Thời gian làm bài (giây)
    required: true
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    selectedAnswer: String,
    isCorrect: Boolean,
    timeSpent: Number // Thời gian làm câu hỏi (giây)
  }],
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  skippedQuestions: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  },
  autoCompleted: {
    type: Boolean,
    default: false
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
  tagPerformance: [{
    tag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag'
    },
    correctCount: {
      type: Number,
    },
    totalCount: {
      type: Number,
    }
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    difficulty: {
      type: String,
      enum: ['too_easy', 'appropriate', 'too_hard']
    }
  },
  reviewStatus: {
    type: String,
    enum: ['pending', 'reviewed', 'ignored'],
    default: 'pending'
  },
  timePerQuestion: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    timeSpent: Number
  }],
  completed: {
    type: Boolean,
    default: true
  },
  reviewed: {
    type: Boolean,
    default: false
  },
  resultSummary: {
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
QuizAttemptSchema.index({ user: 1 });
QuizAttemptSchema.index({ exam: 1 });
QuizAttemptSchema.index({ score: -1 });
QuizAttemptSchema.index({ startTime: -1 });
QuizAttemptSchema.index({ status: 1 });
QuizAttemptSchema.index({ user: 1, exam: 1 });
QuizAttemptSchema.index({ 'answers.question': 1 });
QuizAttemptSchema.index({ reviewStatus: 1 });
QuizAttemptSchema.index({ 'feedback.rating': -1 });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);