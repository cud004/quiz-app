const mongoose = require('mongoose');

const AILogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['explanation', 'learning_path', 'recommendation'],
    required: true
  },
  input: {
    type: Object,
    required: true
  },
  output: {
    type: Object,
    required: true
  },
  processingTime: {
    type: Number  // in milliseconds
  }
}, {
  timestamps: true
});
AILogSchema.index({ user: 1 });
AILogSchema.index({ type: 1 });
module.exports = mongoose.model('AILog', AILogSchema);