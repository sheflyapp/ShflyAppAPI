const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get wallet balance and basic information
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Wallet'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/', auth, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = new Wallet({
        user: req.user.id,
        balance: 0,
        currency: 'USD'
      });
      await wallet.save();
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/wallet/add-funds:
 *   post:
 *     summary: Add funds to wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 description: Amount to add
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, bank_transfer, moyasar]
 *                 description: Payment method
 *               currency:
 *                 type: string
 *                 default: USD
 *                 description: Currency for the transaction
 *               description:
 *                 type: string
 *                 description: Transaction description
 *     responses:
 *       201:
 *         description: Funds added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/add-funds', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, currency = 'USD', description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    let wallet = await Wallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      wallet = new Wallet({
        user: req.user.id,
        balance: 0,
        currency
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      user: req.user.id,
      type: 'deposit',
      amount,
      currency,
      paymentMethod,
      description: description || `Added ${amount} ${currency} to wallet`,
      status: 'completed'
    });

    await transaction.save();

    // Update wallet balance
    wallet.balance += amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    res.status(201).json({
      success: true,
      message: 'Funds added successfully',
      data: {
        wallet,
        transaction
      }
    });
  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw funds from wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - withdrawalMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 description: Amount to withdraw
 *               withdrawalMethod:
 *                 type: string
 *                 enum: [bank_transfer, paypal, moyasar]
 *                 description: Withdrawal method
 *               bankDetails:
 *                 type: object
 *                 description: Bank account details
 *               description:
 *                 type: string
 *                 description: Withdrawal reason
 *     responses:
 *       201:
 *         description: Withdrawal request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request or insufficient funds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, withdrawalMethod, bankDetails, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!withdrawalMethod) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal method is required'
      });
    }

    const wallet = await Wallet.findOne({ user: req.user.id });
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      user: req.user.id,
      type: 'withdrawal',
      amount,
      currency: wallet.currency,
      paymentMethod: withdrawalMethod,
      description: description || `Withdrew ${amount} ${wallet.currency}`,
      status: 'pending',
      bankDetails
    });

    await transaction.save();

    // Update wallet balance
    wallet.balance -= amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        wallet,
        transaction
      }
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, deposit, withdrawal, transfer]
 *           default: all
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, completed, failed, cancelled]
 *           default: all
 *         description: Filter by transaction status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (YYYY-MM-DD)
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
 *         description: Number of transactions per page
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
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
 *                     $ref: '#/components/schemas/Transaction'
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/transactions', auth, async (req, res) => {
  try {
    const {
      type = 'all',
      status = 'all',
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { user: req.user.id };

    // Type filter
    if (type !== 'all') {
      filter.type = type;
    }

    // Status filter
    if (status !== 'all') {
      filter.status = status;
    }

    // Date filters
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/wallet/transactions/{id}:
 *   get:
 *     summary: Get specific transaction details
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/transactions/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user owns this transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this transaction'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @swagger
 * /api/wallet/transfer:
 *   post:
 *     summary: Transfer funds to another user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - amount
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: ID of the recipient user
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 description: Amount to transfer
 *               description:
 *                 type: string
 *                 description: Transfer description
 *     responses:
 *       201:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request or insufficient funds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/transfer', auth, async (req, res) => {
  try {
    const { recipientId, amount, description } = req.body;

    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID and valid amount are required'
      });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to yourself'
      });
    }

    // Check if recipient exists
    const recipient = await require('../models/User').findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Get sender's wallet
    let senderWallet = await Wallet.findOne({ user: req.user.id });
    if (!senderWallet || senderWallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds'
      });
    }

    // Get or create recipient's wallet
    let recipientWallet = await Wallet.findOne({ user: recipientId });
    if (!recipientWallet) {
      recipientWallet = new Wallet({
        user: recipientId,
        balance: 0,
        currency: senderWallet.currency
      });
    }

    // Create transactions
    const senderTransaction = new Transaction({
      user: req.user.id,
      type: 'transfer',
      amount: -amount,
      currency: senderWallet.currency,
      description: description || `Transferred to ${recipient.fullname}`,
      status: 'completed',
      relatedUser: recipientId
    });

    const recipientTransaction = new Transaction({
      user: recipientId,
      type: 'transfer',
      amount,
      currency: recipientWallet.currency,
      description: description || `Received from ${req.user.fullname}`,
      status: 'completed',
      relatedUser: req.user.id
    });

    await senderTransaction.save();
    await recipientTransaction.save();

    // Update wallet balances
    senderWallet.balance -= amount;
    recipientWallet.balance += amount;
    
    await senderWallet.save();
    await recipientWallet.save();

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        senderWallet,
        recipientWallet,
        transaction: senderTransaction
      }
    });
  } catch (error) {
    console.error('Error processing transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
