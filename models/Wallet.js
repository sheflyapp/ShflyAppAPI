const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AED']
  },
  pendingWithdrawals: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransactionDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
walletSchema.index({ user: 1 });
walletSchema.index({ balance: -1 });

// Instance method to add funds
walletSchema.methods.addFunds = function(amount) {
  this.balance += amount;
  this.totalEarned += amount;
  this.lastTransactionDate = new Date();
  return this.save();
};

// Instance method to deduct funds
walletSchema.methods.deductFunds = function(amount) {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  this.totalSpent += amount;
  this.lastTransactionDate = new Date();
  return this.save();
};

// Instance method to check if user can afford
walletSchema.methods.canAfford = function(amount) {
  return this.balance >= amount;
};

// Static method to get wallet summary
walletSchema.statics.getWalletSummary = async function(userId) {
  const wallet = await this.findOne({ user: userId });
  if (!wallet) {
    return {
      balance: 0,
      currency: 'USD',
      totalEarned: 0,
      totalSpent: 0,
      pendingWithdrawals: 0
    };
  }
  
  return {
    balance: wallet.balance,
    currency: wallet.currency,
    totalEarned: wallet.totalEarned,
    totalSpent: wallet.totalSpent,
    pendingWithdrawals: wallet.pendingWithdrawals
  };
};

module.exports = mongoose.model('Wallet', walletSchema);
