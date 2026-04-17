// routes/admin/errors.cjs
const express = require('express');
const router = express.Router();
const { getPool } = require('../../store/azureSql');

/**
 * GET /api/admin/errors
 * Query params:
 *   page (default 1), pageSize (default 50, max 200)
 *   severity (optional: 'error' | 'warn' | 'info')
 *   startDate, endDate (ISO strings)
 *   resolved ('true' | 'false')
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, parseInt(req.query.pageSize, 10) || 50);
    const offset = (page - 1) * pageSize;

    const { severity, startDate, endDate, resolved } = req.query;

    const pool = await getPool();
    const request = pool.request();

    const where = [];
    if (severity) {
      where.push('severity = @severity');
      request.input('severity', severity);
    }
    if (startDate) {
      where.push('createdAt >= @startDate');
      request.input('startDate', new Date(startDate));
    }
    if (endDate) {
      where.push('createdAt <= @endDate');
      request.input('endDate', new Date(endDate));
    }
    if (resolved === 'true' || resolved === 'false') {
      where.push('isResolved = @resolved');
      request.input('resolved', resolved === 'true' ? 1 : 0);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    request.input('offset', offset);
    request.input('pageSize', pageSize);

    // Verify column names against INFORMATION_SCHEMA.COLUMNS before shipping
    const query = `
      SELECT
        errorID,
        severity,
        message,
        stackTrace,
        route,
        method,
        userEmail,
        createdAt,
        isResolved,
        resolvedBy,
        resolvedAt
      FROM SystemErrors
      ${whereClause}
      ORDER BY createdAt DESC
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
 * PATCH /api/admin/errors/:errorID/resolve
 * Marks an error as resolved.
 */
router.patch('/:errorID/resolve', async (req, res) => {
  try {
    const { errorID } = req.params;
    const resolvedBy = req.user?.email || req.user?.preferred_username || 'unknown';

    const pool = await getPool();
    const result = await pool.request()
      .input('errorID', errorID)
      .input('resolvedBy', resolvedBy)
      .query(`
        UPDATE SystemErrors
        SET isResolved = 1,
            resolvedBy = @resolvedBy,
            resolvedAt = SYSUTCDATETIME()
        WHERE errorID = @errorID;

        SELECT @@ROWCOUNT AS affected;
      `);

    if (result.recordset[0].affected === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/errors] PATCH resolve failed:', err);
    res.status(500).json({ error: 'Failed to mark resolved' });
  }
});

module.exports = router;