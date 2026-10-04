// routes/nursingArchiveUploads.js
// Who uploaded each Section 5 Nursing Archive file:
//   POST /api/section5/archive-uploads           - record an upload just made
//   GET  /api/section5/archive-uploads/:clientID - uploaders of a client's files
//
// The file itself goes to blob storage through the shared /api/upload route,
// which has no sign-in, so the Archive tab calls POST right after. Mounted
// behind authMiddleware: the uploader comes from the sign-in token, never the
// request body. Each upload is saved to dbo.NursingArchiveUploads and
// dbo.AuditLog in one transaction. Requires store/dbScripts/NursingArchiveUploads.sql.
const express = require('express');
const sql = require('mssql');
const { getPool } = require('../store/azureSql');

const router = express.Router();

// Mirrors sanitizeSegment() in routes/files.js (blob folder for a clientID)
const sanitizeSegment = (s) => String(s || '').replace(/[^\w\- ]+/g, '_').trim().replace(/\s+/g, '_');

// Nursing Archive blobs are stored at {clientID}/S5__{category}/{file}
const isNursingBlobFor = (clientID, blobName) =>
  [sanitizeSegment(clientID), clientID].some(prefix => blobName.startsWith(`${prefix}/S5__`));

const str = (v, max) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

router.post('/archive-uploads', async (req, res) => {
  const clientID = str(req.body?.clientID, 50);
  const blobName = str(req.body?.blobName, 1024);
  const fileName = str(req.body?.fileName, 255);
  const docType = str(req.body?.docType, 255);

  if (!clientID || !blobName) {
    return res.status(400).json({ success: false, message: 'clientID and blobName are required' });
  }
  if (!isNursingBlobFor(clientID, blobName)) {
    return res.status(400).json({ success: false, message: 'blobName is not a Nursing Archive file for this client' });
  }

  const uploadedBy = req.user?.email || req.user?.name;
  if (!uploadedBy) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
  }
  const uploadedByName = req.user?.name || null;
  const now = new Date();

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    let row;
    try {
      const inserted = await transaction.request()
        .input('clientID',       sql.NVarChar(50),   clientID)
        .input('blobName',       sql.NVarChar(1024), blobName)
        .input('fileName',       sql.NVarChar(255),  fileName)
        .input('docType',        sql.NVarChar(255),  docType)
        .input('uploadedBy',     sql.NVarChar(255),  uploadedBy)
        .input('uploadedByName', sql.NVarChar(255),  uploadedByName)
        .input('uploadedAt',     sql.DateTime2,      now)
        .query(`
          INSERT INTO dbo.NursingArchiveUploads
            (clientID, blobName, fileName, docType, uploadedBy, uploadedByName, uploadedAt)
          OUTPUT INSERTED.*
          VALUES (@clientID, @blobName, @fileName, @docType, @uploadedBy, @uploadedByName, @uploadedAt)
        `);
      row = inserted.recordset[0];

      // File names can contain PHI, so the audit row only references the upload
      await transaction.request()
        .input('userID',    sql.NVarChar(100),     uploadedBy)
        .input('userName',  sql.NVarChar(255),     uploadedByName)
        .input('action',    sql.NVarChar(50),      'UPLOAD_NURSING_ARCHIVE')
        .input('tableName', sql.NVarChar(100),     'NursingArchiveUploads')
        .input('recordID',  sql.NVarChar(100),     String(row?.uploadID ?? ''))
        .input('clientID',  sql.NVarChar(50),      clientID)
        .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ uploadID: row?.uploadID ?? null, clientID, docType }))
        .input('timestamp', sql.DateTime2,         now)
        .query(`INSERT INTO dbo.AuditLog (userID, userName, action, tableName, recordID, clientID, newValues, timestamp)
                VALUES (@userID, @userName, @action, @tableName, @recordID, @clientID, @newValues, @timestamp)`);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }

    res.status(201).json({ success: true, data: row });
  } catch (err) {
    console.error('❌ Error recording Nursing Archive upload:', err);
    res.status(500).json({ success: false, message: 'Failed to record who uploaded the file', error: err.message });
  }
});

router.get('/archive-uploads/:clientID', async (req, res) => {
  const clientID = str(req.params.clientID, 50);
  if (!clientID) {
    return res.status(400).json({ success: false, message: 'Invalid client ID' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT blobName, uploadedBy, uploadedByName, uploadedAt
        FROM dbo.NursingArchiveUploads
        WHERE clientID = @clientID
        ORDER BY uploadedAt DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('❌ Error fetching Nursing Archive uploaders:', err);
    res.status(500).json({ success: false, message: 'Failed to load uploaders', error: err.message });
  }
});

module.exports = router;
