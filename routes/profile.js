const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile - Common]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpire -phoneOtp -emailOtp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profile - Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 description: Full name
 *               bio:
 *                 type: string
 *                 description: User bio
 *               country:
 *                 type: string
 *                 description: Country
 *               city:
 *                 type: string
 *                 description: City
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: Gender
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Languages spoken
 *               chat:
 *                 type: boolean
 *                 description: Chat availability
 *               call:
 *                 type: boolean
 *                 description: Call availability
 *               video:
 *                 type: boolean
 *                 description: Video availability
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/', auth, async (req, res) => {
  try {
    const {
      fullname,
      bio,
      country,
      city,
      gender,
      dob,
      languages,
      chat,
      call,
      video
    } = req.body;

    const updateFields = {};

    if (fullname !== undefined) updateFields.fullname = fullname;
    if (bio !== undefined) updateFields.bio = bio;
    if (country !== undefined) updateFields.country = country;
    if (city !== undefined) updateFields.city = city;
    if (gender !== undefined) updateFields.gender = gender;
    if (dob !== undefined) updateFields.dob = new Date(dob);
    if (languages !== undefined) updateFields.languages = languages;
    if (chat !== undefined) updateFields.chat = chat;
    if (call !== undefined) updateFields.call = call;
    if (video !== undefined) updateFields.video = video;

    // Validate date of birth
    if (dob && isNaN(new Date(dob).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date of birth format'
      });
    }

    // Validate gender
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender value'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpire -phoneOtp -emailOtp');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/password:
 *   put:
 *     summary: Change user password
 *     tags: [Profile - Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 description: New password (min 6 characters)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Bad request or incorrect current password
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/phone:
 *   put:
 *     summary: Update phone number
 *     tags: [Profile - Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: New phone number
 *     responses:
 *       200:
 *         description: Phone number updated successfully
 *       400:
 *         description: Bad request
 *       409:
 *         description: Phone number already exists
 *       500:
 *         description: Server error
 */
router.put('/phone', auth, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ phone, _id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    // Update phone number and reset verification
    await User.findByIdAndUpdate(req.user.id, {
      phone,
      phoneVerified: false,
      phoneOtp: undefined
    });

    res.json({
      success: true,
      message: 'Phone number updated successfully. Please verify your new phone number.'
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/email:
 *   put:
 *     summary: Update email address
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New email address
 *     responses:
 *       200:
 *         description: Email updated successfully
 *       400:
 *         description: Bad request
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
router.put('/email', auth, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Update email and reset verification
    await User.findByIdAndUpdate(req.user.id, {
      email,
      emailVerified: false,
      emailOtp: undefined
    });

    res.json({
      success: true,
      message: 'Email updated successfully. Please verify your new email address.'
    });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/specialization:
 *   put:
 *     summary: Update provider specialization (providers only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - specialization
 *             properties:
 *               specialization:
 *                 type: string
 *                 description: Category ID for specialization
 *     responses:
 *       200:
 *         description: Specialization updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only providers can update specialization
 *       500:
 *         description: Server error
 */
router.put('/specialization', auth, async (req, res) => {
  try {
    const { specialization } = req.body;

    if (!specialization) {
      return res.status(400).json({
        success: false,
        message: 'Specialization is required'
      });
    }

    // Check if user is a provider
    if (req.user.userType !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can update specialization'
      });
    }

    // Validate category exists
    const Category = require('../models/Category');
    const category = await Category.findById(specialization);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    // Update specialization
    await User.findByIdAndUpdate(req.user.id, { specialization });

    res.json({
      success: true,
      message: 'Specialization updated successfully'
    });
  } catch (error) {
    console.error('Error updating specialization:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/pricing:
 *   put:
 *     summary: Update provider pricing (providers only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Price per consultation
 *     responses:
 *       200:
 *         description: Pricing updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only providers can update pricing
 *       500:
 *         description: Server error
 */
router.put('/pricing', auth, async (req, res) => {
  try {
    const { price } = req.body;

    if (price === undefined || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    // Check if user is a provider
    if (req.user.userType !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can update pricing'
      });
    }

    // Update price
    await User.findByIdAndUpdate(req.user.id, { price });

    res.json({
      success: true,
      message: 'Pricing updated successfully'
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/availability-settings:
 *   put:
 *     summary: Update availability settings (providers only)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availability:
 *                 type: object
 *                 properties:
 *                   monday:
 *                     type: boolean
 *                   tuesday:
 *                     type: boolean
 *                   wednesday:
 *                     type: boolean
 *                   thursday:
 *                     type: boolean
 *                   friday:
 *                     type: boolean
 *                   saturday:
 *                     type: boolean
 *                   sunday:
 *                     type: boolean
 *               chat:
 *                 type: boolean
 *               call:
 *                 type: boolean
 *               video:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability settings updated successfully
 *       403:
 *         description: Forbidden - only providers can update availability settings
 *       500:
 *         description: Server error
 */
router.put('/availability-settings', auth, async (req, res) => {
  try {
    const { availability, chat, call, video } = req.body;

    // Check if user is a provider
    if (req.user.userType !== 'provider') {
      return res.status(403).json({
        success: false,
        message: 'Only providers can update availability settings'
      });
    }

    const updateFields = {};

    if (availability !== undefined) updateFields.availability = availability;
    if (chat !== undefined) updateFields.chat = chat;
    if (call !== undefined) updateFields.call = call;
    if (video !== undefined) updateFields.video = video;

    // Update availability settings
    await User.findByIdAndUpdate(req.user.id, updateFields);

    res.json({
      success: true,
      message: 'Availability settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating availability settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/deactivate:
 *   put:
 *     summary: Deactivate user account
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       500:
 *         description: Server error
 */
router.put('/deactivate', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/profile/activate:
 *   put:
 *     summary: Reactivate user account
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account reactivated successfully
 *       500:
 *         description: Server error
 */
router.put('/activate', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: true });

    res.json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
