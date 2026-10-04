// utils/section4Lock.js
// Section 4 encounter notes and care plans are saved as 'draft' (progress) or
// 'submitted'. Submitted records are locked: only an IT Admin / Level 1 unlock
// (which archives the submitted version) returns them to draft.
const sql = require('mssql');

const DRAFT = 'draft';
const SUBMITTED = 'submitted';

// Fail closed: anything that isn't an explicit draft is locked.
const isSubmitted = (status) => status !== DRAFT;

// The client asks to submit with { submit: true }; anything else saves progress.
const wantsSubmit = (body) => body?.submit === true || body?.submit === 'true';

const lockedResponse = (res, what) => res.status(409).json({
  code: 'RECORD_LOCKED',
  message: `This ${what} has been submitted and is locked. An IT Admin or Level 1 user must unlock it before it can be changed.`,
});

// Authenticated user (set by middleware/auth.js)
const getCurrentUser = (req) => req.user?.email || req.user?.name || 'system';

const parseUnlockReason = (body) => {
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  return reason.length >= 5 && reason.length <= 500 ? reason : null;
};

// Keep the submitted version exactly as it was before an unlock re-opens it
const archiveSubmittedVersion = (transaction, {
  recordType, recordID, clientID, snapshot, submittedBy, submittedAt, archivedBy, archivedAt, unlockReason,
}) => transaction.request()
  .input('recordType',   sql.NVarChar(30),      recordType)
  .input('recordID',     sql.NVarChar(100),     String(recordID))
  .input('clientID',     sql.NVarChar(50),      clientID)
  .input('snapshot',     sql.NVarChar(sql.MAX), JSON.stringify(snapshot))
  .input('submittedBy',  sql.NVarChar(255),     submittedBy || null)
  .input('submittedAt',  sql.DateTime2,         submittedAt || null)
  .input('archivedBy',   sql.NVarChar(255),     archivedBy)
  .input('archivedAt',   sql.DateTime2,         archivedAt)
  .input('unlockReason', sql.NVarChar(500),     unlockReason)
  .query(`
    INSERT INTO dbo.Section4RecordVersions
      (recordType, recordID, clientID, snapshot, submittedBy, submittedAt,
       archivedReason, archivedBy, archivedAt, unlockReason)
    VALUES
      (@recordType, @recordID, @clientID, @snapshot, @submittedBy, @submittedAt,
       'unlock', @archivedBy, @archivedAt, @unlockReason)
  `);

// Admin audit trail. The reason is free text that may contain PHI, so it stays
// on the record and in Section4RecordVersions only. Failure here is non-fatal.
const auditUnlock = async (pool, { userID, tableName, recordID, clientID, timestamp }) => {
  try {
    await pool.request()
      .input('userID',    sql.NVarChar(100),     userID)
      .input('action',    sql.NVarChar(50),      'UNLOCK_SUBMITTED_RECORD')
      .input('tableName', sql.NVarChar(100),     tableName)
      .input('recordID',  sql.NVarChar(100),     String(recordID))
      .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ clientID, recordID: String(recordID) }))
      .input('timestamp', sql.DateTime2,         timestamp)
      .query(`INSERT INTO dbo.AuditLog (userID, action, tableName, recordID, newValues, timestamp)
              VALUES (@userID, @action, @tableName, @recordID, @newValues, @timestamp)`);
  } catch (auditErr) {
    console.warn('Audit log failed (non-fatal):', auditErr.message);
  }
};

module.exports = {
  DRAFT,
  SUBMITTED,
  isSubmitted,
  wantsSubmit,
  lockedResponse,
  getCurrentUser,
  parseUnlockReason,
  archiveSubmittedVersion,
  auditUnlock,
};
