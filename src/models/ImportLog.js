const mongoose = require('mongoose');

const ImportLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['questions', 'topics', 'tags', 'exams'],
    required: true
  },
  fileName: String,
  fileSize: Number,
  recordCount: {
    total: Number,
    successful: Number,
    failed: Number
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  errors: [{
    index: Number,
    message: String,
    data: Object
  }],
  importedIds: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  processingTime: Number,
  source: {
    type: String,
    enum: ['file', 'api', 'manual'],
    default: 'file'
  }
}, {
  timestamps: true
});

// Indexes
ImportLogSchema.index({ user: 1 });
ImportLogSchema.index({ type: 1 });
ImportLogSchema.index({ status: 1 });
ImportLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ImportLog', ImportLogSchema); 