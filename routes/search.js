const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Category = require('../models/Category');

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: General search across all entities
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, providers, consultations, categories]
 *           default: all
 *         description: Type of search
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
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Search results
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
 *                     providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     consultations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Consultation'
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchQuery = { $regex: q, $options: 'i' };
    const skip = (page - 1) * limit;
    const results = {};

    if (type === 'all' || type === 'providers') {
      const providers = await User.find({
        userType: 'provider',
        isActive: true,
        isVerified: true,
        $or: [
          { fullname: searchQuery },
          { username: searchQuery },
          { specialization: searchQuery },
          { bio: searchQuery }
        ]
      })
      .populate('specialization', 'name')
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .skip(skip)
      .limit(limit);

      const totalProviders = await User.countDocuments({
        userType: 'provider',
        isActive: true,
        isVerified: true,
        $or: [
          { fullname: searchQuery },
          { username: searchQuery },
          { specialization: searchQuery },
          { bio: searchQuery }
        ]
      });

      results.providers = {
        data: providers,
        total: totalProviders,
        page: parseInt(page),
        totalPages: Math.ceil(totalProviders / limit)
      };
    }

    if (type === 'all' || type === 'consultations') {
      const consultations = await Consultation.find({
        $or: [
          { title: searchQuery },
          { description: searchQuery }
        ],
        status: { $in: ['pending', 'accepted'] }
      })
      .populate('seeker', 'fullname username profileImage')
      .populate('provider', 'fullname username profileImage')
      .populate('category', 'name')
      .skip(skip)
      .limit(limit);

      const totalConsultations = await Consultation.countDocuments({
        $or: [
          { title: searchQuery },
          { description: searchQuery }
        ],
        status: { $in: ['pending', 'accepted'] }
      });

      results.consultations = {
        data: consultations,
        total: totalConsultations,
        page: parseInt(page),
        totalPages: Math.ceil(totalConsultations / limit)
      };
    }

    if (type === 'all' || type === 'categories') {
      const categories = await Category.find({
        $or: [
          { name: searchQuery },
          { description: searchQuery }
        ],
        isActive: true
      })
      .skip(skip)
      .limit(limit);

      const totalCategories = await Category.countDocuments({
        $or: [
          { name: searchQuery },
          { description: searchQuery }
        ],
        isActive: true
      });

      results.categories = {
        data: categories,
        total: totalCategories,
        page: parseInt(page),
        totalPages: Math.ceil(totalCategories / limit)
      };
    }

    res.json({
      success: true,
      query: q,
      type,
      data: results
    });
  } catch (error) {
    console.error('Error in general search:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/search/providers:
 *   get:
 *     summary: Search for providers with advanced filters
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for name, username, or bio
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID filter
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country filter
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City filter
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *         description: Day availability filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, price, name, newest]
 *           default: rating
 *         description: Sort order
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
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Provider search results
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
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       500:
 *         description: Server error
 */
router.get('/providers', async (req, res) => {
  try {
    const {
      q,
      category,
      country,
      city,
      minRating,
      maxPrice,
      availability,
      sortBy = 'rating',
      page = 1,
      limit = 10
    } = req.query;

    const filter = {
      userType: 'provider',
      isActive: true,
      isVerified: true
    };

    // Text search
    if (q) {
      filter.$or = [
        { fullname: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      filter.specialization = category;
    }

    // Location filters
    if (country) {
      filter.country = { $regex: country, $options: 'i' };
    }
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    // Rating filter
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    // Price filter
    if (maxPrice) {
      filter.price = { $lte: parseFloat(maxPrice) };
    }

    // Availability filter
    if (availability) {
      filter[`availability.${availability}`] = true;
    }

    // Sort options
    let sort = {};
    switch (sortBy) {
      case 'rating':
        sort = { rating: -1, totalReviews: -1 };
        break;
      case 'price':
        sort = { price: 1 };
        break;
      case 'name':
        sort = { fullname: 1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      default:
        sort = { rating: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const providers = await User.find(filter)
      .populate('specialization', 'name icon')
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: providers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error in provider search:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/search/consultations:
 *   get:
 *     summary: Search for consultations
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for title or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, completed, cancelled]
 *         description: Status filter
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
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
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Consultation search results
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
 *                     $ref: '#/components/schemas/Consultation'
 *       500:
 *         description: Server error
 */
router.get('/consultations', async (req, res) => {
  try {
    const {
      q,
      category,
      status,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    // Text search
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Price filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const consultations = await Consultation.find(filter)
      .populate('seeker', 'fullname username profileImage')
      .populate('provider', 'fullname username profileImage')
      .populate('category', 'name icon')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Consultation.countDocuments(filter);

    res.json({
      success: true,
      data: consultations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error in consultation search:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/search/categories:
 *   get:
 *     summary: Search for categories
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for name or description
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Category search results
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
 *                     $ref: '#/components/schemas/Category'
 *       500:
 *         description: Server error
 */
router.get('/categories', async (req, res) => {
  try {
    const {
      q,
      active,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    // Text search
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Active filter
    if (active !== undefined) {
      filter.isActive = active === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const categories = await Category.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(filter);

    res.json({
      success: true,
      data: categories,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error in category search:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
