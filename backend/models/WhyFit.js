const mongoose = require('mongoose');

const whyFitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true,
  },
  explanation: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

whyFitSchema.index({ user: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('WhyFit', whyFitSchema);