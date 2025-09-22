const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Category = require('../models/Category');
const Consultation = require('../models/Consultation');
const Payment = require('../models/Payment');
const Question = require('../models/Question');

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     description: Retrieve comprehensive statistics for admin dashboard
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
 *                     totalUsers:
 *                       type: number
 *                     totalSeekers:
 *                       type: number
 *                     totalProviders:
 *                       type: number
 *                     totalConsultations:
 *                       type: number
 *                     totalPayments:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *                     recentUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/dashboard', auth, isAdmin, async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const totalSeekers = await User.countDocuments({ userType: 'seeker' });
    const totalProviders = await User.countDocuments({ userType: 'provider' });
    const totalAdmins = await User.countDocuments({ userType: 'admin' });

    // Get consultation statistics
    const totalConsultations = await Consultation.countDocuments();
    const pendingConsultations = await Consultation.countDocuments({ status: 'pending' });
    const completedConsultations = await Consultation.countDocuments({ status: 'completed' });

    // Get payment statistics
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'success' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Get recent users (last 10)
    const recentUsers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get recent consultations (last 5)
    const recentConsultations = await Consultation.find()
      .populate('seeker', 'fullname email')
      .populate('provider', 'fullname email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          seekers: totalSeekers,
          providers: totalProviders,
          admins: totalAdmins
        },
        consultations: {
          total: totalConsultations,
          pending: pendingConsultations,
          completed: completedConsultations
        },
        payments: {
          total: totalPayments,
          completed: completedPayments,
          revenue: totalRevenue[0]?.total || 0
        },
        recentUsers,
        recentConsultations
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories (Admin only)
 *     description: Retrieve all categories with filtering and search capabilities
 *     tags: [Categories - Admin]
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
 *         description: Number of categories per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for category name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *         description: Filter by active status
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
router.get('/categories', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive = 'all' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (isActive !== 'all') filter.isActive = isActive === 'true';
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

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     description: Create a new service category
 *     tags: [Categories - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               description:
 *                 type: string
 *                 description: Category description
 *               parentCategory:
 *                 type: string
 *                 description: Parent category ID (for subcategories)
 *               icon:
 *                 type: string
 *                 description: Category icon
 *               color:
 *                 type: string
 *                 description: Category color
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               featured:
 *                 type: boolean
 *                 default: false
 *               sortOrder:
 *                 type: number
 *                 default: 0
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     category:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         description: Bad request - Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.post('/categories', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     description: Update an existing category
 *     tags: [Categories - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Category name
 *               description:
 *                 type: string
 *                 description: Category description
 *               parentCategory:
 *                 type: string
 *                 description: Parent category ID (for subcategories)
 *               icon:
 *                 type: string
 *                 description: Category icon
 *               color:
 *                 type: string
 *                 description: Category color
 *               isActive:
 *                 type: boolean
 *               featured:
 *                 type: boolean
 *               sortOrder:
 *                 type: number
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Bad request - Invalid data
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/categories/:id', auth, isAdmin, async (req, res) => {
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
    if (description !== undefined) category.description = description.trim();
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

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     description: Delete a category. Cannot delete categories with subcategories.
 *     tags: [Categories - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Bad request - Cannot delete category with subcategories
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.delete('/categories/:id', auth, isAdmin, async (req, res) => {
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
 *     summary: Get all consultations with filtering (Admin only)
 *     description: Retrieve all consultations with filtering and search capabilities
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
 *                   type: object
 *                   properties:
 *                     consultations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Consultation'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalConsultations:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/consultations', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/consultations/{id}:
 *   get:
 *     summary: Get consultation by ID (Admin only)
 *     description: Retrieve a specific consultation by ID
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation ID
 *     responses:
 *       200:
 *         description: Consultation retrieved successfully
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
 *                     consultation:
 *                       $ref: '#/components/schemas/Consultation'
 *       404:
 *         description: Consultation not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/consultations/:id', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/consultations/{id}:
 *   put:
 *     summary: Update consultation (Admin only)
 *     description: Update consultation details
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, in-progress, completed, cancelled]
 *               notes:
 *                 type: string
 *                 description: Admin notes
 *               seekerNotes:
 *                 type: string
 *                 description: Notes for seeker
 *               providerNotes:
 *                 type: string
 *                 description: Notes for provider
 *     responses:
 *       200:
 *         description: Consultation updated successfully
 *       404:
 *         description: Consultation not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/consultations/:id', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/consultations/{id}/status:
 *   put:
 *     summary: Update consultation status (Admin only)
 *     description: Update only the status of a consultation
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, in-progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Consultation status updated successfully
 *       404:
 *         description: Consultation not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/consultations/:id/status', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/consultations/{id}:
 *   delete:
 *     summary: Delete consultation (Admin only)
 *     description: Delete a consultation
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Consultation ID
 *     responses:
 *       200:
 *         description: Consultation deleted successfully
 *       404:
 *         description: Consultation not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.delete('/consultations/:id', auth, isAdmin, async (req, res) => {
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
 *     summary: Get all payments with filtering (Admin only)
 *     description: Retrieve all payments with filtering and search capabilities
 *     tags: [Payments - Admin]
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
 *           enum: [all, pending, processing, success, failed, cancelled]
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
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalPayments:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/payments', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status: statusFilter = '', method = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (statusFilter && statusFilter !== 'all') filter.status = statusFilter;
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
      .populate('questionId', 'description status')
      .populate('seekerId', 'fullname email')
      .populate('providerId', 'fullname email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalPayments = await Payment.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalPayments / limit);

    // Compute totals in Node to allow currency conversion to SAR
    const currencyToSarRate = {
      SAR: 1,
      USD: 3.75,
      EUR: 4.1,
      GBP: 4.8,
      AED: 1.02
    };

    const statusKeys = ['pending','processing','success','failed','cancelled'];
    const statusTotals = statusKeys.reduce((acc, key) => {
      acc[key] = { count: 0, amount: 0, amountSar: 0 };
      return acc;
    }, {});

    let totalAmount = 0;
    let totalAmountSar = 0;

    for (const p of payments) {
      const st = p.status;
      const rate = currencyToSarRate[p.currency] || 1;
      const amount = (Number(p.amount) || 0) / 100;
      const amountSar = amount * rate;
      totalAmount += amount;
      totalAmountSar += amountSar;
      if (statusTotals[st]) {
        statusTotals[st].count += 1;
        statusTotals[st].amount += amount;
        statusTotals[st].amountSar += amountSar;
      }
    }
    const totalRevenueSar = statusTotals.success?.amountSar || 0;

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          limit: parseInt(limit)
        },
        totals: {
          totalPayments,
          totalAmount,
          totalAmountSar,
          totalRevenueSar,
          statusTotals
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

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   get:
 *     summary: Get payment by ID (Admin only)
 *     description: Retrieve a specific payment by ID
 *     tags: [Payments - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/payments/:id', auth, isAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('questionId', 'description status')
      .populate('seekerId', 'fullname email phone')
      .populate('providerId', 'fullname email phone');

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

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   put:
 *     summary: Update payment (Admin only)
 *     description: Update payment details
 *     tags: [Payments - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, success, failed, cancelled]
 *               notes:
 *                 type: string
 *                 description: Admin notes
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/payments/:id', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/payments/{id}/refund:
 *   put:
 *     summary: Refund payment (Admin only)
 *     description: Process a refund for a completed payment
 *     tags: [Payments - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 *       400:
 *         description: Bad request - Only completed payments can be refunded
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/payments/:id/refund', auth, isAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Only successful payments can be refunded'
      });
    }

    payment.status = 'cancelled';
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

/**
 * @swagger
 * /api/admin/payments/{id}:
 *   delete:
 *     summary: Delete payment (Admin only)
 *     description: Delete a payment record
 *     tags: [Payments - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment deleted successfully
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.delete('/payments/:id', auth, isAdmin, async (req, res) => {
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

/**
 * @swagger
 * /api/admin/questions:
 *   get:
 *     summary: Get all questions (Admin only)
 *     description: Retrieve all questions with filtering and search capabilities for admin management
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
 *         description: Number of questions per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for question description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, answered, closed]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: subcategory
 *         schema:
 *           type: string
 *         description: Filter by subcategory ID
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
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
 *                     $ref: '#/components/schemas/Question'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalQuestions:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/questions', auth, isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      priority = 'all',
      category = '',
      subcategory = ''
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Search in question description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    // Filter by status
    if (status !== 'all') {
      query.status = status;
    }

    // Filter by priority
    if (priority !== 'all') {
      query.priority = priority;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by subcategory
    if (subcategory) {
      query.subcategory = subcategory;
    }

    // Get total count
    const totalQuestions = await Question.countDocuments(query);

    // Get questions with pagination
    const questions = await Question.find(query)
      .populate('userId', 'fullname email profileImage')
      .populate('category', 'name description color')
      .populate('subcategory', 'name description color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPages = Math.ceil(totalQuestions / limit);

    res.json({
      success: true,
      data: questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalQuestions,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get admin questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions'
    });
  }
});

/**
 * @swagger
 * /api/admin/questions/{id}:
 *   get:
 *     summary: Get question by ID (Admin only)
 *     description: Retrieve a specific question by ID for admin management
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.get('/questions/:id', auth, isAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('userId', 'fullname email profileImage')
      .populate('category', 'name description color')
      .populate('subcategory', 'name description color');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error('Get admin question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question'
    });
  }
});

/**
 * @swagger
 * /api/admin/questions/{id}/close:
 *   patch:
 *     summary: Close a question (Admin only)
 *     description: Close a question as an admin
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question closed successfully
 *       400:
 *         description: Question already closed
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.patch('/questions/:id/close', auth, isAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    if (question.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Question is already closed'
      });
    }

    question.status = 'closed';
    question.closedAt = new Date();
    question.closedBy = req.user.id;
    await question.save();

    res.json({
      success: true,
      message: 'Question closed successfully',
      data: question
    });

  } catch (error) {
    console.error('Close admin question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing question'
    });
  }
});

/**
 * @swagger
 * /api/admin/questions/{id}/update:
 *   patch:
 *     summary: Update question status or priority (Admin only)
 *     description: Update question status or priority
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, answered, closed]
 *                 description: Question status
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 description: Question priority
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.patch('/questions/:id/update', auth, isAdmin, async (req, res) => {
  try {
    const { status, priority } = req.body;

    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Update status if provided
    if (status) {
      question.status = status;
      if (status === 'closed') {
        question.closedAt = new Date();
        question.closedBy = req.user.id;
      }
    }

    // Update priority if provided
    if (priority) {
      question.priority = priority;
    }

    await question.save();

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });

  } catch (error) {
    console.error('Update admin question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question'
    });
  }
});

/**
 * @swagger
 * /api/admin/questions/{id}:
 *   delete:
 *     summary: Delete a question (Admin only)
 *     description: Delete a question as an admin
 *     tags: [Admin Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.delete('/questions/:id', auth, isAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await Question.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin question error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question'
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filtering (Admin only)
 *     description: Retrieve all users with filtering and search capabilities for admin management
 *     tags: [Users - Admin]
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
 *         description: Search term for user name, email, or username
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [all, admin, seeker, provider]
 *           default: all
 *         description: Filter by user type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *           default: all
 *         description: Filter by active status
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *           default: all
 *         description: Filter by verification status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, fullname, email, lastLogin]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
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
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/User'
 *                           - type: object
 *                             properties:
 *                               password:
 *                                 type: string
 *                                 description: Password field is excluded from response
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: number
 *                         totalSeekers:
 *                           type: number
 *                         totalProviders:
 *                           type: number
 *                         totalAdmins:
 *                           type: number
 *                         activeUsers:
 *                           type: number
 *                         verifiedUsers:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      userType = 'all',
      isActive = 'all',
      isVerified = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (userType !== 'all') filter.userType = userType;
    if (isActive !== 'all') filter.isActive = isActive === 'true';
    if (isVerified !== 'all') filter.isVerified = isVerified === 'true';

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

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get users with pagination
    const users = await User.find(finalFilter)
      .select('-password') // Exclude password field
      .populate('specializations', 'name description color icon') // Populate specializations with category details
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalUsers / limit);

    // Get statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      totalSeekers: await User.countDocuments({ userType: 'seeker' }),
      totalProviders: await User.countDocuments({ userType: 'provider' }),
      totalAdmins: await User.countDocuments({ userType: 'admin' }),
      activeUsers: await User.countDocuments({ isActive: true }),
      verifiedUsers: await User.countDocuments({ isVerified: true })
    };

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          limit: parseInt(limit)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
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
 *     summary: Get user by ID (Admin only)
 *     description: Retrieve a specific user by ID for admin management
 *     tags: [Users - Admin]
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
 *                   type: object
 *                   properties:
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             password:
 *                               type: string
 *                               description: Password field is excluded from response
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password') // Exclude password field
      .populate('specializations', 'name description color icon'); // Populate specializations with category details

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
    console.error('Get admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     description: Update user details as an admin
 *     tags: [Users - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 description: User full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email
 *               username:
 *                 type: string
 *                 description: Username
 *               phone:
 *                 type: string
 *                 description: User phone number
 *               userType:
 *                 type: string
 *                 enum: [admin, seeker, provider]
 *                 description: User type
 *               isActive:
 *                 type: boolean
 *                 description: Account active status
 *               isVerified:
 *                 type: boolean
 *                 description: Account verification status
 *               bio:
 *                 type: string
 *                 description: User bio
 *               country:
 *                 type: string
 *                 description: User country
 *               city:
 *                 type: string
 *                 description: User city
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: User gender
 *               price:
 *                 type: number
 *                 description: Consultation price (for providers)
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specialization category IDs (for providers) - will be populated with category details in response
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - type: object
 *                           properties:
 *                             password:
 *                               type: string
 *                               description: Password field is excluded from response
 *       400:
 *         description: Bad request - Invalid data
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const {
      fullname,
      email,
      username,
      phone,
      userType,
      isActive,
      isVerified,
      bio,
      country,
      city,
      gender,
      price,
      specializations
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    if (fullname !== undefined) user.fullname = fullname;
    if (email !== undefined) user.email = email;
    if (username !== undefined) user.username = username;
    if (phone !== undefined) user.phone = phone;
    if (userType !== undefined) user.userType = userType;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;
    if (bio !== undefined) user.bio = bio;
    if (country !== undefined) user.country = country;
    if (city !== undefined) user.city = city;
    if (gender !== undefined) user.gender = gender;
    if (price !== undefined) user.price = price;
    if (specializations !== undefined) user.specializations = specializations;

    await user.save();

    // Return user without password and with populated specializations
    const updatedUser = await User.findById(req.params.id)
      .select('-password')
      .populate('specializations', 'name description color icon');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     description: Update user active or verification status
 *     tags: [Users - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Account active status
 *               isVerified:
 *                 type: boolean
 *                 description: Account verification status
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.patch('/users/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { isActive, isVerified } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update status fields
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;

    await user.save();

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: Delete a user account (soft delete by deactivating)
 *     tags: [Users - Admin]
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
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete by deactivating the user
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

module.exports = router;

// New Admin Dashboard stats endpoint for frontend Dashboard.js
router.get('/dashboard/stats', auth, isAdmin, async (req, res) => {
  try {
    // Overview counts
    const [
      totalUsers,
      totalSeekers,
      totalProviders,
      totalCategories,
      totalConsultations,
      totalQuestions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ userType: 'seeker' }),
      User.countDocuments({ userType: 'provider' }),
      Category.countDocuments(),
      Consultation.countDocuments(),
      Question.countDocuments()
    ]);

    // Payments aggregates in SAR, amounts stored in cents
    const allPayments = await Payment.find({}).select('amount currency status');
    const currencyToSarRate = { SAR: 1, USD: 3.75, EUR: 4.1, GBP: 4.8, AED: 1.02 };
    const statusKeys = ['pending','processing','success','failed','cancelled'];
    const statusTotals = statusKeys.reduce((acc, key) => {
      acc[key] = { count: 0, amountSar: 0 };
      return acc;
    }, {});
    let totalAmountSar = 0;
    let totalRevenueSar = 0;
    for (const p of allPayments) {
      const rate = currencyToSarRate[p.currency] || 1;
      const amount = (Number(p.amount) || 0) / 100; // cents -> units
      const amountSar = amount * rate;
      totalAmountSar += amountSar;
      if (statusTotals[p.status]) {
        statusTotals[p.status].count += 1;
        statusTotals[p.status].amountSar += amountSar;
      }
    }
    totalRevenueSar = statusTotals.success?.amountSar || 0;
    const totalPayments = allPayments.length;

    // Recent questions
    const recentQuestions = await Question.find()
      .populate('userId', 'fullname email')
      .populate('closedBy', 'fullname email')
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .sort({ createdAt: -1 })
      .limit(6);

    // Charts data for last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        name: d.toLocaleString('en-US', { month: 'short' })
      });
    }

    const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const initSeries = () => months.reduce((acc, m) => (acc[m.key] = 0, acc), {});

    const usersSeries = initSeries();
    const questionsSeries = initSeries();
    const revenueSarSeries = initSeries();

    const sinceDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [users6m, questions6m, payments6m] = await Promise.all([
      User.find({ createdAt: { $gte: sinceDate } }).select('createdAt'),
      Question.find({ createdAt: { $gte: sinceDate } }).select('createdAt'),
      Payment.find({ createdAt: { $gte: sinceDate } }).select('createdAt amount currency status')
    ]);

    users6m.forEach(u => {
      const key = monthKey(u.createdAt);
      if (usersSeries[key] !== undefined) usersSeries[key] += 1;
    });

    questions6m.forEach(q => {
      const key = monthKey(q.createdAt);
      if (questionsSeries[key] !== undefined) questionsSeries[key] += 1;
    });

    payments6m.forEach(p => {
      const key = monthKey(p.createdAt);
      if (revenueSarSeries[key] !== undefined && p.status === 'success') {
        const rate = currencyToSarRate[p.currency] || 1;
        const amount = (Number(p.amount) || 0) / 100;
        revenueSarSeries[key] += amount * rate;
      }
    });

    const charts = months.map(m => ({
      name: m.name,
      users: usersSeries[m.key] || 0,
      questions: questionsSeries[m.key] || 0,
      revenue: Number((revenueSarSeries[m.key] || 0).toFixed(2))
    }));

    return res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProviders,
          totalSeekers,
          totalCategories,
          totalConsultations,
          totalQuestions,
          totalRevenue: totalRevenueSar
        },
        payments: {
          totalPayments,
          totalAmountSar,
          totalRevenueSar,
          statusTotals
        },
        charts,
        recent: {
          questions: recentQuestions.map(q => ({
            _id: q._id,
            postedBy: { fullname: q.userId?.fullname, email: q.userId?.email },
            solvedBy: q.closedBy ? { fullname: q.closedBy?.fullname, email: q.closedBy?.email } : null,
            category: q.category?.name,
            subcategory: q.subcategory?.name,
            description: q.description,
            status: q.status,
            createdAt: q.createdAt
          }))
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
});