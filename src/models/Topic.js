const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  parentTopic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    default: null,
  },
  order: {
    type: Number,
    default: 0
  },
  questionCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
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
  performanceStats: {
    totalAttempts: { type: Number, default: 0 },
    correctRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
});

// Middleware: Cập nhật `questionCount` khi thêm hoặc xóa câu hỏi
TopicSchema.methods.updateQuestionCount = async function () {
  const Question = mongoose.model('Question');
  const count = await Question.countDocuments({ topic: this._id });
  this.questionCount = count;
  await this.save();
};

// Indexes
TopicSchema.index({ parentTopic: 1 });
TopicSchema.index({ createdBy: 1, isPersonal: 1 });
TopicSchema.index({ isActive: 1 });
TopicSchema.index({ order: 1 });

module.exports = mongoose.model('Topic', TopicSchema);