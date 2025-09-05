const swaggerJsdoc = require('swagger-jsdoc');

const authSwaggerSpecs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shfly App Authentication API',
      version: '1.0.0',
      description: 'Complete authentication system for Shfly App including admin, user, social login, and OTP verification',
      contact: {
        name: 'Shfly Team',
        email: 'support@shflyapp.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.shflyapp.com',
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
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        },
        
        // Admin Authentication Schemas
        AdminLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address'
            },
            password: {
              type: 'string',
              description: 'Admin password'
            }
          }
        },
        AdminRegisterRequest: {
          type: 'object',
          required: ['fullname', 'email', 'password', 'adminSecret'],
          properties: {
            fullname: {
              type: 'string',
              description: 'Admin full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Admin password (minimum 6 characters)'
            },
            adminSecret: {
              type: 'string',
              description: 'Secret key to create admin account'
            },
            phone: {
              type: 'string',
              description: 'Admin phone number (optional)'
            }
          }
        },
        AdminAuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            },
            token: {
              type: 'string',
              description: 'JWT authentication token'
            },
            admin: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fullname: { type: 'string' },
                email: { type: 'string' },
                userType: { type: 'string', enum: ['admin'] }
              }
            }
          }
        },
        
        // User Authentication Schemas
        UserLoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              description: 'User password'
            }
          }
        },
        UserRegisterRequest: {
          type: 'object',
          required: ['fullname', 'email', 'password', 'userType', 'phone', 'specializations'],
          properties: {
            fullname: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (minimum 6 characters)'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider'],
              description: 'Type of user account'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            profileImage: {
              type: 'string',
              description: 'Profile image URL (optional)'
            },
            country: {
              type: 'string',
              description: 'User country (optional)'
            },
            city: {
              type: 'string',
              description: 'User city (optional)'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'User gender (optional)'
            },
            specializations: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'User specialization category IDs (required for all users, at least one)'
            }
          }
        },
        UserAuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            },
            token: {
              type: 'string',
              description: 'JWT authentication token'
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                fullname: { type: 'string' },
                email: { type: 'string' },
                userType: { type: 'string', enum: ['seeker', 'provider'] },
                phone: { type: 'string' }
              }
            }
          }
        },
        
        // Social Login Schemas
        GoogleLoginRequest: {
          type: 'object',
          required: ['idToken', 'platform', 'userType', 'specializations'],
          properties: {
            idToken: {
              type: 'string',
              description: 'Google ID token from client'
            },
            platform: {
              type: 'string',
              enum: ['android', 'ios', 'web'],
              description: 'Platform type (android, ios, or web)'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider'],
              description: 'Type of user account'
            },
            specializations: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'User specialization category IDs (required for all users, at least one)'
            }
          }
        },
        FacebookLoginRequest: {
          type: 'object',
          required: ['facebookId', 'email', 'fullname', 'userType'],
          properties: {
            facebookId: {
              type: 'string',
              description: 'Facebook user ID from OAuth'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email from Facebook'
            },
            fullname: {
              type: 'string',
              description: 'User full name from Facebook'
            },
            profileImage: {
              type: 'string',
              description: 'Profile image URL from Facebook (optional)'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider'],
              description: 'Type of user account'
            }
          }
        },
        AppleLoginRequest: {
          type: 'object',
          required: ['appleId', 'email', 'fullname', 'userType'],
          properties: {
            appleId: {
              type: 'string',
              description: 'Apple user ID from OAuth'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email from Apple'
            },
            fullname: {
              type: 'string',
              description: 'User full name from Apple'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider'],
              description: 'Type of user account'
            }
          }
        },
        
        // OTP Schemas
        PhoneOtpRequest: {
          type: 'object',
          required: ['phone'],
          properties: {
            phone: {
              type: 'string',
              description: 'User phone number to send OTP'
            }
          }
        },
        PhoneOtpVerifyRequest: {
          type: 'object',
          required: ['phone', 'otp', 'userType'],
          properties: {
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            otp: {
              type: 'string',
              description: 'OTP code received via SMS'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider'],
              description: 'Type of user account'
            },
            fullname: {
              type: 'string',
              description: 'User full name (optional for existing users)'
            }
          }
        },
        OtpResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            },
            otp: {
              type: 'string',
              description: 'OTP code (only in development)'
            },
            expiresIn: {
              type: 'string',
              description: 'OTP expiration time'
            }
          }
        },
        
        // User Profile Schema
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullname: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            userType: { type: 'string', enum: ['seeker', 'provider', 'admin'] },
            phone: { type: 'string' },
            profileImage: { type: 'string' },
            bio: { type: 'string' },
            country: { type: 'string' },
            city: { type: 'string' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            dob: { type: 'string', format: 'date' },
            specializations: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'User specialization category IDs'
            },
            price: { type: 'number' },
            rating: { type: 'number' },
            totalReviews: { type: 'number' },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            socialLogin: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Admin User Management Schemas
        AdminCreateUserRequest: {
          type: 'object',
          required: ['username', 'email', 'password', 'userType', 'phone'],
          properties: {
            username: {
              type: 'string',
              description: 'User unique username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password (minimum 6 characters)'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider', 'admin'],
              description: 'Type of user account'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            fullname: {
              type: 'string',
              description: 'User full name (optional)'
            },
            specializations: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'User specialization category IDs (required for seekers and providers, not required for admin)'
            }
          }
        },
        AdminUpdateUserRequest: {
          type: 'object',
          properties: {
            fullname: {
              type: 'string',
              description: 'User full name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            userType: {
              type: 'string',
              enum: ['seeker', 'provider', 'admin'],
              description: 'Type of user account'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            profileImage: {
              type: 'string',
              description: 'Profile image URL'
            },
            isVerified: {
              type: 'boolean',
              description: 'User verification status'
            },
            isActive: {
              type: 'boolean',
              description: 'User active status'
            },
            specializations: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'User specialization category IDs (required for seekers and providers, not required for admin)'
            }
          }
        },
        AdminUserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation success status'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Admin Authentication',
        description: 'Admin user authentication endpoints'
      },
      {
        name: 'User Authentication',
        description: 'Regular user authentication endpoints'
      },
      {
        name: 'Social Login',
        description: 'OAuth authentication endpoints (Google, Facebook, Apple)'
      },
      {
        name: 'OTP Verification',
        description: 'Phone OTP verification endpoints'
      }
    ]
  },
  apis: [
    './routes/adminAuth.js',
    './routes/userAuth.js'
  ]
});

module.exports = authSwaggerSpecs;


