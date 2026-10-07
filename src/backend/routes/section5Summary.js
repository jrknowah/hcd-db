// routes/section5Summary.js
// GET /api/section5/summary/:clientID - what the Section 5 "Main" tab shows:
// for each tab, whether it has data, when it was last entered or changed, and by whom.
//
// Each table is queried on its own so a missing table or column only blanks
// that one tab instead of failing the whole summary.
const express = require('express');
const sql = require('mssql');
const { getPool } = require('../store/azureSql');

const router = express.Router();

// "Last activity" = the later of createdAt and updatedAt (updatedAt may be NULL)
const LAST_AT = 'CASE WHEN updatedAt > createdAt THEN updatedAt ELSE createdAt END';
const LAST_BY = 'CASE WHEN updatedAt > createdAt THEN COALESCE(updatedBy, createdBy) ELSE createdBy END';

// One source table: count plus the most recent activity
const source = (table, { where = '', lastAt = LAST_AT, lastBy = LAST_BY } = {}) => ({ table, where, lastAt, lastBy });

// Tab key -> tables feeding it (Nursing Archive is blob storage, not a table)
const SECTIONS = [
  { key: 'faceSheet', label: 'Medical Face Sheet', sources: [source('medical_face_sheet'), source('medical_appointments')] },
  { key: 'nursingScreening', label: 'Nursing Screening', sources: [source('medical_screening')] },
  { key: 'nursingAssessment', label: 'Nursing Assessment', sources: [source('nursing_admission')] },
  {
    key: 'progressNotes', label: 'Progress Notes',
    sources: [source('dbo.progress_notes', { where: "AND ISNULL(noteStatus, '') <> 'Archived'" })],
  },
  {
    key: 'observationRecord', label: 'Medical Observation Record',
    sources: [
      source('medication_administration_record'),
      // vital_signs has no updatedAt/updatedBy; submitting stamps submittedAt/By
      source('vital_signs', {
        lastAt: 'CASE WHEN submittedAt > createdAt THEN submittedAt ELSE createdAt END',
        lastBy: 'CASE WHEN submittedAt > createdAt THEN COALESCE(submittedBy, recordedBy) ELSE recordedBy END',
      }),
      source('daily_observations'),
    ],
  },
  { key: 'nursingIdt', label: 'Nursing IDT Notes', sources: [source('idt_nursing_notes')] },
  { key: 'providerIdt', label: 'Provider IDT Notes', sources: [source('dbo.idt_provider_notes')] },
  { key: 'dischargePlan', label: 'Discharge Plan', sources: [source('dbo.discharge_plan')] },
];

async function summarizeSource(pool, clientID, src) {
  const result = await pool.request()
    .input('clientID', sql.NVarChar(50), clientID)
    .query(`
      SELECT TOP 1 COUNT(*) OVER () AS total, ${src.lastAt} AS lastAt, ${src.lastBy} AS lastBy
      FROM ${src.table}
      WHERE clientID = @clientID ${src.where}
      ORDER BY lastAt DESC
    `);
  // No rows means no data for this client
  const row = result.recordset[0] || {};
  return { total: Number(row.total) || 0, lastAt: row.lastAt || null, lastBy: row.lastBy || null };
}

async function summarizeSection(pool, clientID, section) {
  const parts = await Promise.all(section.sources.map(src =>
    summarizeSource(pool, clientID, src).catch(err => {
      console.error(`❌ Section 5 summary: ${src.table} failed:`, err.message);
      return null;
    })
  ));
  const ok = parts.filter(Boolean);
  const latest = ok
    .filter(p => p.lastAt)
    .sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))[0];
  const total = ok.reduce((sum, p) => sum + p.total, 0);

  return {
    key: section.key,
    label: section.label,
    hasData: total > 0,
    total,
    lastUpdatedAt: latest?.lastAt || null,
    lastUpdatedBy: latest?.lastBy || null,
    // Every source failed: say "unknown" rather than "no data"
    error: ok.length === 0,
  };
}

router.get('/summary/:clientID', async (req, res) => {
  const { clientID } = req.params;
  if (!clientID || clientID.length > 50) {
    return res.status(400).json({ success: false, message: 'Invalid client ID' });
  }

  try {
    const pool = await getPool();
    const sections = await Promise.all(SECTIONS.map(s => summarizeSection(pool, clientID, s)));
    res.json({ success: true, clientID, sections });
  } catch (err) {
    console.error('❌ Error building Section 5 summary:', err);
    res.status(500).json({ success: false, message: 'Failed to load Section 5 summary', error: err.message });
  }
});

module.exports = router;
