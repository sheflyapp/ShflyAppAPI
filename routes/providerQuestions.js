const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const ProviderQuestion = require('../models/ProviderQuestion');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushToUser } = require('../services/pushService');
const { auth } = require('../middleware/auth');
const { requireSeeker, requireProvider } = require('../middleware/roleAuth');

/**
 * @swagger
 * components:
 *   schemas:
 *     ProviderQuestionRequest:
 *       type: object
 *       required:
 *         - providerId
 *         - question
 *       properties:
 *         providerId:
 *           type: string
 *           description: ID of the provider the question is addressed to
 *           example: 64f1a2b3c4d5e6f7a8b9c0d1
 *         question:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           description: The question text
 *           example: How can I improve my business growth?
 *     ProviderQuestion:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         seekerId:
 *           type: string
 *           description: Set automatically from the authenticated seeker token
 *         providerId:
 *           type: string
 *         question:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, answered, closed]
 *           default: pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/provider-questions:
 *   post:
 *     summary: Submit a question to a provider
 *     description: Seeker submits a question addressed to a specific provider. The seekerId is taken from the authenticated token.
 *     tags: [Provider Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderQuestionRequest'
 *     responses:
 *       201:
 *         description: Question submitted successfully
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
 *                   $ref: '#/components/schemas/ProviderQuestion'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Seeker role required
 *       404:
 *         description: Provider not found
 *       500:
 *         description: Server error
 */
router.post('/', auth, requireSeeker, [
  body('providerId', 'Valid providerId is required').notEmpty().isMongoId(),
  body('question', 'Question is required (10-2000 characters)').trim().notEmpty().isLength({ min: 10, max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { providerId, question } = req.body;

    const provider = await User.findOne({ _id: providerId, userType: 'provider' });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const providerQuestion = await ProviderQuestion.create({
      seekerId: req.user.id,
      providerId,
      question
    });

    // Notify the provider; a notification failure must not fail the submission
    try {
      const seeker = await User.findById(req.user.id).select('fullname');
      const title = 'New Question Received';
      const message = `${seeker?.fullname || 'A seeker'} has asked you a question`;
      const data = { questionId: providerQuestion._id, seekerId: req.user.id };
      await Notification.create({
        recipient: providerId,
        sender: req.user.id,
        type: 'question_received',
        title,
        message,
        data
      });
      await sendPushToUser(providerId, {
        title,
        body: message,
        data: { type: 'question_received', ...data }
      });
    } catch (notifyError) {
      console.error('Error sending question notification:', notifyError);
    }

    res.status(201).json({
      success: true,
      message: 'Question submitted successfully',
      data: providerQuestion
    });
  } catch (error) {
    console.error('Error submitting provider question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting question'
    });
  }
});

/**
 * @swagger
 * /api/provider-questions/received:
 *   get:
 *     summary: Get questions received by the logged-in provider
 *     tags: [Provider Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, answered, closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Provider role required
 *       500:
 *         description: Server error
 */
router.get('/received', auth, requireProvider, [
  query('status').optional().isIn(['pending', 'answered', 'closed']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filter = { providerId: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const [questions, total] = await Promise.all([
      ProviderQuestion.find(filter)
        .populate('seekerId', 'fullname email profileImage')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ProviderQuestion.countDocuments(filter)
    ]);

    res.json({
      success: true,
      message: 'Questions retrieved successfully',
      data: {
        questions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalQuestions: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching received questions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching questions'
    });
  }
});

module.exports = router;
