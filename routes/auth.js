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
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - userType
 *         - phone
 *       properties:
 *         username:
 *           type: string
 *           description: User's unique username
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password (minimum 6 characters)
 *         userType:
 *           type: string
 *           enum: [seeker, provider]
 *           description: Type of user account
 *         phone:
 *           type: string
 *           description: User's phone number
 *         profileImage:
 *           type: string
 *           description: URL to user's profile image
 *     CreateAdminRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - adminSecret
 *       properties:
 *         name:
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
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: User ID
 *             name:
 *               type: string
 *               description: User's name
 *             email:
 *               type: string
 *               description: User's email
 *             userType:
 *               type: string
 *               description: User type
 */

/**
 * @swagger
 * /api/auth/create-admin:
 *   post:
 *     summary: Create first admin user
 *     description: Create the first admin user (only works if no admin exists)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminRequest'
 *     responses:
 *       200:
 *         description: Admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation errors or admin already exists
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
// @route   POST /api/auth/create-admin
// @desc    Create first admin user (only works if no admin exists)
// @access  Public (but should be restricted in production)
router.post('/create-admin', [
  body('name', 'Name is required').notEmpty(),
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

    const { name, email, password, adminSecret } = req.body;

    // Check admin secret (you can change this to any secret you want)
    if (adminSecret !== 'SHFLY_ADMIN_SECRET_2024') {
      return res.status(403).json({ message: 'Invalid admin secret' });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ userType: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin user already exists' });
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
      fullname: name,
      username: email.split('@')[0], // Generate username from email
      email,
      password: hashedPassword,
      userType: 'admin',
      phone: '',
      profileImage: '',
      isVerified: true,
      isActive: true
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
      message: 'Admin user created successfully',
      token,
              user: {
          id: adminUser._id,
          name: adminUser.fullname,
          email: adminUser.email,
          userType: adminUser.userType
        }
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ message: 'Server error during admin creation' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Register a new seeker or provider user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - validation errors or user already exists
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
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username', 'Username is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  body('userType', 'UserType is required').isIn(['seeker', 'provider']),
  body('phone', 'Phone number is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, userType, phone, profileImage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }, { username }] 
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email, phone, or username already exists' });
    }

    // Create user object (password will be hashed by User model pre-save hook)
    const userFields = {
      username,
      email,
      password,  // Plain password - will be hashed by User model
      userType,
      phone: phone || '',
      profileImage: profileImage || '',
      isVerified: true,  // Set to true since verification is commented out
      isActive: true
    };

    const user = new User(userFields);
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
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
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
// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
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

    // Check if user exists and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
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
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.fullname,
        email: user.email,
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * @swagger
 * /api/auth/user:
 *   get:
 *     summary: Get current user data
 *     description: Get authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data retrieved successfully
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
 *       404:
 *         description: User not found
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
// @route   GET /api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', async (req, res) => {
  try {
    // Get token from header (check both Authorization and x-auth-token)
    let token = req.header('Authorization');
    
    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7); // Remove 'Bearer ' prefix
    } else {
      token = req.header('x-auth-token'); // Fallback to x-auth-token
    }

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from database
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout user (client-side token removal)
 *     tags: [Authentication]
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
 *                   example: "Logout successful"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // You could implement a blacklist here if needed
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

module.exports = router;
