const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Import Moyasar service
const moyasarService = require('../services/moyasarService');

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *         - description
 *         - source
 *       properties:
 *         amount:
 *           type: number
 *           description: Payment amount in SAR
 *         currency:
 *           type: string
 *           default: SAR
 *           description: Payment currency
 *         description:
 *           type: string
 *           description: Payment description
 *         callback_url:
 *           type: string
 *           format: uri
 *           description: Callback URL after payment
 *         back_url:
 *           type: string
 *           format: uri
 *           description: Back URL if payment is cancelled
 *         source:
 *           type: object
 *           description: Payment source (credit card, STC Pay, etc.)
 *         metadata:
 *           type: object
 *           description: Additional payment metadata
 *     CreateInvoiceRequest:
 *       type: object
 *       required:
 *         - amount
 *         - description
 *         - customer
 *       properties:
 *         amount:
 *           type: number
 *           description: Invoice amount in SAR
 *         currency:
 *           type: string
 *           default: SAR
 *           description: Invoice currency
 *         description:
 *           type: string
 *           description: Invoice description
 *         callback_url:
 *           type: string
 *           format: uri
 *           description: Callback URL after payment
 *         back_url:
 *           type: string
 *           format: uri
 *           description: Back URL if payment is cancelled
 *         customer:
 *           type: object
 *           description: Customer information
 *         metadata:
 *           type: object
 *           description: Additional invoice metadata
 *     CreateCustomerRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         name:
 *           type: string
 *           description: Customer full name
 *         email:
 *           type: string
 *           format: email
 *           description: Customer email
 *         phone:
 *           type: string
 *           description: Customer phone number
 *         address:
 *           type: object
 *           description: Customer address
 *         metadata:
 *           type: object
 *           description: Additional customer metadata
 *     RefundRequest:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *           description: Refund amount (if not specified, full refund)
 *         reason:
 *           type: string
 *           description: Refund reason
 *     PaymentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         payment:
 *           type: object
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/moyasar/payments:
 *   post:
 *     summary: Create a new payment
 *     description: Create a new payment using Moyasar payment gateway
 *     tags: [Moyasar Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       200:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/payments', [
  body('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
  body('description', 'Description is required').notEmpty(),
  body('source', 'Payment source is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const paymentData = req.body;
    
    // Create payment using Moyasar service
    const result = await moyasarService.createPayment(paymentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during payment creation',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/payments/{paymentId}:
 *   get:
 *     summary: Get payment by ID
 *     description: Retrieve payment details by payment ID
 *     tags: [Moyasar Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
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
 *               $ref: '#/components/schemas/PaymentResponse'
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
router.get('/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const result = await moyasarService.getPayment(paymentId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving payment',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/payments:
 *   get:
 *     summary: List payments
 *     description: Retrieve list of payments with pagination
 *     tags: [Moyasar Payments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: per
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Payment status filter
 *       - in: query
 *         name: created_at_min
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Minimum creation date
 *       - in: query
 *         name: created_at_max
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Maximum creation date
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       500:
 *         description: Internal server error
 */
router.get('/payments', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      per: parseInt(req.query.per) || 20,
      status: req.query.status,
      created_at_min: req.query.created_at_min,
      created_at_max: req.query.created_at_max
    };
    
    const result = await moyasarService.listPayments(options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while listing payments',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/payments/{paymentId}/refund:
 *   post:
 *     summary: Refund a payment
 *     description: Refund a payment (full or partial)
 *     tags: [Moyasar Payments]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID to refund
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundRequest'
 *     responses:
 *       200:
 *         description: Payment refunded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/payments/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const refundData = req.body;
    
    const result = await moyasarService.refundPayment(paymentId, refundData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during refund',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/invoices:
 *   post:
 *     summary: Create a new invoice
 *     description: Create a new invoice using Moyasar
 *     tags: [Moyasar Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceRequest'
 *     responses:
 *       200:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Bad request - validation errors
 *       500:
 *         description: Internal server error
 */
router.post('/invoices', [
  body('amount', 'Amount is required and must be a positive number').isFloat({ min: 0.01 }),
  body('description', 'Description is required').notEmpty(),
  body('customer', 'Customer information is required').notEmpty()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invoiceData = req.body;
    
    const result = await moyasarService.createInvoice(invoiceData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during invoice creation',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/invoices/{invoiceId}:
 *   get:
 *     summary: Get invoice by ID
 *     description: Retrieve invoice details by invoice ID
 *     tags: [Moyasar Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const result = await moyasarService.getInvoice(invoiceId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving invoice',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/invoices:
 *   get:
 *     summary: List invoices
 *     description: Retrieve list of invoices with pagination
 *     tags: [Moyasar Invoices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: per
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Invoice status filter
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/invoices', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      per: parseInt(req.query.per) || 20,
      status: req.query.status
    };
    
    const result = await moyasarService.listInvoices(options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while listing invoices',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/customers:
 *   post:
 *     summary: Create a new customer
 *     description: Create a new customer in Moyasar
 *     tags: [Moyasar Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomerRequest'
 *     responses:
 *       200:
 *         description: Customer created successfully
 *       400:
 *         description: Bad request - validation errors
 *       500:
 *         description: Internal server error
 */
router.post('/customers', [
  body('name', 'Customer name is required').notEmpty(),
  body('email', 'Valid email is required').isEmail()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerData = req.body;
    
    const result = await moyasarService.createCustomer(customerData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during customer creation',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/customers/{customerId}:
 *   get:
 *     summary: Get customer by ID
 *     description: Retrieve customer details by customer ID
 *     tags: [Moyasar Customers]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await moyasarService.getCustomer(customerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving customer',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/customers/{customerId}:
 *   put:
 *     summary: Update customer
 *     description: Update customer information
 *     tags: [Moyasar Customers]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomerRequest'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.put('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const updateData = req.body;
    
    const result = await moyasarService.updateCustomer(customerId, updateData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during customer update',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/customers:
 *   get:
 *     summary: List customers
 *     description: Retrieve list of customers with pagination
 *     tags: [Moyasar Customers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: per
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/customers', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      per: parseInt(req.query.per) || 20
    };
    
    const result = await moyasarService.listCustomers(options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while listing customers',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/customers/{customerId}/payment-methods:
 *   get:
 *     summary: Get customer payment methods
 *     description: Retrieve payment methods for a specific customer
 *     tags: [Moyasar Customers]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.get('/customers/:customerId/payment-methods', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const result = await moyasarService.getCustomerPaymentMethods(customerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get customer payment methods error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while retrieving payment methods',
      error: error.message 
    });
  }
});

/**
 * @swagger
 * /api/moyasar/webhooks:
 *   post:
 *     summary: Moyasar webhook endpoint
 *     description: Handle webhooks from Moyasar for payment updates
 *     tags: [Moyasar Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Webhook event type
 *               data:
 *                 type: object
 *                 description: Webhook data payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Internal server error
 */
router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-moyasar-signature'];
    const body = req.body.toString();
    
    // Verify webhook signature
    if (!moyasarService.verifyWebhookSignature(signature, body)) {
      console.warn('Invalid webhook signature');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook signature' 
      });
    }
    
    // Parse webhook data
    const webhookData = JSON.parse(body);
    
    // Process webhook
    const result = moyasarService.processWebhook(webhookData);
    
    if (result.success) {
      console.log('Webhook processed successfully:', result);
      
      // TODO: Update your database based on webhook data
      // Example: Update payment status, create transaction records, etc.
      
      res.json({ 
        success: true, 
        message: 'Webhook processed successfully' 
      });
    } else {
      console.warn('Webhook processing failed:', result);
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during webhook processing',
      error: error.message 
    });
  }
});

module.exports = router;


