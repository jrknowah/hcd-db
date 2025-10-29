// src/backend/middleware/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Security middleware for production-ready API
 */

// ✅ Rate limiting to prevent brute force attacks
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// ✅ Specific rate limiters for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  
  // Stricter limit for auth endpoints
  auth: createRateLimiter(15 * 60 * 1000, 5), // 5 requests per 15 minutes
  
  // Moderate limit for data modification
  mutation: createRateLimiter(15 * 60 * 1000, 30), // 30 requests per 15 minutes
  
  // Generous limit for read operations
  query: createRateLimiter(15 * 60 * 1000, 200), // 200 requests per 15 minutes
};

// ✅ Security headers configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", process.env.VITE_API_URL || "'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Azure
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// ✅ Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential NoSQL injection attempts
  mongoSanitize()(req, res, () => {
    // Clean XSS attempts
    xss()(req, res, () => {
      // Prevent parameter pollution
      hpp()(req, res, next);
    });
  });
};

// ✅ Request validation middleware
const validateRequest = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\(/i,
    /expression\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Check body, query, and params
  const suspicious = 
    checkValue(req.body) || 
    checkValue(req.query) || 
    checkValue(req.params);

  if (suspicious) {
    console.error('🚨 Suspicious input detected:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Request contains potentially malicious content'
    });
  }

  next();
};

// ✅ CORS configuration for production
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'https://zealous-river-09541d21e.1.azurestaticapps.net'
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
};

// ✅ Audit logging middleware
const auditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log after response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log important operations
    if (req.method !== 'GET' || res.statusCode >= 400) {
      console.log('📝 Audit Log:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        user: req.user?.id || 'anonymous',
      });
    }
  });
  
  next();
};

// ✅ Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
};

// ✅ Request size limits
const requestSizeLimits = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: true }
};

// ✅ Timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      console.error('⏱️ Request timeout:', {
        path: req.path,
        method: req.method,
        timeout: timeoutMs
      });
      
      res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long to process'
      });
    });
    
    next();
  };
};

module.exports = {
  rateLimiters,
  helmetConfig,
  sanitizeInput,
  validateRequest,
  corsOptions,
  auditLog,
  errorHandler,
  requestSizeLimits,
  requestTimeout
};