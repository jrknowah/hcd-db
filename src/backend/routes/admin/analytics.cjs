// routes/admin/analytics.cjs
// Admin > Reports & Analytics. Mounted at /api/admin/analytics behind authMiddleware + requireAdmin.
//
// HIPAA notes:
//   - Every response from this router is AGGREGATE ONLY. No row-level client data, ever.
//   - Small-cell suppression is applied here, in the API layer, not in React — so it
//     cannot be bypassed by calling the endpoint directly.
//   - Report SQL lives in the REPORTS registry below so new reports are additive.

const express = require('express');
const sql = require('mssql');
const { getPool } = require('../../store/azureSql.js');

const router = express.Router();

// ---------------------------------------------------------------------------
// Small-cell suppression
// ---------------------------------------------------------------------------
// Counts below this threshold are replaced with null and flagged, to prevent
// re-identification from small cohorts. 11 is the common HHS/HUD convention.
const MIN_CELL_SIZE = 11;

// Columns that represent counts of people and therefore need suppression.
const COUNT_COLUMN_PATTERN = /count|clients|total|enrolled|discharged|admissions|encounters/i;

function suppressSmallCells(rows) {
  let suppressed = 0;

  const out = rows.map((row) => {
    const copy = { ...row };
    Object.keys(copy).forEach((key) => {
      const v = copy[key];
      if (
        typeof v === 'number' &&
        COUNT_COLUMN_PATTERN.test(key) &&
        v > 0 &&
        v < MIN_CELL_SIZE
      ) {
        copy[key] = null;
        copy.__suppressed = true;
        suppressed += 1;
      }
    });
    return copy;
  });

  return { rows: out, suppressedCells: suppressed };
}

// ---------------------------------------------------------------------------
// REPORT REGISTRY
// ---------------------------------------------------------------------------
// Each entry: label, category, params it accepts, and a SQL builder.
// SQL must return aggregates only. Add new reports here — nothing else changes.
//
// ⚠️  The SQL below references Clients / Referrals / Discharge / EncounterNote.
//     Adjust table and column names to match your schema; the shape is what matters.

const REPORTS = {
  census_by_facility: {
    label: 'Current Census by Facility',
    category: 'Funder / Contract',
    description: 'Active clients per facility as of today.',
    sql: () => `
      SELECT
        ISNULL(c.Facility, 'Unassigned') AS facility,
        COUNT(*)                          AS clientCount
      FROM dbo.Clients c
      WHERE c.DischargeDate IS NULL
      GROUP BY c.Facility
      ORDER BY facility
    `,
    bind: () => [],
  },

  admissions_by_month: {
    label: 'Admissions by Month',
    category: 'Funder / Contract',
    description: 'Monthly admission counts over the selected date range.',
    sql: () => `
      SELECT
        FORMAT(c.AdmitDate, 'yyyy-MM') AS period,
        COUNT(*)                       AS admissions
      FROM dbo.Clients c
      WHERE c.AdmitDate >= @startDate AND c.AdmitDate < @endDate
      GROUP BY FORMAT(c.AdmitDate, 'yyyy-MM')
      ORDER BY period
    `,
    bind: (q) => [
      { name: 'startDate', type: sql.DateTime2, value: new Date(q.startDate) },
      { name: 'endDate', type: sql.DateTime2, value: new Date(q.endDate) },
    ],
  },

  referral_source_breakdown: {
    label: 'Referral Source Breakdown',
    category: 'Funder / Contract',
    description: 'Referral volume by originating source.',
    sql: () => `
      SELECT
        ISNULL(r.ReferralSource, 'Unknown') AS source,
        COUNT(*)                            AS referralCount
      FROM dbo.Referrals r
      WHERE r.ReferralDate >= @startDate AND r.ReferralDate < @endDate
      GROUP BY r.ReferralSource
      ORDER BY referralCount DESC
    `,
    bind: (q) => [
      { name: 'startDate', type: sql.DateTime2, value: new Date(q.startDate) },
      { name: 'endDate', type: sql.DateTime2, value: new Date(q.endDate) },
    ],
  },

  discharge_disposition: {
    label: 'Discharge Disposition',
    category: 'Clinical Outcomes',
    description: 'Where clients went at discharge — the core outcome measure.',
    sql: () => `
      SELECT
        ISNULL(d.Disposition, 'Not recorded') AS disposition,
        COUNT(*)                              AS clientCount
      FROM dbo.Discharge d
      WHERE d.DischargeDate >= @startDate AND d.DischargeDate < @endDate
      GROUP BY d.Disposition
      ORDER BY clientCount DESC
    `,
    bind: (q) => [
      { name: 'startDate', type: sql.DateTime2, value: new Date(q.startDate) },
      { name: 'endDate', type: sql.DateTime2, value: new Date(q.endDate) },
    ],
  },

  average_length_of_stay: {
    label: 'Average Length of Stay',
    category: 'Clinical Outcomes',
    description: 'Mean and median days in program, by facility.',
    sql: () => `
      SELECT
        ISNULL(c.Facility, 'Unassigned') AS facility,
        COUNT(*)                          AS clientCount,
        AVG(CAST(DATEDIFF(DAY, c.AdmitDate, c.DischargeDate) AS FLOAT)) AS avgDays
      FROM dbo.Clients c
      WHERE c.DischargeDate IS NOT NULL
        AND c.DischargeDate >= @startDate AND c.DischargeDate < @endDate
      GROUP BY c.Facility
      ORDER BY facility
    `,
    bind: (q) => [
      { name: 'startDate', type: sql.DateTime2, value: new Date(q.startDate) },
      { name: 'endDate', type: sql.DateTime2, value: new Date(q.endDate) },
    ],
  },

  encounter_volume_by_type: {
    label: 'Encounter Volume by Type',
    category: 'Clinical Outcomes',
    description: 'Documented encounters grouped by note type.',
    sql: () => `
      SELECT
        ISNULL(e.NoteType, 'Unspecified') AS noteType,
        COUNT(*)                          AS encounters
      FROM dbo.EncounterNote e
      WHERE e.NoteDate >= @startDate AND e.NoteDate < @endDate
      GROUP BY e.NoteType
      ORDER BY encounters DESC
    `,
    bind: (q) => [
      { name: 'startDate', type: sql.DateTime2, value: new Date(q.startDate) },
      { name: 'endDate', type: sql.DateTime2, value: new Date(q.endDate) },
    ],
  },
};

function defaultRange(q) {
  const endDate = q.endDate || new Date().toISOString().slice(0, 10);
  const start = new Date(endDate);
  start.setFullYear(start.getFullYear() - 1);
  return {
    startDate: q.startDate || start.toISOString().slice(0, 10),
    endDate,
  };
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
// SPECIFIC ROUTES FIRST
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/analytics/reports
 * Report catalog for the picker. No data, just metadata.
 */
router.get('/reports', (req, res) => {
  const catalog = Object.entries(REPORTS).map(([key, r]) => ({
    key,
    label: r.label,
    category: r.category,
    description: r.description,
  }));
  res.json({ reports: catalog, minCellSize: MIN_CELL_SIZE });
});

/**
 * GET /api/admin/analytics/summary
 * Headline KPIs for the analytics landing page.
 */
router.get('/summary', async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        SUM(CASE WHEN DischargeDate IS NULL THEN 1 ELSE 0 END) AS activeClients,
        SUM(CASE WHEN AdmitDate >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS admissions30d,
        SUM(CASE WHEN DischargeDate >= DATEADD(DAY, -30, SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS discharges30d,
        COUNT(*) AS totalClients
      FROM dbo.Clients
    `);

    const trend = await pool.request().query(`
      SELECT
        FORMAT(AdmitDate, 'yyyy-MM') AS period,
        COUNT(*)                     AS admissions
      FROM dbo.Clients
      WHERE AdmitDate >= DATEADD(MONTH, -12, SYSUTCDATETIME())
      GROUP BY FORMAT(AdmitDate, 'yyyy-MM')
      ORDER BY period
    `);

    const { rows: trendRows } = suppressSmallCells(trend.recordset);

    res.json({
      summary: result.recordset[0] || {},
      admissionsTrend: trendRows,
      minCellSize: MIN_CELL_SIZE,
    });
  } catch (err) {
    console.error('❌ /analytics/summary failed:', err);
    res.status(500).json({ error: 'Failed to load analytics summary' });
  }
});

/**
 * GET /api/admin/analytics/reports/:reportKey/export
 * CSV of a single report, suppression already applied.
 */
router.get('/reports/:reportKey/export', async (req, res) => {
  const report = REPORTS[req.params.reportKey];
  if (!report) return res.status(404).json({ error: 'Unknown report' });

  try {
    const range = defaultRange(req.query);
    const pool = await getPool();
    const request = pool.request();
    report.bind({ ...req.query, ...range }).forEach((p) =>
      request.input(p.name, p.type, p.value)
    );

    const result = await request.query(report.sql());
    const { rows } = suppressSmallCells(result.recordset);

    if (!rows.length) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send('\uFEFF');
    }

    const headers = Object.keys(rows[0]).filter((h) => h !== '__suppressed');
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => csvEscape(r[h] === null ? `<${MIN_CELL_SIZE}` : r[h]))
          .join(',')
      ),
    ].join('\r\n');

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${req.params.reportKey}-${stamp}.csv"`
    );
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(`❌ /analytics/reports/${req.params.reportKey}/export failed:`, err);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// ---------------------------------------------------------------------------
// PARAMETERIZED ROUTE LAST
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/analytics/reports/:reportKey
 */
router.get('/reports/:reportKey', async (req, res) => {
  const report = REPORTS[req.params.reportKey];
  if (!report) return res.status(404).json({ error: 'Unknown report' });

  try {
    const range = defaultRange(req.query);
    const pool = await getPool();
    const request = pool.request();
    report.bind({ ...req.query, ...range }).forEach((p) =>
      request.input(p.name, p.type, p.value)
    );

    const result = await request.query(report.sql());
    const { rows, suppressedCells } = suppressSmallCells(result.recordset);

    res.json({
      key: req.params.reportKey,
      label: report.label,
      category: report.category,
      range,
      rows,
      suppressedCells,
      minCellSize: MIN_CELL_SIZE,
    });
  } catch (err) {
    console.error(`❌ /analytics/reports/${req.params.reportKey} failed:`, err);
    res.status(500).json({ error: 'Failed to run report' });
  }
});

module.exports = router;
