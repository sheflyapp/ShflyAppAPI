const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'withdrawal', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AED']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    description: 'Reason for transaction (especially for refunds)'
  },
  notes: {
    type: String,
    description: 'Additional notes'
  },
  relatedConsultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
    description: 'Related consultation for this transaction'
  },
  relatedPayment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    description: 'Related payment for this transaction'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'Related user for transfers'
  },
  bankDetails: {
    accountNumber: String,
    routingNumber: String,
    accountType: {
      type: String,
      enum: ['checking', 'savings']
    },
    bankName: String
  },
  processedAt: {
    type: Date,
    description: 'When transaction was processed'
  },
  failureReason: {
    type: String,
    description: 'Reason for failure if status is failed'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ relatedConsultation: 1 });
transactionSchema.index({ relatedPayment: 1 });

// Pre-save middleware to set processedAt for completed transactions
transactionSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

// Instance method to mark as completed
transactionSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.processedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
transactionSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Static method to get user transaction summary
transactionSchema.statics.getUserSummary = async function(userId) {
  const summary = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    totalCredits: 0,
    totalDebits: 0,
    totalRefunds: 0,
    totalWithdrawals: 0,
    totalTransfers: 0
  };
  
  summary.forEach(item => {
    switch (item._id) {
      case 'credit':
        result.totalCredits = item.totalAmount;
        break;
      case 'debit':
        result.totalDebits = Math.abs(item.totalAmount);
        break;
      case 'refund':
        result.totalRefunds = item.totalAmount;
        break;
      case 'withdrawal':
        result.totalWithdrawals = Math.abs(item.totalAmount);
        break;
      case 'transfer':
        result.totalTransfers = Math.abs(item.totalAmount);
        break;
    }
  });
  
  return result;
};

// Static method to get recent transactions
transactionSchema.statics.getRecentTransactions = async function(userId, limit = 5) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('relatedConsultation', 'title status')
    .populate('relatedPayment', 'amount currency')
    .populate('relatedUser', 'fullname username');
};

module.exports = mongoose.model('Transaction', transactionSchema);
