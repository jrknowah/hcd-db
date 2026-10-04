// routes/section5Lock.js
// Admin actions on submitted (locked) Section 5 notes and observation records:
//   POST   /api/section5/records/:recordType/:id/unlock  - re-open for editing
//   DELETE /api/section5/records/:recordType/:id         - delete it
//
// Mounted behind authMiddleware; only IT Admin / Level 1 may call either. Both
// need a reason and first copy the submitted row to Section5RecordVersions, so
// what was submitted is never lost.
const express = require('express');
const sql = require('mssql');
const { getPool } = require('../store/azureSql');
const { requireUnlockPermission, canUnlockSignedForms } = require('../middleware/signedFormUnlock');
const { RECORD_TYPES, actingUser } = require('../services/section5RecordLock');

const router = express.Router();

// Same groups as unlock, with a delete-specific refusal
const requireDeletePermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  if (!canUnlockSignedForms(req.user)) {
    return res.status(403).json({
      code: 'DELETE_NOT_PERMITTED',
      message: 'Only IT Admin or Level 1 users can delete a submitted record.',
    });
  }
  next();
};

const ACTIONS = {
  unlock: { verb: 'unlock', done: 'unlocked', audit: 'UNLOCK_SECTION5_RECORD' },
  delete: { verb: 'delete', done: 'deleted',  audit: 'DELETE_SECTION5_RECORD' },
};

/**
 * Validate, lock the row, archive it, then let `apply` unlock or delete it.
 * Sends the response.
 */
async function archiveAndApply(req, res, action, apply) {
  const { recordType, id } = req.params;
  const cfg = RECORD_TYPES[recordType];
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  if (!cfg) {
    return res.status(400).json({ message: `Invalid record type: ${recordType}` });
  }
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ message: 'Invalid record id' });
  }
  if (reason.length < 5 || reason.length > 500) {
    return res.status(422).json({ message: `A reason between 5 and 500 characters is required to ${action.verb} a submitted record` });
  }

  const currentUser = actingUser(req);
  const now = new Date();
  let clientID = null;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // UPDLOCK so a concurrent save, unlock or delete can't slip in between read and write
      const existing = await transaction.request()
        .input('id', cfg.idType, id)
        .query(`SELECT * FROM ${cfg.table} WITH (UPDLOCK, HOLDLOCK) WHERE ${cfg.idColumn} = @id`);

      const record = existing.recordset[0];
      if (!record) {
        await transaction.rollback();
        return res.status(404).json({ message: `${cfg.label} not found` });
      }
      if (!record.isLocked) {
        await transaction.rollback();
        return res.status(409).json({ code: 'RECORD_NOT_LOCKED', message: `${cfg.label} is not submitted or locked` });
      }
      clientID = record.clientID || null;

      // Keep the submitted version exactly as it was
      await transaction.request()
        .input('recordType',     sql.NVarChar(50),      recordType)
        .input('recordID',       sql.BigInt,            id)
        .input('clientID',       sql.NVarChar(50),      clientID)
        .input('snapshot',       sql.NVarChar(sql.MAX), JSON.stringify(record))
        .input('submittedBy',    sql.NVarChar(255),     record.submittedBy || null)
        .input('submittedAt',    sql.DateTime2,         record.submittedAt || null)
        .input('archivedReason', sql.NVarChar(50),      action.verb)
        .input('archivedBy',     sql.NVarChar(255),     currentUser)
        .input('archivedAt',     sql.DateTime2,         now)
        .input('unlockReason',   sql.NVarChar(500),     reason)
        .query(`
          INSERT INTO dbo.Section5RecordVersions
            (recordType, recordID, clientID, snapshot, submittedBy, submittedAt,
             archivedReason, archivedBy, archivedAt, unlockReason)
          VALUES
            (@recordType, @recordID, @clientID, @snapshot, @submittedBy, @submittedAt,
             @archivedReason, @archivedBy, @archivedAt, @unlockReason)
        `);

      await apply(transaction, cfg, { id, currentUser, now, reason });

      // Audit trail for Admin > Audit, in the same transaction so an unlock or
      // delete never happens without its audit row. The reason is free text
      // that may contain PHI, so it stays in Section5RecordVersions only.
      await transaction.request()
        .input('userID',    sql.NVarChar(100),     currentUser)
        .input('userName',  sql.NVarChar(255),     req.user?.name || null)
        .input('action',    sql.NVarChar(50),      action.audit)
        .input('tableName', sql.NVarChar(100),     cfg.table.replace(/^dbo\./, ''))
        .input('recordID',  sql.NVarChar(100),     String(id))
        .input('clientID',  sql.NVarChar(50),      clientID)
        .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ recordType, recordID: String(id), clientID }))
        .input('timestamp', sql.DateTime2,         now)
        .query(`INSERT INTO dbo.AuditLog (userID, userName, action, tableName, recordID, clientID, newValues, timestamp)
                VALUES (@userID, @userName, @action, @tableName, @recordID, @clientID, @newValues, @timestamp)`);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }

    res.json({
      success: true,
      message: `${cfg.label} ${action.done}`,
      recordType,
      id: String(id),
      ...(action === ACTIONS.unlock && { isLocked: false }),
      [`${action.done}By`]: currentUser,
      [`${action.done}At`]: now.toISOString(),
    });
  } catch (err) {
    console.error(`❌ Error trying to ${action.verb} ${recordType} ${id}:`, err);
    res.status(500).json({ message: `Failed to ${action.verb} record`, error: err.message });
  }
}

router.post('/records/:recordType/:id/unlock', requireUnlockPermission('a submitted record'), (req, res) =>
  archiveAndApply(req, res, ACTIONS.unlock, (transaction, cfg, { id, currentUser, now, reason }) =>
    transaction.request()
      .input('id',           cfg.idType,         id)
      .input('unlockedBy',   sql.NVarChar(255),  currentUser)
      .input('unlockedAt',   sql.DateTime2,      now)
      .input('unlockReason', sql.NVarChar(500),  reason)
      .query(`
        UPDATE ${cfg.table}
        SET isLocked     = 0,
            unlockedBy   = @unlockedBy,
            unlockedAt   = @unlockedAt,
            unlockReason = @unlockReason
        WHERE ${cfg.idColumn} = @id
      `)
  )
);

router.delete('/records/:recordType/:id', requireDeletePermission, (req, res) =>
  archiveAndApply(req, res, ACTIONS.delete, (transaction, cfg, { id }) =>
    transaction.request()
      .input('id', cfg.idType, id)
      .query(`DELETE FROM ${cfg.table} WHERE ${cfg.idColumn} = @id`)
  )
);

module.exports = router;
