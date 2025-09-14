const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const StaticContent = require('../models/StaticContent');

/**
 * @swagger
 * /api/content/{type}:
 *   get:
 *     summary: Get static content by type
 *     description: Retrieve static content (privacy policy, terms, help, etc.)
 *     tags: [Static Content]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [privacy-policy, terms-conditions, help, onboarding, about, contact, faq]
 *         description: Type of static content
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [en, ar]
 *           default: en
 *         description: Language preference
 *     responses:
 *       200:
 *         description: Content retrieved successfully
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
 *                     type:
 *                       type: string
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     version:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                     metadata:
 *                       type: object
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { lang = 'en' } = req.query;

    const content = await StaticContent.getContentByType(type, lang);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get static content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all static content
 *     description: Retrieve all active static content
 *     tags: [Static Content]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [en, ar]
 *           default: en
 *         description: Language preference
 *     responses:
 *       200:
 *         description: All content retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       version:
 *                         type: string
 *                       lastUpdated:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { lang = 'en' } = req.query;

    const contents = await StaticContent.getAllActiveContent(lang);

    res.json({
      success: true,
      data: contents
    });
  } catch (error) {
    console.error('Get all static content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/content/{type}:
 *   post:
 *     summary: Create or update static content (Admin only)
 *     description: Create or update static content
 *     tags: [Static Content - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [privacy-policy, terms-conditions, help, onboarding, about, contact, faq]
 *         description: Type of static content
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Content title
 *               content:
 *                 type: string
 *                 description: Content in English
 *               contentAr:
 *                 type: string
 *                 description: Content in Arabic
 *               version:
 *                 type: string
 *                 description: Content version
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               seoTitle:
 *                 type: string
 *                 description: SEO title
 *               seoDescription:
 *                 type: string
 *                 description: SEO description
 *               seoKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: SEO keywords
 *     responses:
 *       200:
 *         description: Content updated successfully
 *       201:
 *         description: Content created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.post('/:type', auth, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { title, content, contentAr, version, metadata, seoTitle, seoDescription, seoKeywords } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    // Check if content already exists
    let existingContent = await StaticContent.findOne({ type });

    if (existingContent) {
      // Update existing content
      existingContent.title = title;
      existingContent.content = content;
      existingContent.contentAr = contentAr || existingContent.contentAr;
      existingContent.version = version || existingContent.version;
      existingContent.lastUpdatedBy = req.user.id;
      existingContent.metadata = metadata || existingContent.metadata;
      existingContent.seoTitle = seoTitle || existingContent.seoTitle;
      existingContent.seoDescription = seoDescription || existingContent.seoDescription;
      existingContent.seoKeywords = seoKeywords || existingContent.seoKeywords;

      await existingContent.save();

      res.json({
        success: true,
        message: 'Content updated successfully',
        data: existingContent
      });
    } else {
      // Create new content
      const newContent = new StaticContent({
        type,
        title,
        content,
        contentAr: contentAr || '',
        version: version || '1.0.0',
        lastUpdatedBy: req.user.id,
        metadata: metadata || {},
        seoTitle: seoTitle || '',
        seoDescription: seoDescription || '',
        seoKeywords: seoKeywords || []
      });

      await newContent.save();

      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: newContent
      });
    }
  } catch (error) {
    console.error('Create/Update static content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/content/{type}:
 *   put:
 *     summary: Update static content (Admin only)
 *     description: Update existing static content
 *     tags: [Static Content - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [privacy-policy, terms-conditions, help, onboarding, about, contact, faq]
 *         description: Type of static content
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Content title
 *               content:
 *                 type: string
 *                 description: Content in English
 *               contentAr:
 *                 type: string
 *                 description: Content in Arabic
 *               version:
 *                 type: string
 *                 description: Content version
 *               isActive:
 *                 type: boolean
 *                 description: Content active status
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               seoTitle:
 *                 type: string
 *                 description: SEO title
 *               seoDescription:
 *                 type: string
 *                 description: SEO description
 *               seoKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: SEO keywords
 *     responses:
 *       200:
 *         description: Content updated successfully
 *       404:
 *         description: Content not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.put('/:type', auth, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const updateData = { ...req.body, lastUpdatedBy: req.user.id };

    const content = await StaticContent.findOneAndUpdate(
      { type },
      updateData,
      { new: true, runValidators: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: content
    });
  } catch (error) {
    console.error('Update static content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/content/{type}:
 *   delete:
 *     summary: Delete static content (Admin only)
 *     description: Soft delete static content by setting isActive to false
 *     tags: [Static Content - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [privacy-policy, terms-conditions, help, onboarding, about, contact, faq]
 *         description: Type of static content
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *       404:
 *         description: Content not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.delete('/:type', auth, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;

    const content = await StaticContent.findOneAndUpdate(
      { type },
      { isActive: false, lastUpdatedBy: req.user.id },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Delete static content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/content/admin/all:
 *   get:
 *     summary: Get all static content for admin (Admin only)
 *     description: Retrieve all static content including inactive ones for admin management
 *     tags: [Static Content - Admin]
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
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by content type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: All content retrieved successfully
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
 *                     $ref: '#/components/schemas/StaticContent'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/admin/all', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, isActive } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const contents = await StaticContent.find(filter)
      .populate('lastUpdatedBy', 'fullname email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalItems = await StaticContent.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: contents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all static content for admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
