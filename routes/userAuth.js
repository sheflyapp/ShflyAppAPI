const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import User model
const User = require('../models/User');
const googleAuthService = require('../services/googleAuthService');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserLoginRequest:
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
 *     UserRegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - userType
 *         - phone
 *         - specializations
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
 *         fullname:
 *           type: string
 *           description: User's full name (optional)
 *         country:
 *           type: string
 *           description: User's country
 *         city:
 *           type: string
 *           description: User's city
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: User's gender
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 *           description: User's specialization category IDs (required for all users, at least one)
 *     GoogleLoginRequest:
 *       type: object
 *       required:
 *         - idToken
 *         - platform
 *         - userType
 *         - specializations
 *       properties:
 *         idToken:
 *           type: string
 *           description: Google ID token from client
 *         platform:
 *           type: string
 *           enum: [android, ios, web]
 *           description: Platform type (android, ios, or web)
 *         userType:
 *           type: string
 *           enum: [seeker, provider]
 *           description: Type of user account
 *         specializations:
 *           type: array
 *           items:
 *             type: string
 *           description: User's specialization category IDs (required for all users, at least one)
 *     FacebookLoginRequest:
 *       type: object
 *       required:
 *         - facebookId
 *         - email
 *         - fullname
 *       properties:
 *         facebookId:
 *           type: string
 *           description: Facebook user ID
 *         email:
 *           type: string
 *           format: email
 *           description: User's email from Facebook
 *         fullname:
 *           type: string
 *           description: User's full name from Facebook
 *         userType:
 *           type: string
 *           enum: [seeker, provider]
 *           description: Type of user account
 *     AppleLoginRequest:
 *       type: object
 *       required:
 *         - appleId
 *         - email
 *         - fullname
 *       properties:
 *         appleId:
 *           type: string
 *           description: Apple user ID
 *         email:
 *           type: string
 *           format: email
 *           description: User's email from Apple
 *         fullname:
 *           type: string
 *           description: User's full name from Apple
 *         userType:
 *           type: string
 *           enum: [seeker, provider]
 *           description: Type of user account
 *     PhoneOtpRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           description: User's phone number
 *     PhoneOtpVerifyRequest:
 *       type: object
 *       required:
 *         - phone
 *         - otp
 *         - userType
 *       properties:
 *         phone:
 *           type: string
 *           description: User's phone number
 *         otp:
 *           type: string
 *           description: OTP code received via SMS
 *         userType:
 *           type: string
 *           enum: [seeker, provider]
 *           description: Type of user account
 *         fullname:
 *           type: string
 *           description: User's full name (optional for existing users)
 *     UserAuthResponse:
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
 *             username:
 *               type: string
 *               description: User's username
 *             email:
 *               type: string
 *               description: User's email
 *             userType:
 *               type: string
 *               description: User type
 *             phone:
 *               type: string
 *               description: User's phone number
 */

/**
 * @swagger
 * /api/user/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Register a new seeker or provider user
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegisterRequest'
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
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
router.post('/register', [
  body('username', 'Username is required').notEmpty(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  body('userType', 'UserType is required').isIn(['seeker', 'provider']),
  body('phone', 'Phone number is required').notEmpty(),
  body('specializations', 'Specializations are required for all users').isArray({ min: 1 }),
  body('specializations.*', 'Each specialization must be a valid ObjectId').isMongoId()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, userType, phone, profileImage, country, city, gender, specializations } = req.body;

    // Validate specializations
    const Category = require('../models/Category');
    const categories = await Category.find({ 
      _id: { $in: specializations }, 
      isActive: true 
    });
    
    if (categories.length !== specializations.length) {
      return res.status(400).json({ message: 'One or more specializations are invalid or inactive' });
    }

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
      phone,
      profileImage: profileImage || '',
      country: country || '',
      city: city || '',
      gender: gender || 'other',
      specializations: specializations,
      isVerified: true,  // Set to true since verification is commented out
      isActive: true,
      socialLogin: false
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
        userType: user.userType,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * @swagger
 * /api/user/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and get JWT token
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
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

    // Check if user exists and include password for comparison
    const user = await User.findOne({ email, userType: { $ne: 'admin' } }).select('+password');
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
        username: user.username,
        email: user.email,
        userType: user.userType,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * @swagger
 * /api/user/auth/google:
 *   post:
 *     summary: Google OAuth login/register
 *     description: Authenticate or register user using Google OAuth
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleLoginRequest'
 *     responses:
 *       200:
 *         description: Google login/register successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/google', [
  body('idToken', 'Google ID token is required').notEmpty(),
  body('platform', 'Platform is required').isIn(['android', 'ios', 'web']),
  body('userType', 'UserType is required').isIn(['seeker', 'provider']),
  body('specializations', 'Specializations are required for all users').isArray({ min: 1 }),
  body('specializations.*', 'Each specialization must be a valid ObjectId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { idToken, platform, userType, specializations } = req.body;
    // Verify Google ID token
    const googleUser = await googleAuthService.verifyIdToken(idToken, platform);
    if (!googleUser.emailVerified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }
    // Validate specializations
    const Category = require('../models/Category');
    const categories = await Category.find({ 
      _id: { $in: specializations }, 
      isActive: true 
    });
    
    if (categories.length !== specializations.length) {
      return res.status(400).json({ message: 'One or more specializations are invalid or inactive' });
    }
    // Check if user exists with this Google ID or email
    let user = await User.findOne({ 
      $or: [{ googleId: googleUser.googleId }, { email: googleUser.email }] 
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        user.socialLogin = true;
      }
      
      // Update specializations if provided
      if (specializations) {
        user.specializations = specializations;
      }
      
      await user.save();
    } else {
      // Create new user
      user = new User({
        fullname: googleUser.fullname,
        username: googleUser.email.split('@')[0],
        email: googleUser.email,
        googleId: googleUser.googleId,
        userType,
        phone: '',
        profileImage: googleUser.profileImage || '',
        specializations: specializations,
        isVerified: true,
        isActive: true,
        socialLogin: true
      });
      await user.save();
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
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        specializations: user.specializations
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: error.message || 'Server error during Google authentication' });
  }
});

/**
 * @swagger
 * /api/user/auth/facebook:
 *   post:
 *     summary: Facebook OAuth login/register
 *     description: Authenticate or register user using Facebook OAuth
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FacebookLoginRequest'
 *     responses:
 *       200:
 *         description: Facebook login/register successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/facebook', [
  body('facebookId', 'Facebook ID is required').notEmpty(),
  body('email', 'Email is required').isEmail(),
  body('fullname', 'Full name is required').notEmpty(),
  body('userType', 'UserType is required').isIn(['seeker', 'provider'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { facebookId, email, fullname, profileImage, userType } = req.body;

    // Check if user exists with this Facebook ID or email
    let user = await User.findOne({ 
      $or: [{ facebookId }, { email }] 
    });

    if (user) {
      // Update Facebook ID if not set
      if (!user.facebookId) {
        user.facebookId = facebookId;
        user.socialLogin = true;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        fullname,
        username: email.split('@')[0],
        email,
        facebookId,
        userType,
        phone: '',
        profileImage: profileImage || '',
        isVerified: true,
        isActive: true,
        socialLogin: true
      });
      await user.save();
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
      message: 'Facebook authentication successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({ message: 'Server error during Facebook authentication' });
  }
});

/**
 * @swagger
 * /api/user/auth/apple:
 *   post:
 *     summary: Apple OAuth login/register
 *     description: Authenticate or register user using Apple OAuth
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppleLoginRequest'
 *     responses:
 *       200:
 *         description: Apple login/register successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/apple', [
  body('appleId', 'Apple ID is required').notEmpty(),
  body('email', 'Email is required').isEmail(),
  body('fullname', 'Full name is required').notEmpty(),
  body('userType', 'UserType is required').isIn(['seeker', 'provider'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { appleId, email, fullname, userType } = req.body;

    // Check if user exists with this Apple ID or email
    let user = await User.findOne({ 
      $or: [{ appleId }, { email }] 
    });

    if (user) {
      // Update Apple ID if not set
      if (!user.appleId) {
        user.appleId = appleId;
        user.socialLogin = true;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        fullname,
        username: email.split('@')[0],
        email,
        appleId,
        userType,
        phone: '',
        profileImage: '',
        isVerified: true,
        isActive: true,
        socialLogin: true
      });
      await user.save();
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
      message: 'Apple authentication successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({ message: 'Server error during Apple authentication' });
  }
});

/**
 * @swagger
 * /api/user/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     description: Send OTP verification code to user's phone number
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PhoneOtpRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully"
 *       400:
 *         description: Bad request - validation errors
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
router.post('/send-otp', [
  body('phone', 'Phone number is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists with this phone
    let user = await User.findOne({ phone });

    if (user) {
      // Update existing user's OTP
      user.phoneOtp = { code: otp, expiresAt };
      await user.save();
    } else {
      // Create temporary user for OTP verification
      user = new User({
        fullname: '',
        username: `temp_${Date.now()}`,
        email: `temp_${Date.now()}@temp.com`,
        phone,
        userType: 'seeker', // Default, will be updated during verification
        isVerified: false,
        isActive: false,
        phoneOtp: { code: otp, expiresAt }
      });
      await user.save();
    }

    // TODO: Integrate with SMS service (Twilio, etc.)
    // For now, just return the OTP in development
    if (process.env.NODE_ENV === 'development') {
      res.json({
        message: 'OTP sent successfully',
        otp: otp, // Remove this in production
        expiresIn: '10 minutes'
      });
    } else {
      res.json({
        message: 'OTP sent successfully',
        expiresIn: '10 minutes'
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Server error while sending OTP' });
  }
});

/**
 * @swagger
 * /api/user/auth/verify-otp:
 *   post:
 *     summary: Verify phone OTP
 *     description: Verify OTP code and login/register user
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PhoneOtpVerifyRequest'
 *     responses:
 *       200:
 *         description: OTP verification successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserAuthResponse'
 *       400:
 *         description: Bad request - validation errors or invalid OTP
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
router.post('/verify-otp', [
  body('phone', 'Phone number is required').notEmpty(),
  body('otp', 'OTP code is required').notEmpty(),
  body('userType', 'UserType is required').isIn(['seeker', 'provider'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp, userType, fullname } = req.body;

    // Find user with this phone and valid OTP
    const user = await User.findOne({ 
      phone,
      'phoneOtp.code': otp,
      'phoneOtp.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP or OTP expired' });
    }

    // Clear OTP after successful verification
    user.phoneOtp = undefined;
    user.phoneVerified = true;

    // If this is a new user, update their details
    if (!user.isActive) {
      user.fullname = fullname || `User_${Date.now()}`;
      user.username = `user_${Date.now()}`;
      user.email = `user_${Date.now()}@phone.com`;
      user.userType = userType;
      user.isActive = true;
      user.isVerified = true;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user._id,
        phone: user.phone,
        userType: user.userType
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      message: 'OTP verification successful',
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        phone: user.phone,
        userType: user.userType
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

/**
 * @swagger
 * /api/user/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get authenticated user's profile information
 *     tags: [User Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
    
    // Get user from database (exclude admin users)
    const user = await User.findById(decoded.user.id)
      .select('-password')
      .populate('specializations', 'name description color');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType === 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin users should use admin routes.' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
});

/**
 * @swagger
 * /api/user/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout user (client-side token removal)
 *     tags: [User Authentication]
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
 *                   example: "User logout successful"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', async (req, res) => {
  try {
    res.json({ message: 'User logout successful' });
  } catch (error) {
    console.error('User logout error:', error);
    res.status(500).json({ message: 'Server error during user logout' });
  }
});

module.exports = router;


