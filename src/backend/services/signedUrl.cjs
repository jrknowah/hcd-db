// services/signedUrl.cjs
// Short-lived signed URLs for API endpoints the browser opens directly (window.open,
// <a href>), which can't carry an Authorization header. An authenticated endpoint
// signs the URL for the current user; middleware/auth.js requireApiAuth accepts a
// valid, unexpired signature in place of a token for that exact path.

const crypto = require('crypto');

const DEFAULT_TTL_SECONDS = 5 * 60;

// Set DOWNLOAD_URL_SECRET in App Service so links survive restarts and work across
// instances. Without it, a per-process key is used (links break on restart).
const SECRET = process.env.DOWNLOAD_URL_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.DOWNLOAD_URL_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  DOWNLOAD_URL_SECRET not set — signed download links use a per-process key');
}

function signature(pathname, exp, user) {
  return crypto.createHmac('sha256', SECRET).update(`${pathname}\n${exp}\n${user}`).digest('hex');
}

/**
 * Appends exp/u/sig to an absolute or root-relative API URL.
 * `user` is the identifier recorded in the audit log when the link is used.
 */
function signUrl(url, user, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const parsed = new URL(url, 'http://placeholder');
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const u = user || 'anonymous';
  parsed.searchParams.set('exp', String(exp));
  parsed.searchParams.set('u', u);
  parsed.searchParams.set('sig', signature(parsed.pathname, exp, u));
  return /^https?:\/\//i.test(url) ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
}

/** Returns the signing user if req carries a valid, unexpired signature for its path; else null. */
function verifySignedRequest(req) {
  const { exp, u, sig } = req.query || {};
  if (typeof exp !== 'string' || typeof u !== 'string' || typeof sig !== 'string') return null;
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return null;

  const pathname = new URL(req.originalUrl, 'http://placeholder').pathname;
  const expected = Buffer.from(signature(pathname, exp, u), 'hex');
  const given = Buffer.from(sig, 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  return u;
}

module.exports = { signUrl, verifySignedRequest };
