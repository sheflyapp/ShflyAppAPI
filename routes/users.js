const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Category = require('../models/Category');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             users:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: number
 *                   example: 1
 *                 totalPages:
 *                   type: number
 *                   example: 5
 *                 totalUsers:
 *                   type: number
 *                   example: 50
 *                 limit:
 *                   type: number
 *                   example: 10
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Retrieve paginated list of all users with filtering and search capabilities
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
 *         description: Search term for user fullname or email
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [all, seeker, provider, admin]
 *         description: Filter by user type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *         description: Filter by active status
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *         description: Filter by verification status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      userType = 'all',
      isActive = 'all',
      isVerified = 'all'
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
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };

    // Get users with pagination
    const users = await User.find(finalFilter)
      .populate('specializations', 'name description color')
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
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     description: Retrieve a specific user by ID with full details
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
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('specializations', 'name description color')
      .select('-password');

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

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     description: Update user information including admin-only fields
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
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               profileImage:
 *                 type: string
 *                 description: Profile image URL
 *               userType:
 *                 type: string
 *                 enum: [seeker, provider, admin]
 *                 description: User type (admin only)
 *               isVerified:
 *                 type: boolean
 *                 description: Verification status (admin only)
 *               isActive:
 *                 type: boolean
 *                 description: Active status (admin only)
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of specialization category IDs
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
 *                       $ref: '#/components/schemas/User'
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
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const {
      fullname,
      email,
      phone,
      profileImage,
      userType,
      isVerified,
      isActive,
      specializations
    } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate email uniqueness if email is being updated
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Validate specializations if provided
    if (specializations && Array.isArray(specializations)) {
      const Category = require('../models/Category');
      const categories = await Category.find({
        _id: { $in: specializations },
        isActive: true
      });

      if (categories.length !== specializations.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more specializations are invalid or inactive'
        });
      }
    }

    // Update user fields
    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (userType && req.userProfile.userType === 'admin') user.userType = userType;
    if (typeof isVerified === 'boolean' && req.userProfile.userType === 'admin') user.isVerified = isVerified;
    if (typeof isActive === 'boolean' && req.userProfile.userType === 'admin') user.isActive = isActive;
    if (phone !== undefined) user.phone = phone;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (specializations !== undefined) user.specializations = specializations;

    await user.save();

    // Populate specializations before returning
    await user.populate('specializations', 'name description color');

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

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     description: Delete a user account. Admin cannot delete their own account.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Cannot delete own account
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.userProfile._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
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

module.exports = router;