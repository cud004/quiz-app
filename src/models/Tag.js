const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    trim: true,
  },
  relatedTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  performanceStats: {
    totalAttempts: { type: Number, default: 0 },
    correctRate: { type: Number, default: 0 }
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  }
}, {
  timestamps: true,
});

// Tạo slug từ name trước khi lưu
TagSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes
TagSchema.index({ usageCount: -1 });
TagSchema.index({ isActive: 1 });
TagSchema.index({ category: 1 });
TagSchema.index({ 'performanceStats.totalAttempts': -1 });
TagSchema.index({ 'performanceStats.correctRate': -1 });

module.exports = mongoose.model('Tag', TagSchema);