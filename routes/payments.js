const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Consultation = require('../models/Consultation');
const User = require('../models/User');

// @route   GET /api/payments
// @desc    Get all payments (admin only)
// @access  Private/Admin
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

// @route   POST /api/payments
// @desc    Create a new payment
// @access  Private
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

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private
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

// @route   PUT /api/payments/:id
// @desc    Update payment
// @access  Private
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

// @route   DELETE /api/payments/:id
// @desc    Delete payment (admin only)
// @access  Private/Admin
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
