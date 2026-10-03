// services/auditLog.cjs
// Shared reader/writer for the audit table, used by the request audit middleware
// (middleware/auditTrail.cjs) and the Admin > Audit Trail router (routes/admin/audit.cjs).
//
// HIPAA: callers must only pass identifiers and metadata (user, action, route, IDs,
// changed field NAMES). Never pass field values — the audit log must not hold PHI.

const sql = require('mssql');

// Required lazily: loading azureSql.js opens a connection, which test mode avoids.
const getPool = () => require('../store/azureSql.js').getPool();

// The app writes audit rows to dbo.AuditLog (userID, action, tableName, recordID,
// newValues, timestamp — see routes/clientExport.js). Rather than hardcode a
// column list that drifts from the real table, resolve the table and columns
// from INFORMATION_SCHEMA once and degrade gracefully when a column is absent.
const TABLE_CANDIDATES = ['AuditLog', 'UserActionLog'];

// Logical field -> candidate physical column names (matched case-insensitively).
const COLUMN_CANDIDATES = {
  id: ['auditID', 'AuditLogID', 'LogID', 'ID'],
  userId: ['userID'],
  userName: ['userName', 'performedBy'],
  action: ['action', 'ActionType'],
  resourceType: ['ResourceType', 'tableName'],
  resourceId: ['ResourceID', 'recordID'],
  clientId: ['clientID'],
  timestamp: ['timestamp', 'createdAt', 'createdDate'],
  ip: ['IPAddress'],
  userAgent: ['userAgent'],
  success: ['success'],
  details: ['newValues', 'details'],
};

// Tables without a success column mark failures with this action suffix.
const FAILED_SUFFIX = '_FAILED';
// Already a failure by name; no suffix needed.
const ACCESS_DENIED = 'ACCESS_DENIED';

const INT_TYPES = new Set(['int', 'bigint', 'smallint', 'tinyint']);

const quote = (name) => `[${String(name).replace(/]/g, ']]')}]`;

let schemaPromise = null;

async function loadSchema() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME IN (${TABLE_CANDIDATES.map((t) => `'${t}'`).join(', ')})
  `);

  const byTable = {};
  result.recordset.forEach((r) => {
    (byTable[r.TABLE_NAME.toLowerCase()] ||= []).push(r);
  });

  const tableName = TABLE_CANDIDATES.find((t) => byTable[t.toLowerCase()]);
  if (!tableName) {
    throw new Error(`No audit table found (looked for dbo.${TABLE_CANDIDATES.join(', dbo.')})`);
  }

  const columns = byTable[tableName.toLowerCase()];
  const cols = {};
  const types = {};
  const maxLengths = {};
  Object.entries(COLUMN_CANDIDATES).forEach(([key, names]) => {
    const match = names
      .map((n) => columns.find((c) => c.COLUMN_NAME.toLowerCase() === n.toLowerCase()))
      .find(Boolean);
    cols[key] = match ? quote(match.COLUMN_NAME) : null;
    types[key] = match ? match.DATA_TYPE.toLowerCase() : null;
    // -1 is NVARCHAR(MAX); null for non-character types.
    maxLengths[key] = match && match.CHARACTER_MAXIMUM_LENGTH > 0 ? match.CHARACTER_MAXIMUM_LENGTH : null;
  });

  if (!cols.timestamp) throw new Error(`dbo.${tableName} has no timestamp column`);

  return { table: `dbo.${quote(tableName)}`, cols, types, maxLengths };
}

/** Cached schema lookup; a failed lookup is retried on the next call. */
function getSchema() {
  if (!schemaPromise) {
    schemaPromise = loadSchema().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

/**
 * Read-side SQL expressions per logical field (null when unavailable).
 * Tables without a clientID column carry it in the JSON details (written by
 * middleware/auditTrail.cjs) or, for client-level rows, in the record ID.
 */
function readExprs(S) {
  const out = { ...S.cols };
  if (!out.clientId) {
    const derived = [];
    if (S.cols.details) {
      derived.push(
        `CASE WHEN ISJSON(${S.cols.details}) = 1 THEN JSON_VALUE(${S.cols.details}, '$.clientID') END`
      );
    }
    if (S.cols.resourceType && S.cols.resourceId) {
      derived.push(`CASE WHEN ${S.cols.resourceType} = 'Clients' THEN ${S.cols.resourceId} END`);
    }
    if (derived.length === 1) out.clientId = derived[0];
    else if (derived.length > 1) out.clientId = `COALESCE(${derived.join(', ')})`;
  }
  return out;
}

/** SQL expression for whether a row records a successful action. */
function successExpr(S) {
  if (S.cols.success) return S.cols.success;
  if (S.cols.action) {
    return `CAST(CASE WHEN ${S.cols.action} LIKE '%[_]FAILED' OR ${S.cols.action} = '${ACCESS_DENIED}' THEN 0 ELSE 1 END AS BIT)`;
  }
  return 'CAST(1 AS BIT)';
}

function fit(S, key, value) {
  if (value === null || value === undefined) return null;
  const s = String(value);
  const max = S.maxLengths[key];
  return max && s.length > max ? s.slice(0, max) : s;
}

/**
 * Inserts one audit row, writing only the columns the table has.
 * entry: { userId, userName, action, resourceType, resourceId, clientId, ip,
 *          userAgent, success, details }
 * Throws on failure — callers decide whether that's fatal (it never should be).
 */
async function writeAuditEntry(entry) {
  const S = await getSchema();
  const pool = await getPool();
  const request = pool.request();

  let action = entry.action;
  if (entry.success === false && !S.cols.success && action && !action.endsWith(FAILED_SUFFIX)
      && action !== ACCESS_DENIED) {
    action += FAILED_SUFFIX;
  }

  const values = {
    userId: entry.userId,
    userName: entry.userName,
    action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    clientId: entry.clientId,
    ip: entry.ip,
    userAgent: entry.userAgent,
    details: entry.details ? JSON.stringify(entry.details) : null,
  };

  const columns = [];
  const params = [];
  Object.entries(values).forEach(([key, value]) => {
    if (!S.cols[key] || value === null || value === undefined) return;
    request.input(key, sql.NVarChar, fit(S, key, value));
    columns.push(S.cols[key]);
    params.push(`@${key}`);
  });

  columns.push(S.cols.timestamp);
  params.push('SYSUTCDATETIME()');
  if (S.cols.success) {
    columns.push(S.cols.success);
    params.push(entry.success === false ? '0' : '1');
  }

  await request.query(`
    INSERT INTO ${S.table} (${columns.join(', ')})
    VALUES (${params.join(', ')})
  `);
}

/** Who is acting, from the token set by middleware/auth.js. Email matches clientExport.js rows. */
function actorFrom(req) {
  const u = req.user || {};
  return {
    userId: u.email || u.userId || u.oid || u.sub || 'anonymous',
    userName: u.name || null,
  };
}

module.exports = {
  getSchema,
  readExprs,
  writeAuditEntry,
  successExpr,
  actorFrom,
  INT_TYPES,
};
