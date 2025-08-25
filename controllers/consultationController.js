const Consultation = require('../models/Consultation');
const User = require('../models/User');

// Create new consultation request
const createConsultation = async (req, res) => {
  try {
    const { providerId, category, consultationType, scheduledAt, description, duration = 60 } = req.body;
    const seekerId = req.user.userId;

    // Check if seeker exists and is active
    const seeker = await User.findById(seekerId);
    if (!seeker || seeker.userType !== 'seeker' || !seeker.isActive) {
      return res.status(403).json({ message: 'Access denied. Valid seeker account required.' });
    }

    // Check if provider exists and is active
    const provider = await User.findById(providerId);
    if (!provider || provider.userType !== 'provider' || !provider.isActive || !provider.isVerified) {
      return res.status(404).json({ message: 'Provider not found or not available.' });
    }

    // Check if consultation type is available for this provider
    if (!provider[consultationType]) {
      return res.status(400).json({ message: `${consultationType} consultation is not available for this provider` });
    }

    // Check if time slot is available
    const existingConsultation = await Consultation.findOne({
      provider: providerId,
      scheduledAt: {
        $gte: new Date(scheduledAt),
        $lt: new Date(new Date(scheduledAt).getTime() + duration * 60000)
      },
      status: { $in: ['pending', 'confirmed', 'in-progress'] }
    });

    if (existingConsultation) {
      return res.status(400).json({ message: 'Time slot is not available. Please choose another time.' });
    }

    // Create consultation
    const consultation = new Consultation({
      seeker: seekerId,
      provider: providerId,
      category,
      consultationType,
      scheduledAt: new Date(scheduledAt),
      description,
      duration,
      price: provider.price,
      status: 'pending'
    });

    await consultation.save();

    res.status(201).json({
      message: 'Consultation request sent successfully',
      consultation
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get consultations for seeker
const getSeekerConsultations = async (req, res) => {
  try {
    const seekerId = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { seeker: seekerId };
    if (status) filter.status = status;

    const consultations = await Consultation.find(filter)
      .populate('provider', 'fullname specialization profileImage rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Consultation.countDocuments(filter);

    res.json({
      consultations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get seeker consultations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get consultations for provider
const getProviderConsultations = async (req, res) => {
  try {
    const providerId = req.user.userId;
    const { status, page = 1, limit = 10 } = req.query;

    let filter = { provider: providerId };
    if (status) filter.status = status;

    const consultations = await Consultation.find(filter)
      .populate('seeker', 'fullname profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Consultation.countDocuments(filter);

    res.json({
      consultations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get provider consultations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get consultation by ID
const getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const consultation = await Consultation.findById(id)
      .populate('seeker', 'fullname profileImage')
      .populate('provider', 'fullname specialization profileImage rating');

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check if user has access to this consultation
    if (consultation.seeker.toString() !== userId && consultation.provider.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(consultation);
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update consultation status (Provider only)
const updateConsultationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const providerId = req.user.userId;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check if user is the provider
    if (consultation.provider.toString() !== providerId) {
      return res.status(403).json({ message: 'Access denied. Provider only.' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['confirmed', 'rejected'],
      'confirmed': ['in-progress', 'cancelled'],
      'in-progress': ['completed', 'cancelled'],
      'completed': [],
      'rejected': [],
      'cancelled': []
    };

    if (!validTransitions[consultation.status].includes(status)) {
      return res.status(400).json({ message: `Invalid status transition from ${consultation.status} to ${status}` });
    }

    consultation.status = status;
    if (reason) consultation.reason = reason;
    consultation.updatedAt = new Date();

    await consultation.save();

    res.json({
      message: `Consultation ${status} successfully`,
      consultation
    });
  } catch (error) {
    console.error('Update consultation status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel consultation (Seeker only)
const cancelConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const seekerId = req.user.userId;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check if user is the seeker
    if (consultation.seeker.toString() !== seekerId) {
      return res.status(403).json({ message: 'Access denied. Seeker only.' });
    }

    // Check if consultation can be cancelled
    if (!['pending', 'confirmed'].includes(consultation.status)) {
      return res.status(400).json({ message: 'Consultation cannot be cancelled at this stage' });
    }

    consultation.status = 'cancelled';
    if (reason) consultation.reason = reason;
    consultation.updatedAt = new Date();

    await consultation.save();

    res.json({
      message: 'Consultation cancelled successfully',
      consultation
    });
  } catch (error) {
    console.error('Cancel consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Rate and review consultation (Seeker only)
const rateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const seekerId = req.user.userId;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check if user is the seeker
    if (consultation.seeker.toString() !== seekerId) {
      return res.status(403).json({ message: 'Access denied. Seeker only.' });
    }

    // Check if consultation is completed
    if (consultation.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed consultations' });
    }

    // Check if already rated
    if (consultation.rating) {
      return res.status(400).json({ message: 'Consultation already rated' });
    }

    consultation.rating = rating;
    consultation.review = review;
    consultation.updatedAt = new Date();

    await consultation.save();

    // Update provider's average rating
    const provider = await User.findById(consultation.provider);
    const consultations = await Consultation.find({ 
      provider: consultation.provider, 
      rating: { $exists: true } 
    });

    const totalRating = consultations.reduce((sum, c) => sum + c.rating, 0);
    provider.rating = totalRating / consultations.length;
    provider.totalReviews = consultations.length;
    await provider.save();

    res.json({
      message: 'Rating submitted successfully',
      consultation
    });
  } catch (error) {
    console.error('Rate consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get consultation statistics
const getConsultationStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    let filter = {};
    if (user.userType === 'seeker') {
      filter.seeker = userId;
    } else if (user.userType === 'provider') {
      filter.provider = userId;
    }

    const totalConsultations = await Consultation.countDocuments(filter);
    const pendingConsultations = await Consultation.countDocuments({ ...filter, status: 'pending' });
    const confirmedConsultations = await Consultation.countDocuments({ ...filter, status: 'confirmed' });
    const inProgressConsultations = await Consultation.countDocuments({ ...filter, status: 'in-progress' });
    const completedConsultations = await Consultation.countDocuments({ ...filter, status: 'completed' });
    const cancelledConsultations = await Consultation.countDocuments({ ...filter, status: 'cancelled' });

    res.json({
      totalConsultations,
      pendingConsultations,
      confirmedConsultations,
      inProgressConsultations,
      completedConsultations,
      cancelledConsultations
    });
  } catch (error) {
    console.error('Get consultation stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createConsultation,
  getSeekerConsultations,
  getProviderConsultations,
  getConsultationById,
  updateConsultationStatus,
  cancelConsultation,
  rateConsultation,
  getConsultationStats
};
