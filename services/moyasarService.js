const axios = require('axios');
const crypto = require('crypto');

class MoyasarService {
  constructor() {
    this.apiKey = process.env.MOYASAR_API_KEY;
    this.secretKey = process.env.MOYASAR_SECRET_KEY;
    this.baseURL = process.env.MOYASAR_BASE_URL || 'https://api.moyasar.com/v1';
    this.webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
    
    // Configure axios with Moyasar authentication
    this.api = axios.create({
      baseURL: this.baseURL,
      auth: {
        username: this.apiKey,
        password: ''
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a new payment
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Payment response
   */
  async createPayment(paymentData) {
    try {
      const {
        amount,
        currency = 'SAR',
        description,
        callback_url,
        back_url,
        source,
        metadata = {}
      } = paymentData;

      const paymentPayload = {
        amount: Math.round(amount * 100), // Convert to smallest currency unit (halalas for SAR)
        currency,
        description,
        callback_url,
        back_url,
        source,
        metadata
      };

      const response = await this.api.post('/payments', paymentPayload);
      return {
        success: true,
        payment: response.data,
        message: 'Payment created successfully'
      };
    } catch (error) {
      console.error('Moyasar payment creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to create payment'
      };
    }
  }

  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice information
   * @returns {Promise<Object>} Invoice response
   */
  async createInvoice(invoiceData) {
    try {
      const {
        amount,
        currency = 'SAR',
        description,
        callback_url,
        back_url,
        customer,
        metadata = {}
      } = invoiceData;

      const invoicePayload = {
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency,
        description,
        callback_url,
        back_url,
        customer,
        metadata
      };

      const response = await this.api.post('/invoices', invoicePayload);
      return {
        success: true,
        invoice: response.data,
        message: 'Invoice created successfully'
      };
    } catch (error) {
      console.error('Moyasar invoice creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to create invoice'
      };
    }
  }

  /**
   * Get payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment details
   */
  async getPayment(paymentId) {
    try {
      const response = await this.api.get(`/payments/${paymentId}`);
      return {
        success: true,
        payment: response.data,
        message: 'Payment retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar get payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve payment'
      };
    }
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice details
   */
  async getInvoice(invoiceId) {
    try {
      const response = await this.api.get(`/invoices/${invoiceId}`);
      return {
        success: true,
        invoice: response.data,
        message: 'Invoice retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar get invoice error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve invoice'
      };
    }
  }

  /**
   * List payments with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Payments list
   */
  async listPayments(options = {}) {
    try {
      const {
        page = 1,
        per = 20,
        created_at_min,
        created_at_max,
        status
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        per: per.toString()
      });

      if (created_at_min) params.append('created_at_min', created_at_min);
      if (created_at_max) params.append('created_at_max', created_at_max);
      if (status) params.append('status', status);

      const response = await this.api.get(`/payments?${params.toString()}`);
      return {
        success: true,
        payments: response.data,
        message: 'Payments retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar list payments error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve payments'
      };
    }
  }

  /**
   * List invoices with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Invoices list
   */
  async listInvoices(options = {}) {
    try {
      const {
        page = 1,
        per = 20,
        created_at_min,
        created_at_max,
        status
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        per: per.toString()
      });

      if (created_at_min) params.append('created_at_min', created_at_min);
      if (created_at_max) params.append('created_at_max', created_at_max);
      if (status) params.append('status', status);

      const response = await this.api.get(`/invoices?${params.toString()}`);
      return {
        success: true,
        invoices: response.data,
        message: 'Invoices retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar list invoices error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve invoices'
      };
    }
  }

  /**
   * Refund a payment
   * @param {string} paymentId - Payment ID to refund
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} Refund response
   */
  async refundPayment(paymentId, refundData = {}) {
    try {
      const {
        amount,
        reason = 'Refund requested by customer'
      } = refundData;

      const refundPayload = {
        amount: amount ? Math.round(amount * 100) : undefined, // If no amount specified, full refund
        reason
      };

      const response = await this.api.post(`/payments/${paymentId}/refund`, refundPayload);
      return {
        success: true,
        refund: response.data,
        message: 'Payment refunded successfully'
      };
    } catch (error) {
      console.error('Moyasar refund error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to refund payment'
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Webhook signature
   * @param {string} body - Raw request body
   * @returns {boolean} Signature validity
   */
  verifyWebhookSignature(signature, body) {
    try {
      if (!this.webhookSecret) {
        console.warn('Moyasar webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body, 'utf8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook data
   * @param {Object} webhookData - Webhook payload
   * @returns {Object} Processed webhook data
   */
  processWebhook(webhookData) {
    try {
      const { type, data } = webhookData;
      
      switch (type) {
        case 'payment.succeeded':
          return {
            success: true,
            type: 'payment_succeeded',
            paymentId: data.id,
            amount: data.amount / 100, // Convert from halalas to SAR
            currency: data.currency,
            status: data.status,
            metadata: data.metadata,
            message: 'Payment succeeded'
          };

        case 'payment.failed':
          return {
            success: true,
            type: 'payment_failed',
            paymentId: data.id,
            amount: data.amount / 100,
            currency: data.currency,
            status: data.status,
            failure_reason: data.failure_reason,
            metadata: data.metadata,
            message: 'Payment failed'
          };

        case 'invoice.paid':
          return {
            success: true,
            type: 'invoice_paid',
            invoiceId: data.id,
            amount: data.amount / 100,
            currency: data.currency,
            status: data.status,
            metadata: data.metadata,
            message: 'Invoice paid'
          };

        default:
          return {
            success: false,
            type: 'unknown',
            message: `Unknown webhook type: ${type}`
          };
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process webhook'
      };
    }
  }

  /**
   * Create a customer
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Customer response
   */
  async createCustomer(customerData) {
    try {
      const {
        name,
        email,
        phone,
        address,
        metadata = {}
      } = customerData;

      const customerPayload = {
        name,
        email,
        phone,
        address,
        metadata
      };

      const response = await this.api.post('/customers', customerPayload);
      return {
        success: true,
        customer: response.data,
        message: 'Customer created successfully'
      };
    } catch (error) {
      console.error('Moyasar create customer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to create customer'
      };
    }
  }

  /**
   * Get customer by ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Customer details
   */
  async getCustomer(customerId) {
    try {
      const response = await this.api.get(`/customers/${customerId}`);
      return {
        success: true,
        customer: response.data,
        message: 'Customer retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar get customer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve customer'
      };
    }
  }

  /**
   * Update customer
   * @param {string} customerId - Customer ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Update response
   */
  async updateCustomer(customerId, updateData) {
    try {
      const response = await this.api.put(`/customers/${customerId}`, updateData);
      return {
        success: true,
        customer: response.data,
        message: 'Customer updated successfully'
      };
    } catch (error) {
      console.error('Moyasar update customer error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to update customer'
      };
    }
  }

  /**
   * List customers with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customers list
   */
  async listCustomers(options = {}) {
    try {
      const {
        page = 1,
        per = 20
      } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        per: per.toString()
      });

      const response = await this.api.get(`/customers?${params.toString()}`);
      return {
        success: true,
        customers: response.data,
        message: 'Customers retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar list customers error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve customers'
      };
    }
  }

  /**
   * Get payment methods for a customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} Payment methods
   */
  async getCustomerPaymentMethods(customerId) {
    try {
      const response = await this.api.get(`/customers/${customerId}/payment_methods`);
      return {
        success: true,
        paymentMethods: response.data,
        message: 'Payment methods retrieved successfully'
      };
    } catch (error) {
      console.error('Moyasar get customer payment methods error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to retrieve payment methods'
      };
    }
  }
}

module.exports = new MoyasarService();


