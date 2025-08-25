const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
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
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  consultationType: {
    type: String,
    required: true,
    enum: ['chat', 'call', 'video'],
    default: 'chat'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480 // 8 hours max
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  location: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  seekerNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  providerNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    trim: true,
    maxlength: 500
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledBy: {
    type: String,
    enum: ['seeker', 'provider', 'admin']
  },
  cancellationFee: {
    type: Number,
    min: 0
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
consultationSchema.index({ seeker: 1 });
consultationSchema.index({ provider: 1 });
consultationSchema.index({ category: 1 });
consultationSchema.index({ status: 1 });
consultationSchema.index({ scheduledDate: 1 });
consultationSchema.index({ createdAt: -1 });

// Virtual for consultation duration in hours
consultationSchema.virtual('durationInHours').get(function() {
  return this.duration / 60;
});

// Virtual for total price
consultationSchema.virtual('totalPrice').get(function() {
  return this.price;
});

// Virtual for isOverdue
consultationSchema.virtual('isOverdue').get(function() {
  if (this.status === 'in_progress' && this.startTime) {
    const now = new Date();
    const expectedEndTime = new Date(this.startTime.getTime() + this.duration * 60000);
    return now > expectedEndTime;
  }
  return false;
});

// Method to start consultation
consultationSchema.methods.startConsultation = function() {
  this.status = 'in_progress';
  this.startTime = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Method to complete consultation
consultationSchema.methods.completeConsultation = function() {
  this.status = 'completed';
  this.endTime = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Method to cancel consultation
consultationSchema.methods.cancelConsultation = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.updatedAt = new Date();
  return this.save();
};

// Method to accept consultation
consultationSchema.methods.acceptConsultation = function() {
  this.status = 'accepted';
  this.updatedAt = new Date();
  return this.save();
};

// Pre-save middleware to validate consultation type availability
consultationSchema.pre('save', function(next) {
  if (this.isModified('consultationType')) {
    // Check if provider supports this consultation type
    if (this.consultationType === 'call' && !this.provider.call) {
      return next(new Error('Provider does not support call consultations'));
    }
    if (this.consultationType === 'video' && !this.provider.video) {
      return next(new Error('Provider does not support video consultations'));
    }
  }
  next();
});

module.exports = mongoose.model('Consultation', consultationSchema);

