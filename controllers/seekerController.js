const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
  });
};

// Seeker Registration
const registerSeeker = async (req, res) => {
  try {
    const { username, email, phone } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }, { phone }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new seeker user
    const seekerData = {
      ...req.body,
      userType: 'seeker',
      isActive: true, // Seekers are active by default
      isVerified: false
    };

    user = new User(seekerData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Seeker registered successfully',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Seeker registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Seeker Login
const loginSeeker = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and is a seeker
    const user = await User.findOne({ email, userType: 'seeker' });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials or not a seeker' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Seeker login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Seeker Profile
const getSeekerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Access denied. Seeker only.' });
    }

    res.json(user.getPublicProfile());
  } catch (error) {
    console.error('Get seeker profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Seeker Profile
const updateSeekerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Access denied. Seeker only.' });
    }

    // Update allowed fields
    const allowedUpdates = ['fullname', 'bio', 'country', 'profileImage'];
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
    console.error('Update seeker profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Available Providers for Seekers
const getAvailableProviders = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Access denied. Seeker only.' });
    }

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
    console.error('Get available providers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Provider Details by ID
const getProviderDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Access denied. Seeker only.' });
    }

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
    console.error('Get provider details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerSeeker,
  loginSeeker,
  getSeekerProfile,
  updateSeekerProfile,
  getAvailableProviders,
  getProviderDetails
};
