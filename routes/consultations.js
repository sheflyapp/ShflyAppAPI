const express = require('express');
const router = express.Router();
const { auth, isProvider, isSeeker, isAdmin } = require('../middleware/auth');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const Category = require('../models/Category');

/**
 * @swagger
 * /api/consultations:
 *   get:
 *     summary: Get all consultations with filtering
 *     tags: [Consultations - Common]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, accepted, in-progress, completed, cancelled]
 *         description: Filter by consultation status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, video, audio, chat, in-person]
 *         description: Filter by consultation type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
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
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', type = '', category = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.consultationType = type;
    if (category && category !== 'all') filter.category = category;
    
    // Filter by user userType
    if (req.userProfile.userType === 'provider') {
      filter.provider = req.userProfile._id;
    } else if (req.userProfile.userType === 'seeker') {
      filter.seeker = req.userProfile._id;
    }
    // Admin can see all consultations
    
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
 * /api/consultations:
 *   post:
 *     summary: Create a new consultation
 *     tags: [Consultations - Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - categoryId
 *               - title
 *               - description
 *               - scheduledDate
 *               - duration
 *               - price
 *             properties:
 *               providerId:
 *                 type: string
 *                 description: ID of the provider
 *               categoryId:
 *                 type: string
 *                 description: ID of the service category
 *               title:
 *                 type: string
 *                 description: Consultation title
 *               description:
 *                 type: string
 *                 description: Consultation description
 *               consultationType:
 *                 type: string
 *                 enum: [video, audio, chat, in-person]
 *                 description: Type of consultation
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled date and time
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               price:
 *                 type: number
 *                 description: Consultation price
 *               location:
 *                 type: string
 *                 description: Consultation location (optional)
 *               notes:
 *                 type: string
 *                 description: Additional notes (optional)
 *     responses:
 *       201:
 *         description: Consultation created successfully
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
 *                   $ref: '#/components/schemas/Consultation'
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Seeker access required
 *       500:
 *         description: Server error
 */
router.post('/', auth, isSeeker, async (req, res) => {
  try {
    const {
      providerId,
      categoryId,
      title,
      description,
      consultationType,
      scheduledDate,
      duration,
      price,
      location,
      notes
    } = req.body;
    
    // Validate required fields
    if (!providerId || !categoryId || !title || !description || !scheduledDate || !duration || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if provider exists and is active
    const provider = await User.findById(providerId);
    if (!provider || provider.userType !== 'provider' || !provider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive provider'
      });
    }
    
    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category || !category.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive category'
      });
    }
    
    // Check if scheduled date is in the future
    const scheduled = new Date(scheduledDate);
    if (scheduled <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }
    
    // Check if duration is valid
    if (duration < 15 || duration > 480) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 15 and 480 minutes'
      });
    }
    
    const consultation = new Consultation({
      seeker: req.userProfile._id,
      provider: providerId,
      category: categoryId,
      title,
      description,
      consultationType,
      scheduledDate: scheduled,
      duration,
      price,
      location,
      notes,
      status: 'pending'
    });
    
    await consultation.save();
    
    // Populate the consultation for response
    await consultation.populate([
      { path: 'seeker', select: 'fullname email' },
      { path: 'provider', select: 'fullname email specialization' },
      { path: 'category', select: 'name' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Consultation created successfully',
      data: { consultation }
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating consultation' 
    });
  }
});

// @route   GET /api/consultations/:id
// @desc    Get consultation by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('seeker', 'fullname email phone')
      .populate('provider', 'fullname email phone specialization')
      .populate('category', 'name description');
    
    if (!consultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consultation not found' 
      });
    }
    
    // Check if user has access to this consultation
    const isOwner = consultation.seeker._id.toString() === req.userProfile._id.toString() ||
                   consultation.provider._id.toString() === req.userProfile._id.toString();
    
    if (!isOwner && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
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

// @route   PUT /api/consultations/:id
// @desc    Update consultation
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, notes, seekerNotes, providerNotes, startTime, endTime, rating, review } = req.body;
    
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Consultation not found' 
      });
    }
    
    // Check if user has access to update this consultation
    const isOwner = consultation.seeker._id.toString() === req.userProfile._id.toString() ||
                   consultation.provider._id.toString() === req.userProfile._id.toString();
    
    if (!isOwner && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Update consultation fields based on user userType
    if (req.userProfile.userType === 'admin') {
      if (status) consultation.status = status;
      if (notes !== undefined) consultation.notes = notes;
      if (seekerNotes !== undefined) consultation.seekerNotes = seekerNotes;
      if (providerNotes !== undefined) consultation.providerNotes = providerNotes;
    } else if (req.userProfile.userType === 'provider') {
      if (status && ['accepted', 'in_progress', 'completed', 'cancelled', 'rejected'].includes(status)) {
        consultation.status = status;
      }
      if (providerNotes !== undefined) consultation.providerNotes = providerNotes;
      if (startTime) consultation.startTime = startTime;
      if (endTime) consultation.endTime = endTime;
    } else if (req.userProfile.userType === 'seeker') {
      if (status && ['cancelled'].includes(status)) {
        consultation.status = status;
      }
      if (seekerNotes !== undefined) consultation.seekerNotes = seekerNotes;
      if (rating) consultation.rating = rating;
      if (review) consultation.review = review;
    }
    
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

// @route   DELETE /api/consultations/:id
// @desc    Delete consultation (admin only)
// @access  Private/Admin
router.delete('/:id', auth, isAdmin, async (req, res) => {
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

module.exports = router;
