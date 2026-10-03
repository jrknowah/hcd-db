// middleware/auth.js - Backend Authentication Middleware
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { verifySignedRequest } = require('../services/signedUrl.cjs');
const TENANT_ID = '2fca3a49-cd1a-4717-bccc-5dbd1ea86b64';
const APP_CLIENT_ID = '0b3e6463-bea7-4521-a36a-a32edb6af7a1';
const groups = require('../config/groups.json');
// HOPE_it — the group the frontend maps to IT_ADMIN (config/groupConfig.js).
// Roles are assigned by group membership, so this is what makes IT staff admins.
const IT_ADMIN_GROUP_ID = groups.groupIds.HOPE_it;
const ADMIN_GROUP_IDS = [IT_ADMIN_GROUP_ID, process.env.ADMIN_GROUP_ID].filter(Boolean);
// Group ID -> app role, for the groups that may use the app at all (config/groups.json).
const ROLE_BY_GROUP_ID = Object.fromEntries(
  Object.entries(groups.roleGroups).map(([name, role]) => [groups.groupIds[name], role])
);

// Development shortcuts (dev-bypass-token, mock auth) only when explicitly in
// development or test. App Service doesn't set NODE_ENV, so an unset value must
// behave like production.
const IS_DEV_OR_TEST = ['development', 'test'].includes(process.env.NODE_ENV);

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

const USE_MOCK_AUTH = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true';

const DEV_USER = {
  email: 'dev@example.com',
  name: 'Development User',
  userId: 'dev-user-id',
  roles: ['user'],
  groups: [],
  appRoles: ['LEVEL1'],
  isAdmin: false
};

// Verifies an ID token and resolves to the req.user shape.
function verifyToken(token) {
  if (token === 'dev-bypass-token' && IS_DEV_OR_TEST) {
    return Promise.resolve({ ...DEV_USER });
  }

  // ID tokens have audience = your app's client ID.
  // Access tokens for Graph have audience = 00000003-... and a nonce
  // that prevents server-side signature verification — don't use those.
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: APP_CLIENT_ID,
      issuer: [
        `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
        `https://sts.windows.net/${TENANT_ID}/`,
      ],
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) return reject(err);

      const tokenGroups = decoded.groups || [];
      resolve({
        userId:   decoded.sub || decoded.oid,
        email:    decoded.email || decoded.preferred_username || decoded.upn || decoded.unique_name,
        name:     decoded.name,
        roles:    decoded.roles  || [],
        groups:   tokenGroups,
        appRoles: [...new Set(tokenGroups.map(g => ROLE_BY_GROUP_ID[g]).filter(Boolean))],
        // Entra omits the groups claim when a user is in too many groups ("overage").
        groupsOverage: Boolean(decoded._claim_names?.groups),
        tenantId: decoded.tid,
        isAdmin:  (decoded.roles  || []).includes('Admin') ||
                  (decoded.roles  || []).includes('ITAdmin') ||
                  (decoded.groups || []).some(g => ADMIN_GROUP_IDS.includes(g)) ||
                  (decoded.wids   || []).includes('62e90394-69f5-4237-9190-012177145e10'),
      });
    });
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

    try {
      req.user = await verifyToken(token);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV !== 'production' ? err.message : undefined
      });
    }

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Paths under /api reachable without signing in: health probes, and logout (a
// no-op that must still work after the session has expired).
const PUBLIC_API_PATHS = ['/api/health', '/api/auth/logout'];

// Only members of a group in config/groups.json (or admins) may use the API.
const requireAllowedGroup = (req, res, next) => {
  const u = req.user || {};
  if (u.viaSignedUrl || u.isAdmin || (u.appRoles || []).length) return next();

  if (u.groupsOverage) {
    return res.status(403).json({
      error: 'Your account is in too many groups for sign-in to list them. Ask IT to assign access via app roles.',
      code: 'GROUPS_OVERAGE'
    });
  }
  return res.status(403).json({
    error: 'Your account is not in a group that has access to this application',
    code: 'NOT_IN_ALLOWED_GROUP'
  });
};

// Gate for every /api route: a valid token from a member of an allowed group, or a
// signed short-lived link (see services/signedUrl.cjs) for GETs the browser opens
// directly — those are only issued to users who already passed this gate.
const requireApiAuth = (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (PUBLIC_API_PATHS.some((p) => req.originalUrl.startsWith(p))) return next();
  if (USE_MOCK_AUTH) return mockAuthMiddleware(req, res, next);

  if (req.method === 'GET') {
    const signedBy = verifySignedRequest(req);
    if (signedBy) {
      req.user = { email: signedBy, viaSignedUrl: true, roles: [], groups: [], isAdmin: false };
      return next();
    }
  }

  return authMiddleware(req, res, () => requireAllowedGroup(req, res, next));
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

module.exports = USE_MOCK_AUTH
  ? mockAuthMiddleware
  : authMiddleware;

module.exports.requireRole  = requireRole;
module.exports.requireApiAuth = requireApiAuth;
module.exports.requireAdmin = requireAdmin;
module.exports.mockAuth     = mockAuthMiddleware;