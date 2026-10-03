// routes/admin/analytics.cjs
// Admin > Reports & Analytics. Mounted at /api/admin/analytics behind authMiddleware + requireAdmin.
//
// HIPAA notes:
//   - Every response from this router is AGGREGATE ONLY. No row-level client data, ever.
//   - Small-cell suppression is applied here, in the API layer, not in React — so it
//     cannot be bypassed by calling the endpoint directly. Exports (CSV / Excel / PDF)
//     are built from the already-suppressed rows.
//   - Report SQL lives in the REPORTS registry below so new reports are additive.
//
// Table / column names match what the clinical routes read and write:
//   Clients (clientID, clientAdmitDate, clientSite, clientDOB, clientGender, ...)
//   ClientDischarge (clientID, clientDischargeDate)       — routes/discharge.js
//   ClientReferrals (lahsa/odr/dhs/dmhReferral)           — routes/referrals.js
//   EncounterNotes (ClientID, CareNoteDate, CareNoteType, CareNoteSite, CreatedBy)
//   AuthorizationForms (clientID, formType, status)       — routes/authorization.js
//   medical_appointments, nursing_admission, AssessmentCarePlans, AssessmentMilestones
// clientID types differ between tables, so joins compare as NVARCHAR.

const express = require('express');
const sql = require('mssql');
const { getPool } = require('../../store/azureSql.js');
const { buildCsv, buildXlsx, buildPdf, humanizeColumn } = require('./analyticsExport.cjs');

const router = express.Router();

// ---------------------------------------------------------------------------
// Small-cell suppression
// ---------------------------------------------------------------------------
// Counts below this threshold are replaced with null and flagged, to prevent
// re-identification from small cohorts. 11 is the common HHS/HUD convention.
const MIN_CELL_SIZE = 11;

// Columns that represent counts of people or events and therefore need suppression.
const COUNT_COLUMN_PATTERN =
  /count|clients|total|enrolled|discharge|admission|encounter|referr|appointment/i;

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

    // Secondary suppression: a figure derived from a suppressed cohort can give
    // it away (a cohort of 1 has avgDays = their stay; netChange minus admissions
    // reveals discharges), so non-count numbers in that row go too.
    if (copy.__suppressed) {
      Object.keys(copy).forEach((key) => {
        if (typeof copy[key] === 'number' && !COUNT_COLUMN_PATTERN.test(key)) {
          copy[key] = null;
          suppressed += 1;
        }
      });
    }
    return copy;
  });

  return { rows: out, suppressedCells: suppressed };
}

// ---------------------------------------------------------------------------
// Shared SQL fragments
// ---------------------------------------------------------------------------

// One row per client with their stay dates. Range-based reports select from this.
const STAYS_CTE = `
  stays AS (
    SELECT
      CAST(c.clientID AS NVARCHAR(50))                    AS clientID,
      ISNULL(NULLIF(LTRIM(RTRIM(c.clientSite)), ''), 'Unassigned') AS site,
      CAST(c.clientAdmitDate AS DATE)                     AS admitDate,
      CAST(d.clientDischargeDate AS DATE)                 AS dischargeDate,
      CAST(c.clientDOB AS DATE)                           AS dob,
      c.clientGender, c.clientRace, c.clientEthnicity, c.clientVetStatus, c.clientPrimaryLang
    FROM Clients c
    LEFT JOIN ClientDischarge d
      ON CAST(d.clientID AS NVARCHAR(50)) = CAST(c.clientID AS NVARCHAR(50))
  )`;

// Enrolled at any point in [@startDate, @endDate].
const SERVED_IN_RANGE = `
  (admitDate IS NULL OR admitDate < DATEADD(DAY, 1, @endDate))
  AND (dischargeDate IS NULL OR dischargeDate >= @startDate)`;

// Enrolled today.
const ACTIVE_TODAY = `
  (admitDate IS NULL OR admitDate <= CAST(GETDATE() AS DATE))
  AND (dischargeDate IS NULL OR dischargeDate > CAST(GETDATE() AS DATE))`;

// Inclusive date range on a DATE/DATETIME column.
const inRange = (col) => `${col} >= @startDate AND ${col} < DATEADD(DAY, 1, @endDate)`;

const blank = (col, fallback) => `ISNULL(NULLIF(LTRIM(RTRIM(${col})), ''), '${fallback}')`;

const rangeParams = (q) => [
  { name: 'startDate', type: sql.Date, value: q.startDate },
  { name: 'endDate', type: sql.Date, value: q.endDate },
];

// Demographic breakdown of clients served in range, by one Clients column.
function demographicReport(label, column, header, description) {
  const alias = header.replace(/\W/g, '').replace(/^./, (c) => c.toLowerCase());
  return {
    label,
    category: 'Demographics',
    description: description || `Clients served in the date range, by ${header.toLowerCase()}.`,
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT ${blank(column, 'Not recorded')} AS ${alias},
             COUNT(*)                              AS clientCount
      FROM stays
      WHERE ${SERVED_IN_RANGE}
      GROUP BY ${blank(column, 'Not recorded')}
      ORDER BY clientCount DESC
    `,
    bind: rangeParams,
  };
}

// Stay length → HUD-style buckets. `days` is a SQL expression.
const losBucket = (days) => `
  CASE
    WHEN ${days} IS NULL THEN 'Unknown'
    WHEN ${days} < 30   THEN 'Under 30 days'
    WHEN ${days} < 90   THEN '30–89 days'
    WHEN ${days} < 180  THEN '90–179 days'
    WHEN ${days} < 365  THEN '180–364 days'
    ELSE '365+ days'
  END`;

const losBucketOrder = (days) => `
  CASE
    WHEN ${days} IS NULL THEN 9
    WHEN ${days} < 30   THEN 1
    WHEN ${days} < 90   THEN 2
    WHEN ${days} < 180  THEN 3
    WHEN ${days} < 365  THEN 4
    ELSE 5
  END`;

// ---------------------------------------------------------------------------
// REPORT REGISTRY
// ---------------------------------------------------------------------------
// Each entry: label, category, description, usesRange (default true), a SQL
// builder, its bind params, and an optional row transform.
// SQL must return aggregates only. Add new reports here — nothing else changes.

const REPORTS = {
  // ----- Census & Flow -----------------------------------------------------
  census_by_site: {
    label: 'Current Census by Site',
    category: 'Census & Flow',
    description: 'Clients enrolled today, per site. Ignores the date range.',
    usesRange: false,
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT site, COUNT(*) AS activeClients
      FROM stays
      WHERE ${ACTIVE_TODAY}
      GROUP BY site
      ORDER BY site
    `,
    bind: () => [],
  },

  admissions_by_month: {
    label: 'Admissions by Month',
    category: 'Census & Flow',
    description: 'Monthly admission counts over the selected date range.',
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT FORMAT(admitDate, 'yyyy-MM') AS period, COUNT(*) AS admissions
      FROM stays
      WHERE ${inRange('admitDate')}
      GROUP BY FORMAT(admitDate, 'yyyy-MM')
      ORDER BY period
    `,
    bind: rangeParams,
  },

  discharges_by_month: {
    label: 'Discharges by Month',
    category: 'Census & Flow',
    description: 'Monthly discharge counts over the selected date range.',
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT FORMAT(dischargeDate, 'yyyy-MM') AS period, COUNT(*) AS discharges
      FROM stays
      WHERE ${inRange('dischargeDate')}
      GROUP BY FORMAT(dischargeDate, 'yyyy-MM')
      ORDER BY period
    `,
    bind: rangeParams,
  },

  flow_by_site: {
    label: 'Admissions vs. Discharges by Site',
    category: 'Census & Flow',
    description: 'Admissions, discharges and net change per site in the date range.',
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT
        site,
        SUM(CASE WHEN ${inRange('admitDate')} THEN 1 ELSE 0 END)     AS admissions,
        SUM(CASE WHEN ${inRange('dischargeDate')} THEN 1 ELSE 0 END) AS discharges,
        SUM(CASE WHEN ${inRange('admitDate')} THEN 1 ELSE 0 END)
          - SUM(CASE WHEN ${inRange('dischargeDate')} THEN 1 ELSE 0 END) AS netChange
      FROM stays
      GROUP BY site
      HAVING SUM(CASE WHEN ${inRange('admitDate')} OR ${inRange('dischargeDate')} THEN 1 ELSE 0 END) > 0
      ORDER BY site
    `,
    bind: rangeParams,
  },

  average_length_of_stay: {
    label: 'Length of Stay by Site',
    category: 'Census & Flow',
    description: 'Average and median days enrolled, for clients discharged in the date range.',
    sql: () => `
      WITH ${STAYS_CTE},
      los AS (
        SELECT site, DATEDIFF(DAY, admitDate, dischargeDate) AS days
        FROM stays
        WHERE admitDate IS NOT NULL AND ${inRange('dischargeDate')}
      ),
      med AS (
        SELECT DISTINCT site,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days) OVER (PARTITION BY site) AS medianDays
        FROM los
      )
      SELECT
        l.site,
        COUNT(*)                                   AS clientCount,
        ROUND(AVG(CAST(l.days AS FLOAT)), 1)       AS avgDays,
        ROUND(MAX(m.medianDays), 1)                AS medianDays
      FROM los l
      JOIN med m ON m.site = l.site
      GROUP BY l.site
      ORDER BY l.site
    `,
    bind: rangeParams,
  },

  length_of_stay_distribution: {
    label: 'Length of Stay Distribution',
    category: 'Census & Flow',
    description: 'Clients discharged in the date range, grouped by how long they stayed.',
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT b.lengthOfStay, COUNT(*) AS clientCount
      FROM stays
      CROSS APPLY (SELECT DATEDIFF(DAY, admitDate, dischargeDate) AS days) x
      CROSS APPLY (SELECT ${losBucket('x.days')} AS lengthOfStay, ${losBucketOrder('x.days')} AS ord) b
      WHERE ${inRange('dischargeDate')}
      GROUP BY b.lengthOfStay
      ORDER BY MIN(b.ord)
    `,
    bind: rangeParams,
  },

  current_stay_length: {
    label: 'Current Clients by Time Enrolled',
    category: 'Census & Flow',
    description: 'Clients enrolled today, grouped by how long they have been here. Ignores the date range.',
    usesRange: false,
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT b.timeEnrolled, COUNT(*) AS clientCount
      FROM stays
      CROSS APPLY (SELECT DATEDIFF(DAY, admitDate, CAST(GETDATE() AS DATE)) AS days) x
      CROSS APPLY (SELECT ${losBucket('x.days')} AS timeEnrolled, ${losBucketOrder('x.days')} AS ord) b
      WHERE ${ACTIVE_TODAY}
      GROUP BY b.timeEnrolled
      ORDER BY MIN(b.ord)
    `,
    bind: () => [],
  },

  // ----- Demographics ------------------------------------------------------
  demographics_age: {
    label: 'Age at Admission',
    category: 'Demographics',
    description: 'Clients served in the date range, by age at admission (HUD age bands).',
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT b.ageGroup, COUNT(*) AS clientCount
      FROM stays
      CROSS APPLY (
        SELECT CASE WHEN dob IS NULL OR admitDate IS NULL THEN NULL
          ELSE DATEDIFF(YEAR, dob, admitDate)
               - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, dob, admitDate), dob) > admitDate THEN 1 ELSE 0 END
        END AS age
      ) a
      CROSS APPLY (
        SELECT
          CASE
            WHEN a.age IS NULL THEN 'Not recorded'
            WHEN a.age < 18 THEN 'Under 18'
            WHEN a.age < 25 THEN '18–24'
            WHEN a.age < 35 THEN '25–34'
            WHEN a.age < 45 THEN '35–44'
            WHEN a.age < 55 THEN '45–54'
            WHEN a.age < 65 THEN '55–64'
            ELSE '65+'
          END AS ageGroup,
          CASE
            WHEN a.age IS NULL THEN 99
            WHEN a.age < 18 THEN 1
            WHEN a.age < 25 THEN 2
            WHEN a.age < 35 THEN 3
            WHEN a.age < 45 THEN 4
            WHEN a.age < 55 THEN 5
            WHEN a.age < 65 THEN 6
            ELSE 7
          END AS ord
      ) b
      WHERE ${SERVED_IN_RANGE}
      GROUP BY b.ageGroup
      ORDER BY MIN(b.ord)
    `,
    bind: rangeParams,
  },

  demographics_gender: demographicReport('Gender', 'clientGender', 'Gender'),
  demographics_race: demographicReport('Race', 'clientRace', 'Race'),
  demographics_ethnicity: demographicReport('Ethnicity', 'clientEthnicity', 'Ethnicity'),
  demographics_veteran: demographicReport('Veteran Status', 'clientVetStatus', 'Veteran Status'),
  demographics_language: demographicReport('Primary Language', 'clientPrimaryLang', 'Language'),

  // ----- Referrals ---------------------------------------------------------
  referrals_by_agency: {
    label: 'Referrals by Agency',
    category: 'Referrals',
    description: 'Clients served in the date range who have a LAHSA, ODR, DHS or DMH referral on file.',
    sql: () => `
      WITH ${STAYS_CTE},
      served AS (
        SELECT r.*
        FROM stays s
        JOIN ClientReferrals r ON CAST(r.clientID AS NVARCHAR(50)) = s.clientID
        WHERE ${SERVED_IN_RANGE.replace(/admitDate/g, 's.admitDate').replace(/dischargeDate/g, 's.dischargeDate')}
      )
      SELECT agency, referredClients FROM (
        SELECT 'LAHSA' AS agency, 1 AS ord,
               SUM(CASE WHEN NULLIF(LTRIM(RTRIM(lahsaReferral)), '') IS NOT NULL THEN 1 ELSE 0 END) AS referredClients
        FROM served
        UNION ALL
        SELECT 'ODR', 2, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(odrReferral)), '') IS NOT NULL THEN 1 ELSE 0 END) FROM served
        UNION ALL
        SELECT 'DHS', 3, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(dhsReferral)), '') IS NOT NULL THEN 1 ELSE 0 END) FROM served
        UNION ALL
        SELECT 'DMH', 4, SUM(CASE WHEN NULLIF(LTRIM(RTRIM(dmhReferral)), '') IS NOT NULL THEN 1 ELSE 0 END) FROM served
      ) t
      ORDER BY ord
    `,
    bind: rangeParams,
    transform: (rows) => rows.map((r) => ({ ...r, referredClients: r.referredClients ?? 0 })),
  },

  // ----- Services & Clinical -----------------------------------------------
  encounter_volume_by_type: {
    label: 'Encounters by Note Type',
    category: 'Services & Clinical',
    description: 'Documented encounter notes in the date range, by note type.',
    sql: () => `
      SELECT ${blank('e.CareNoteType', 'Unspecified')} AS noteType,
             COUNT(*)                                   AS encounters,
             COUNT(DISTINCT e.ClientID)                 AS clientsSeen
      FROM EncounterNotes e
      WHERE ${inRange('e.CareNoteDate')}
      GROUP BY ${blank('e.CareNoteType', 'Unspecified')}
      ORDER BY encounters DESC
    `,
    bind: rangeParams,
  },

  encounters_by_month: {
    label: 'Encounters by Month',
    category: 'Services & Clinical',
    description: 'Encounter notes and distinct clients seen, per month.',
    sql: () => `
      SELECT FORMAT(e.CareNoteDate, 'yyyy-MM') AS period,
             COUNT(*)                          AS encounters,
             COUNT(DISTINCT e.ClientID)        AS clientsSeen
      FROM EncounterNotes e
      WHERE ${inRange('e.CareNoteDate')}
      GROUP BY FORMAT(e.CareNoteDate, 'yyyy-MM')
      ORDER BY period
    `,
    bind: rangeParams,
  },

  encounters_by_site: {
    label: 'Encounters by Site',
    category: 'Services & Clinical',
    description: 'Encounter notes in the date range, by the site recorded on the note.',
    sql: () => `
      SELECT ${blank('e.CareNoteSite', 'Unspecified')} AS site,
             COUNT(*)                                   AS encounters,
             COUNT(DISTINCT e.ClientID)                 AS clientsSeen
      FROM EncounterNotes e
      WHERE ${inRange('e.CareNoteDate')}
      GROUP BY ${blank('e.CareNoteSite', 'Unspecified')}
      ORDER BY encounters DESC
    `,
    bind: rangeParams,
  },

  clients_without_recent_encounter: {
    label: 'Clients Without an Encounter in 30 Days',
    category: 'Services & Clinical',
    description: 'Clients enrolled today with no encounter note in the last 30 days, per site. Ignores the date range.',
    usesRange: false,
    sql: () => `
      WITH ${STAYS_CTE},
      recent AS (
        SELECT DISTINCT CAST(ClientID AS NVARCHAR(50)) AS clientID
        FROM EncounterNotes
        WHERE CareNoteDate >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
      )
      SELECT s.site,
             COUNT(*)                                                   AS activeClients,
             SUM(CASE WHEN r.clientID IS NULL THEN 1 ELSE 0 END)        AS clientsWithoutEncounter
      FROM stays s
      LEFT JOIN recent r ON r.clientID = s.clientID
      WHERE ${ACTIVE_TODAY.replace(/admitDate/g, 's.admitDate').replace(/dischargeDate/g, 's.dischargeDate')}
      GROUP BY s.site
      ORDER BY s.site
    `,
    bind: () => [],
  },

  medical_appointments_by_type: {
    label: 'Medical Appointments by Type',
    category: 'Services & Clinical',
    description: 'Medical appointments dated in the range, by appointment type.',
    sql: () => `
      SELECT ${blank('m.medApptType', 'Unspecified')} AS appointmentType,
             COUNT(*)                                 AS appointments,
             COUNT(DISTINCT m.clientID)               AS clientsSeen
      FROM medical_appointments m
      WHERE ${inRange('m.medApptDate')}
      GROUP BY ${blank('m.medApptType', 'Unspecified')}
      ORDER BY appointments DESC
    `,
    bind: rangeParams,
  },

  // ----- Documentation & Compliance ----------------------------------------
  authorization_forms_status: {
    label: 'Authorization & Consent Forms',
    category: 'Documentation & Compliance',
    description:
      'For clients served in the date range: how many have each Section 2 form completed vs. still in progress.',
    sql: () => `
      WITH ${STAYS_CTE}
      SELECT a.formType AS form,
             SUM(CASE WHEN LOWER(a.status) IN ('submitted', 'approved', 'completed') THEN 1 ELSE 0 END) AS completedClients,
             SUM(CASE WHEN LOWER(a.status) IN ('submitted', 'approved', 'completed') THEN 0 ELSE 1 END) AS inProgressClients
      FROM AuthorizationForms a
      JOIN stays s ON s.clientID = CAST(a.clientID AS NVARCHAR(50))
      WHERE ${SERVED_IN_RANGE.replace(/admitDate/g, 's.admitDate').replace(/dischargeDate/g, 's.dischargeDate')}
      GROUP BY a.formType
      ORDER BY a.formType
    `,
    bind: rangeParams,
    transform: (rows) => rows.map((r) => ({ ...r, form: humanizeColumn(r.form || 'Unknown') })),
  },

  onboarding_timeliness: {
    label: 'Onboarding Timeliness',
    category: 'Documentation & Compliance',
    description:
      'For clients admitted in the date range: how many reached each intake step, and the average days from admission.',
    sql: () => `
      WITH ${STAYS_CTE},
      admitted AS (
        SELECT clientID, admitDate FROM stays WHERE ${inRange('admitDate')}
      ),
      steps AS (
        SELECT 'Nursing admission assessment' AS step, 1 AS ord, a.clientID,
               DATEDIFF(DAY, a.admitDate, MIN(CAST(n.createdAt AS DATE))) AS days
        FROM admitted a
        JOIN nursing_admission n ON CAST(n.clientID AS NVARCHAR(50)) = a.clientID
        GROUP BY a.clientID, a.admitDate
        UNION ALL
        SELECT 'Care plan assessment started', 2, a.clientID,
               DATEDIFF(DAY, a.admitDate, MIN(CAST(p.startDate AS DATE)))
        FROM admitted a
        JOIN AssessmentCarePlans p ON CAST(p.clientID AS NVARCHAR(50)) = a.clientID
        GROUP BY a.clientID, a.admitDate
        UNION ALL
        SELECT 'First encounter note', 3, a.clientID,
               DATEDIFF(DAY, a.admitDate, MIN(CAST(e.CareNoteDate AS DATE)))
        FROM admitted a
        JOIN EncounterNotes e ON CAST(e.ClientID AS NVARCHAR(50)) = a.clientID
        GROUP BY a.clientID, a.admitDate
      )
      SELECT
        step,
        COUNT(*)                                                     AS clientsCompleted,
        SUM(CASE WHEN days <= 7 THEN 1 ELSE 0 END)                   AS clientsWithin7Days,
        ROUND(AVG(CAST(CASE WHEN days < 0 THEN 0 ELSE days END AS FLOAT)), 1) AS avgDaysFromAdmit
      FROM steps
      GROUP BY step
      ORDER BY MIN(ord)
    `,
    bind: rangeParams,
  },

  care_plan_milestones: {
    label: 'Care Plan Milestones',
    category: 'Documentation & Compliance',
    description: 'All care plan milestones today: completed, open, and overdue (past due date). Ignores the date range.',
    usesRange: false,
    sql: () => `
      SELECT ${blank('m.title', 'Untitled')} AS milestone,
             COUNT(*)                                                         AS totalMilestones,
             SUM(CASE WHEN m.completed = 1 THEN 1 ELSE 0 END)                 AS completedCount,
             SUM(CASE WHEN m.completed = 0 THEN 1 ELSE 0 END)                 AS openCount,
             SUM(CASE WHEN m.completed = 0 AND m.dueDate < GETDATE() THEN 1 ELSE 0 END) AS overdueCount
      FROM AssessmentMilestones m
      GROUP BY ${blank('m.title', 'Untitled')}
      ORDER BY totalMilestones DESC
    `,
    bind: () => [],
  },

  notes_by_staff: {
    label: 'Encounter Notes by Staff',
    category: 'Documentation & Compliance',
    description: 'Encounter notes written per staff member in the date range — a workload view.',
    sql: () => `
      SELECT ${blank('e.CreatedBy', 'Unknown')} AS staff,
             COUNT(*)                            AS notesWritten
      FROM EncounterNotes e
      WHERE ${inRange('e.CareNoteDate')}
      GROUP BY ${blank('e.CreatedBy', 'Unknown')}
      ORDER BY notesWritten DESC
    `,
    bind: rangeParams,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** Inclusive date range; defaults to the last 12 months. Throws on bad input. */
function resolveRange(q) {
  const endDate = q.endDate || isoDate(new Date());
  let startDate = q.startDate;
  if (!startDate) {
    const s = new Date(`${endDate}T00:00:00Z`);
    s.setUTCFullYear(s.getUTCFullYear() - 1);
    startDate = isoDate(s);
  }
  for (const d of [startDate, endDate]) {
    if (!ISO_DATE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) {
      const err = new Error(`Invalid date "${d}" — use YYYY-MM-DD.`);
      err.status = 400;
      throw err;
    }
  }
  if (startDate > endDate) {
    const err = new Error('Start date must be on or before end date.');
    err.status = 400;
    throw err;
  }
  return { startDate, endDate };
}

function columnsOf(recordset) {
  const meta = recordset && recordset.columns;
  if (meta && Object.keys(meta).length) {
    return Object.values(meta)
      .sort((a, b) => a.index - b.index)
      .map((c) => c.name);
  }
  return recordset && recordset[0] ? Object.keys(recordset[0]) : [];
}

/**
 * Runs one report and returns a suppressed, export-ready result.
 * Never throws for SQL errors — the error text is carried on the result so one
 * broken report doesn't take down an "export all".
 */
async function runReport(key, range) {
  const report = REPORTS[key];
  const usesRange = report.usesRange !== false;
  const base = {
    key,
    label: report.label,
    category: report.category,
    description: report.description,
    usesRange,
    range: usesRange ? range : { startDate: isoDate(new Date()), endDate: isoDate(new Date()) },
    minCellSize: MIN_CELL_SIZE,
  };

  try {
    const pool = await getPool();
    const request = pool.request();
    report.bind(range).forEach((p) => request.input(p.name, p.type, p.value));

    const result = await request.query(report.sql());
    const columns = columnsOf(result.recordset);
    const raw = report.transform ? report.transform(result.recordset) : result.recordset;
    const { rows, suppressedCells } = suppressSmallCells(raw);

    return { ...base, columns, rows, suppressedCells };
  } catch (err) {
    console.error(`❌ analytics report "${key}" failed:`, err.message);
    // Admin-only endpoint: SQL Server's message ("Invalid column name 'x'") is
    // what an admin needs to fix a schema mismatch, and contains no client data.
    return { ...base, columns: [], rows: [], suppressedCells: 0, error: err.message };
  }
}

const FORMATS = {
  csv: { type: 'text/csv; charset=utf-8', ext: 'csv' },
  xlsx: { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
  pdf: { type: 'application/pdf', ext: 'pdf' },
};

async function sendExport(res, results, format, baseName, generatedBy) {
  let body;
  if (format === 'csv') body = buildCsv(results[0]);
  else if (format === 'xlsx') body = buildXlsx(results);
  else body = await buildPdf(results, { generatedBy });

  const stamp = isoDate(new Date());
  res.setHeader('Content-Type', FORMATS[format].type);
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}-${stamp}.${FORMATS[format].ext}"`);
  res.send(body);
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
    usesRange: r.usesRange !== false,
  }));
  res.json({ reports: catalog, minCellSize: MIN_CELL_SIZE, formats: Object.keys(FORMATS) });
});

/**
 * GET /api/admin/analytics/summary
 * Headline KPIs for the analytics landing page.
 */
router.get('/summary', async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      WITH ${STAYS_CTE}
      SELECT
        SUM(CASE WHEN ${ACTIVE_TODAY} THEN 1 ELSE 0 END) AS activeClients,
        SUM(CASE WHEN admitDate >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) AS admissions30d,
        SUM(CASE WHEN dischargeDate >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
                  AND dischargeDate <= CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS discharges30d,
        COUNT(*) AS totalClients
      FROM stays
    `);

    const trend = await pool.request().query(`
      SELECT
        FORMAT(clientAdmitDate, 'yyyy-MM') AS period,
        COUNT(*)                           AS admissions
      FROM Clients
      WHERE clientAdmitDate >= DATEADD(MONTH, -12, CAST(GETDATE() AS DATE))
      GROUP BY FORMAT(clientAdmitDate, 'yyyy-MM')
      ORDER BY period
    `);

    // Headline figures are suppressed like everything else.
    const { rows: [summary = {}] } = suppressSmallCells(result.recordset);
    delete summary.__suppressed;
    const { rows: trendRows } = suppressSmallCells(trend.recordset);

    res.json({
      summary,
      admissionsTrend: trendRows,
      minCellSize: MIN_CELL_SIZE,
    });
  } catch (err) {
    console.error('❌ /analytics/summary failed:', err);
    res.status(500).json({ error: `Failed to load analytics summary: ${err.message}` });
  }
});

/**
 * GET /api/admin/analytics/export-all?format=xlsx|pdf&startDate&endDate[&category=]
 * Every report (optionally one category) in a single workbook / PDF —
 * the "funder packet". Reports that fail are included with their error.
 */
router.get('/export-all', async (req, res) => {
  const format = String(req.query.format || 'xlsx').toLowerCase();
  if (format !== 'xlsx' && format !== 'pdf') {
    return res.status(400).json({ error: 'format must be xlsx or pdf' });
  }

  try {
    const range = resolveRange(req.query);
    const keys = Object.keys(REPORTS).filter(
      (k) => !req.query.category || REPORTS[k].category === req.query.category
    );
    if (!keys.length) return res.status(404).json({ error: 'No reports in that category' });

    // Sequential keeps load on the SQL pool modest; these are small aggregates.
    const results = [];
    for (const k of keys) results.push(await runReport(k, range));

    await sendExport(res, results, format, 'analytics-reports', req.user?.email);
  } catch (err) {
    if (!err.status) console.error('❌ /analytics/export-all failed:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to export reports' });
  }
});

/**
 * GET /api/admin/analytics/reports/:reportKey/export?format=csv|xlsx|pdf
 * A single report, suppression already applied.
 */
router.get('/reports/:reportKey/export', async (req, res) => {
  const { reportKey } = req.params;
  if (!Object.prototype.hasOwnProperty.call(REPORTS, reportKey)) {
    return res.status(404).json({ error: 'Unknown report' });
  }
  const format = String(req.query.format || 'csv').toLowerCase();
  if (!FORMATS[format]) return res.status(400).json({ error: 'format must be csv, xlsx or pdf' });

  try {
    const range = resolveRange(req.query);
    const result = await runReport(reportKey, range);
    if (result.error) return res.status(500).json({ error: result.error });

    await sendExport(res, [result], format, reportKey, req.user?.email);
  } catch (err) {
    if (!err.status) console.error(`❌ /analytics/reports/${reportKey}/export failed:`, err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to export report' });
  }
});

// ---------------------------------------------------------------------------
// PARAMETERIZED ROUTE LAST
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/analytics/reports/:reportKey
 */
router.get('/reports/:reportKey', async (req, res) => {
  const { reportKey } = req.params;
  if (!Object.prototype.hasOwnProperty.call(REPORTS, reportKey)) {
    return res.status(404).json({ error: 'Unknown report' });
  }

  try {
    const range = resolveRange(req.query);
    const result = await runReport(reportKey, range);
    if (result.error) {
      return res.status(500).json({ error: `Report failed: ${result.error}` });
    }
    res.json(result);
  } catch (err) {
    if (!err.status) console.error(`❌ /analytics/reports/${reportKey} failed:`, err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to run report' });
  }
});

module.exports = router;
module.exports._test = { REPORTS, suppressSmallCells, resolveRange, runReport };
