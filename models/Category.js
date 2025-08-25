const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  icon: {
    type: String,
    default: 'default-icon'
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    validate: {
      validator: function(v) {
        // Allow null (parent category) or valid ObjectId (subcategory)
        return v === null || mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Parent category must be a valid ObjectId or null'
    }
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  consultationCount: {
    type: Number,
    default: 0
  },
  providerCount: {
    type: Number,
    default: 0
  },
  averagePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  sortOrder: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  image: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better query performance
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ featured: 1 });
categorySchema.index({ sortOrder: 1 });

// Virtual for full category path
categorySchema.virtual('fullPath').get(function() {
  if (this.parentCategory) {
    return `${this.parentCategory.name} > ${this.name}`;
  }
  return this.name;
});

// Virtual for isParent
categorySchema.virtual('isParent').get(function() {
  return this.subcategories && this.subcategories.length > 0;
});

// Virtual for isSubcategory
categorySchema.virtual('isSubcategory').get(function() {
  return this.parentCategory !== null;
});

// Method to add subcategory
categorySchema.methods.addSubcategory = function(subcategoryId) {
  if (!this.subcategories.includes(subcategoryId)) {
    this.subcategories.push(subcategoryId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove subcategory
categorySchema.methods.removeSubcategory = function(subcategoryId) {
  this.subcategories = this.subcategories.filter(id => !id.equals(subcategoryId));
  return this.save();
};

// Method to update consultation count
categorySchema.methods.updateConsultationCount = function() {
  // This would typically be called when consultations are added/removed
  return this.save();
};

// Method to update provider count
categorySchema.methods.updateProviderCount = function() {
  // This would typically be called when providers are added/removed
  return this.save();
};

// Static method to get active categories
categorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to get parent categories
categorySchema.statics.getParentCategories = function() {
  return this.find({ 
    isActive: true, 
    parentCategory: null 
  }).sort({ sortOrder: 1, name: 1 });
};

// Static method to get subcategories
categorySchema.statics.getSubcategories = function(parentId) {
  return this.find({ 
    isActive: true, 
    parentCategory: parentId 
  }).sort({ sortOrder: 1, name: 1 });
};

// Pre-save middleware to ensure unique names and proper parentCategory handling
categorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const existingCategory = await this.constructor.findOne({ 
      name: this.name, 
      _id: { $ne: this._id } 
    });
    
    if (existingCategory) {
      return next(new Error('Category name already exists'));
    }
  }
  
  // Ensure parentCategory is properly set (convert empty string to null)
  if (this.parentCategory === '') {
    this.parentCategory = null;
  }
  
  next();
});

module.exports = mongoose.model('Category', categorySchema);

