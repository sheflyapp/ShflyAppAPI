const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shfly App API',
      version: '1.0.0',
      description: 'Complete API documentation for Shfly Consultation App',
      contact: {
        name: 'Shfly Team',
        email: 'support@shfly.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.shfly.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            fullname: { type: 'string', description: 'Full name of user' },
            username: { type: 'string', description: 'Username' },
            email: { type: 'string', format: 'email', description: 'Email address' },
            userType: { 
              type: 'string', 
              enum: ['admin', 'seeker', 'provider'],
              description: 'Type of user'
            },
            phone: { type: 'string', description: 'Phone number' },
            profileImage: { type: 'string', description: 'Profile image URL' },
            isVerified: { type: 'boolean', description: 'Email verification status' },
            isActive: { type: 'boolean', description: 'Account active status' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Consultation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            seeker: { type: 'string', description: 'Seeker user ID' },
            provider: { type: 'string', description: 'Provider user ID' },
            category: { type: 'string', description: 'Category ID' },
            title: { type: 'string', description: 'Consultation title' },
            description: { type: 'string', description: 'Consultation description' },
            status: { 
              type: 'string', 
              enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
              description: 'Consultation status'
            },
            scheduledAt: { type: 'string', format: 'date-time' },
            duration: { type: 'number', description: 'Duration in minutes' },
            price: { type: 'number', description: 'Price in currency' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', description: 'Category name' },
            description: { type: 'string', description: 'Category description' },
            icon: { type: 'string', description: 'Category icon' },
            isActive: { type: 'boolean', description: 'Category active status' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            consultation: { type: 'string', description: 'Consultation ID' },
            amount: { type: 'number', description: 'Payment amount' },
            currency: { type: 'string', default: 'USD' },
            status: { 
              type: 'string', 
              enum: ['pending', 'completed', 'failed', 'refunded'],
              description: 'Payment status'
            },
            paymentMethod: { type: 'string', description: 'Payment method used' },
            transactionId: { type: 'string', description: 'External transaction ID' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', description: 'Error message' },
            errors: { 
              type: 'array', 
              items: { type: 'object' },
              description: 'Validation errors'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', description: 'Success message' },
            data: { type: 'object', description: 'Response data' }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Consultations', description: 'Consultation management endpoints' },
      { name: 'Providers', description: 'Provider management endpoints' },
      { name: 'Seekers', description: 'Seeker management endpoints' },
      { name: 'Categories', description: 'Category management endpoints' },
      { name: 'Payments', description: 'Payment management endpoints' },
      { name: 'Chat', description: 'Chat functionality endpoints' },
      { name: 'Search', description: 'Search functionality endpoints' },
      { name: 'Notifications', description: 'Notification management endpoints' },
      { name: 'Upload', description: 'File upload endpoints' },
      { name: 'Wallet', description: 'Wallet management endpoints' }
    ]
  },
  apis: ['./routes/*.js', './server.js', './swagger-templates.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
