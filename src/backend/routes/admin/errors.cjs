// routes/admin/errors.cjs
const express = require('express');
const router = express.Router();
const { getPool } = require('../../store/azureSql');

/**
 * GET /api/admin/errors
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, parseInt(req.query.pageSize, 10) || 50);
    const offset = (page - 1) * pageSize;

    const {
      severity, source, errorCode, route, userID, clientID,
      startDate, endDate, resolved, search
    } = req.query;

    const pool = await getPool();
    const request = pool.request();

    const where = [];

    if (severity) { where.push('Severity = @severity'); request.input('severity', severity); }
    if (source) { where.push('Source = @source'); request.input('source', source); }
    if (errorCode) { where.push('ErrorCode = @errorCode'); request.input('errorCode', errorCode); }
    if (route) { where.push('Route LIKE @route'); request.input('route', `%${route}%`); }
    if (userID) { where.push('UserID = @userID'); request.input('userID', userID); }
    if (clientID) { where.push('ClientID = @clientID'); request.input('clientID', clientID); }
    if (startDate) { where.push('Timestamp >= @startDate'); request.input('startDate', new Date(startDate)); }
    if (endDate) { where.push('Timestamp <= @endDate'); request.input('endDate', new Date(endDate)); }
    if (resolved === 'true' || resolved === 'false') {
      where.push('Resolved = @resolved');
      request.input('resolved', resolved === 'true' ? 1 : 0);
    }
    if (search) { where.push('Message LIKE @search'); request.input('search', `%${search}%`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    request.input('offset', offset);
    request.input('pageSize', pageSize);

    const query = `
      SELECT
        ErrorID, Timestamp, Severity, Source, Route, Method,
        ErrorCode, Message, StackTrace, UserID, ClientID,
        Resolved, ResolvedAt, ResolvedBy, Notes
      FROM SystemErrors
      ${whereClause}
      ORDER BY Timestamp DESC
      OFFSET @offset ROWS
      FETCH NEXT @pageSize ROWS ONLY;

      SELECT COUNT(*) AS total FROM SystemErrors ${whereClause};
    `;

    const result = await request.query(query);

    res.json({
      errors: result.recordsets[0],
      total: result.recordsets[1][0].total,
      page,
      pageSize
    });
  } catch (err) {
    console.error('[admin/errors] GET failed:', err);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

/**
 * GET /api/admin/errors/stats
 * MUST be registered before /:errorID
 */
router.get('/stats', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN Resolved = 0 THEN 1 ELSE 0 END) AS unresolved,
        SUM(CASE WHEN Timestamp >= DATEADD(hour, -24, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS last24h,
        SUM(CASE WHEN Severity = 'error' AND Resolved = 0 THEN 1 ELSE 0 END) AS unresolvedErrors,
        SUM(CASE WHEN Severity = 'warn' AND Resolved = 0 THEN 1 ELSE 0 END) AS unresolvedWarnings
      FROM SystemErrors;

      SELECT Severity, COUNT(*) AS count
      FROM SystemErrors
      WHERE Timestamp >= DATEADD(day, -7, SYSUTCDATETIME())
      GROUP BY Severity;
    `);

    res.json({
      summary: result.recordsets[0][0],
      last7DaysBySeverity: result.recordsets[1]
    });
  } catch (err) {
    console.error('[admin/errors] GET /stats failed:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/errors/:errorID
 */
router.get('/:errorID', async (req, res) => {
  try {
    const errorID = parseInt(req.params.errorID, 10);
    if (isNaN(errorID)) return res.status(400).json({ error: 'Invalid errorID' });

    const pool = await getPool();
    const result = await pool.request()
      .input('errorID', errorID)
      .query(`SELECT * FROM SystemErrors WHERE ErrorID = @errorID;`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('[admin/errors] GET /:errorID failed:', err);
    res.status(500).json({ error: 'Failed to fetch error detail' });
  }
});

/**
 * PATCH /api/admin/errors/:errorID/resolve
 */
router.patch('/:errorID/resolve', async (req, res) => {
  try {
    const errorID = parseInt(req.params.errorID, 10);
    if (isNaN(errorID)) return res.status(400).json({ error: 'Invalid errorID' });

    const { notes } = req.body || {};
    const resolvedBy = req.user?.email || req.user?.name || 'unknown';

    const pool = await getPool();
    const request = pool.request()
      .input('errorID', errorID)
      .input('resolvedBy', resolvedBy);

    let query = `
      UPDATE SystemErrors
      SET Resolved = 1,
          ResolvedBy = @resolvedBy,
          ResolvedAt = SYSUTCDATETIME()
    `;

    if (notes) {
      query += `, Notes = @notes`;
      request.input('notes', notes);
    }

    query += `
      WHERE ErrorID = @errorID;
      SELECT @@ROWCOUNT AS affected;
    `;

    const result = await request.query(query);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/errors] PATCH resolve failed:', err);
    res.status(500).json({ error: 'Failed to mark resolved' });
  }
});

/**
 * PATCH /api/admin/errors/:errorID/reopen
 */
router.patch('/:errorID/reopen', async (req, res) => {
  try {
    const errorID = parseInt(req.params.errorID, 10);
    if (isNaN(errorID)) return res.status(400).json({ error: 'Invalid errorID' });

    const pool = await getPool();
    const result = await pool.request()
      .input('errorID', errorID)
      .query(`
        UPDATE SystemErrors
        SET Resolved = 0, ResolvedBy = NULL, ResolvedAt = NULL
        WHERE ErrorID = @errorID;
        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/errors] PATCH reopen failed:', err);
    res.status(500).json({ error: 'Failed to reopen error' });
  }
});

module.exports = router;