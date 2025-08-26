const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  fullname: {
    type: String,
    trim: true,
    maxlength: [100, 'Full name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if not using social login
      return !this.socialLogin;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  userType: {
    type: String,
    required: [true, 'Please select a userType'],
    enum: ['seeker', 'provider', 'admin'],
    default: 'seeker'
  },
  phone: {
    type: String,
    required: [true, 'Please add a Phone number'],
    maxlength: [20, 'Phone number cannot be more than 20 characters']
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  country: {
    type: String,
    maxlength: [100, 'Country cannot be more than 100 characters']
  },
  city: {
    type: String,
    maxlength: [100, 'City cannot be more than 100 characters']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  dob: {
    type: Date
  },
  specialization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  totalReviews: {
    type: Number,
    min: [0, 'Total reviews cannot be negative'],
    default: 0
  },
  availability: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  languages: [{
    type: String,
    trim: true
  }],
  chat: {
    type: Boolean,
    default: true
  },
  call: {
    type: Boolean,
    default: true
  },
  video: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: true  // Set to true since email/phone verification is commented out
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Social Login Fields
  socialLogin: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    sparse: true
  },
  facebookId: {
    type: String,
    sparse: true
  },
  appleId: {
    type: String,
    sparse: true
  },
  
  // OTP Verification Fields - COMMENTED OUT FOR NOW
  // phoneVerified: {
  //   type: Boolean,
  //   default: false
  // },
  // phoneOtp: {
  //   code: String,
  //   expiresAt: Date
  // },
  // emailVerified: {
  //   type: Boolean,
  //   default: false
  // },
  // emailOtp: {
  //   code: String,
  //   expiresAt: Date
  // },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to check password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ specialization: 1 });
UserSchema.index({ country: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for display name
UserSchema.virtual('displayName').get(function() {
  return this.fullname || this.username || 'Unknown User';
});

// Virtual for isProvider
UserSchema.virtual('isProvider').get(function() {
  return this.userType === 'provider';
});

// Virtual for isSeeker
UserSchema.virtual('isSeeker').get(function() {
  return this.userType === 'seeker';
});

// Virtual for isAdmin
UserSchema.virtual('isAdmin').get(function() {
  return this.userType === 'admin';
});

module.exports = mongoose.model('User', UserSchema);

