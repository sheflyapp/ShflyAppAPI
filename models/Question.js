const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    validate: {
      validator: async function(v) {
        if (!v) return false;
        const Category = mongoose.model('Category');
        const category = await Category.findById(v);
        return category && category.isActive;
      },
      message: 'Category must be a valid and active category'
    }
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Subcategory is required'],
    validate: {
      validator: async function(v) {
        if (!v) return false;
        const Category = mongoose.model('Category');
        const subcategory = await Category.findById(v);
        return subcategory && subcategory.isActive && subcategory.parentCategory;
      },
      message: 'Subcategory must be a valid and active subcategory'
    }
  },
  description: {
    type: String,
    required: [true, 'Question description is required'],
    trim: true,
    minlength: [10, 'Question description must be at least 10 characters long'],
    maxlength: [2000, 'Question description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: String, // File URLs
    description: String
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  answerCount: {
    type: Number,
    default: 0
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ userId: 1 });
questionSchema.index({ category: 1 });
questionSchema.index({ subcategory: 1 });
questionSchema.index({ status: 1 });
questionSchema.index({ priority: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ lastActivityAt: -1 });

// Virtual for isAnswered
questionSchema.virtual('isAnswered').get(function() {
  return this.status === 'answered';
});

// Virtual for isClosed
questionSchema.virtual('isClosed').get(function() {
  return this.status === 'closed';
});

// Method to update view count
questionSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to update answer count
questionSchema.methods.updateAnswerCount = function() {
  return this.constructor.countDocuments({ _id: this._id, status: 'answered' });
};

// Method to close question
questionSchema.methods.closeQuestion = function(closedBy) {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = closedBy;
  return this.save();
};

// Static method to get questions by user
questionSchema.statics.getQuestionsByUser = function(userId, options = {}) {
  const query = { userId };
  if (options.status) query.status = options.status;
  if (options.category) query.category = options.category;
  if (options.subcategory) query.subcategory = options.subcategory;
  
  return this.find(query)
    .populate('category', 'name description color')
    .populate('subcategory', 'name description color')
    .populate('userId', 'fullname username email')
    .sort({ createdAt: -1 });
};

// Static method to get public questions
questionSchema.statics.getPublicQuestions = function(options = {}) {
  const query = { isPublic: true };
  if (options.category) query.category = options.category;
  if (options.subcategory) query.subcategory = options.subcategory;
  if (options.status) query.status = options.status;
  
  return this.find(query)
    .populate('category', 'name description color')
    .populate('subcategory', 'name description color')
    .populate('userId', 'fullname username')
    .sort({ createdAt: -1 });
};

// Pre-save middleware to update lastActivityAt
questionSchema.pre('save', function(next) {
  if (this.isModified('status') || this.isModified('answerCount')) {
    this.lastActivityAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Question', questionSchema);
