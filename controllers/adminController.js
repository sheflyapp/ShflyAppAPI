const User = require('../models/User');
const Consultation = require('../models/Consultation');

// Get all providers (for admin)
const getAllProviders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, verified } = req.query;
    
    let filter = { userType: 'provider' };
    
    if (status !== undefined) filter.isActive = status === 'true';
    if (verified !== undefined) filter.isVerified = verified === 'true';

    const providers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      providers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get all providers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all seekers (for admin)
const getAllSeekers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let filter = { userType: 'seeker' };
    
    if (status !== undefined) filter.isActive = status === 'true';

    const seekers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      seekers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get all seekers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get provider by ID (for admin)
const getProviderById = async (req, res) => {
  try {
    const provider = await User.findOne({ 
      _id: req.params.id, 
      userType: 'provider' 
    }).select('-password');

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    console.error('Get provider by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get seeker by ID (for admin)
const getSeekerById = async (req, res) => {
  try {
    const seeker = await User.findOne({ 
      _id: req.params.id, 
      userType: 'seeker' 
    }).select('-password');

    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    res.json(seeker);
  } catch (error) {
    console.error('Get seeker by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve/Reject provider
const updateProviderStatus = async (req, res) => {
  try {
    const { isActive, isVerified, reason } = req.body;
    const { id } = req.params;

    const provider = await User.findOne({ 
      _id: id, 
      userType: 'provider' 
    });

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Update status
    if (isActive !== undefined) provider.isActive = isActive;
    if (isVerified !== undefined) provider.isVerified = isVerified;

    await provider.save();

    res.json({
      message: `Provider ${isActive ? 'approved' : 'rejected'} successfully`,
      provider: provider.getPublicProfile()
    });
  } catch (error) {
    console.error('Update provider status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update seeker status
const updateSeekerStatus = async (req, res) => {
  try {
    const { isActive, reason } = req.body;
    const { id } = req.params;

    const seeker = await User.findOne({ 
      _id: id, 
      userType: 'seeker' 
    });

    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    // Update status
    if (isActive !== undefined) seeker.isActive = isActive;

    await seeker.save();

    res.json({
      message: `Seeker ${isActive ? 'activated' : 'deactivated'} successfully`,
      seeker: seeker.getPublicProfile()
    });
  } catch (error) {
    console.error('Update seeker status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete provider
const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await User.findOne({ 
      _id: id, 
      userType: 'provider' 
    });

    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete seeker
const deleteSeeker = async (req, res) => {
  try {
    const { id } = req.params;

    const seeker = await User.findOne({ 
      _id: id, 
      userType: 'seeker' 
    });

    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'Seeker deleted successfully' });
  } catch (error) {
    console.error('Delete seeker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Count users by type
    const totalProviders = await User.countDocuments({ userType: 'provider' });
    const totalSeekers = await User.countDocuments({ userType: 'seeker' });
    const totalUsers = totalProviders + totalSeekers;

    // Count consultations
    const totalConsultations = await Consultation.countDocuments();
    const pendingConsultations = await Consultation.countDocuments({ status: 'pending' });
    const completedConsultations = await Consultation.countDocuments({ status: 'completed' });

    // Calculate total revenue from completed consultations
    const completedConsultationsData = await Consultation.find({ status: 'completed' });
    const totalRevenue = completedConsultationsData.reduce((sum, consultation) => {
      return sum + (consultation.price || 0);
    }, 0);

    // Get recent consultations for the table
    const recentConsultations = await Consultation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('provider', 'fullname email')
      .populate('seeker', 'fullname email')
      .populate('category', 'name');

    // Format recent consultations for frontend
    const formattedConsultations = recentConsultations.map(consultation => ({
      _id: consultation._id,
      provider: {
        fullname: consultation.provider?.fullname || 'Unknown Provider',
        email: consultation.provider?.email || 'N/A'
      },
      seeker: {
        fullname: consultation.seeker?.fullname || 'Unknown Seeker',
        email: consultation.seeker?.email || 'N/A'
      },
      category: consultation.category?.name || 'N/A',
      consultationType: consultation.consultationType || 'N/A',
      status: consultation.status || 'N/A',
      price: consultation.price || 0,
      createdAt: consultation.createdAt
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProviders,
          totalSeekers,
          totalConsultations,
          totalRevenue,
          pendingConsultations
        },
        recent: {
          consultations: formattedConsultations
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

module.exports = {
  getAllProviders,
  getAllSeekers,
  getProviderById,
  getSeekerById,
  updateProviderStatus,
  updateSeekerStatus,
  deleteProvider,
  deleteSeeker,
  getDashboardStats
};
