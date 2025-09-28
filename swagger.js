const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shfly App API',
      version: '1.0.0',
      description: 'Complete API documentation for Shfly consultation mobile app',
      contact: {
        name: 'Shfly Team',
        email: 'support@shfly.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://shflyappapi.onrender.com',
        description: 'Production server'
      }
    ],
    security: [
      {
        bearerAuth: []
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
            _id: { type: 'string' },
            fullname: { type: 'string', description: 'User full name' },
            username: { type: 'string', description: 'Unique username' },
            email: { type: 'string', format: 'email', description: 'User email' },
            phone: { type: 'string', description: 'User phone number' },
            userType: { 
              type: 'string', 
              enum: ['admin', 'seeker', 'provider'],
              description: 'User role type'
            },
            profileImage: { type: 'string', description: 'Profile image URL' },
            bio: { type: 'string', description: 'User bio' },
            country: { type: 'string', description: 'User country' },
            city: { type: 'string', description: 'User city' },
            gender: { 
              type: 'string', 
              enum: ['male', 'female', 'other'],
              description: 'User gender'
            },
            dob: { type: 'string', format: 'date', description: 'Date of birth' },
            languages: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Languages spoken'
            },
            isActive: { type: 'boolean', default: true, description: 'Account status' },
            isVerified: { type: 'boolean', default: false, description: 'Verification status' },
            rating: { type: 'number', description: 'Average rating (providers only)' },
            totalReviews: { type: 'integer', description: 'Total number of reviews' },
            price: { type: 'number', description: 'Consultation price (providers only)' },
            specializations: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'User specialization category IDs'
            },
            availability: {
              type: 'object',
              properties: {
                monday: { type: 'boolean' },
                tuesday: { type: 'boolean' },
                wednesday: { type: 'boolean' },
                thursday: { type: 'boolean' },
                friday: { type: 'boolean' },
                saturday: { type: 'boolean' },
                sunday: { type: 'boolean' }
              }
            },
            chat: { type: 'boolean', description: 'Chat availability' },
            call: { type: 'boolean', description: 'Call availability' },
            video: { type: 'boolean', description: 'Video availability' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Consultation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string', description: 'Consultation title' },
            description: { type: 'string', description: 'Consultation description' },
            seeker: { type: 'string', description: 'Seeker user ID' },
            provider: { type: 'string', description: 'Provider user ID' },
            category: { type: 'string', description: 'Category ID' },
            status: { 
              type: 'string', 
              enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
              description: 'Consultation status'
            },
            scheduledDate: { type: 'string', format: 'date-time', description: 'Scheduled date and time' },
            duration: { type: 'integer', description: 'Duration in minutes' },
            price: { type: 'number', description: 'Consultation price' },
            paymentStatus: { 
              type: 'string', 
              enum: ['pending', 'paid', 'refunded'],
              description: 'Payment status'
            },
            consultationType: { 
              type: 'string', 
              enum: ['chat', 'call', 'video'],
              description: 'Type of consultation'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', description: 'Category name' },
            description: { type: 'string', description: 'Category description' },
            icon: { type: 'string', description: 'Category icon' },
            isActive: { type: 'boolean', default: true, description: 'Category status' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            questionId: { type: 'string', description: 'Question ID' },
            seekerId: { type: 'string', description: 'Seeker user ID' },
            providerId: { type: 'string', description: 'Provider user ID' },
            amount: { type: 'number', description: 'Payment amount' },
            transactionId: { type: 'string', description: 'External transaction ID' },
            currency: { type: 'string', default: 'USD' },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'success', 'failed', 'cancelled'],
              description: 'Payment status'
            },
            description: { type: 'string', description: 'Payment description' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Chat: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            question: { type: 'string', description: 'Question ID' },
            participants: {
              type: 'array',
              items: { type: 'string' },
              description: 'User IDs participating in the chat'
            },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sender: { type: 'string', description: 'Sender user ID' },
                  content: { type: 'string', description: 'Message content' },
                  messageType: { type: 'string', enum: ['text', 'image', 'file'], default: 'text' },
                  fileUrl: { type: 'string', description: 'Optional file URL for image/file messages' },
                  isRead: { type: 'boolean' },
                  readAt: { type: 'string', format: 'date-time' },
                  readBy: { type: 'array', items: { type: 'string' } },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          example: {
            _id: 'string',
            question: 'string',
            participants: ['string', 'string'],
            messages: [
              {
                sender: 'string',
                content: 'string',
                messageType: 'text',
                fileUrl: 'string',
                isRead: false,
                readAt: null,
                readBy: [],
                createdAt: '2025-09-22T18:37:03.706Z',
                updatedAt: '2025-09-22T18:37:03.706Z'
              }
            ],
            createdAt: '2025-09-22T18:37:03.706Z',
            updatedAt: '2025-09-22T18:37:03.706Z'
          }
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            sender: { type: 'string', description: 'Sender user ID' },
            recipient: { type: 'string', description: 'Recipient user ID' },
            title: { type: 'string', description: 'Notification title' },
            message: { type: 'string', description: 'Notification message' },
            type: {
              type: 'string',
              enum: ['consultation', 'payment', 'system', 'chat'],
              description: 'Notification type'
            },
            consultation: { type: 'string', description: 'Related consultation ID' },
            isRead: { type: 'boolean', default: false },
            readAt: { type: 'string', format: 'date-time' },
            data: { type: 'object', description: 'Additional data' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            seekerId: { type: 'string', description: 'Seeker user ID' },
            providerId: { type: 'string', description: 'Provider user ID' },
            questionsId: { type: 'string', description: 'Question ID' },
            rating: { type: 'integer', minimum: 1, maximum: 5, description: 'Rating from 1 to 5' },
            comment: { type: 'string', description: 'Review comment' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Availability: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            provider: { type: 'string', description: 'Provider user ID' },
            date: { type: 'string', format: 'date', description: 'Date (YYYY-MM-DD)' },
            startTime: { type: 'string', description: 'Start time (HH:MM)' },
            endTime: { type: 'string', description: 'End time (HH:MM)' },
            isAvailable: { type: 'boolean', default: true, description: 'Whether the time slot is available' },
            maxBookings: { type: 'integer', default: 1, description: 'Maximum number of bookings for this slot' },
            price: { type: 'number', description: 'Price for this time slot' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string', description: 'User ID' },
            type: {
              type: 'string',
              enum: ['deposit', 'withdrawal', 'transfer'],
              description: 'Transaction type'
            },
            amount: { type: 'number', description: 'Transaction amount' },
            currency: { type: 'string', default: 'USD' },
            paymentMethod: { type: 'string', description: 'Payment method used' },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'cancelled'],
              default: 'pending'
            },
            description: { type: 'string', description: 'Transaction description' },
            bankDetails: { type: 'object', description: 'Bank account details for withdrawals' },
            relatedUser: { type: 'string', description: 'Related user ID for transfers' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string', description: 'User ID' },
            balance: { type: 'number', default: 0, description: 'Current balance' },
            currency: { type: 'string', default: 'USD', description: 'Currency' },
            lastTransaction: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Question: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string', description: 'Seeker user ID' },
            category: { 
              type: 'object',
              properties: {
                _id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                color: { type: 'string' },
                icon: { type: 'string' }
              },
              description: 'Question category details'
            },
            subcategory: { 
              type: 'object',
              properties: {
                _id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                color: { type: 'string' },
                icon: { type: 'string' }
              },
              description: 'Question subcategory details'
            },
            description: { type: 'string', description: 'Question description' },
            status: { 
              type: 'string', 
              enum: ['pending', 'answered', 'closed'],
              description: 'Question status'
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Question priority'
            },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Question tags'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  description: { type: 'string' }
                }
              },
              description: 'Question attachments'
            },
            isAnonymous: { type: 'boolean', description: 'Whether question is anonymous' },
            isPublic: { type: 'boolean', description: 'Whether question is public' },
            viewCount: { type: 'number', description: 'Number of views' },
            answerCount: { type: 'number', description: 'Number of answers' },
            lastActivityAt: { type: 'string', format: 'date-time' },
            closedAt: { type: 'string', format: 'date-time' },
            closedBy: { type: 'string', description: 'User who closed the question' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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
        },
        PublicUsersResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    currentPage: { type: 'number', example: 1 },
                    totalPages: { type: 'number', example: 5 },
                    totalUsers: { type: 'number', example: 50 },
                    limit: { type: 'number', example: 10 }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization endpoints' },
      { name: 'Admin Authentication', description: 'Admin authentication endpoints' },
      { name: 'User Authentication', description: 'User authentication endpoints (Registration & Login)' },
      { name: 'Users', description: 'User management and profile operations' },
      { name: 'Users - Admin', description: 'User management and profile operations (Admin only)' },
      { name: 'Admin Operations', description: 'Admin-only operations and management' },
      { name: 'Consultations - Common', description: 'Consultation booking and management (All users)' },
      { name: 'Categories - Admin', description: 'Service category management (Admin only)' },
      { name: 'Payments - Admin', description: 'Payment processing and management (Admin only)' },
      { name: 'Payments - Seeker', description: 'Payment creation and management (Seekers only)' },
      { name: 'Moyasar Payments', description: 'Moyasar payment gateway integration' },
      { name: 'Moyasar Invoices', description: 'Moyasar invoice management' },
      { name: 'Moyasar Customers', description: 'Moyasar customer management' },
      { name: 'Moyasar Webhooks', description: 'Moyasar webhook handling' },
      { name: 'Chat - Common', description: 'Real-time chat functionality (All users)' },
      { name: 'Search - Common', description: 'Search and discovery functionality (Public)' },
      { name: 'Notifications - Common', description: 'User notification system (All users)' },
      { name: 'Upload - Common', description: 'File and image upload management (All users)' },
      { name: 'Wallet - Common', description: 'Wallet and transaction management (All users)' },
      { name: 'Reviews - Seeker', description: 'Review and rating system (Seekers only)' },
      { name: 'Availability - Provider', description: 'Provider availability scheduling (Providers only)' },
      { name: 'Provider Questions', description: 'Question management for providers (Providers only)' },
      { name: 'Profile - Common', description: 'User profile management (All users)' }
    ]
  },
  apis: [
    './routes/*.js',
    './swagger-templates.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
