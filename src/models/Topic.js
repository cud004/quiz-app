const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true, // Loại bỏ khoảng trắng thừa
    minlength: 3, // Tên phải có ít nhất 3 ký tự
    maxlength: 100, // Tên không được vượt quá 100 ký tự
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500, // Mô tả không được vượt quá 500 ký tự
  },
  parentTopic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    default: null,
  },
  questionCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true, // Hỗ trợ soft delete
  },
}, {
  timestamps: true,
});

// Middleware: Cập nhật `questionCount` khi thêm hoặc xóa câu hỏi
TopicSchema.methods.updateQuestionCount = async function () {
  const Question = mongoose.model('Question'); // Import model Question
  const count = await Question.countDocuments({ topic: this._id });
  this.questionCount = count;
  await this.save();
};

// Chỉ mục bổ sung
TopicSchema.index({ parentTopic: 1 }); // Tăng hiệu suất truy vấn theo parentTopic

module.exports = mongoose.model('Topic', TopicSchema);