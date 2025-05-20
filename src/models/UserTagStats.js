const mongoose = require('mongoose');

const UserTagStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tag: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    required: true,
    index: true
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: false
  },
  totalAnswered: {
    type: Number,
    default: 0
  },
  correctAnswered: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

UserTagStatsSchema.index({ user: 1, tag: 1 }, { unique: true });

module.exports = mongoose.model('UserTagStats', UserTagStatsSchema); 