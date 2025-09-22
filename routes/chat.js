const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Question = require('../models/Question');

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get chat conversations (by question) for a user
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
      participants: req.user.id
    })
    .populate('participants', 'fullname username profileImage')
    .populate('question', 'description status')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Chat.countDocuments({ participants: req.user.id });

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
 *     summary: Send a message (by question)
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
 *               - questionId
 *               - message
 *             properties:
 *               questionId:
 *                 type: string
 *                 description: ID of the question
 *               message:
 *                 type: string
 *                 description: Message content
 *               providerId:
 *                 type: string
 *                 description: Optional provider user ID to explicitly set the receiver/second participant
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               fileUrl:
 *                 type: string
 *                 description: Optional file URL for image/file messages
 *             example:
 *               questionId: "string"
 *               message: "string"
 *               messageType: "text"
 *               providerId: "string"
 *               fileUrl: "string"
 *           examples:
 *             textMessage:
 *               summary: Text message
 *               value:
 *                 questionId: "string"
 *                 message: "string"
 *                 messageType: "text"
 *                 providerId: "string"
 *             fileMessage:
 *               summary: File message
 *               value:
 *                 questionId: "string"
 *                 message: "Please see attached"
 *                 messageType: "file"
 *                 fileUrl: "https://example.com/file.pdf"
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
    const { questionId, message, messageType = 'text', providerId, fileUrl } = req.body;

    if (!questionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Question ID and message are required'
      });
    }

    // Check if question exists
    const question = await Question.findById(questionId).populate('userId', '_id');
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Determine the second participant
    let otherParticipantId = null;
    if (providerId) {
      // Validate provider exists
      const provider = await User.findById(providerId).select('_id');
      if (!provider) {
        return res.status(400).json({ success: false, message: 'Invalid providerId' });
      }
      otherParticipantId = provider._id.toString();
    } else {
      // Fallback to question owner as the counterpart
      otherParticipantId = question.userId._id.toString();
    }

    // Avoid duplicate participants; enforce that the counterpart isn't the sender
    if (otherParticipantId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Receiver cannot be the same as sender. Provide a valid providerId.' });
    }

    const participants = Array.from(new Set([req.user.id, otherParticipantId]));

    // Find or create chat
    let chat = await Chat.findOne({ question: questionId });
    
    if (!chat) {
      chat = new Chat({
        question: questionId,
        participants,
        messages: []
      });
    }

    // Ensure participants reflect sender/receiver pair (no duplicates)
    chat.participants = Array.from(new Set([participants[0], participants[1]]));

    // Add message
    chat.messages.push({ sender: req.user.id, content: message, messageType, fileUrl });
    chat.lastMessage = new Date();

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
 * /api/chat/by-question:
 *   get:
 *     summary: Get chat messages for a question
 *     tags: [Chat - Common]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
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
 *       400:
 *         description: Bad request
 *       404:
 *         description: Conversation not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/by-question', auth, async (req, res) => {
  try {
    const { questionId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    if (!questionId) {
      return res.status(400).json({ success: false, message: 'questionId is required' });
    }

    const chat = await Chat.findOne({ question: questionId })
      .populate('participants', 'fullname username profileImage')
      .populate('question', 'description status');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!chat.participants.map(p => p._id.toString()).includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this conversation' });
    }

    const messages = chat.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .reverse();

    return res.json({
      success: true,
      data: { ...chat.toObject(), messages },
      pagination: {
        current: page,
        total: Math.ceil(chat.messages.length / limit),
        hasNext: page * limit < chat.messages.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching conversation by question:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/chat/by-participants:
 *   get:
 *     summary: Get chats filtered by participants (senderId/providerId)
 *     tags: [Chat - Common]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: senderId
 *         schema:
 *           type: string
 *         description: One participant user ID (commonly the sender)
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Other participant user ID (commonly the provider/receiver)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Chats retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/by-participants', auth, async (req, res) => {
  try {
    const { senderId, providerId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base filter: user must be a participant in any returned chat
    let filter = {};

    if (senderId && providerId) {
      filter = { participants: { $all: [senderId, providerId] } };
    } else if (senderId) {
      filter = { participants: { $all: [req.user.id, senderId] } };
    } else if (providerId) {
      filter = { participants: { $all: [req.user.id, providerId] } };
    } else {
      // If no specific ids provided, limit to chats the user is part of
      filter = { participants: req.user.id };
    }

    // Always ensure requester is participant for privacy
    const ensureParticipant = { participants: req.user.id };
    const finalFilter = { $and: [filter, ensureParticipant] };

    const [chats, total] = await Promise.all([
      Chat.find(finalFilter)
        .populate('participants', 'fullname username profileImage')
        .populate('question', 'description status')
        .sort({ lastMessage: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Chat.countDocuments(finalFilter)
    ]);

    return res.json({
      success: true,
      data: chats,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching chats by participants:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/chat/{conversationId}:
 *   get:
 *     summary: Get messages for a specific conversation (by question)
 *     tags: [Chat - Common]
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
      .populate('participants', 'fullname username profileImage')
      .populate('question', 'description status');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user is part of this conversation
    if (!chat.participants.map(p => p._id.toString()).includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this conversation'
      });
    }

    // Paginate messages
    const messages = chat.messages
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
 *     tags: [Chat - Common]
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
    if (!chat.participants.map(p => p.toString()).includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this conversation'
      });
    }

    // Mark unread messages as read
    chat.messages.forEach(msg => {
      if (msg.sender.toString() !== req.user.id) {
        msg.isRead = true;
        msg.readAt = new Date();
        if (!msg.readBy) msg.readBy = [];
        if (!msg.readBy.map(id => id.toString()).includes(req.user.id)) {
          msg.readBy.push(req.user.id);
        }
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
 *     tags: [Chat - Common]
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
    if (!chat.participants.map(p => p.toString()).includes(req.user.id)) {
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

