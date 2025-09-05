const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import User model
const User = require('../models/User');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminLoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Admin's email address
 *         password:
 *           type: string
 *           description: Admin's password
 *     AdminRegisterRequest:
 *       type: object
 *       required:
 *         - fullname
 *         - email
 *         - password
 *         - adminSecret
 *       properties:
 *         fullname:
 *           type: string
 *           description: Admin's full name
 *         email:
 *           type: string
 *           format: email
 *           description: Admin's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Admin's password (minimum 6 characters)
 *         adminSecret:
 *           type: string
 *           description: Secret key to create admin account
 *         phone:
 *           type: string
 *           description: Admin's phone number
 *     AdminAuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         admin:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Admin ID
 *             fullname:
 *               type: string
 *               description: Admin's full name
 *             email:
 *               type: string
 *               description: Admin's email
 *             userType:
 *               type: string
 *               description: User type (always 'admin')
 */

/**
 * @swagger
 * /api/admin/auth/register:
 *   post:
 *     summary: Register a new admin user
 *     description: Register a new admin user with admin secret verification
 *     tags: [Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminRegisterRequest'
 *     responses:
 *       200:
 *         description: Admin user registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAuthResponse'
 *       400:
 *         description: Bad request - validation errors or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - invalid admin secret
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', [
  body('fullname', 'Full name is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  body('adminSecret', 'Admin secret is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, adminSecret, phone } = req.body;

    // Check admin secret
    if (adminSecret !== process.env.ADMIN_SECRET || adminSecret !== 'SHFLY_ADMIN_SECRET_2024') {
      return res.status(403).json({ message: 'Invalid admin secret' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const adminUser = new User({
      fullname,
      username: email.split('@')[0], // Generate username from email
      email,
      password: hashedPassword,
      userType: 'admin',
      phone: phone || '',
      profileImage: '',
      isVerified: true,
      isActive: true,
      socialLogin: false
    });

    await adminUser.save();

    // Create JWT token
    const payload = {
      user: {
        id: adminUser._id,
        email: adminUser.email,
        userType: adminUser.userType
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      message: 'Admin user registered successfully',
      token,
      admin: {
        id: adminUser._id,
        fullname: adminUser.fullname,
        email: adminUser.email,
        userType: adminUser.userType
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during admin registration' });
  }
});

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate admin and get JWT token
 *     tags: [Admin Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminLoginRequest'
 *     responses:
 *       200:
 *         description: Admin login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminAuthResponse'
 *       400:
 *         description: Bad request - validation errors or invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists, is admin, and include password for comparison
    const user = await User.findOne({ email, userType: 'admin' }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Admin account is deactivated' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
});

/**
 * @swagger
 * /api/admin/auth/profile:
 *   get:
 *     summary: Get admin profile
 *     description: Get authenticated admin's profile information
 *     tags: [Admin Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - user is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', async (req, res) => {
  try {
    // Get token from header
    let token = req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    } else {
      token = req.header('x-auth-token');
    }

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from database and verify it's an admin
    const user = await User.findById(decoded.user.id)
      .select('-password')
      .populate('specializations', 'name description color');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

/**
 * @swagger
 * /api/admin/auth/logout:
 *   post:
 *     summary: Admin logout
 *     description: Logout admin (client-side token removal)
 *     tags: [Admin Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Admin logout successful"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', async (req, res) => {
  try {
    res.json({ message: 'Admin logout successful' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ message: 'Server error during admin logout' });
  }
});

module.exports = router;


