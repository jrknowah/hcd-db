// routes/admin/documentation.cjs
// Admin > Behavioral Health (Sections 1-4) and Admin > Nursing (Section 5):
// which active clients have documentation that is missing, unfinished or out
// of date. Mounted at /api/admin/documentation behind authMiddleware +
// requireSupervisorAccess (IT Admin or Level 1).
//
//   GET /api/admin/documentation/behavioral
//   GET /api/admin/documentation/nursing
//
// Unlike Reports & Analytics this is row-level (one row per client, with the
// client's name), so every view writes a row to dbo.AuditLog.
//
// Each source table is queried once for all clients (grouped by clientID) and
// on its own, so a missing table or column only blanks that one column of the
// report ("error") instead of failing the page.
//
// Item statuses:
//   ok         - nothing to do
//   pending    - not entered yet, but the client is still inside the grace period
//   missing    - not entered and the grace period has passed
//   incomplete - started but not finished: a draft, an unsigned form, an
//                assessment not marked Complete
//   overdue    - finished, but not updated recently enough / past its due date
//   na         - not required for this client
//   error      - the source table could not be read

const express = require('express');
const sql = require('mssql');
const { getPool } = require('../../store/azureSql.js');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

// Encounter notes are required twice a week, Monday-Sunday weeks
// (same rule as src/utils/noteCompliance.js on the Section 4 progress tab).
const ENCOUNTER_NOTES_PER_WEEK = 2;

// Section 2 forms every client must sign at intake (the "high" priority forms
// in routes/authSig.js, minus the program-specific CalAIM opt-in).
const CORE_CONSENT_FORMS = ['orientation', 'clientRights', 'consentTreatment'];
const SIGNED_FORM_STATUSES = ['completed', 'submitted', 'approved'];

// clientIDs are stored as different types (and sometimes padded) across tables
const CID = (col = 'clientID') => `LTRIM(RTRIM(CAST(${col} AS NVARCHAR(50))))`;
// Latest of createdAt / updatedAt (updatedAt may be NULL)
const LAST_AT = (created = 'createdAt', updated = 'updatedAt') =>
  `MAX(CASE WHEN ${updated} > ${created} THEN ${updated} ELSE ${created} END)`;
const sqlList = (values) => values.map((v) => `'${v}'`).join(', ');

// ---------------------------------------------------------------------------
// Helpers for evaluate()
// ---------------------------------------------------------------------------
const daysSince = (value, today) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((today - d) / DAY_MS);
};

const fmtDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Nothing on file: "missing" once the client has been here longer than the
// grace period, "pending" before that. Clients with no admit date are treated
// as past the grace period.
const notEntered = (client, graceDays, what = 'Not entered') =>
  client.daysEnrolled === null || client.daysEnrolled > graceDays
    ? { status: 'missing', detail: what }
    : { status: 'pending', detail: `${what} (due within ${graceDays} days of admission)` };

// Simple "is there a record, is any of it a draft, is it recent enough" check
// used by most notes and forms.
function recordCheck({ graceDays, staleDays, required = true, draftLabel = 'draft' }) {
  return (row, client, ctx) => {
    if (!row || !row.total) {
      return required ? notEntered(client, graceDays) : { status: 'na', detail: 'None on file' };
    }
    const lastAt = row.lastAt || null;
    if (row.drafts > 0) {
      return { status: 'incomplete', detail: `${plural(row.drafts, draftLabel)} not submitted`, lastAt };
    }
    const age = daysSince(lastAt, ctx.today);
    if (staleDays && age !== null && age > staleDays) {
      return { status: 'overdue', detail: `Last updated ${age} days ago (every ${staleDays} days expected)`, lastAt };
    }
    return { status: 'ok', detail: `${plural(row.total, 'record')} on file`, lastAt };
  };
}

// ---------------------------------------------------------------------------
// CHECK REGISTRY
// ---------------------------------------------------------------------------
// Each check: key, section (number shown in the UI and used for the link),
// label, rule (plain-English summary shown on the page), sql (one row per
// client: clientID plus whatever evaluate needs), and evaluate(row, client, ctx).
// Grace / stale thresholds live here; change them here and nowhere else.

const BEHAVIORAL_CHECKS = [
  {
    key: 'faceSheet',
    section: 1,
    label: 'Client Face Sheet',
    rule: 'Contact / insurance face sheet entered within 7 days of admission.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total
      FROM ClientFace
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 7 }),
  },
  {
    key: 'consentForms',
    section: 2,
    label: 'Consent Forms',
    rule: `Core intake forms (Orientation, Client Rights, Consent for Treatment) signed within 3 days of admission; any other form that was started but never signed is flagged.`,
    sql: () => `
      SELECT ${CID()} AS clientID,
             COUNT(*) AS total,
             COUNT(DISTINCT CASE WHEN formType IN (${sqlList(CORE_CONSENT_FORMS)})
                                  AND status IN (${sqlList(SIGNED_FORM_STATUSES)}) THEN formType END) AS coreSigned,
             SUM(CASE WHEN ISNULL(status, '') NOT IN (${sqlList(SIGNED_FORM_STATUSES)}) THEN 1 ELSE 0 END) AS unsigned,
             ${LAST_AT()} AS lastAt
      FROM AuthorizationForms
      GROUP BY ${CID()}`,
    evaluate: (row, client) => {
      const coreSigned = Number(row?.coreSigned) || 0;
      const unsigned = Number(row?.unsigned) || 0;
      const lastAt = row?.lastAt || null;
      const coreMissing = CORE_CONSENT_FORMS.length - coreSigned;
      if (!row || !row.total) return notEntered(client, 3, 'No forms started');
      if (coreMissing > 0) {
        const late = client.daysEnrolled === null || client.daysEnrolled > 3;
        const detail = `${coreSigned} of ${CORE_CONSENT_FORMS.length} core forms signed` +
          (unsigned ? `; ${plural(unsigned, 'form')} unsigned` : '');
        return { status: late ? 'incomplete' : 'pending', detail, lastAt };
      }
      if (unsigned > 0) return { status: 'incomplete', detail: `${plural(unsigned, 'form')} started but not signed`, lastAt };
      return { status: 'ok', detail: `${plural(row.total, 'form')} signed`, lastAt };
    },
  },
  {
    key: 'bioSocial',
    section: 3,
    label: 'Bio-Social Assessment',
    rule: 'Completed (marked Complete) within 14 days of admission.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN completionStatus = 'Complete' THEN 1 ELSE 0 END) AS complete,
             MAX(completionPercentage) AS pct,
             ${LAST_AT()} AS lastAt
      FROM BioSocialAssessment
      GROUP BY ${CID()}`,
    evaluate: assessmentCheck(14),
  },
  {
    key: 'mentalHealth',
    section: 3,
    label: 'Mental Health Assessment',
    rule: 'Completed (marked Complete) within 14 days of admission.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN completionStatus = 'Complete' THEN 1 ELSE 0 END) AS complete,
             MAX(completionPercentage) AS pct,
             ${LAST_AT()} AS lastAt
      FROM MentalHealthAssessments
      GROUP BY ${CID()}`,
    evaluate: assessmentCheck(14),
  },
  {
    key: 'reassessment',
    section: 3,
    label: 'Re-Assessment',
    rule: 'A re-assessment every 180 days after admission; the latest one must be marked Complete.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             MAX(COALESCE(CAST(dateLastReAssess AS DATETIME2), createdAt)) AS lastAt,
             SUM(CASE WHEN ISNULL(completionStatus, '') <> 'Complete' THEN 1 ELSE 0 END) AS unfinished
      FROM ReassessmentData
      GROUP BY ${CID()}`,
    evaluate: (row, client, ctx) => {
      const every = 180;
      if (!row || !row.total) {
        return notEntered(client, every, 'No re-assessment on file');
      }
      const lastAt = row.lastAt || null;
      if (row.unfinished > 0) {
        return { status: 'incomplete', detail: `${plural(row.unfinished, 're-assessment')} not marked Complete`, lastAt };
      }
      const age = daysSince(lastAt, ctx.today);
      if (age !== null && age > every) {
        return { status: 'overdue', detail: `Last re-assessment ${age} days ago (every ${every} days)`, lastAt };
      }
      return { status: 'ok', detail: `Last re-assessment ${fmtDate(lastAt)}`, lastAt };
    },
  },
  {
    key: 'assessmentPlan',
    section: 3,
    label: 'Assessment Care Plan',
    rule: 'An assessment care plan within 14 days of admission; flagged while not Complete, and overdue once past its expected completion date.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN assessmentStatus <> 'Complete' THEN 1 ELSE 0 END) AS open,
             SUM(CASE WHEN assessmentStatus <> 'Complete'
                       AND expectedCompletionDate < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS pastDue,
             ${LAST_AT()} AS lastAt
      FROM AssessmentCarePlans
      WHERE ISNULL(assessmentStatus, '') NOT IN ('Deleted', 'Cancelled')
      GROUP BY ${CID()}`,
    evaluate: (row, client) => {
      if (!row || !row.total) return notEntered(client, 14);
      const lastAt = row.lastAt || null;
      if (row.pastDue > 0) return { status: 'overdue', detail: `${plural(row.pastDue, 'plan')} past expected completion date`, lastAt };
      if (row.open > 0) return { status: 'incomplete', detail: `${plural(row.open, 'plan')} not Complete`, lastAt };
      return { status: 'ok', detail: 'Complete', lastAt };
    },
  },
  {
    key: 'carePlan',
    section: 4,
    label: 'Care Plan',
    rule: 'A care plan within 30 days of admission, reviewed at least every 90 days; drafts are flagged until submitted.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN submissionStatus = 'draft' THEN 1 ELSE 0 END) AS drafts,
             ${LAST_AT()} AS lastAt
      FROM CarePlans
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 30, staleDays: 90 }),
  },
  {
    key: 'encounterNotes',
    section: 4,
    label: 'Encounter Notes',
    rule: `${ENCOUNTER_NOTES_PER_WEEK} encounter notes per week (Mon–Sun); last week is checked. Drafts are flagged until submitted.`,
    sql: () => `
      SELECT ${CID('ClientID')} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN SubmissionStatus = 'draft' THEN 1 ELSE 0 END) AS drafts,
             SUM(CASE WHEN CareNoteDate >= @lastWeekStart AND CareNoteDate < @thisWeekStart THEN 1 ELSE 0 END) AS lastWeek,
             SUM(CASE WHEN CareNoteDate >= @thisWeekStart THEN 1 ELSE 0 END) AS thisWeek,
             MAX(CareNoteDate) AS lastAt
      FROM EncounterNotes
      GROUP BY ${CID('ClientID')}`,
    bind: (ctx) => [
      { name: 'lastWeekStart', type: sql.Date, value: ctx.lastWeekStart },
      { name: 'thisWeekStart', type: sql.Date, value: ctx.thisWeekStart },
    ],
    evaluate: (row, client, ctx) => {
      const lastAt = row?.lastAt || null;
      if (row?.drafts > 0) {
        return { status: 'incomplete', detail: `${plural(row.drafts, 'draft note')} not submitted`, lastAt };
      }
      // Only hold the client to last week's count if they were here all week
      const hereLastWeek = !client.admitDate || new Date(client.admitDate) < ctx.lastWeekStart;
      if (!hereLastWeek) {
        if (!row || !row.total) return { status: 'pending', detail: 'No notes yet (admitted this week or last)' };
        return { status: 'ok', detail: `${row.thisWeek} this week`, lastAt };
      }
      const lastWeek = Number(row?.lastWeek) || 0;
      if (lastWeek < ENCOUNTER_NOTES_PER_WEEK) {
        const age = daysSince(lastAt, ctx.today);
        return {
          status: !row || !row.total ? 'missing' : 'overdue',
          detail: `${lastWeek} of ${ENCOUNTER_NOTES_PER_WEEK} notes last week` +
            (age !== null ? `; last note ${age} days ago` : '; no notes on file'),
          lastAt,
        };
      }
      return { status: 'ok', detail: `${lastWeek} notes last week, ${row.thisWeek} this week`, lastAt };
    },
  },
];

function assessmentCheck(graceDays) {
  return (row, client) => {
    if (!row || !row.total) return notEntered(client, graceDays);
    const lastAt = row.lastAt || null;
    if (!row.complete) {
      const pct = row.pct !== null && row.pct !== undefined ? ` (${Math.round(row.pct)}% done)` : '';
      return { status: 'incomplete', detail: `Not marked Complete${pct}`, lastAt };
    }
    return { status: 'ok', detail: 'Complete', lastAt };
  };
}

// Section 5 notes and observation records lock on submit (isLocked = 1);
// isLocked = 0 means "Save Progress" only. See services/section5RecordLock.js.
const NURSING_CHECKS = [
  {
    key: 'medFaceSheet',
    section: 5,
    label: 'Medical Face Sheet',
    rule: 'Entered within 3 days of admission.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total, ${LAST_AT()} AS lastAt
      FROM medical_face_sheet
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 3 }),
  },
  {
    key: 'nursingScreening',
    section: 5,
    label: 'Nursing Screening',
    rule: 'Entered within 3 days of admission.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total, ${LAST_AT()} AS lastAt
      FROM medical_screening
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 3 }),
  },
  {
    key: 'nursingAssessment',
    section: 5,
    label: 'Nursing Assessment',
    rule: 'Nursing admission assessment entered within 3 days of admission.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total, ${LAST_AT()} AS lastAt
      FROM nursing_admission
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 3 }),
  },
  {
    key: 'progressNotes',
    section: 5,
    label: 'Progress Notes',
    rule: 'A progress note at least every 30 days; notes saved but not submitted are flagged.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN ISNULL(isLocked, 0) = 0 THEN 1 ELSE 0 END) AS drafts,
             ${LAST_AT()} AS lastAt
      FROM dbo.progress_notes
      WHERE ISNULL(noteStatus, '') <> 'Archived'
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 30, staleDays: 30, draftLabel: 'note' }),
  },
  {
    key: 'nursingIdt',
    section: 5,
    label: 'Nursing IDT Notes',
    rule: 'A nursing IDT note at least every 30 days; notes saved but not submitted are flagged.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN ISNULL(isLocked, 0) = 0 THEN 1 ELSE 0 END) AS drafts,
             ${LAST_AT()} AS lastAt
      FROM dbo.idt_nursing_notes
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 30, staleDays: 30, draftLabel: 'note' }),
  },
  {
    key: 'providerIdt',
    section: 5,
    label: 'Provider IDT Notes',
    rule: 'A provider IDT note at least every 30 days; notes saved but not submitted are flagged.',
    sql: () => `
      SELECT ${CID()} AS clientID, COUNT(*) AS total,
             SUM(CASE WHEN ISNULL(isLocked, 0) = 0 THEN 1 ELSE 0 END) AS drafts,
             ${LAST_AT()} AS lastAt
      FROM dbo.idt_provider_notes
      GROUP BY ${CID()}`,
    evaluate: recordCheck({ graceDays: 30, staleDays: 30, draftLabel: 'note' }),
  },
  {
    key: 'observationRecord',
    section: 5,
    label: 'Observation Records',
    rule: 'Medication administration, vital signs and daily observation entries saved but not submitted. Not required for every client.',
    // vital_signs has no updatedAt; submitting stamps submittedAt
    sql: () => `
      SELECT clientID, SUM(total) AS total, SUM(drafts) AS drafts, MAX(lastAt) AS lastAt
      FROM (
        SELECT ${CID()} AS clientID, COUNT(*) AS total,
               SUM(CASE WHEN ISNULL(isLocked, 0) = 0 THEN 1 ELSE 0 END) AS drafts,
               ${LAST_AT()} AS lastAt
        FROM dbo.medication_administration_record GROUP BY ${CID()}
        UNION ALL
        SELECT ${CID()}, COUNT(*),
               SUM(CASE WHEN ISNULL(isLocked, 0) = 0 THEN 1 ELSE 0 END),
               ${LAST_AT('createdAt', 'submittedAt')}
        FROM dbo.vital_signs GROUP BY ${CID()}
        UNION ALL
        SELECT ${CID()}, COUNT(*),
               SUM(CASE WHEN ISNULL(isLocked, 0) = 0 THEN 1 ELSE 0 END),
               ${LAST_AT()}
        FROM dbo.daily_observations GROUP BY ${CID()}
      ) t
      GROUP BY clientID`,
    evaluate: recordCheck({ required: false, draftLabel: 'entry' }),
  },
];

const AREAS = {
  behavioral: { label: 'Behavioral Health (Sections 1–4)', checks: BEHAVIORAL_CHECKS },
  nursing: { label: 'Nursing (Section 5)', checks: NURSING_CHECKS },
};

const GAP_STATUSES = ['missing', 'incomplete', 'overdue'];

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

// Clients enrolled today (admitted, not discharged)
async function loadActiveClients(pool) {
  const result = await pool.request().query(`
    SELECT ${CID('c.clientID')} AS clientID,
           c.clientFirstName AS firstName,
           c.clientLastName AS lastName,
           ISNULL(NULLIF(LTRIM(RTRIM(c.clientSite)), ''), 'Unassigned') AS site,
           CAST(c.clientAdmitDate AS DATE) AS admitDate
    FROM Clients c
    LEFT JOIN ClientDischarge d ON ${CID('d.clientID')} = ${CID('c.clientID')}
    WHERE (c.clientAdmitDate IS NULL OR CAST(c.clientAdmitDate AS DATE) <= CAST(GETDATE() AS DATE))
      AND (d.clientDischargeDate IS NULL OR CAST(d.clientDischargeDate AS DATE) > CAST(GETDATE() AS DATE))
  `);
  return result.recordset;
}

// clientID -> row for one check; null if the query failed
async function loadCheck(pool, check, ctx) {
  try {
    const request = pool.request();
    (check.bind ? check.bind(ctx) : []).forEach((p) => request.input(p.name, p.type, p.value));
    const result = await request.query(check.sql());
    const byClient = new Map();
    result.recordset.forEach((row) => {
      if (row.clientID !== null && row.clientID !== undefined) byClient.set(String(row.clientID), row);
    });
    return byClient;
  } catch (err) {
    console.error(`❌ Documentation report: ${check.key} failed:`, err.message);
    return null;
  }
}

// Monday 00:00 of the week containing `date`
const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

function buildContext(now = new Date()) {
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  return { today: now, thisWeekStart, lastWeekStart };
}

async function buildReport(pool, areaKey, now) {
  const area = AREAS[areaKey];
  const ctx = buildContext(now);

  const [clients, checkData] = await Promise.all([
    loadActiveClients(pool),
    Promise.all(area.checks.map((check) => loadCheck(pool, check, ctx))),
  ]);

  const byCheck = Object.fromEntries(area.checks.map((c) => [
    c.key, { missing: 0, incomplete: 0, overdue: 0, pending: 0, ok: 0 },
  ]));

  const rows = clients.map((c) => {
    const client = {
      clientID: String(c.clientID),
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      site: c.site,
      admitDate: fmtDate(c.admitDate),
      daysEnrolled: c.admitDate ? daysSince(c.admitDate, ctx.today) : null,
    };

    const items = {};
    area.checks.forEach((check, i) => {
      const data = checkData[i];
      let item;
      if (!data) {
        item = { status: 'error', detail: 'Could not be checked' };
      } else {
        try {
          item = check.evaluate(data.get(client.clientID) || null, client, ctx);
        } catch (err) {
          console.error(`❌ Documentation report: evaluating ${check.key} for ${client.clientID} failed:`, err.message);
          item = { status: 'error', detail: 'Could not be checked' };
        }
      }
      item.lastAt = item.lastAt ? new Date(item.lastAt).toISOString() : null;
      items[check.key] = item;
      if (byCheck[check.key][item.status] !== undefined) byCheck[check.key][item.status] += 1;
    });

    const gapCount = Object.values(items).filter((it) => GAP_STATUSES.includes(it.status)).length;
    return { ...client, items, gapCount };
  });

  rows.sort((a, b) => b.gapCount - a.gapCount
    || a.lastName.localeCompare(b.lastName)
    || a.firstName.localeCompare(b.firstName));

  return {
    area: areaKey,
    label: area.label,
    generatedAt: ctx.today.toISOString(),
    checks: area.checks.map(({ key, section, label, rule }) => ({ key, section, label, rule })),
    failedChecks: area.checks.filter((_, i) => !checkData[i]).map((c) => c.key),
    summary: {
      activeClients: rows.length,
      clientsWithGaps: rows.filter((r) => r.gapCount > 0).length,
      byCheck,
    },
    clients: rows,
  };
}

// Viewing a client-level PHI report is an auditable event. Never blocks the
// response: a failed audit write is logged and the report still returns.
async function recordView(pool, req, areaKey, clientCount) {
  try {
    await pool.request()
      .input('userID', sql.NVarChar(100), req.user?.email || req.user?.userId || 'unknown')
      .input('userName', sql.NVarChar(255), req.user?.name || null)
      .input('action', sql.NVarChar(50), 'VIEW_REPORT')
      .input('tableName', sql.NVarChar(100), 'DocumentationReport')
      .input('recordID', sql.NVarChar(100), areaKey)
      .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ report: `documentation/${areaKey}`, clientCount }))
      .input('timestamp', sql.DateTime2, new Date())
      .query(`INSERT INTO dbo.AuditLog (userID, userName, action, tableName, recordID, newValues, timestamp)
              VALUES (@userID, @userName, @action, @tableName, @recordID, @newValues, @timestamp)`);
  } catch (err) {
    console.error('❌ Documentation report: audit write failed:', err.message);
  }
}

router.get('/:area', async (req, res) => {
  const areaKey = req.params.area;
  if (!AREAS[areaKey]) {
    return res.status(404).json({ error: `Unknown report area: ${areaKey}` });
  }

  try {
    const pool = await getPool();
    const report = await buildReport(pool, areaKey);
    await recordView(pool, req, areaKey, report.clients.length);
    res.set('Cache-Control', 'no-store');
    res.json(report);
  } catch (err) {
    console.error(`❌ Documentation report (${areaKey}) failed:`, err);
    res.status(500).json({ error: 'Failed to build documentation report' });
  }
});

module.exports = router;
module.exports.AREAS = AREAS;
module.exports.buildReport = buildReport;
module.exports.buildContext = buildContext;
