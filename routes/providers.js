const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');

// @route   GET /api/providers
// @desc    Get all providers (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', specialization = '', featured = false, verified = false } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { userType: 'provider', isActive: true };
    
    if (specialization && specialization !== 'all') {
      filter.specialization = specialization;
    }
    
    if (featured === 'true') {
      filter.featured = true;
    }
    
    if (verified === 'true') {
      filter.isVerified = true;
    }
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { fullname: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { specialization: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };
    
    // Get providers with pagination
    const providers = await User.find(finalFilter)
      .select('-password')
      .sort({ isVerified: -1, rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalProviders = await User.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalProviders / limit);
    
    res.json({
      success: true,
      data: {
        providers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProviders,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching providers' 
    });
  }
});

// @route   POST /api/providers
// @desc    Create a new provider (admin only)
// @access  Private/Admin
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      fullname,
      email,
      password,
      specialization,
      price,
      country,
      gender,
      dob,
      bio,
      phone,
      profileImage,
      isVerified = false,
      isActive = true
    } = req.body;
    
    // Validate required fields
    if (!fullname || !email || !password || !specialization || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Check if specialization exists
    const category = await Category.findById(specialization);
    if (!category || !category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive specialization'
      });
    }
    
    const provider = new User({
      fullname,
      email,
      password,
      userType: 'provider',
      specialization,
      price,
      country,
      gender,
      dob,
      bio,
      phone,
      profileImage,
      isVerified,
      isActive
    });
    
    await provider.save();
    
    // Remove password from response
    const providerResponse = provider.toObject({ hide: 'password' });
    
    res.status(201).json({
      success: true,
      message: 'Provider created successfully',
      data: { provider: providerResponse }
    });
  } catch (error) {
    console.error('Create provider error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating provider' 
    });
  }
});

// @route   GET /api/providers/questions
// @desc    Get questions for providers based on their specializations
// @access  Private/Provider
router.get('/questions', auth, async (req, res) => {
  try {
    // Debug logging
    console.log('Questions endpoint accessed by user:', {
      userId: req.userProfile._id,
      userType: req.userProfile.userType,
      email: req.userProfile.email
    });
    
    // Check if user is a provider
    if (req.userProfile.userType !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only providers can access this endpoint.'
      });
    }

    const {
      page = 1,
      limit = 10,
      status = 'all',
      priority = 'all',
      category = 'all',
      subcategory = 'all',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const providerId = req.userProfile._id;

    // Get provider's specializations
    const provider = await User.findById(providerId).select('specializations');
    if (!provider || !provider.specializations || provider.specializations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provider must have specializations to view questions.'
      });
    }

    // Build filter object
    const filter = {
      isPublic: true,
      $or: [
        { category: { $in: provider.specializations } },
        { subcategory: { $in: provider.specializations } }
      ]
    };

    // Add status filter
    if (status !== 'all') {
      filter.status = status;
    }

    // Add priority filter
    if (priority !== 'all') {
      filter.priority = priority;
    }

    // Add category filter
    if (category !== 'all') {
      filter.category = category;
    }

    // Add subcategory filter
    if (subcategory !== 'all') {
      filter.subcategory = subcategory;
    }

    // Add search filter
    if (search) {
      filter.$and = [
        {
          $or: [
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
          ]
        }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get questions with pagination
    const questions = await Question.find(filter)
      .populate('userId', 'fullname username email profileImage bio country city')
      .populate('category', 'name description color icon')
      .populate('subcategory', 'name description color icon')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalQuestions = await Question.countDocuments(filter);
    const totalPages = Math.ceil(totalQuestions / limit);

    // Get additional statistics
    const stats = await Question.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          pendingQuestions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          answeredQuestions: {
            $sum: { $cond: [{ $eq: ['$status', 'answered'] }, 1, 0] }
          },
          closedQuestions: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          },
          urgentQuestions: {
            $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] }
          },
          highPriorityQuestions: {
            $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
          }
        }
      }
    ]);

    const questionStats = stats.length > 0 ? stats[0] : {
      totalQuestions: 0,
      pendingQuestions: 0,
      answeredQuestions: 0,
      closedQuestions: 0,
      urgentQuestions: 0,
      highPriorityQuestions: 0
    };

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalQuestions,
          limit: parseInt(limit)
        },
        stats: questionStats
      }
    });
  } catch (error) {
    console.error('Get provider questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions'
    });
  }
});

// @route   GET /api/providers/:id
// @desc    Get provider by ID (public)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const provider = await User.findById(req.params.id)
      .select('-password')
      .populate('specialization', 'name description');
    
    if (!provider || provider.userType !== 'provider') {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    if (!provider.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    res.json({
      success: true,
      data: { provider }
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching provider' 
    });
  }
});

// @route   PUT /api/providers/:id
// @desc    Update provider (admin or own profile)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      fullname,
      email,
      specialization,
      price,
      country,
      gender,
      dob,
      bio,
      phone,
      profileImage,
      isVerified,
      isActive
    } = req.body;
    
    const provider = await User.findById(req.params.id);
    if (!provider || provider.userType !== 'provider') {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    // Check if user is updating their own profile or is admin
    if (req.userProfile._id.toString() !== req.params.id && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Only admin can update verification status and active status
    if (req.userProfile.userType !== 'admin') {
      delete req.body.isVerified;
      delete req.body.isActive;
    }
    
    // Check if email already exists (if changing email)
    if (email && email !== provider.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    // Check if specialization exists (if changing specialization)
    if (specialization && specialization !== provider.specialization) {
      const category = await Category.findById(specialization);
      if (!category || !category.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive specialization'
        });
      }
    }
    
    // Update provider fields
    if (fullname) provider.fullname = fullname;
    if (email) provider.email = email;
    if (specialization) provider.specialization = specialization;
    if (price !== undefined) provider.price = price;
    if (country !== undefined) provider.country = country;
    if (gender !== undefined) provider.gender = gender;
    if (dob !== undefined) provider.dob = dob;
    if (bio !== undefined) provider.bio = bio;
    if (phone !== undefined) provider.phone = phone;
    if (profileImage !== undefined) provider.profileImage = profileImage;
    if (typeof isVerified === 'boolean' && req.userProfile.userType === 'admin') provider.isVerified = isVerified;
    if (typeof isActive === 'boolean' && req.userProfile.userType === 'admin') provider.isActive = isActive;
    
    await provider.save();
    
    // Remove password from response
    const providerResponse = provider.toObject({ hide: 'password' });
    
    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: { provider: providerResponse }
    });
  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating provider' 
    });
  }
});

// @route   DELETE /api/providers/:id
// @desc    Delete provider (admin only)
// @access  Private/Admin
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.userType !== 'provider') {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    // Prevent admin from deleting themselves
    if (provider._id.toString() === req.userProfile._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting provider' 
    });
  }
});



module.exports = router;
