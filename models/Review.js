const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  consultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 500
  },
  tags: [{
    type: String,
    enum: ['professional', 'knowledgeable', 'helpful', 'punctual', 'clear', 'patient', 'responsive', 'thorough']
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reportReason: {
    type: String,
    description: 'Reason for reporting the review'
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  providerResponse: {
    comment: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure one review per consultation per reviewer
reviewSchema.index({ consultation: 1, reviewer: 1 }, { unique: true });

// Index for faster queries
reviewSchema.index({ provider: 1, rating: 1 });
reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ rating: 1, createdAt: -1 });

// Pre-save middleware to validate data
reviewSchema.pre('save', function(next) {
  // Ensure rating is within valid range
  if (this.rating < 1 || this.rating > 5) {
    return next(new Error('Rating must be between 1 and 5'));
  }
  
  // Ensure comment length is valid
  if (this.comment.length < 10 || this.comment.length > 500) {
    return next(new Error('Comment must be between 10 and 500 characters'));
  }
  
  next();
});

// Instance method to mark as helpful
reviewSchema.methods.markHelpful = function() {
  this.helpfulCount += 1;
  return this.save();
};

// Instance method to mark as not helpful
reviewSchema.methods.markNotHelpful = function() {
  this.notHelpfulCount += 1;
  return this.save();
};

// Instance method to report review
reviewSchema.methods.report = function(reason) {
  this.isReported = true;
  this.reportReason = reason;
  return this.save();
};

// Instance method to add provider response
reviewSchema.methods.addProviderResponse = function(comment) {
  this.providerResponse = {
    comment,
    respondedAt: new Date()
  };
  return this.save();
};

// Static method to get average rating for a provider
reviewSchema.statics.getAverageRating = async function(providerId) {
  const result = await this.aggregate([
    { $match: { provider: providerId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? {
    averageRating: Math.round(result[0].averageRating * 10) / 10,
    totalReviews: result[0].totalReviews
  } : {
    averageRating: 0,
    totalReviews: 0
  };
};

// Static method to get rating distribution for a provider
reviewSchema.statics.getRatingDistribution = async function(providerId) {
  const result = await this.aggregate([
    { $match: { provider: providerId } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.forEach(item => {
    distribution[item._id] = item.count;
  });
  
  return distribution;
};

// Static method to get top rated providers
reviewSchema.statics.getTopRatedProviders = async function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$provider',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    },
    {
      $match: {
        totalReviews: { $gte: 3 } // Minimum 3 reviews to be considered
      }
    },
    {
      $sort: { averageRating: -1, totalReviews: -1 }
    },
    { $limit: limit }
  ]);
};

// Virtual for review sentiment (positive, neutral, negative)
reviewSchema.virtual('sentiment').get(function() {
  if (this.rating >= 4) return 'positive';
  if (this.rating >= 3) return 'neutral';
  return 'negative';
});

// Virtual for review age
reviewSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
