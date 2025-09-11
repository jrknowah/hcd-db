// middleware/auth.js - Backend Authentication Middleware
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for Azure AD token validation
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  requestHeaders: {}, // Default headers
  timeout: 30000, // Defaults to 30s
});

// Get signing key from Azure AD
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authorization header is required',
        code: 'NO_AUTH_HEADER'
      });
    }

    const token = authHeader.split(' ')[1]; // Remove "Bearer " prefix
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token is required',
        code: 'NO_TOKEN'
      });
    }

    // For development/testing - allow bypass with specific token
    if (process.env.NODE_ENV === 'development' && token === 'dev-bypass-token') {
      req.user = {
        email: 'dev@example.com',
        name: 'Development User',
        userId: 'dev-user-id',
        roles: ['user'],
        isAdmin: false
      };
      return next();
    }

    // Verify JWT token with Azure AD
    jwt.verify(token, getKey, {
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      // Extract user information from token
      const user = {
        userId: decoded.sub || decoded.oid,
        email: decoded.email || decoded.preferred_username,
        name: decoded.name,
        roles: decoded.roles || [],
        groups: decoded.groups || [],
        tenantId: decoded.tid,
        isAdmin: (decoded.roles || []).includes('Admin') || (decoded.groups || []).includes(process.env.ADMIN_GROUP_ID)
      };

      // Attach user to request object
      req.user = user;
      next();
    });

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional: Role-based authorization middleware
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRoles = req.user.roles || [];
    if (!userRoles.includes(requiredRole) && !req.user.isAdmin) {
      return res.status(403).json({ 
        error: `Role '${requiredRole}' required`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Mock auth for development (use with caution)
const mockAuthMiddleware = (req, res, next) => {
  console.warn('🚨 Using mock authentication - NOT for production!');
  
  req.user = {
    userId: 'mock-user-id',
    email: req.headers['x-mock-user-email'] || 'mockuser@example.com',
    name: req.headers['x-mock-user-name'] || 'Mock User',
    roles: req.headers['x-mock-user-roles']?.split(',') || ['user'],
    groups: req.headers['x-mock-user-groups']?.split(',') || [],
    isAdmin: req.headers['x-mock-user-admin'] === 'true',
    tenantId: 'mock-tenant-id'
  };
  
  next();
};

// Export based on environment
module.exports = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true' 
  ? mockAuthMiddleware 
  : authMiddleware;

// Export additional middleware
module.exports.requireRole = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.mockAuth = mockAuthMiddleware;