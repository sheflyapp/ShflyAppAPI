const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Category = require('../models/Category');
const Consultation = require('../models/Consultation');
const Payment = require('../models/Payment');

// Apply admin authentication to all routes
router.use(auth);
router.use(isAdmin);

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalProviders:
 *                           type: integer
 *                         totalSeekers:
 *                           type: integer
 *                         totalCategories:
 *                           type: integer
 *                         totalConsultations:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get user counts
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ userType: 'provider' });
    const totalSeekers = await User.countDocuments({ userType: 'seeker' });
    
    // Get categories count
    const totalCategories = await Category.countDocuments();
    
    // Get consultation count
    const totalConsultations = await Consultation.countDocuments();
    
    // Get recent consultations
    const recentConsultations = await Consultation.find()
      .populate('seeker', 'fullname email')
      .populate('provider', 'fullname email specialization')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Calculate total revenue from completed payments
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
    
    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProviders,
          totalSeekers,
          totalCategories,
          totalConsultations,
          totalRevenue: revenue
        },
        recent: {
          consultations: recentConsultations
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard statistics' 
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or username
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [all, admin, seeker, provider]
 *         description: Filter by user type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, verified, unverified, active, inactive]
 *         description: Filter by user status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', userType = '', status = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (userType && userType !== 'all') {
      filter.userType = userType;
    }
    if (status && status !== 'all') {
      if (status === 'verified') filter.isVerified = true;
      else if (status === 'unverified') filter.isVerified = false;
      else if (status === 'active') filter.isActive = true;
      else if (status === 'inactive') filter.isActive = false;
    }
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { fullname: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };
    
    // Get users with pagination
    const users = await User.find(finalFilter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalUsers / limit);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users' 
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user' 
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/users/:id', async (req, res) => {
  try {
    const { fullname, email, userType, isVerified, isActive, phone, profileImage } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update user fields
    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (userType) user.userType = userType;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;
    if (profileImage !== undefined) user.profileImage = profileImage;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: user.toObject({ hide: 'password' }) }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating user' 
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Toggle user active status
// @access  Private/Admin
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    user.isActive = isActive;
    await user.save();
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: user.toObject({ hide: 'password' }) }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating user status' 
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting user' 
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private/Admin
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, userType, phone, fullname } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already exists' : 'Username already exists'
      });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      userType,
      phone: phone || '',
      fullname: fullname || username,
      isVerified: true,
      isActive: true
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: user.toObject({ hide: 'password' }) }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories with filtering
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentCategory
 *         schema:
 *           type: string
 *         description: Parent category ID or 'null' for root categories
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for category name
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/categories', async (req, res) => {
  try {
    const { parentCategory, search = '' } = req.query;
    
    let filter = {};
    
    // Filter by parent category
    if (parentCategory === 'null') {
      filter.parentCategory = null;
    } else if (parentCategory) {
      filter.parentCategory = parentCategory;
    }
    
    // Add search filter
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    
    const categories = await Category.find(filter)
      .populate('parentCategory', 'name')
      .populate('subcategories', 'name')
      .sort({ sortOrder: 1, name: 1 });
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching categories' 
    });
  }
});

// @route   POST /api/admin/categories
// @desc    Create new category
// @access  Private/Admin
router.post('/categories', async (req, res) => {
  try {
    const { name, description, parentCategory, icon, color, isActive, featured, sortOrder } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Convert empty string to null for parentCategory
    const parentCat = parentCategory === '' ? null : parentCategory;
    
    const category = new Category({
      name: name.trim(),
      description: description.trim(),
      parentCategory: parentCat,
      icon,
      color,
      isActive,
      featured,
      sortOrder
    });
    
    await category.save();
    
    // If this is a subcategory, add it to parent's subcategories
    if (parentCat) {
      const parent = await Category.findById(parentCat);
      if (parent) {
        parent.subcategories.push(category._id);
        await parent.save();
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating category' 
    });
  }
});

// @route   PUT /api/admin/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put('/categories/:id', async (req, res) => {
  try {
    const { name, description, parentCategory, icon, color, isActive, featured, sortOrder } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }
    
    // Convert empty string to null for parentCategory
    const parentCat = parentCategory === '' ? null : parentCategory;
    
    // Update category fields
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category name cannot be empty'
        });
      }
      category.name = name.trim();
    }
    if (description !== undefined) {
      category.description = description.trim();
    }
    if (parentCategory !== undefined) category.parentCategory = parentCat;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (typeof isActive === 'boolean') category.isActive = isActive;
    if (typeof featured === 'boolean') category.featured = featured;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    
    await category.save();
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating category' 
    });
  }
});

// @route   DELETE /api/admin/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }
    
    // Check if category has subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete category with subcategories' 
      });
    }
    
    // Remove from parent's subcategories if it's a subcategory
    if (category.parentCategory) {
      const parent = await Category.findById(category.parentCategory);
      if (parent) {
        parent.subcategories = parent.subcategories.filter(id => !id.equals(category._id));
        await parent.save();
      }
    }
    
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting category' 
    });
  }
});

/**
 * @swagger
 * /api/admin/consultations:
 *   get:
 *     summary: Get all consultations with filtering
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of consultations per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, accepted, in-progress, completed, cancelled]
 *         description: Filter by consultation status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for consultation title
 *     responses:
 *       200:
 *         description: Consultations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Consultation'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/consultations', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', type = '', category = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.consultationType = type;
    if (category && category !== 'all') filter.category = category;
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };
    
    // Get consultations with pagination
    const consultations = await Consultation.find(finalFilter)
      .populate('seeker', 'fullname email')
      .populate('provider', 'fullname email specialization')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalConsultations = await Consultation.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalConsultations / limit);
    
    res.json({
      success: true,
      data: {
        consultations,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalConsultations,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching consultations' 
    });
  }
});

// @route   GET /api/admin/consultations/:id
// @desc    Get consultation by ID
// @access  Private/Admin
router.get('/consultations/:id', async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('seeker', 'fullname email phone')
      .populate('provider', 'fullname email phone specialization')
      .populate('category', 'name');
    
    if (!consultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consultation not found' 
      });
    }
    
    res.json({
      success: true,
      data: { consultation }
    });
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching consultation' 
    });
  }
});

// @route   PUT /api/admin/consultations/:id
// @desc    Update consultation
// @access  Private/Admin
router.put('/consultations/:id', async (req, res) => {
  try {
    const { status, notes, seekerNotes, providerNotes } = req.body;
    
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consultation not found' 
      });
    }
    
    // Update consultation fields
    if (status) consultation.status = status;
    if (notes !== undefined) consultation.notes = notes;
    if (seekerNotes !== undefined) consultation.seekerNotes = seekerNotes;
    if (providerNotes !== undefined) consultation.providerNotes = providerNotes;
    
    await consultation.save();
    
    res.json({
      success: true,
      message: 'Consultation updated successfully',
      data: { consultation }
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating consultation' 
    });
  }
});

// @route   PUT /api/admin/consultations/:id/status
// @desc    Update consultation status
// @access  Private/Admin
router.put('/consultations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consultation not found' 
      });
    }
    
    consultation.status = status;
    await consultation.save();
    
    res.json({
      success: true,
      message: 'Consultation status updated successfully',
      data: { consultation }
    });
  } catch (error) {
    console.error('Update consultation status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating consultation status' 
    });
  }
});

// @route   DELETE /api/admin/consultations/:id
// @desc    Delete consultation
// @access  Private/Admin
router.delete('/consultations/:id', async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consultation not found' 
      });
    }
    
    await Consultation.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Consultation deleted successfully'
    });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting consultation' 
    });
  }
});

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Get all payments with filtering
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, completed, failed, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *         description: Filter by payment method
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/payments', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', method = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (method && method !== 'all') filter.paymentMethod = method;
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { transactionId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };
    
    // Get payments with pagination
    const payments = await Payment.find(finalFilter)
      .populate('consultation', 'title consultationType')
      .populate('seeker', 'fullname email')
      .populate('provider', 'fullname email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalPayments = await Payment.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalPayments / limit);
    
    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payments' 
    });
  }
});

// @route   GET /api/admin/payments/:id
// @desc    Get payment by ID
// @access  Private/Admin
router.get('/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('consultation', 'title consultationType status')
      .populate('seeker', 'fullname email phone')
      .populate('provider', 'fullname email phone');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment' 
    });
  }
});

// @route   PUT /api/admin/payments/:id
// @desc    Update payment
// @access  Private/Admin
router.put('/payments/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Update payment fields
    if (status) payment.status = status;
    if (notes !== undefined) payment.notes = notes;
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating payment' 
    });
  }
});

// @route   PUT /api/admin/payments/:id/refund
// @desc    Refund payment
// @access  Private/Admin
router.put('/payments/:id/refund', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }
    
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundAmount = payment.amount;
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error refunding payment' 
    });
  }
});

// @route   DELETE /api/admin/payments/:id
// @desc    Delete payment
// @access  Private/Admin
router.delete('/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    await Payment.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting payment' 
    });
  }
});

module.exports = router;
