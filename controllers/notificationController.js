const Notification = require('../models/Notification');
const User = require('../models/User');

// Create notification
const createNotification = async (req, res) => {
  try {
    const { recipientId, type, title, message, data, priority = 'normal' } = req.body;
    const senderId = req.user.userId;

    // Validate notification type
    const validTypes = [
      'consultation_request',
      'consultation_confirmed',
      'consultation_cancelled',
      'consultation_reminder',
      'message_received',
      'payment_success',
      'payment_failed',
      'provider_approved',
      'provider_rejected',
      'system_announcement',
      'rating_received',
      'profile_updated'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority level' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create notification
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      data: data || {},
      priority,
      isRead: false
    });

    await notification.save();

    // Populate sender details
    await notification.populate('sender', 'fullname profileImage userType');

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      type, 
      isRead, 
      priority, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let filter = { recipient: userId };

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Read status filter
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    // Priority filter
    if (priority) {
      filter.priority = priority;
    }

    // Sorting
    let sort = {};
    if (sortBy === 'createdAt') {
      sort = { createdAt: sortOrder === 'desc' ? -1 : 1 };
    } else if (sortBy === 'priority') {
      sort = { priority: sortOrder === 'desc' ? -1 : 1, createdAt: -1 };
    } else if (sortBy === 'isRead') {
      sort = { isRead: 1, createdAt: -1 };
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'fullname profileImage userType')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user is the recipient
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark multiple notifications as read
const markMultipleNotificationsAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.userId;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Notification IDs array is required' });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: userId
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark multiple notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if user is the recipient
    if (notification.recipient.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await notification.remove();

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete multiple notifications
const deleteMultipleNotifications = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const userId = req.user.userId;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: 'Notification IDs array is required' });
    }

    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      recipient: userId
    });

    res.json({
      message: `${result.deletedCount} notifications deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete multiple notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get notification count
const getNotificationCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalUnread = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    const countByType = await Notification.aggregate([
      { $match: { recipient: userId, isRead: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const countByPriority = await Notification.aggregate([
      { $match: { recipient: userId, isRead: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    res.json({
      totalUnread,
      countByType,
      countByPriority
    });
  } catch (error) {
    console.error('Get notification count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send bulk notifications (Admin only)
const sendBulkNotifications = async (req, res) => {
  try {
    const { 
      userTypes, 
      categories, 
      type, 
      title, 
      message, 
      data, 
      priority = 'normal' 
    } = req.body;

    // Validate notification type
    const validTypes = [
      'system_announcement',
      'maintenance_notice',
      'feature_update',
      'policy_change'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid notification type for bulk sending' });
    }

    // Build user filter
    let userFilter = {};
    if (userTypes && userTypes.length > 0) {
      userFilter.userType = { $in: userTypes };
    }
    if (categories && categories.length > 0) {
      userFilter.category = { $in: categories };
    }

    // Get users to notify
    const users = await User.find({
      ...userFilter,
      isActive: true
    }).select('_id');

    if (users.length === 0) {
      return res.status(400).json({ message: 'No users found matching the criteria' });
    }

    // Create notifications
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: req.user.userId,
      type,
      title,
      message,
      data: data || {},
      priority,
      isRead: false
    }));

    await Notification.insertMany(notifications);

    res.json({
      message: `Bulk notifications sent to ${users.length} users successfully`,
      sentCount: users.length
    });
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('notificationPreferences');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      preferences: user.notificationPreferences || {}
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ message: 'Preferences object is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update preferences
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...preferences
    };

    await user.save();

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markMultipleNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteMultipleNotifications,
  getNotificationCount,
  sendBulkNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
};
