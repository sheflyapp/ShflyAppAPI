const mongoose = require('mongoose');

const StaticContentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['privacy-policy', 'terms-conditions', 'help', 'onboarding', 'about', 'contact', 'faq'],
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  contentAr: {
    type: String,
    default: ''
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  seoTitle: {
    type: String,
    default: ''
  },
  seoDescription: {
    type: String,
    default: ''
  },
  seoKeywords: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Index for efficient queries
StaticContentSchema.index({ type: 1, isActive: 1 });
StaticContentSchema.index({ lastUpdatedBy: 1 });

// Virtual for formatted content
StaticContentSchema.virtual('formattedContent').get(function() {
  return this.content.replace(/\n/g, '<br>');
});

// Method to get content by type and language
StaticContentSchema.statics.getContentByType = async function(type, language = 'en') {
  const content = await this.findOne({ type, isActive: true });
  if (!content) return null;
  
  return {
    type: content.type,
    title: content.title,
    content: language === 'ar' ? (content.contentAr || content.content) : content.content,
    version: content.version,
    lastUpdated: content.updatedAt,
    metadata: content.metadata
  };
};

// Method to get all active content
StaticContentSchema.statics.getAllActiveContent = async function(language = 'en') {
  const contents = await this.find({ isActive: true }).sort({ type: 1 });
  
  return contents.map(content => ({
    type: content.type,
    title: content.title,
    content: language === 'ar' ? (content.contentAr || content.content) : content.content,
    version: content.version,
    lastUpdated: content.updatedAt,
    metadata: content.metadata
  }));
};

module.exports = mongoose.model('StaticContent', StaticContentSchema);
