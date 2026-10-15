const mongoose = require('mongoose');

const providerQuestionSchema = new mongoose.Schema({
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seeker ID is required']
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Provider ID is required']
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    minlength: [10, 'Question must be at least 10 characters long'],
    maxlength: [2000, 'Question cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'closed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

providerQuestionSchema.index({ seekerId: 1, createdAt: -1 });
providerQuestionSchema.index({ providerId: 1, createdAt: -1 });

module.exports = mongoose.model('ProviderQuestion', providerQuestionSchema);
