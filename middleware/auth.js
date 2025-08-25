const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Check if the decoded token has the expected structure
    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    const user = await User.findById(decoded.user.id);

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = decoded.user;
    req.userProfile = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is a provider
const isProvider = async (req, res, next) => {
  try {
    if (req.userProfile.userType !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Provider privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check if user is a seeker
const isSeeker = async (req, res, next) => {
  try {
    if (req.userProfile.userType !== 'seeker') {
      return res.status(403).json({ message: 'Access denied. Seeker privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (req.userProfile.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { auth, isProvider, isSeeker, isAdmin };


