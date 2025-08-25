const User = require('../models/User');

// Middleware to check if user is a provider
const requireProvider = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.userType !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider role required.'
      });
    }
    next();
  } catch (error) {
    console.error('Provider auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check if user is a seeker
const requireSeeker = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.userType !== 'seeker') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Seeker role required.'
      });
    }
    next();
  } catch (error) {
    console.error('Seeker auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check if user is an admin
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check if user is either provider or seeker
const requireProviderOrSeeker = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || (user.userType !== 'provider' && user.userType !== 'seeker')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Provider or Seeker role required.'
      });
    }
    next();
  } catch (error) {
    console.error('User auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requireProvider,
  requireSeeker,
  requireAdmin,
  requireProviderOrSeeker
};
