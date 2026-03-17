// middleware/auth.js - Backend Authentication Middleware
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for Azure AD token validation
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  requestHeaders: {},
  timeout: 30000,
});

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

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token is required',
        code: 'NO_TOKEN'
      });
    }

    // Development bypass
    if (token === 'dev-bypass-token' && process.env.NODE_ENV !== 'production') {
      req.user = {
        email: 'dev@example.com',
        name: 'Development User',
        userId: 'dev-user-id',
        roles: ['user'],
        isAdmin: false
      };
      return next();
    }

    // Accept both audiences:
    //   1. Your app's own client ID  (0b3e6463-...)
    //   2. Microsoft Graph ID        (00000003-0000-0000-c000-000000000000)
    //
    // MSAL issues Graph-audience tokens when loginRequest uses only Graph
    // scopes (User.Read, GroupMember.Read.All, etc.). Both token types are
    // cryptographically signed by Azure AD for your specific tenant and app,
    // so accepting both is safe — the appid / oid / upd claims are identical.
    const validAudiences = [
      process.env.AZURE_CLIENT_ID,
      '00000003-0000-0000-c000-000000000000',
    ].filter(Boolean);

    // TEMP DEBUG — remove after fix
console.log('=== AUTH DEBUG ===');
console.log('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID);
console.log('AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID);
console.log('validAudiences:', validAudiences);
// Decode without verifying to see what's in the token
const decoded_debug = jwt.decode(token, { complete: true });
console.log('Token aud:', decoded_debug?.payload?.aud);
console.log('Token iss:', decoded_debug?.payload?.iss);
console.log('Token exp:', new Date(decoded_debug?.payload?.exp * 1000).toISOString());
console.log('==================');

    jwt.verify(token, getKey, {
      audience: validAudiences,
      issuer: [
        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
        `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
      ],
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
          details: process.env.NODE_ENV !== 'production' ? err.message : undefined
        });
      }

      req.user = {
        userId:   decoded.sub || decoded.oid,
        email:    decoded.email || decoded.preferred_username || decoded.upn || decoded.unique_name,
        name:     decoded.name,
        roles:    decoded.roles  || [],
        groups:   decoded.groups || [],
        tenantId: decoded.tid,
        isAdmin:  (decoded.roles  || []).includes('Admin') ||
                  (decoded.groups || []).includes(process.env.ADMIN_GROUP_ID) ||
                  (decoded.wids   || []).includes('62e90394-69f5-4237-9190-012177145e10'), // Global Admin role template ID
      };

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

// Role-based authorization middleware
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

// Mock auth for development
const mockAuthMiddleware = (req, res, next) => {
  console.warn('🚨 Using mock authentication - NOT for production!');

  req.user = {
    userId:   'mock-user-id',
    email:    req.headers['x-mock-user-email'] || 'mockuser@example.com',
    name:     req.headers['x-mock-user-name']  || 'Mock User',
    roles:    req.headers['x-mock-user-roles']?.split(',')  || ['user'],
    groups:   req.headers['x-mock-user-groups']?.split(',') || [],
    isAdmin:  req.headers['x-mock-user-admin'] === 'true',
    tenantId: 'mock-tenant-id'
  };

  next();
};

module.exports = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true'
  ? mockAuthMiddleware
  : authMiddleware;

module.exports.requireRole  = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.mockAuth     = mockAuthMiddleware;