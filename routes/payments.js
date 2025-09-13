const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Consultation = require('../models/Consultation');
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
 *           enum: [all, pending, completed, failed, cancelled]
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
      .populate('consultation', 'title consultationType status')
      .populate('seeker', 'fullname email')
      .populate('provider', 'fullname email')
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
 *     description: Create a new payment for a consultation (Seekers only)
 *     tags: [Payments - Seeker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consultationId
 *               - amount
 *               - paymentMethod
 *               - description
 *             properties:
 *               consultationId:
 *                 type: string
 *                 description: ID of the consultation
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Payment currency
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, debit_card, bank_transfer, wallet]
 *                 description: Payment method
 *               description:
 *                 type: string
 *                 description: Payment description
 *               metadata:
 *                 type: object
 *                 description: Additional payment metadata
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
 *         description: Consultation not found
 *       500:
 *         description: Server error
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      consultationId,
      amount,
      currency = 'USD',
      paymentMethod,
      description,
      metadata = {}
    } = req.body;
    
    // Validate required fields
    if (!consultationId || !amount || !paymentMethod || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if consultation exists and user has access
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }
    
    // Check if user is the seeker of this consultation
    if (consultation.seeker.toString() !== req.userProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if consultation is in a valid state for payment
    if (consultation.status !== 'accepted' && consultation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Consultation is not in a valid state for payment'
      });
    }
    
    // Check if payment already exists for this consultation
    const existingPayment = await Payment.findOne({ consultation: consultationId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this consultation'
      });
    }
    
    // Validate amount matches consultation price
    if (amount !== consultation.price) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must match consultation price'
      });
    }
    
    const payment = new Payment({
      consultation: consultationId,
      seeker: req.userProfile._id,
      provider: consultation.provider,
      amount,
      currency,
      paymentMethod,
      description,
      metadata,
      status: 'pending'
    });
    
    await payment.save();
    
    // Populate the payment for response
    await payment.populate([
      { path: 'consultation', select: 'title consultationType status' },
      { path: 'seeker', select: 'fullname email' },
      { path: 'provider', select: 'fullname email' }
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
      .populate('consultation', 'title consultationType status scheduledDate')
      .populate('seeker', 'fullname email phone')
      .populate('provider', 'fullname email phone');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Check if user has access to this payment
    const isOwner = payment.seeker.toString() === req.userProfile._id.toString() ||
                   payment.provider.toString() === req.userProfile._id.toString();
    
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
 *                 enum: [pending, completed, failed, cancelled]
 *                 description: Payment status
 *               notes:
 *                 type: string
 *                 description: Payment notes
 *               transactionId:
 *                 type: string
 *                 description: External transaction ID
 *               stripePaymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
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
    const { status, notes, transactionId, stripePaymentIntentId } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }
    
    // Check if user has access to update this payment
    const isOwner = payment.seeker.toString() === req.userProfile._id.toString() ||
                   payment.provider.toString() === req.userProfile._id.toString();
    
    if (!isOwner && req.userProfile.userType !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    
    // Update payment fields
    if (status) payment.status = status;
    if (notes !== undefined) payment.notes = notes;
    if (transactionId) payment.transactionId = transactionId;
    if (stripePaymentIntentId) payment.stripePaymentIntentId = stripePaymentIntentId;
    
    // If payment is completed, update consultation status
    if (status === 'completed') {
      const consultation = await Consultation.findById(payment.consultation);
      if (consultation && consultation.status === 'pending') {
        consultation.status = 'accepted';
        await consultation.save();
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
    if (payment.status === 'completed' || payment.status === 'processing') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete completed or processing payments' 
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
