// middleware/requireAdmin.cjs
const jwt = require('jsonwebtoken');

/**
 * Requires the authenticated user to have the ITAdmin app role.
 * Must run AFTER your existing auth middleware that decodes the idToken
 * and attaches it to req.user (or wherever you put it).
 */
function requireAdmin(req, res, next) {
  try {
    // Adjust this to match how your existing auth middleware exposes claims.
    // If you decode fresh here instead, pull from Authorization header.
    const roles = req.user?.roles || req.tokenClaims?.roles || [];

    if (!Array.isArray(roles) || !roles.includes('ITAdmin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'ITAdmin role required'
      });
    }

    next();
  } catch (err) {
    console.error('[requireAdmin] error checking role:', err);
    return res.status(403).json({ error: 'Forbidden' });
  }
}

module.exports = { requireAdmin };