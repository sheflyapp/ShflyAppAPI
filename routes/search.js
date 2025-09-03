const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Category = require('../models/Category');
const {
  searchProviders,
  getProviderRecommendations,
  searchConsultations,
  getSearchSuggestions,
  getTrendingSearches,
  advancedProviderSearch
} = require('../controllers/searchController');

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
router.get('/providers', searchProviders);

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
router.get('/consultations', auth, searchConsultations);

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

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [providers, specializations, categories]
 *           default: providers
 *         description: Type of suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       id:
 *                         type: string
 *                       text:
 *                         type: string
 *                       subtitle:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get('/suggestions', getSearchSuggestions);

/**
 * @swagger
 * /api/search/trending:
 *   get:
 *     summary: Get trending searches
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Trending searches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trendingSpecializations:
 *                   type: array
 *                 trendingCategories:
 *                   type: array
 *       500:
 *         description: Server error
 */
router.get('/trending', getTrendingSearches);

/**
 * @swagger
 * /api/search/recommendations:
 *   get:
 *     summary: Get provider recommendations for user
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recommendations
 *     responses:
 *       200:
 *         description: Provider recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/recommendations', auth, getProviderRecommendations);

/**
 * @swagger
 * /api/search/advanced:
 *   get:
 *     summary: Advanced provider search with geolocation
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: User latitude
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: User longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 50
 *         description: Search radius in kilometers
 *       - in: query
 *         name: services
 *         schema:
 *           type: string
 *         description: Comma-separated services (chat,call,video)
 *       - in: query
 *         name: languages
 *         schema:
 *           type: string
 *         description: Comma-separated languages
 *       - in: query
 *         name: experience
 *         schema:
 *           type: integer
 *         description: Minimum years of experience
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
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Advanced search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 totalPages:
 *                   type: number
 *                 currentPage:
 *                   type: number
 *                 total:
 *                   type: number
 *       500:
 *         description: Server error
 */
router.get('/advanced', advancedProviderSearch);

module.exports = router;
