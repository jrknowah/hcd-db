// middleware/auditTrail.cjs
// Writes one audit row per API request once the response is sent: who (from the
// token, see requireApiAuth), what (VIEW/CREATE/UPDATE/DELETE), which route, which
// client/record, and whether it succeeded. Requests rejected by the auth gate are
// recorded as ACCESS_DENIED.
//
// HIPAA: only identifiers and route patterns are recorded — never request bodies,
// query strings, or field values. Writes record the NAMES of submitted fields; routes
// that diff against the stored record report the names that actually changed via
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

// Field names only — never values. Top level plus one level into plain objects
// (forms often nest sections). Keys that don't look like field names are skipped,
// since some payloads key objects by data.
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const MAX_FIELDS = 200;
const IGNORED_FIELDS = new Set(['clientID']);

function submittedFieldNames(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  const names = [];
  Object.entries(body).forEach(([key, value]) => {
    if (!FIELD_NAME.test(key) || IGNORED_FIELDS.has(key)) return;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const nested = Object.keys(value).filter((k) => FIELD_NAME.test(k));
      if (nested.length) {
        nested.forEach((k) => names.push(`${key}.${k}`));
        return;
      }
    }
    names.push(key);
  });
  return names.slice(0, MAX_FIELDS);
}

function auditTrail(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();

  const action = ACTIONS[req.method];
  if (!action || req.originalUrl.startsWith('/api/health')) return next();
  const selfAudited = SKIP_PREFIXES.some((p) => req.originalUrl.startsWith(p));

  res.on('finish', () => {
    const base = {
      ...actorFrom(req),
      ip: req.ip,
      userAgent: (req.get('user-agent') || '').slice(0, 500),
    };

    // Rejected by the auth gate or an admin check before reaching a route.
    if (!req.route && (res.statusCode === 401 || res.statusCode === 403)) {
      // Only the first path segment — later segments can be file names.
      const area = `/api/${(req.originalUrl.split('?')[0].split('/')[2] || '').slice(0, 64)}`;
      writeAuditEntry({
        ...base,
        action: 'ACCESS_DENIED',
        resourceType: area,
        success: false,
        details: { method: req.method, route: area, status: res.statusCode },
      }).catch((err) => console.error('⚠️  Failed to write audit entry:', err.message));
      return;
    }

    // Unmatched routes (404s from no handler) aren't user activity on a resource.
    if (!req.route || selfAudited) return;

    const routePattern = `${req.baseUrl || ''}${req.route.path}`;
    const clientID = pickClientId(req, res);
    const success = res.statusCode < 400;
    const isWrite = action !== 'VIEW';

    // Routes that compare against the stored record report exactly what changed;
    // for the rest, record which fields were submitted.
    const changedFields = res.locals.auditChangedFields;
    const submittedFields = isWrite && !changedFields ? submittedFieldNames(req.body) : [];

    writeAuditEntry({
      ...base,
      action: res.locals.auditAction || action,
      resourceType: routePattern,
      resourceId: pickResourceId(req.params) || clientID,
      clientId: clientID,
      success,
      details: {
        method: req.method,
        route: routePattern,
        status: res.statusCode,
        ...(clientID && { clientID }),
        ...(changedFields && { changedFields }),
        ...(submittedFields.length && { submittedFields }),
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
