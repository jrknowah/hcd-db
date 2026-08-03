// routes/admin/audit.cjs
// Admin > Audit Trail. Mounted at /api/admin/audit behind authMiddleware + requireAdmin.
//
// HIPAA notes:
//   - This router NEVER returns PHI values. Only resource references (IDs) and action metadata.
//   - Reading the audit log is itself an auditable event; every list/detail/export call
//     writes its own UserActionLog row (see recordAuditAccess below).
//   - Export is capped and logged with the applied filter set.

const express = require('express');
const sql = require('mssql');
const { getPool } = require('../../store/azureSql.js');

const router = express.Router();

// ---------------------------------------------------------------------------
// SCHEMA MAP — the only place to change if UserActionLog column names differ.
// ---------------------------------------------------------------------------
const T = {
  table: 'dbo.UserActionLog',
  id: 'LogID',
  userId: 'UserID',
  userName: 'UserName',
  action: 'ActionType',
  resourceType: 'ResourceType',
  resourceId: 'ResourceID',
  clientId: 'ClientID',
  timestamp: 'Timestamp',
  ip: 'IPAddress',
  userAgent: 'UserAgent',
  success: 'Success',
};

// Whitelisted sort columns — never interpolate raw user input into ORDER BY.
const SORTABLE = {
  timestamp: T.timestamp,
  userId: T.userId,
  action: T.action,
  resourceType: T.resourceType,
  clientId: T.clientId,
};

const MAX_PAGE_SIZE = 200;
const MAX_EXPORT_ROWS = 50000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function actorFrom(req) {
  return {
    userId: req.user?.oid || req.user?.sub || req.user?.userID || 'unknown',
    userName: req.user?.name || req.user?.preferred_username || null,
  };
}

/**
 * Writes an audit row for the act of reading the audit log.
 * Fire-and-forget: a logging failure must never break the read path.
 */
async function recordAuditAccess(req, action, resourceId) {
  try {
    const pool = await getPool();
    const actor = actorFrom(req);
    await pool
      .request()
      .input('userId', sql.NVarChar(255), actor.userId)
      .input('userName', sql.NVarChar(255), actor.userName)
      .input('action', sql.NVarChar(100), action)
      .input('resourceType', sql.NVarChar(100), 'AuditLog')
      .input('resourceId', sql.NVarChar(255), resourceId || null)
      .input('ip', sql.NVarChar(64), req.ip || null)
      .input('userAgent', sql.NVarChar(500), (req.get('user-agent') || '').slice(0, 500))
      .query(`
        INSERT INTO ${T.table}
          (${T.userId}, ${T.userName}, ${T.action}, ${T.resourceType}, ${T.resourceId},
           ${T.timestamp}, ${T.ip}, ${T.userAgent}, ${T.success})
        VALUES
          (@userId, @userName, @action, @resourceType, @resourceId,
           SYSUTCDATETIME(), @ip, @userAgent, 1)
      `);
  } catch (err) {
    console.error('⚠️  Failed to record audit-log access:', err.message);
  }
}

/**
 * Builds the shared WHERE clause + bound parameters from query filters.
 * Returns { where, bind } where bind(request) attaches every input.
 */
function buildFilters(q) {
  const clauses = [];
  const params = [];

  const add = (clause, name, type, value) => {
    clauses.push(clause);
    params.push({ name, type, value });
  };

  if (q.userID) add(`${T.userId} = @userID`, 'userID', sql.NVarChar(255), q.userID);
  if (q.action) add(`${T.action} = @action`, 'action', sql.NVarChar(100), q.action);
  if (q.resourceType)
    add(`${T.resourceType} = @resourceType`, 'resourceType', sql.NVarChar(100), q.resourceType);
  if (q.resourceID)
    add(`${T.resourceId} = @resourceID`, 'resourceID', sql.NVarChar(255), q.resourceID);
  if (q.clientID) add(`${T.clientId} = @clientID`, 'clientID', sql.NVarChar(255), q.clientID);
  if (q.startDate)
    add(`${T.timestamp} >= @startDate`, 'startDate', sql.DateTime2, new Date(q.startDate));
  if (q.endDate) add(`${T.timestamp} < @endDate`, 'endDate', sql.DateTime2, new Date(q.endDate));
  if (q.success === 'true' || q.success === 'false')
    add(`${T.success} = @success`, 'success', sql.Bit, q.success === 'true' ? 1 : 0);

  // Free-text search across non-PHI metadata columns only.
  if (q.search) {
    clauses.push(`(
      ${T.userName} LIKE @search OR
      ${T.userId} LIKE @search OR
      ${T.action} LIKE @search OR
      ${T.resourceType} LIKE @search
    )`);
    params.push({ name: 'search', type: sql.NVarChar(255), value: `%${q.search}%` });
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    bind: (request) => {
      params.forEach((p) => request.input(p.name, p.type, p.value));
      return request;
    },
  };
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
// SPECIFIC ROUTES FIRST — these must precede /:logID or the catch-all shadows them.
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/audit/filters
 * Distinct values for the filter dropdowns.
 */
router.get('/filters', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT ${T.action} AS value, 'action' AS kind
        FROM ${T.table} WHERE ${T.action} IS NOT NULL
      UNION ALL
      SELECT DISTINCT ${T.resourceType} AS value, 'resourceType' AS kind
        FROM ${T.table} WHERE ${T.resourceType} IS NOT NULL
      UNION ALL
      SELECT DISTINCT CAST(${T.userId} AS NVARCHAR(255)) AS value, 'userID' AS kind
        FROM ${T.table} WHERE ${T.userId} IS NOT NULL
    `);

    const out = { actions: [], resourceTypes: [], userIDs: [] };
    const bucket = { action: 'actions', resourceType: 'resourceTypes', userID: 'userIDs' };
    result.recordset.forEach((r) => {
      const key = bucket[r.kind];
      if (key && r.value) out[key].push(r.value);
    });
    Object.values(out).forEach((arr) => arr.sort());

    res.json(out);
  } catch (err) {
    console.error('❌ /audit/filters failed:', err);
    res.status(500).json({ error: 'Failed to load audit filters' });
  }
});

/**
 * GET /api/admin/audit/stats
 * Headline counters for the dashboard cards.
 */
router.get('/stats', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN ${T.timestamp} >= DATEADD(HOUR, -24, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS last24h,
        SUM(CASE WHEN ${T.timestamp} >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS last7d,
        SUM(CASE WHEN ${T.success} = 0 THEN 1 ELSE 0 END) AS failures,
        COUNT(DISTINCT ${T.userId}) AS distinctUsers,
        MIN(${T.timestamp}) AS oldestEntry
      FROM ${T.table}
    `);

    const topActions = await pool.request().query(`
      SELECT TOP 10 ${T.action} AS action, COUNT(*) AS count
      FROM ${T.table}
      WHERE ${T.timestamp} >= DATEADD(DAY, -30, SYSUTCDATETIME())
      GROUP BY ${T.action}
      ORDER BY COUNT(*) DESC
    `);

    const daily = await pool.request().query(`
      SELECT CAST(${T.timestamp} AS DATE) AS day, COUNT(*) AS count
      FROM ${T.table}
      WHERE ${T.timestamp} >= DATEADD(DAY, -30, SYSUTCDATETIME())
      GROUP BY CAST(${T.timestamp} AS DATE)
      ORDER BY day
    `);

    res.json({
      summary: result.recordset[0] || {},
      topActions: topActions.recordset,
      daily: daily.recordset,
    });
  } catch (err) {
    console.error('❌ /audit/stats failed:', err);
    res.status(500).json({ error: 'Failed to load audit stats' });
  }
});

/**
 * GET /api/admin/audit/export
 * CSV of the current filter set, capped at MAX_EXPORT_ROWS.
 */
router.get('/export', async (req, res) => {
  try {
    const pool = await getPool();
    const { where, bind } = buildFilters(req.query);

    const request = bind(pool.request());
    request.input('cap', sql.Int, MAX_EXPORT_ROWS);

    const result = await request.query(`
      SELECT TOP (@cap)
        ${T.id}           AS LogID,
        ${T.timestamp}    AS Timestamp,
        ${T.userId}       AS UserID,
        ${T.userName}     AS UserName,
        ${T.action}       AS Action,
        ${T.resourceType} AS ResourceType,
        ${T.resourceId}   AS ResourceID,
        ${T.clientId}     AS ClientID,
        ${T.ip}           AS IPAddress,
        ${T.success}      AS Success
      FROM ${T.table}
      ${where}
      ORDER BY ${T.timestamp} DESC
    `);

    const rows = result.recordset;
    const headers = [
      'LogID', 'Timestamp', 'UserID', 'UserName', 'Action',
      'ResourceType', 'ResourceID', 'ClientID', 'IPAddress', 'Success',
    ];

    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')),
    ].join('\r\n');

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${stamp}.csv"`);
    res.send('\uFEFF' + csv); // BOM so Excel reads UTF-8 correctly

    recordAuditAccess(req, 'AUDIT_LOG_EXPORT', `rows=${rows.length}`);
  } catch (err) {
    console.error('❌ /audit/export failed:', err);
    res.status(500).json({ error: 'Failed to export audit log' });
  }
});

/**
 * GET /api/admin/audit
 * Paginated, filtered, server-sorted list.
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    const offset = (page - 1) * pageSize;

    const sortCol = SORTABLE[req.query.sortBy] || T.timestamp;
    const sortDir = String(req.query.sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const pool = await getPool();
    const { where, bind } = buildFilters(req.query);

    const countResult = await bind(pool.request()).query(`
      SELECT COUNT(*) AS total FROM ${T.table} ${where}
    `);
    const total = countResult.recordset[0]?.total ?? 0;

    const request = bind(pool.request());
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    const result = await request.query(`
      SELECT
        ${T.id}           AS LogID,
        ${T.timestamp}    AS Timestamp,
        ${T.userId}       AS UserID,
        ${T.userName}     AS UserName,
        ${T.action}       AS Action,
        ${T.resourceType} AS ResourceType,
        ${T.resourceId}   AS ResourceID,
        ${T.clientId}     AS ClientID,
        ${T.ip}           AS IPAddress,
        ${T.success}      AS Success
      FROM ${T.table}
      ${where}
      ORDER BY ${sortCol} ${sortDir}, ${T.id} ${sortDir}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({ entries: result.recordset, total, page, pageSize });

    recordAuditAccess(req, 'AUDIT_LOG_VIEW', `page=${page};size=${pageSize}`);
  } catch (err) {
    console.error('❌ /audit list failed:', err);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

// ---------------------------------------------------------------------------
// PARAMETERIZED ROUTE LAST
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/audit/:logID
 */
router.get('/:logID', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('logID', sql.NVarChar(255), req.params.logID)
      .query(`
        SELECT
          ${T.id}           AS LogID,
          ${T.timestamp}    AS Timestamp,
          ${T.userId}       AS UserID,
          ${T.userName}     AS UserName,
          ${T.action}       AS Action,
          ${T.resourceType} AS ResourceType,
          ${T.resourceId}   AS ResourceID,
          ${T.clientId}     AS ClientID,
          ${T.ip}           AS IPAddress,
          ${T.userAgent}    AS UserAgent,
          ${T.success}      AS Success
        FROM ${T.table}
        WHERE ${T.id} = @logID
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Audit entry not found' });
    }

    res.json(result.recordset[0]);

    recordAuditAccess(req, 'AUDIT_LOG_DETAIL_VIEW', req.params.logID);
  } catch (err) {
    console.error('❌ /audit/:logID failed:', err);
    res.status(500).json({ error: 'Failed to load audit entry' });
  }
});

module.exports = router;
