const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Provider Registration
const registerProvider = async (req, res) => {
  try {
    const { username, email, phone } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }, { phone }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new provider user
    const providerData = {
      ...req.body,
      userType: 'provider',
      isActive: false, // Providers need admin approval
      isVerified: false
    };

    user = new User(providerData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Provider registered successfully. Waiting for admin approval.',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Provider registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Provider Login
const loginProvider = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and is a provider
    const user = await User.findOne({ email, userType: 'provider' });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials or not a provider' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is pending admin approval' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Provider login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Provider Profile
const getProviderProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Provider only.' });
    }

    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Get provider profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Provider Profile
const updateProviderProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Provider only.' });
    }

    // Update allowed fields
    const allowedUpdates = ['fullname', 'bio', 'price', 'specialization', 'chat', 'call', 'video', 'availability'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update provider profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Active Providers (for seekers)
const getAllProviders = async (req, res) => {
  try {
    const { category, specialization, rating, priceMin, priceMax, country } = req.query;
    
    let filter = { userType: 'provider', isActive: true, isVerified: true };
    
    if (category) filter.category = category;
    if (specialization) filter.specialization = { $regex: specialization, $options: 'i' };
    if (rating) filter.rating = { $gte: parseFloat(rating) };
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }
    if (country) filter.country = { $regex: country, $options: 'i' };

    const providers = await User.find(filter)
      .select('fullname specialization price rating totalReviews country bio profileImage availability')
      .sort({ rating: -1, totalReviews: -1 });

    res.json(providers);
  } catch (error) {
    console.error('Get all providers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Provider by ID
const getProviderById = async (req, res) => {
  try {
    const provider = await User.findOne({ 
      _id: req.params.id, 
      userType: 'provider', 
      isActive: true,
      isVerified: true
    }).select('-password');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    console.error('Get provider by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerProvider,
  loginProvider,
  getProviderProfile,
  updateProviderProfile,
  getAllProviders,
  getProviderById
};
