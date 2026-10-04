// routes/section5Lock.js
// POST /api/section5/records/:recordType/:id/unlock
//
// Re-opens a submitted (locked) Section 5 note or observation record. Mounted
// behind authMiddleware; only IT Admin / Level 1 may call it. The submitted
// version is copied to Section5RecordVersions first, so what was submitted is
// never lost.
const express = require('express');
const sql = require('mssql');
const { getPool } = require('../store/azureSql');
const { requireSignedFormUnlock } = require('../middleware/signedFormUnlock');
const { RECORD_TYPES, actingUser } = require('../services/section5RecordLock');

const router = express.Router();

router.post('/records/:recordType/:id/unlock', requireSignedFormUnlock, async (req, res) => {
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
    return res.status(422).json({ message: 'A reason between 5 and 500 characters is required to unlock a submitted record' });
  }

  const currentUser = actingUser(req);
  const now = new Date();
  let clientID = null;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // UPDLOCK so a concurrent save or unlock can't slip in between read and write
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
        .input('recordType',   sql.NVarChar(50),      recordType)
        .input('recordID',     sql.BigInt,            id)
        .input('clientID',     sql.NVarChar(50),      clientID)
        .input('snapshot',     sql.NVarChar(sql.MAX), JSON.stringify(record))
        .input('submittedBy',  sql.NVarChar(255),     record.submittedBy || null)
        .input('submittedAt',  sql.DateTime2,         record.submittedAt || null)
        .input('archivedBy',   sql.NVarChar(255),     currentUser)
        .input('archivedAt',   sql.DateTime2,         now)
        .input('unlockReason', sql.NVarChar(500),     reason)
        .query(`
          INSERT INTO dbo.Section5RecordVersions
            (recordType, recordID, clientID, snapshot, submittedBy, submittedAt,
             archivedReason, archivedBy, archivedAt, unlockReason)
          VALUES
            (@recordType, @recordID, @clientID, @snapshot, @submittedBy, @submittedAt,
             'unlock', @archivedBy, @archivedAt, @unlockReason)
        `);

      await transaction.request()
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
        `);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }

    // Admin audit trail. The reason is free text that may contain PHI, so it
    // stays in the record / Section5RecordVersions only. Failure here is non-fatal.
    try {
      await pool.request()
        .input('userID',    sql.NVarChar(100),     currentUser)
        .input('action',    sql.NVarChar(50),      'UNLOCK_SECTION5_RECORD')
        .input('tableName', sql.NVarChar(100),     cfg.table.replace(/^dbo\./, ''))
        .input('recordID',  sql.NVarChar(100),     String(id))
        .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ recordType, recordID: String(id), clientID }))
        .input('timestamp', sql.DateTime2,         now)
        .query(`INSERT INTO dbo.AuditLog (userID, action, tableName, recordID, newValues, timestamp)
                VALUES (@userID, @action, @tableName, @recordID, @newValues, @timestamp)`);
    } catch (auditErr) {
      console.error('⚠️ Could not write unlock to AuditLog:', auditErr.message);
    }

    res.json({
      success: true,
      message: `${cfg.label} unlocked`,
      recordType,
      id: String(id),
      isLocked: false,
      unlockedBy: currentUser,
      unlockedAt: now.toISOString(),
    });
  } catch (err) {
    console.error(`❌ Error unlocking ${recordType} ${id}:`, err);
    res.status(500).json({ message: 'Failed to unlock record', error: err.message });
  }
});

module.exports = router;
