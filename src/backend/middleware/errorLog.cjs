// middleware/errorLog.cjs
// Records every server-side failure (HTTP 5xx) under /api in dbo.SystemErrors, which
// Admin > System Errors reads (routes/admin/errors.cjs).
//
// HIPAA: error messages can contain patient data (SQL errors quote the offending
// value, and some routes return err.message). Only the route pattern, method, status,
// error type and stack trace (code locations, not data) are stored — never message text.

const sql = require('mssql');
const { actorFrom } = require('../services/auditLog.cjs');

// Required lazily: loading azureSql.js opens a connection, which test mode avoids.
const getPool = () => require('../store/azureSql.js').getPool();

const MAX_STACK = 4000;

/** Lets the Express error handler attach the thrown error before responding. */
function noteError(res, err) {
  if (!err) return;
  res.locals.systemError = {
    code: String(err.code || err.name || 'Error').slice(0, 100),
    // Stack frames only; the first line repeats the message, so drop it.
    stack: typeof err.stack === 'string'
      ? err.stack.split('\n').filter((l) => /^\s+at /.test(l)).join('\n').slice(0, MAX_STACK)
      : null,
  };
}

function routeOf(req) {
  if (req.route) return `${req.baseUrl || ''}${req.route.path}`;
  // Unmatched: only the first segment, since later ones can be file names.
  return `/api/${(req.originalUrl.split('?')[0].split('/')[2] || '').slice(0, 64)}`;
}

function clientIdOf(req) {
  const id = req.params?.clientID || req.body?.clientID || req.query?.clientID;
  return typeof id === 'string' || typeof id === 'number' ? String(id).slice(0, 255) : null;
}

async function writeSystemError(req, res) {
  const noted = res.locals.systemError || {};
  const route = routeOf(req);
  const pool = await getPool();
  await pool.request()
    .input('severity', sql.NVarChar(20), 'error')
    .input('source', sql.NVarChar(50), 'api')
    .input('route', sql.NVarChar(500), route)
    .input('method', sql.NVarChar(10), req.method)
    .input('errorCode', sql.NVarChar(100), noted.code || `HTTP_${res.statusCode}`)
    .input('message', sql.NVarChar(sql.MAX), `${req.method} ${route} failed with HTTP ${res.statusCode}`)
    .input('stackTrace', sql.NVarChar(sql.MAX), noted.stack || null)
    .input('userId', sql.NVarChar(255), actorFrom(req).userId)
    .input('clientId', sql.NVarChar(255), clientIdOf(req))
    .query(`
      INSERT INTO dbo.SystemErrors
        (Timestamp, Severity, Source, Route, Method, ErrorCode, Message, StackTrace, UserID, ClientID, Resolved)
      VALUES
        (SYSUTCDATETIME(), @severity, @source, @route, @method, @errorCode, @message, @stackTrace, @userId, @clientId, 0)
    `);
}

function errorLog(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  res.on('finish', () => {
    if (res.statusCode < 500) return;
    writeSystemError(req, res).catch((err) => {
      console.error('⚠️  Failed to record system error:', err.message);
    });
  });

  next();
}

module.exports = errorLog;
module.exports.noteError = noteError;
