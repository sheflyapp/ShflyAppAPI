const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/seekers
// @desc    Get all seekers (admin only)
// @access  Private/Admin
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', country = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { userType: 'seeker' };
    
    if (status && status !== 'all') {
      if (status === 'verified') filter.isVerified = true;
      else if (status === 'unverified') filter.isVerified = false;
      else if (status === 'active') filter.isActive = true;
      else if (status === 'inactive') filter.isActive = false;
    }
    
    if (country && country !== 'all') {
      filter.country = country;
    }
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { fullname: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };
    
    // Get seekers with pagination
    const seekers = await User.find(finalFilter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalSeekers = await User.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalSeekers / limit);
    
    res.json({
      success: true,
      data: {
        seekers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalSeekers,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get seekers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching seekers' 
    });
  }
});

// @route   POST /api/seekers
// @desc    Create a new seeker (admin only)
// @access  Private/Admin
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      fullname,
      email,
      password,
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
    if (!fullname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
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
    
    const seeker = new User({
      fullname,
      email,
      password,
      userType: 'seeker',
      country,
      gender,
      dob,
      bio,
      phone,
      profileImage,
      isVerified,
      isActive
    });
    
    await seeker.save();
    
    // Remove password from response
    const seekerResponse = seeker.toObject({ hide: 'password' });
    
    res.status(201).json({
      success: true,
      message: 'Seeker created successfully',
      data: { seeker: seekerResponse }
    });
  } catch (error) {
    console.error('Create seeker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating seeker' 
    });
  }
});

// @route   GET /api/seekers/:id
// @desc    Get seeker by ID (admin or own profile)
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const seeker = await User.findById(req.params.id).select('-password');
    
    if (!seeker || seeker.userType !== 'seeker') {
      return res.status(404).json({ 
        success: false, 
        message: 'Seeker not found' 
      });
    }
    
    // Check if user is requesting their own profile or is admin
    if (req.userProfile._id.toString() !== req.params.id && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({
      success: true,
      data: { seeker }
    });
  } catch (error) {
    console.error('Get seeker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching seeker' 
    });
  }
});

// @route   PUT /api/seekers/:id
// @desc    Update seeker (admin or own profile)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      fullname,
      email,
      country,
      gender,
      dob,
      bio,
      phone,
      profileImage,
      isVerified,
      isActive
    } = req.body;
    
    const seeker = await User.findById(req.params.id);
    if (!seeker || seeker.userType !== 'seeker') {
      return res.status(404).json({ 
        success: false, 
        message: 'Seeker not found' 
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
    if (email && email !== seeker.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    // Update seeker fields
    if (fullname) seeker.fullname = fullname;
    if (email) seeker.email = email;
    if (country !== undefined) seeker.country = country;
    if (gender !== undefined) seeker.gender = gender;
    if (dob !== undefined) seeker.dob = dob;
    if (bio !== undefined) seeker.bio = bio;
    if (phone !== undefined) seeker.phone = phone;
    if (profileImage !== undefined) seeker.profileImage = profileImage;
    if (typeof isVerified === 'boolean' && req.userProfile.userType === 'admin') seeker.isVerified = isVerified;
    if (typeof isActive === 'boolean' && req.userProfile.userType === 'admin') seeker.isActive = isActive;
    
    await seeker.save();
    
    // Remove password from response
    const seekerResponse = seeker.toObject({ hide: 'password' });
    
    res.json({
      success: true,
      message: 'Seeker updated successfully',
      data: { seeker: seekerResponse }
    });
  } catch (error) {
    console.error('Update seeker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating seeker' 
    });
  }
});

// @route   DELETE /api/seekers/:id
// @desc    Delete seeker (admin only)
// @access  Private/Admin
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const seeker = await User.findById(req.params.id);
    if (!seeker || seeker.userType !== 'seeker') {
      return res.status(404).json({ 
        success: false, 
        message: 'Seeker not found' 
      });
    }
    
    // Prevent admin from deleting themselves
    if (seeker._id.toString() === req.userProfile._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Seeker deleted successfully'
    });
  } catch (error) {
    console.error('Delete seeker error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting seeker' 
    });
  }
});

module.exports = router;
