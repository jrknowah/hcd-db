// routes/admin/audit.cjs
// Admin > Audit Trail. Mounted at /api/admin/audit behind authMiddleware + requireAdmin.
//
// HIPAA notes:
//   - This router NEVER returns PHI values. Only resource references (IDs) and action metadata.
//   - Reading the audit log is itself an auditable event; every list/detail/export call
//     writes its own audit row (see recordAuditAccess below).
//   - Export is capped and logged with the applied filter set.

const express = require('express');
const sql = require('mssql');
const { getPool } = require('../../store/azureSql.js');
const {
  getSchema, readExprs, writeAuditEntry, successExpr, actorFrom, INT_TYPES,
} = require('../../services/auditLog.cjs');

const router = express.Router();

// Whitelisted sort keys -> logical fields. Never interpolate raw user input into ORDER BY.
const SORTABLE = {
  timestamp: 'timestamp',
  userId: 'userId',
  action: 'action',
  resourceType: 'resourceType',
  clientId: 'clientId',
};

const MAX_PAGE_SIZE = 200;
const MAX_EXPORT_ROWS = 50000;

/** SELECT expression for a logical field, NULL (or a default) when the column is absent. */
function sel(S, key, fallback = 'NULL') {
  return readExprs(S)[key] || fallback;
}

/** Column list shared by list/export/detail, aliased to the names the UI expects. */
function selectList(S, { includeDetail = false } = {}) {
  const fields = [
    `${sel(S, 'id')} AS LogID`,
    `${sel(S, 'timestamp')} AS Timestamp`,
    `${sel(S, 'userId')} AS UserID`,
    `${sel(S, 'userName')} AS UserName`,
    `${sel(S, 'action')} AS Action`,
    `${sel(S, 'resourceType')} AS ResourceType`,
    `${sel(S, 'resourceId')} AS ResourceID`,
    `${sel(S, 'clientId')} AS ClientID`,
    `${sel(S, 'ip')} AS IPAddress`,
  ];
  if (includeDetail) {
    fields.push(`${sel(S, 'userAgent')} AS UserAgent`);
    fields.push(`${sel(S, 'details')} AS Details`);
  }
  fields.push(`${successExpr(S)} AS Success`);
  return fields.join(',\n        ');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Writes an audit row for the act of reading the audit log.
 * Fire-and-forget: a logging failure must never break the read path.
 */
async function recordAuditAccess(req, action, resourceId) {
  try {
    await writeAuditEntry({
      ...actorFrom(req),
      action,
      resourceType: 'AuditLog',
      resourceId,
      ip: req.ip,
      userAgent: (req.get('user-agent') || '').slice(0, 500),
    });
  } catch (err) {
    console.error('⚠️  Failed to record audit-log access:', err.message);
  }
}

/**
 * Builds the shared WHERE clause + bound parameters from query filters.
 * Filters on columns the table doesn't have are ignored.
 * Returns { where, bind } where bind(request) attaches every input.
 */
function buildFilters(S, q) {
  const clauses = [];
  const params = [];
  const c = readExprs(S);

  const add = (key, op, name, type, value) => {
    if (!c[key]) return;
    clauses.push(`${c[key]} ${op} @${name}`);
    params.push({ name, type, value });
  };

  if (q.userID) add('userId', '=', 'userID', sql.NVarChar(255), q.userID);
  if (q.action) add('action', '=', 'action', sql.NVarChar(100), q.action);
  if (q.resourceType) add('resourceType', '=', 'resourceType', sql.NVarChar(100), q.resourceType);
  if (q.resourceID) add('resourceId', '=', 'resourceID', sql.NVarChar(255), q.resourceID);
  if (q.clientID) add('clientId', '=', 'clientID', sql.NVarChar(255), q.clientID);
  if (q.startDate) add('timestamp', '>=', 'startDate', sql.DateTime2, new Date(q.startDate));
  if (q.endDate) add('timestamp', '<', 'endDate', sql.DateTime2, new Date(q.endDate));
  if (q.success === 'true' || q.success === 'false') {
    clauses.push(`${successExpr(S)} = @success`);
    params.push({ name: 'success', type: sql.Bit, value: q.success === 'true' ? 1 : 0 });
  }

  // Free-text search across non-PHI metadata columns only.
  const searchCols = ['userName', 'userId', 'action', 'resourceType'].map((k) => c[k]).filter(Boolean);
  if (q.search && searchCols.length) {
    clauses.push(`(${searchCols.map((col) => `${col} LIKE @search`).join(' OR ')})`);
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
    const S = await getSchema();
    const pool = await getPool();

    const sources = [
      ['action', 'action'],
      ['resourceType', 'resourceType'],
      ['userId', 'userID'],
    ].filter(([key]) => S.cols[key]);

    const out = { actions: [], resourceTypes: [], userIDs: [] };

    if (sources.length) {
      const result = await pool.request().query(
        sources
          .map(([key, kind]) => `
            SELECT DISTINCT CAST(${S.cols[key]} AS NVARCHAR(255)) AS value, '${kind}' AS kind
              FROM ${S.table} WHERE ${S.cols[key]} IS NOT NULL`)
          .join('\n      UNION ALL')
      );

      const bucket = { action: 'actions', resourceType: 'resourceTypes', userID: 'userIDs' };
      result.recordset.forEach((r) => {
        const key = bucket[r.kind];
        if (key && r.value) out[key].push(r.value);
      });
      Object.values(out).forEach((arr) => arr.sort());
    }

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
    const S = await getSchema();
    const pool = await getPool();
    const ts = S.cols.timestamp;

    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN ${ts} >= DATEADD(HOUR, -24, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS last24h,
        SUM(CASE WHEN ${ts} >= DATEADD(DAY, -7, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS last7d,
        SUM(CASE WHEN ${successExpr(S)} = 0 THEN 1 ELSE 0 END) AS failures,
        ${S.cols.userId ? `COUNT(DISTINCT ${S.cols.userId})` : '0'} AS distinctUsers,
        MIN(${ts}) AS oldestEntry
      FROM ${S.table}
    `);

    const topActions = S.cols.action
      ? (await pool.request().query(`
          SELECT TOP 10 ${S.cols.action} AS action, COUNT(*) AS count
          FROM ${S.table}
          WHERE ${ts} >= DATEADD(DAY, -30, SYSUTCDATETIME())
          GROUP BY ${S.cols.action}
          ORDER BY COUNT(*) DESC
        `)).recordset
      : [];

    const daily = await pool.request().query(`
      SELECT CAST(${ts} AS DATE) AS day, COUNT(*) AS count
      FROM ${S.table}
      WHERE ${ts} >= DATEADD(DAY, -30, SYSUTCDATETIME())
      GROUP BY CAST(${ts} AS DATE)
      ORDER BY day
    `);

    res.json({
      summary: result.recordset[0] || {},
      topActions,
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
    const S = await getSchema();
    const pool = await getPool();
    const { where, bind } = buildFilters(S, req.query);

    const request = bind(pool.request());
    request.input('cap', sql.Int, MAX_EXPORT_ROWS);

    const result = await request.query(`
      SELECT TOP (@cap)
        ${selectList(S)}
      FROM ${S.table}
      ${where}
      ORDER BY ${S.cols.timestamp} DESC
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
    res.send('﻿' + csv); // BOM so Excel reads UTF-8 correctly

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

    const S = await getSchema();
    const sortCol = readExprs(S)[SORTABLE[req.query.sortBy]] || S.cols.timestamp;
    const sortDir = String(req.query.sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const tieBreak = S.cols.id && S.cols.id !== sortCol ? `, ${S.cols.id} ${sortDir}` : '';

    const pool = await getPool();
    const { where, bind } = buildFilters(S, req.query);

    const countResult = await bind(pool.request()).query(`
      SELECT COUNT(*) AS total FROM ${S.table} ${where}
    `);
    const total = countResult.recordset[0]?.total ?? 0;

    const request = bind(pool.request());
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    const result = await request.query(`
      SELECT
        ${selectList(S)}
      FROM ${S.table}
      ${where}
      ORDER BY ${sortCol} ${sortDir}${tieBreak}
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
    const S = await getSchema();
    if (!S.cols.id) {
      return res.status(404).json({ error: 'Audit entry not found' });
    }

    // Bind with the column's real type so a bad ID is a 404, not a SQL conversion error.
    let idType = sql.NVarChar(255);
    let idValue = req.params.logID;
    if (INT_TYPES.has(S.types.id)) {
      if (!/^\d+$/.test(idValue)) {
        return res.status(404).json({ error: 'Audit entry not found' });
      }
      idType = sql.BigInt;
      idValue = Number(idValue);
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('logID', idType, idValue)
      .query(`
        SELECT
          ${selectList(S, { includeDetail: true })}
        FROM ${S.table}
        WHERE ${S.cols.id} = @logID
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
