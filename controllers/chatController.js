const Chat = require('../models/Chat');
const User = require('../models/User');

// Create or get existing chat room
const createOrGetChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.userId;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'Access denied. Valid user account required.' });
    }

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant || !participant.isActive) {
      return res.status(404).json({ message: 'Participant not found or not active.' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId, participantId] }
    });

    if (!chat) {
      // Create new chat room
      chat = new Chat({
        participants: [userId, participantId],
        lastMessage: null,
        lastMessageAt: null
      });
      await chat.save();
    }

    // Populate participant details
    await chat.populate('participants', 'fullname profileImage userType');

    res.json({
      message: 'Chat room created/retrieved successfully',
      chat
    });
  } catch (error) {
    console.error('Create or get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all chats for a user
const getUserChats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'fullname profileImage userType')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Chat.countDocuments({ participants: userId });

    res.json({
      chats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied. Not a participant in this chat.' });
    }

    // Get messages with pagination
    const messages = await Chat.findById(chatId)
      .populate({
        path: 'messages',
        options: {
          sort: { createdAt: -1 },
          limit: limit * 1,
          skip: (page - 1) * limit
        },
        populate: {
          path: 'sender',
          select: 'fullname profileImage userType'
        }
      });

    const totalMessages = chat.messages.length;

    res.json({
      messages: messages.messages.reverse(), // Show oldest first
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: parseInt(page),
      total: totalMessages
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const senderId = req.user.userId;

    // Check if user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(senderId)) {
      return res.status(403).json({ message: 'Access denied. Not a participant in this chat.' });
    }

    // Create message
    const message = {
      sender: senderId,
      content,
      messageType,
      timestamp: new Date()
    };

    // Add message to chat
    chat.messages.push(message);
    chat.lastMessage = message;
    chat.lastMessageAt = new Date();
    await chat.save();

    // Populate sender details
    await chat.populate('lastMessage.sender', 'fullname profileImage userType');

    res.json({
      message: 'Message sent successfully',
      message: chat.lastMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    // Check if user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied. Not a participant in this chat.' });
    }

    // Mark unread messages as read
    let updatedCount = 0;
    chat.messages.forEach(message => {
      if (message.sender.toString() !== userId && !message.readBy.includes(userId)) {
        message.readBy.push(userId);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await chat.save();
    }

    res.json({
      message: `${updatedCount} messages marked as read`,
      updatedCount
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete message (sender only)
const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.userId;

    // Check if user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied. Not a participant in this chat.' });
    }

    // Find message
    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied. Can only delete your own messages.' });
    }

    // Delete message
    message.remove();
    await chat.save();

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const chats = await Chat.find({
      participants: userId
    });

    let totalUnread = 0;
    const unreadByChat = {};

    chats.forEach(chat => {
      let chatUnread = 0;
      chat.messages.forEach(message => {
        if (message.sender.toString() !== userId && !message.readBy.includes(userId)) {
          chatUnread++;
        }
      });
      
      if (chatUnread > 0) {
        unreadByChat[chat._id] = chatUnread;
        totalUnread += chatUnread;
      }
    });

    res.json({
      totalUnread,
      unreadByChat
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search messages
const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
    }

    // Get chats where user is participant
    const userChats = await Chat.find({
      participants: userId
    });

    const chatIds = userChats.map(chat => chat._id);

    // Search in messages
    const searchRegex = new RegExp(query, 'i');
    
    const messages = await Chat.aggregate([
      { $match: { _id: { $in: chatIds } } },
      { $unwind: '$messages' },
      { $match: { 'messages.content': searchRegex } },
      { $sort: { 'messages.timestamp': -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit * 1 },
      {
        $lookup: {
          from: 'users',
          localField: 'messages.sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $project: {
          message: '$messages',
          sender: { $arrayElemAt: ['$sender', 0] },
          chatId: '$_id'
        }
      }
    ]);

    res.json({
      messages,
      currentPage: parseInt(page),
      total: messages.length
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrGetChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  getUnreadCount,
  searchMessages
};
