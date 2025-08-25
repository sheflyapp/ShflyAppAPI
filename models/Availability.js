const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    }
  },
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  breakStart: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Break start time must be in HH:MM format'
    }
  },
  breakEnd: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Break end time must be in HH:MM format'
    }
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index to ensure unique provider-day combinations
availabilitySchema.index({ provider: 1, dayOfWeek: 1 }, { unique: true });

// Pre-save middleware to validate time logic
availabilitySchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('Start time must be before end time'));
  }
  
  if (this.breakStart && this.breakEnd) {
    if (this.breakStart >= this.breakEnd) {
      return next(new Error('Break start time must be before break end time'));
    }
    
    if (this.breakStart < this.startTime || this.breakEnd > this.endTime) {
      return next(new Error('Break time must be within working hours'));
    }
  }
  
  next();
});

// Instance method to check if a specific time is available
availabilitySchema.methods.isTimeAvailable = function(time) {
  const timeStr = time.toTimeString().slice(0, 5);
  return timeStr >= this.startTime && timeStr <= this.endTime;
};

// Instance method to get available time slots
availabilitySchema.methods.getAvailableSlots = function(duration = 60) {
  const slots = [];
  const start = new Date(`2000-01-01T${this.startTime}`);
  const end = new Date(`2000-01-01T${this.endTime}`);
  const durationMs = duration * 60000;
  
  let current = new Date(start);
  
  while (current < end) {
    const slotEnd = new Date(current.getTime() + durationMs);
    if (slotEnd <= end) {
      slots.push({
        start: current.toTimeString().slice(0, 5),
        end: slotEnd.toTimeString().slice(0, 5)
      });
    }
    current = new Date(current.getTime() + durationMs);
  }
  
  return slots;
};

module.exports = mongoose.model('Availability', availabilitySchema);
