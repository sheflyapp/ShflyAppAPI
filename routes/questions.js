const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Category = require('../models/Category');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Question:
 *       type: object
 *       required:
 *         - userId
 *         - category
 *         - subcategory
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the question
 *         userId:
 *           type: string
 *           description: ID of the user who asked the question
 *         category:
 *           type: string
 *           description: ID of the main category
 *         subcategory:
 *           type: string
 *           description: ID of the subcategory
 *         description:
 *           type: string
 *           description: The question description
 *           maxLength: 2000
 *         status:
 *           type: string
 *           enum: [pending, answered, closed]
 *           default: pending
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: File URL
 *               description:
 *                 type: string
 *                 description: File description
 *         isAnonymous:
 *           type: boolean
 *           default: false
 *         isPublic:
 *           type: boolean
 *           default: true
 *         viewCount:
 *           type: number
 *           default: 0
 *         answerCount:
 *           type: number
 *           default: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         lastActivityAt:
 *           type: string
 *           format: date-time
 *         closedAt:
 *           type: string
 *           format: date-time
 *         closedBy:
 *           type: string
 *           description: ID of the user who closed the question
 *     
 *     QuestionRequest:
 *       type: object
 *       required:
 *         - category
 *         - subcategory
 *         - description
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID (automatically set from authenticated user token)
 *           readOnly: true
 *         category:
 *           type: string
 *           description: ID of the main category
 *         subcategory:
 *           type: string
 *           description: ID of the subcategory
 *         description:
 *           type: string
 *           description: The question description
 *           maxLength: 2000
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: File URL
 *               description:
 *                 type: string
 *                 description: File description
 *         isAnonymous:
 *           type: boolean
 *         isPublic:
 *           type: boolean
 *     
 *     QuestionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Question'
 */

/**
 * @swagger
 * /api/questions:
 *   post:
 *     summary: Create a new question
 *     description: Create a new question. The userId is automatically set from the authenticated user's token.
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuestionRequest'
 *     responses:
 *       201:
 *         description: Question created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuestionResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', auth, [
  body('category', 'Category is required').notEmpty().isMongoId(),
  body('subcategory', 'Subcategory is required').notEmpty().isMongoId(),
  body('description', 'Question description is required').trim().notEmpty().isLength({ min: 10, max: 2000 }),
  body('priority', 'Invalid priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('tags', 'Tags must be an array').optional().isArray(),
  body('tags.*', 'Each tag must be a string').optional().isString().trim(),
  body('attachments', 'Attachments must be an array').optional().isArray(),
  body('isAnonymous', 'isAnonymous must be a boolean').optional().isBoolean(),
  body('isPublic', 'isPublic must be a boolean').optional().isBoolean()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { category, subcategory, description, priority, tags, attachments, isAnonymous, isPublic } = req.body;

    // Verify category and subcategory exist and are active
    const [categoryDoc, subcategoryDoc] = await Promise.all([
      Category.findById(category),
      Category.findById(subcategory)
    ]);

    if (!categoryDoc || !categoryDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive category'
      });
    }

    if (!subcategoryDoc || !subcategoryDoc.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive subcategory'
      });
    }

    // Verify subcategory belongs to the category
    if (subcategoryDoc.parentCategory.toString() !== category.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory does not belong to the selected category'
      });
    }

    // Create question
    const question = new Question({
      userId: req.user.id,
      category,
      subcategory,
      description,
      priority: priority || 'medium',
      tags: tags || [],
      attachments: attachments || [],
      isAnonymous: isAnonymous || false,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await question.save();

    // Populate the question with category and user details
    await question.populate([
      { path: 'category', select: 'name description color' },
      { path: 'subcategory', select: 'name description color' },
      { path: 'userId', select: 'fullname username email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question
    });

  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating question'
    });
  }
});

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Get all questions (public or user's own)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, answered, closed]
 *         description: Filter by status
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
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of questions per page
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, [
  query('status').optional().isIn(['pending', 'answered', 'closed']),
  query('category').optional().isMongoId(),
  query('subcategory').optional().isMongoId(),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
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

    const { status, category, subcategory, priority, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (priority) query.priority = priority;

    // Get questions (public questions + user's own questions)
    const questions = await Question.find({
      $or: [
        { isPublic: true, ...query },
        { userId: req.user.id, ...query }
      ]
    })
    .populate('category', 'name description color')
    .populate('subcategory', 'name description color')
    .populate('userId', 'fullname username email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Question.countDocuments({
      $or: [
        { isPublic: true, ...query },
        { userId: req.user.id, ...query }
      ]
    });

    res.json({
      success: true,
      message: 'Questions retrieved successfully',
      data: {
        questions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalQuestions: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching questions'
    });
  }
});

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     summary: Get a specific question by ID
 *     tags: [Questions]
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
 *       404:
 *         description: Question not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, [
  param('id', 'Invalid question ID').isMongoId()
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

    const question = await Question.findById(req.params.id)
      .populate('category', 'name description color')
      .populate('subcategory', 'name description color')
      .populate('userId', 'fullname username email');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user can view this question
    if (!question.isPublic && question.userId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This is a private question.'
      });
    }

    // Increment view count
    await question.incrementViewCount();

    res.json({
      success: true,
      message: 'Question retrieved successfully',
      data: question
    });

  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching question'
    });
  }
});

/**
 * @swagger
 * /api/questions/{id}:
 *   put:
 *     summary: Update a question
 *     description: Update a question. Only the question owner can update. The userId cannot be changed.
 *     tags: [Questions]
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
 *             $ref: '#/components/schemas/QuestionRequest'
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       404:
 *         description: Question not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id', auth, [
  param('id', 'Invalid question ID').isMongoId(),
  body('category', 'Category is required').optional().isMongoId(),
  body('subcategory', 'Subcategory is required').optional().isMongoId(),
  body('description', 'Question description is required').optional().trim().isLength({ min: 10, max: 2000 }),
  body('priority', 'Invalid priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('tags', 'Tags must be an array').optional().isArray(),
  body('tags.*', 'Each tag must be a string').optional().isString().trim(),
  body('attachments', 'Attachments must be an array').optional().isArray(),
  body('isAnonymous', 'isAnonymous must be a boolean').optional().isBoolean(),
  body('isPublic', 'isPublic must be a boolean').optional().isBoolean()
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

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns this question
    if (question.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own questions.'
      });
    }

    // Check if question can be updated (not closed)
    if (question.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a closed question'
      });
    }

    const { category, subcategory, description, priority, tags, attachments, isAnonymous, isPublic } = req.body;

    // Validate category and subcategory if provided
    if (category || subcategory) {
      const [categoryDoc, subcategoryDoc] = await Promise.all([
        category ? Category.findById(category) : null,
        subcategory ? Category.findById(subcategory) : null
      ]);

      if (category && (!categoryDoc || !categoryDoc.isActive)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive category'
        });
      }

      if (subcategory && (!subcategoryDoc || !subcategoryDoc.isActive)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive subcategory'
        });
      }

      // Verify subcategory belongs to category
      if (category && subcategory && subcategoryDoc.parentCategory.toString() !== category.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Subcategory does not belong to the selected category'
        });
      }
    }

    // Update question
    const updateData = {};
    if (category) updateData.category = category;
    if (subcategory) updateData.subcategory = subcategory;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (tags !== undefined) updateData.tags = tags;
    if (attachments !== undefined) updateData.attachments = attachments;
    if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'category', select: 'name description color' },
      { path: 'subcategory', select: 'name description color' },
      { path: 'userId', select: 'fullname username email' }
    ]);

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });

  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating question'
    });
  }
});

/**
 * @swagger
 * /api/questions/{id}:
 *   delete:
 *     summary: Delete a question
 *     tags: [Questions]
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
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, [
  param('id', 'Invalid question ID').isMongoId()
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

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns this question
    if (question.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own questions.'
      });
    }

    await Question.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting question'
    });
  }
});

/**
 * @swagger
 * /api/questions/{id}/close:
 *   patch:
 *     summary: Close a question
 *     tags: [Questions]
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
 *       404:
 *         description: Question not found
 *       403:
 *         description: Access denied
 *       400:
 *         description: Question already closed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch('/:id/close', auth, [
  param('id', 'Invalid question ID').isMongoId()
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

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns this question
    if (question.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only close your own questions.'
      });
    }

    // Check if question is already closed
    if (question.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Question is already closed'
      });
    }

    await question.closeQuestion(req.user.id);

    res.json({
      success: true,
      message: 'Question closed successfully'
    });

  } catch (error) {
    console.error('Error closing question:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while closing question'
    });
  }
});

module.exports = router;
