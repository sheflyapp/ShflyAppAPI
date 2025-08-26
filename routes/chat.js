const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Chat = require('../models/Chat');
const Consultation = require('../models/Consultation');

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get chat conversations for a user
 *     tags: [Chat - Common]
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
 *         description: Number of conversations per page
 *     responses:
 *       200:
 *         description: List of chat conversations
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
 *                     $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const conversations = await Chat.find({
      $or: [
        { seeker: req.user.id },
        { provider: req.user.id }
      ]
    })
    .populate('seeker', 'fullname username profileImage')
    .populate('provider', 'fullname username profileImage')
    .populate('consultation', 'title status')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Chat.countDocuments({
      $or: [
        { seeker: req.user.id },
        { provider: req.user.id }
      ]
    });

    res.json({
      success: true,
      data: conversations,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a message
 *     tags: [Chat - Common]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consultationId
 *               - message
 *             properties:
 *               consultationId:
 *                 type: string
 *                 description: ID of the consultation
 *               message:
 *                 type: string
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *     responses:
 *       201:
 *         description: Message sent successfully
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
router.post('/', auth, async (req, res) => {
  try {
    const { consultationId, message, messageType = 'text' } = req.body;

    if (!consultationId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Consultation ID and message are required'
      });
    }

    // Check if consultation exists and user is part of it
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    if (consultation.seeker.toString() !== req.user.id && 
        consultation.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to send messages in this consultation'
      });
    }

    // Find or create chat
    let chat = await Chat.findOne({ consultation: consultationId });
    
    if (!chat) {
      chat = new Chat({
        consultation: consultationId,
        seeker: consultation.seeker,
        provider: consultation.provider,
        messages: []
      });
    }

    // Add message
    chat.messages.push({
      sender: req.user.id,
      message,
      messageType,
      timestamp: new Date()
    });

    await chat.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chat
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/chat/{conversationId}:
 *   get:
 *     summary: Get messages for a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
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
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Chat'
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const chat = await Chat.findById(conversationId)
      .populate('seeker', 'fullname username profileImage')
      .populate('provider', 'fullname username profileImage')
      .populate('consultation', 'title status');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is part of this conversation
    if (chat.seeker._id.toString() !== req.user.id && 
        chat.provider._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this conversation'
      });
    }

    // Paginate messages
    const messages = chat.messages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + limit)
      .reverse();

    res.json({
      success: true,
      data: {
        ...chat.toObject(),
        messages
      },
      pagination: {
        current: page,
        total: Math.ceil(chat.messages.length / limit),
        hasNext: page * limit < chat.messages.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/chat/{conversationId}/mark-read:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     responses:
 *       200:
 *         description: Messages marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.put('/:conversationId/mark-read', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const chat = await Chat.findById(conversationId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is part of this conversation
    if (chat.seeker.toString() !== req.user.id && 
        chat.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this conversation'
      });
    }

    // Mark unread messages as read
    chat.messages.forEach(msg => {
      if (msg.sender.toString() !== req.user.id && !msg.readBy.includes(req.user.id)) {
        msg.readBy.push(req.user.id);
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/chat/{conversationId}:
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat conversation ID
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.delete('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const chat = await Chat.findById(conversationId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is part of this conversation
    if (chat.seeker.toString() !== req.user.id && 
        chat.provider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this conversation'
      });
    }

    await Chat.findByIdAndDelete(conversationId);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;

