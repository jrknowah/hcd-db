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

// Keep a copy of the record exactly as it was before an unlock re-opens it
// ('unlock') or an IT Admin / Level 1 user deletes it ('delete')
const archiveVersion = (transaction, {
  action, recordType, recordID, clientID, snapshot, submittedBy, submittedAt, archivedBy, archivedAt, reason,
}) => transaction.request()
  .input('recordType',     sql.NVarChar(30),      recordType)
  .input('recordID',       sql.NVarChar(100),     String(recordID))
  .input('clientID',       sql.NVarChar(50),      clientID)
  .input('snapshot',       sql.NVarChar(sql.MAX), JSON.stringify(snapshot))
  .input('submittedBy',    sql.NVarChar(255),     submittedBy || null)
  .input('submittedAt',    sql.DateTime2,         submittedAt || null)
  .input('archivedReason', sql.NVarChar(50),      action)
  .input('archivedBy',     sql.NVarChar(255),     archivedBy)
  .input('archivedAt',     sql.DateTime2,         archivedAt)
  .input('reason',         sql.NVarChar(500),     reason || null)
  .query(`
    INSERT INTO dbo.Section4RecordVersions
      (recordType, recordID, clientID, snapshot, submittedBy, submittedAt,
       archivedReason, archivedBy, archivedAt, reason)
    VALUES
      (@recordType, @recordID, @clientID, @snapshot, @submittedBy, @submittedAt,
       @archivedReason, @archivedBy, @archivedAt, @reason)
  `);

// Audit trail row for the Admin > Audit page: who (email + display name),
// what, which record and which client. Written inside the caller's
// transaction, so an unlock or delete never happens without its audit row.
// The reason is free text that may contain PHI, so it stays in
// Section4RecordVersions and is never written here.
const auditAction = (transaction, { action, req, tableName, recordID, clientID, details = {}, timestamp }) =>
  transaction.request()
    .input('userID',    sql.NVarChar(100),     getCurrentUser(req))
    .input('userName',  sql.NVarChar(255),     req.user?.name || null)
    .input('action',    sql.NVarChar(50),      action)
    .input('tableName', sql.NVarChar(100),     tableName)
    .input('recordID',  sql.NVarChar(100),     String(recordID))
    .input('clientID',  sql.NVarChar(50),      clientID || null)
    .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ clientID, recordID: String(recordID), ...details }))
    .input('timestamp', sql.DateTime2,         timestamp)
    .query(`INSERT INTO dbo.AuditLog (userID, userName, action, tableName, recordID, clientID, newValues, timestamp)
            VALUES (@userID, @userName, @action, @tableName, @recordID, @clientID, @newValues, @timestamp)`);

const deleteNotPermittedResponse = (res, what) => res.status(403).json({
  code: 'DELETE_NOT_PERMITTED',
  message: `Only IT Admin or Level 1 users can delete a submitted ${what}.`,
});

module.exports = {
  DRAFT,
  SUBMITTED,
  isSubmitted,
  wantsSubmit,
  lockedResponse,
  getCurrentUser,
  parseUnlockReason,
  archiveVersion,
  auditAction,
  deleteNotPermittedResponse,
};
