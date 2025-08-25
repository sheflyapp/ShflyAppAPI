const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  consultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
    required: true
  },
  seeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'bank_transfer', 'cash']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: Map,
    of: String
  },
  refundReason: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  refundedAmount: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
paymentSchema.index({ consultation: 1 });
paymentSchema.index({ seeker: 1 });
paymentSchema.index({ provider: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for payment status
paymentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for payment amount in cents (for Stripe)
paymentSchema.virtual('amountInCents').get(function() {
  return Math.round(this.amount * 100);
});

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(transactionId) {
  this.status = 'completed';
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
