// middleware/auth.js - Backend Authentication Middleware
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
// Tenant, app registration and groups come from config/orgs/<ORG>.json;
// AUTH_TENANT_ID / AUTH_CLIENT_ID app settings override the first two.
const { TENANT_ID, CLIENT_ID: APP_CLIENT_ID, group } = require('../config/orgConfig.cjs');
// HOPE_it — the group the frontend maps to IT_ADMIN (config/groupConfig.js).
// Roles are assigned by group membership, so this is what makes IT staff admins.
const IT_ADMIN_GROUP_ID = group('HOPE_it');
const ADMIN_GROUP_IDS = [IT_ADMIN_GROUP_ID, process.env.ADMIN_GROUP_ID].filter(Boolean);

// ID tokens are signed with tenant-specific keys.
// We use the tenant JWKS endpoint — ID tokens do not have a nonce
// in the header so jwks-rsa can verify them normally.
const jwks = jwksClient({
  // jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  requestHeaders: {},
  timeout: 30000,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    callback(null, key.publicKey || key.rsaPublicKey);
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

    // ID tokens have audience = your app's client ID.
    // Access tokens for Graph have audience = 00000003-... and a nonce
    // that prevents server-side signature verification — don't use those.
jwt.verify(token, getKey, {
  audience: APP_CLIENT_ID,
  issuer: [
    `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
    `https://sts.windows.net/${TENANT_ID}/`,
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
                  (decoded.roles  || []).includes('ITAdmin') ||
                  (decoded.groups || []).some(g => ADMIN_GROUP_IDS.includes(g)) ||
                  (decoded.wids   || []).includes('62e90394-69f5-4237-9190-012177145e10'),
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

// Sets req.user when the request carries a valid sign-in token, and otherwise
// lets it through unchanged: never answers 401. Used so the audit trail can
// name the person behind requests on routes that do not require sign-in.
const identifyUser = (req, res, next) => {
  if (req.user || !req.headers.authorization) return next();
  let done = false;
  const proceed = () => { if (!done) { done = true; next(); } };
  const quiet = { status: () => ({ json: proceed }) };
  try {
    module.exports(req, quiet, proceed);
  } catch {
    proceed();
  }
};

module.exports.identifyUser = identifyUser;
module.exports.requireRole  = requireRole;
module.exports.requireAdmin = requireAdmin;
module.exports.mockAuth     = mockAuthMiddleware;