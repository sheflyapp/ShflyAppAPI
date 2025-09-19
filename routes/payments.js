const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Question = require('../models/Question');
const User = require('../models/User');

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments (admin only)
 *     description: Get payments with filtering and pagination (Admin only)
 *     tags: [Payments - Admin]
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
 *         description: Number of payments per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for transaction ID or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, processing, success, failed, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [all, credit_card, debit_card, bank_transfer, wallet]
 *         description: Filter by payment method
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalPayments:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', method = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (method && method !== 'all') filter.paymentMethod = method;
    
    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { transactionId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };
    
    // Get payments with pagination
    const payments = await Payment.find(finalFilter)
      .populate('questionId', 'description status')
      .populate('seekerId', 'fullname email')
      .populate('providerId', 'fullname email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalPayments = await Payment.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalPayments / limit);
    
    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPayments,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payments' 
    });
  }
});

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Create a new payment for a question (Seekers only)
 *     tags: [Payments - Seeker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             example1:
 *               summary: Basic payment creation
 *               value:
 *                 questionId: "507f1f77bcf86cd799439011"
 *                 seekerId: "507f1f77bcf86cd799439012"
 *                 providerId: "507f1f77bcf86cd799439013"
 *                 amount: 100.50
 *                 currency: "USD"
 *                 description: "Payment for consultation question"
 *                 transactionId: "TXN_123456789"
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *               - seekerId
 *               - providerId
 *               - amount
 *               - description
 *             properties:
 *               questionId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the question
 *                 example: "507f1f77bcf86cd799439011"
 *               seekerId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the seeker user
 *                 example: "507f1f77bcf86cd799439012"
 *               providerId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the provider user
 *                 example: "507f1f77bcf86cd799439013"
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Payment amount
 *                 example: 100.50
 *               currency:
 *                 type: string
 *                 default: "USD"
 *                 description: Payment currency
 *                 example: "USD"
 *               description:
 *                 type: string
 *                 description: Payment description
 *                 example: "Payment for consultation question"
 *               transactionId:
 *                 type: string
 *                 description: External transaction ID (optional)
 *                 example: "TXN_123456789"
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      questionId,
      seekerId,
      providerId,
      amount,
      currency = 'USD',
      description,
      transactionId
    } = req.body;
    
    // Validate required fields
    if (!questionId || !seekerId || !providerId || !amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Check if seeker and provider exist
    const seeker = await User.findById(seekerId);
    const provider = await User.findById(providerId);
    
    if (!seeker || !provider) {
      return res.status(404).json({
        success: false,
        message: 'Seeker or provider not found'
      });
    }
    
    // Check if user is authorized to create this payment
    if (req.userProfile.userType !== 'admin' && 
        req.userProfile._id.toString() !== seekerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if payment already exists for this question
    const existingPayment = await Payment.findOne({ questionId: questionId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this question'
      });
    }
    
    const payment = new Payment({
      questionId,
      seekerId,
      providerId,
      amount,
      currency,
      description,
      transactionId,
      status: 'pending'
    });
    
    await payment.save();
    
    // Populate the payment for response
    await payment.populate([
      { path: 'questionId', select: 'description status' },
      { path: 'seekerId', select: 'fullname email' },
      { path: 'providerId', select: 'fullname email' }
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating payment' 
    });
  }
});

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     description: Get payment details by ID (Seeker/Provider/Admin access)
 *     tags: [Payments - Seeker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('questionId', 'description status')
      .populate('seekerId', 'fullname email phone')
      .populate('providerId', 'fullname email phone');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Check if user has access to this payment
    const isOwner = payment.seekerId.toString() === req.userProfile._id.toString() ||
                   payment.providerId.toString() === req.userProfile._id.toString();
    
    if (!isOwner && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment' 
    });
  }
});

/**
 * @swagger
 * /api/payments/{id}:
 *   put:
 *     summary: Update payment
 *     description: Update payment details (Seeker/Provider/Admin access)
 *     tags: [Payments - Seeker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, success, failed, cancelled]
 *                 description: Payment status
 *               description:
 *                 type: string
 *                 description: Payment description
 *               transactionId:
 *                 type: string
 *                 description: External transaction ID
 *     responses:
 *       200:
 *         description: Payment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, description, transactionId } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Check if user has access to update this payment
    const isOwner = payment.seekerId.toString() === req.userProfile._id.toString() ||
                   payment.providerId.toString() === req.userProfile._id.toString();
    
    if (!isOwner && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Update payment fields
    if (status) payment.status = status;
    if (description) payment.description = description;
    if (transactionId) payment.transactionId = transactionId;
    
    // If payment is successful, update question status if needed
    if (status === 'success') {
      const question = await Question.findById(payment.questionId);
      if (question && question.status === 'pending') {
        question.status = 'answered';
        await question.save();
      }
    }
    
    await payment.save();
    
    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating payment' 
    });
  }
});

/**
 * @swagger
 * /api/payments/{id}:
 *   delete:
 *     summary: Delete payment (admin only)
 *     description: Delete a payment (Admin only)
 *     tags: [Payments - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete completed or processing payments
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Only allow deletion of pending or failed payments
    if (payment.status === 'success' || payment.status === 'processing') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete successful or processing payments' 
      });
    }
    
    await Payment.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting payment' 
    });
  }
});

module.exports = router;
