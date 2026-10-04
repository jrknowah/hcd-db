// services/section5RecordLock.js
// Section 5 notes and observation records lock once submitted.
//
// Staff can "Save Progress" (isLocked = 0) as often as they like. "Submit"
// saves and sets isLocked = 1; after that every update or delete is refused
// with 409 RECORD_LOCKED until an IT Admin or Level 1 user unlocks the record
// (routes/section5Lock.js). Requires store/dbScripts/Section5RecordLock.sql.
const sql = require('mssql');

// recordType (URL segment) -> table holding it
const RECORD_TYPES = {
  'progress-note':     { table: 'dbo.progress_notes',                   idColumn: 'id',            idType: sql.Int,    label: 'Progress note' },
  'idt-nursing':       { table: 'dbo.idt_nursing_notes',                idColumn: 'idtNursingID',  idType: sql.Int,    label: 'IDT nursing note' },
  'idt-provider':      { table: 'dbo.idt_provider_notes',               idColumn: 'id',            idType: sql.Int,    label: 'IDT provider note' },
  'medication-admin':  { table: 'dbo.medication_administration_record', idColumn: 'marID',         idType: sql.BigInt, label: 'Medication administration record' },
  'vital-signs':       { table: 'dbo.vital_signs',                      idColumn: 'vitalSignID',   idType: sql.BigInt, label: 'Vital signs record' },
  'daily-observation': { table: 'dbo.daily_observations',               idColumn: 'observationID', idType: sql.BigInt, label: 'Daily observation' },
};

// Request fields the client must never set directly
const LOCK_FIELDS = ['submit', 'isLocked', 'submittedBy', 'submittedAt', 'unlockedBy', 'unlockedAt', 'unlockReason'];

const isSubmit = (body) => body?.submit === true || body?.submit === 'true';

// Prefer the authenticated user; these routes may also run without auth
const actingUser = (req, fallback) => req.user?.email || req.user?.name || fallback || 'system';

/**
 * Bind @isLocked, @submittedBy and @submittedAt for an INSERT or UPDATE.
 * Save Progress clears submittedBy/At; Submit stamps them.
 */
const bindSubmitInputs = (request, req, fallbackUser) => {
  const submit = isSubmit(req.body);
  request.input('isLocked', sql.Bit, submit ? 1 : 0);
  request.input('submittedBy', sql.NVarChar(255), submit ? actingUser(req, fallbackUser) : null);
  request.input('submittedAt', sql.DateTime2, submit ? new Date() : null);
  return submit;
};

const lockedResponse = (res, recordType) => res.status(409).json({
  success: false,
  code: 'RECORD_LOCKED',
  error: 'Record locked',
  message: `This ${(RECORD_TYPES[recordType]?.label || 'record').toLowerCase()} has been submitted and is locked. An IT Admin or Level 1 user must unlock it before it can be changed.`,
});

/** { exists, isLocked } for one record. */
const getLockState = async (pool, recordType, id) => {
  const cfg = RECORD_TYPES[recordType];
  const result = await pool.request()
    .input('id', cfg.idType, id)
    .query(`SELECT ISNULL(isLocked, 0) AS isLocked FROM ${cfg.table} WHERE ${cfg.idColumn} = @id`);
  const row = result.recordset[0];
  return { exists: !!row, isLocked: !!row?.isLocked };
};

/**
 * Express middleware for PUT/DELETE routes: answers 409 when the record named
 * by req.params[param] is locked. The routes also add `AND ISNULL(isLocked, 0) = 0`
 * to their WHERE clause so a record submitted between this check and the
 * write is still protected.
 */
const rejectIfLocked = (recordType, param, getPool) => async (req, res, next) => {
  try {
    const pool = await getPool();
    const state = await getLockState(pool, recordType, req.params[param]);
    if (state.isLocked) return lockedResponse(res, recordType);
    next();
  } catch (err) {
    console.error(`❌ Lock check failed for ${recordType}:`, err);
    res.status(500).json({ success: false, error: 'Lock check failed', message: err.message });
  }
};

module.exports = {
  RECORD_TYPES,
  LOCK_FIELDS,
  isSubmit,
  actingUser,
  bindSubmitInputs,
  lockedResponse,
  getLockState,
  rejectIfLocked,
};
