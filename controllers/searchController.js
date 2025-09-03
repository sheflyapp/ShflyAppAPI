const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Category = require('../models/Category');

// Search providers with advanced filters
const searchProviders = async (req, res) => {
  try {
    const {
      query,
      category,
      specialization,
      rating,
      priceMin,
      priceMax,
      country,
      city,
      consultationType,
      availability,
      page = 1,
      limit = 20,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    let filter = { 
      userType: 'provider',
      isActive: true,
      isVerified: true
    };

    // Text search
    if (query) {
      filter.$or = [
        { fullname: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Specialization filter
    if (specialization) {
      filter.specialization = specialization;
    }

    // Rating filter
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Price filter
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }

    // Location filter
    if (country) {
      filter.country = { $regex: country, $options: 'i' };
    }
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    // Consultation type filter
    if (consultationType) {
      filter[consultationType] = true;
    }

    // Availability filter
    if (availability) {
      const [day, time] = availability.split(':');
      filter[`availability.${day}.slots`] = {
        $elemMatch: {
          startTime: { $lte: time },
          endTime: { $gte: time },
          isAvailable: true
        }
      };
    }

    // Sorting
    let sort = {};
    if (sortBy === 'rating') {
      sort = { rating: sortOrder === 'desc' ? -1 : 1, totalReviews: -1 };
    } else if (sortBy === 'price') {
      sort = { price: sortOrder === 'desc' ? -1 : 1 };
    } else if (sortBy === 'name') {
      sort = { fullname: sortOrder === 'desc' ? -1 : 1 };
    } else if (sortBy === 'experience') {
      sort = { createdAt: sortOrder === 'desc' ? -1 : 1 };
    }

    const providers = await User.find(filter)
      .select('fullname username specialization price rating totalReviews country city bio profileImage availability chat call video')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: providers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: parseInt(page) * limit < total,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        query,
        category,
        specialization,
        rating,
        priceMin,
        priceMax,
        country,
        city,
        consultationType,
        availability
      }
    });
  } catch (error) {
    console.error('Search providers error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Get provider recommendations
const getProviderRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    let recommendations = [];

    if (user.userType === 'seeker') {
      // Get seeker's consultation history
      const consultations = await Consultation.find({ 
        seeker: userId, 
        status: 'completed' 
      }).populate('provider', 'specialization category');

      // Find providers with similar specializations
      const specializations = consultations.map(c => c.provider.specialization);
      const categories = consultations.map(c => c.provider.category);

      if (specializations.length > 0) {
        recommendations = await User.find({
          userType: 'provider',
          isActive: true,
          isVerified: true,
          specialization: { $in: specializations },
          _id: { $nin: consultations.map(c => c.provider._id) }
        })
        .select('fullname specialization price rating totalReviews profileImage')
        .sort({ rating: -1 })
        .limit(limit);
      }
    }

    res.json({
      success: true,
      data: {
        recommendations
      }
    });
  } catch (error) {
    console.error('Get provider recommendations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Search consultations
const searchConsultations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      query,
      status,
      category,
      consultationType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    let filter = {};
    
    // Set filter based on user type
    if (user.userType === 'seeker') {
      filter.seeker = userId;
    } else if (user.userType === 'provider') {
      filter.provider = userId;
    }

    // Text search
    if (query) {
      filter.$or = [
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Consultation type filter
    if (consultationType) {
      filter.consultationType = consultationType;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.scheduledAt = {};
      if (dateFrom) filter.scheduledAt.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledAt.$lte = new Date(dateTo);
    }

    const consultations = await Consultation.find(filter)
      .populate('seeker', 'fullname profileImage')
      .populate('provider', 'fullname specialization profileImage')
      .sort({ scheduledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Consultation.countDocuments(filter);

    res.json({
      success: true,
      data: consultations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: parseInt(page) * limit < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Search consultations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Get search suggestions
const getSearchSuggestions = async (req, res) => {
  try {
    const { query, type = 'providers' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    let suggestions = [];

    if (type === 'providers') {
      // Get provider suggestions
      const providers = await User.find({
        userType: 'provider',
        isActive: true,
        isVerified: true,
        $or: [
          { fullname: { $regex: query, $options: 'i' } },
          { specialization: { $regex: query, $options: 'i' } }
        ]
      })
      .select('fullname specialization')
      .limit(10);

      suggestions = providers.map(p => ({
        type: 'provider',
        id: p._id,
        text: p.fullname,
        subtitle: p.specialization
      }));
    } else if (type === 'specializations') {
      // Get specialization suggestions
      const specializations = await User.distinct('specialization', {
        userType: 'provider',
        isActive: true,
        isVerified: true,
        specialization: { $regex: query, $options: 'i' }
      });

      suggestions = specializations.slice(0, 10).map(s => ({
        type: 'specialization',
        text: s
      }));
    } else if (type === 'categories') {
      // Get category suggestions
      const categories = await Category.find({
        name: { $regex: query, $options: 'i' },
        isActive: true
      })
      .select('name description')
      .limit(10);

      suggestions = categories.map(c => ({
        type: 'category',
        id: c._id,
        text: c.name,
        subtitle: c.description
      }));
    }

    res.json({ 
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Get trending searches
const getTrendingSearches = async (req, res) => {
  try {
    // Get popular specializations
    const popularSpecializations = await User.aggregate([
      { $match: { userType: 'provider', isActive: true, isVerified: true } },
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get popular categories
    const popularCategories = await Consultation.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        trendingSpecializations: popularSpecializations,
        trendingCategories: popularCategories
      }
    });
  } catch (error) {
    console.error('Get trending searches error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Advanced provider search with geolocation
const advancedProviderSearch = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 50, // Default 50km radius
      services,
      languages,
      experience,
      page = 1,
      limit = 20
    } = req.query;

    let filter = { 
      userType: 'provider', 
      isActive: true, 
      isVerified: true 
    };

    // Services filter
    if (services) {
      const serviceArray = services.split(',');
      filter.$or = serviceArray.map(service => ({
        [service]: true
      }));
    }

    // Languages filter
    if (languages) {
      const languageArray = languages.split(',');
      filter.languages = { $in: languageArray };
    }

    // Experience filter
    if (experience) {
      const years = parseInt(experience);
      const experienceDate = new Date();
      experienceDate.setFullYear(experienceDate.getFullYear() - years);
      filter.createdAt = { $lte: experienceDate };
    }

    let providers = await User.find(filter)
      .select('fullname specialization price rating totalReviews country city bio profileImage availability languages createdAt')
      .sort({ rating: -1, totalReviews: -1 });

    // Filter by distance if coordinates provided
    if (latitude && longitude) {
      providers = providers.filter(provider => {
        if (provider.location && provider.location.coordinates) {
          const distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            provider.location.coordinates[1],
            provider.location.coordinates[0]
          );
          return distance <= radius;
        }
        return true;
      });
    }

    // Pagination
    const total = providers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProviders = providers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        providers: paginatedProviders,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error('Advanced provider search error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

module.exports = {
  searchProviders,
  getProviderRecommendations,
  searchConsultations,
  getSearchSuggestions,
  getTrendingSearches,
  advancedProviderSearch
};
