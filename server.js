const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy configuration for deployment behind proxies (Render, Heroku, etc.)
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // In production, trust the first proxy (Render's proxy)
  app.set('trust proxy', 1);
  console.log('🔒 Production mode: Trusting proxy headers');
} else {
  // In development, don't trust proxies
  app.set('trust proxy', false);
  console.log('🔒 Development mode: Not trusting proxy headers');
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://shflyapp-admin.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting with proxy support
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use a custom key generator that handles proxy scenarios
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available, otherwise use req.ip
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.ip;
    const connectionIp = req.connection.remoteAddress;
    
    if (forwardedFor) {
      // Get the first IP from the chain (client IP)
      const clientIp = forwardedFor.split(',')[0].trim();
      console.log(`🔍 Rate limit key generation: X-Forwarded-For: ${forwardedFor} -> Client IP: ${clientIp}`);
      return clientIp;
    }
    
    console.log(`🔍 Rate limit key generation: req.ip: ${realIp}, connection.remoteAddress: ${connectionIp}`);
    return realIp || connectionIp || 'unknown';
  },
  // Skip rate limiting for health checks and documentation
  skip: (req) => {
    const skipPaths = ['/health', '/', '/api-docs', '/api-docs/*'];
    const shouldSkip = skipPaths.some(path => {
      if (path.endsWith('/*')) {
        return req.path.startsWith(path.slice(0, -2));
      }
      return req.path === path;
    });
    
    if (shouldSkip) {
      console.log(`⏭️ Skipping rate limit for: ${req.path}`);
    }
    
    return shouldSkip;
  },
  // Handle rate limit exceeded
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(15 * 60 / 1000)
    });
  }
});

// Apply rate limiting with logging
console.log('🔒 Applying rate limiting middleware');
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shfly_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Shfly App API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true
  }
}));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Shfly App API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs'
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/auth', require('./routes/adminAuth'));
app.use('/api/user/auth', require('./routes/userAuth'));
app.use('/api/moyasar', require('./routes/moyasarPayments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/seekers', require('./routes/seekers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/search', require('./routes/search'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/profile', require('./routes/profile'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle rate limit errors specifically
  if (err.code === 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR') {
    console.error('Rate limit proxy configuration error:', err.message);
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Rate limiting configuration issue. Please contact support.'
    });
  }
  
  // Handle other errors
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Trust Proxy: ${app.get('trust proxy')}`);
});

module.exports = app;
