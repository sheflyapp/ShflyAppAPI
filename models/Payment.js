const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'success', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
paymentSchema.index({ questionId: 1 });
paymentSchema.index({ seekerId: 1 });
paymentSchema.index({ providerId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for payment status
paymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'success';
});

// Virtual for payment amount in cents (for Stripe)
paymentSchema.virtual('amountInCents').get(function() {
  return Math.round(this.amount * 100);
});

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(transactionId) {
  this.status = 'success';
  this.transactionId = transactionId;
  this.updatedAt = new Date();
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function() {
  this.status = 'failed';
  this.updatedAt = new Date();
  return this.save();
};

// Method to refund payment
paymentSchema.methods.refund = function(reason, amount) {
  this.status = 'refunded';
  this.refundReason = reason;
  this.refundedAmount = amount || this.amount;
  this.refundedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
