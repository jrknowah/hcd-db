// middleware/auditTrail.cjs
// Writes one audit row per API request once the response is sent: who (from the
// token, see optionalAuth), what (VIEW/CREATE/UPDATE/DELETE), which route, which
// client/record, and whether it succeeded.
//
// HIPAA: only identifiers and route patterns are recorded — never request bodies,
// query strings, or field values. Routes may add the NAMES of changed fields via
// recordChangedFields(res, [...]).

const { writeAuditEntry, actorFrom } = require('../services/auditLog.cjs');

const ACTIONS = {
  GET: 'VIEW',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// Routes that are not user activity, or that write their own richer audit rows.
const SKIP_PREFIXES = ['/api/health', '/api/admin/audit'];

const MAX_ID_LENGTH = 255;

/** Lets a route attach the names (never values) of the fields it changed. */
function recordChangedFields(res, fields) {
  const names = [...new Set((fields || []).filter((f) => typeof f === 'string' && f))];
  if (names.length) res.locals.auditChangedFields = names;
}

// Normalizes DB and request values so unchanged fields compare equal
// (dates arrive as Date from SQL but as 'YYYY-MM-DD' strings from the UI).
function comparable(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  const s = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}T/.test(s) ? s.slice(0, 10) : s;
}

// Names of the submitted columns whose value differs from the stored row.
function changedColumns(before, updates, columns) {
  const stored = {};
  Object.entries(before || {}).forEach(([k, v]) => { stored[k.toLowerCase()] = v; });
  return columns.filter((col) => comparable(stored[col.toLowerCase()]) !== comparable(updates[col]));
}

function scalarId(value) {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string' || !value) return null;
  return value.slice(0, MAX_ID_LENGTH);
}

// Only params named like IDs — others (fileName, blobPath) can contain PHI.
function pickResourceId(params) {
  const key = Object.keys(params || {}).find((k) => /id$/i.test(k) && k !== 'clientID');
  return key ? scalarId(params[key]) : null;
}

function pickClientId(req, res) {
  return (
    scalarId(res.locals.auditClientId) ||
    scalarId(req.params?.clientID) ||
    scalarId(req.body?.clientID) ||
    scalarId(req.query?.clientID)
  );
}

function auditTrail(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  const action = ACTIONS[req.method];
  if (!action || SKIP_PREFIXES.some((p) => req.originalUrl.startsWith(p))) return next();

  res.on('finish', () => {
    // Unmatched routes (404s from no handler) aren't user activity on a resource.
    if (!req.route) return;

    const routePattern = `${req.baseUrl || ''}${req.route.path}`;
    const clientID = pickClientId(req, res);
    const success = res.statusCode < 400;

    writeAuditEntry({
      ...actorFrom(req),
      action: res.locals.auditAction || action,
      resourceType: routePattern,
      resourceId: pickResourceId(req.params) || clientID,
      clientId: clientID,
      ip: req.ip,
      userAgent: (req.get('user-agent') || '').slice(0, 500),
      success,
      details: {
        method: req.method,
        route: routePattern,
        status: res.statusCode,
        ...(clientID && { clientID }),
        ...(res.locals.auditChangedFields && { changedFields: res.locals.auditChangedFields }),
      },
    }).catch((err) => {
      console.error('⚠️  Failed to write audit entry:', err.message);
    });
  });

  next();
}

module.exports = auditTrail;
module.exports.recordChangedFields = recordChangedFields;
module.exports.changedColumns = changedColumns;
