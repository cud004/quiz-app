const mongoose = require('mongoose');

const LearningPathSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topics: [{
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
    priority: { type: Number, default: 1 },
    progress: { type: Number, default: 0 }
  }],
  recommendedExams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

LearningPathSchema.index({ user: 1 });

module.exports = mongoose.model('LearningPath', LearningPathSchema);