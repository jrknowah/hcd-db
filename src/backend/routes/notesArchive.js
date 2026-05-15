// routes/notesArchive.js
// Mounted at /api/note-archive in server.cjs, so routes here are relative.
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const { getPool } = require('../store/azureSql.js');
const sql = require('mssql');

// In-memory multer — never write PHI to App Service ephemeral disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const STORAGE_ACCOUNT = 'clientintakestorage';
const CONTAINER_NAME = 'client-docs';

// Managed Identity blob client — matches the rest of HCD
const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
  `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential
);

// POST /api/note-archive/upload
router.post('/upload', upload.single('noteFile'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { clientID } = req.body; // optional
    const uploadedBy =
      req.user?.preferred_username || req.user?.email || 'unknown';

    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobName = clientID
      ? `notes-archive/${clientID}/${timestamp}_${safeName}`
      : `notes-archive/unassigned/${timestamp}_${safeName}`;

    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }
    });

    // Persist record in SQL — adjust table/columns to your schema
    const pool = await getPool();
    const result = await pool.request()
      .input('ClientID', sql.NVarChar(50), clientID || null)
      .input('FileName', sql.NVarChar(255), file.originalname)
      .input('BlobPath', sql.NVarChar(500), blobName)
      .input('FileSize', sql.BigInt, file.size)
      .input('MimeType', sql.NVarChar(100), file.mimetype)
      .input('UploadedBy', sql.NVarChar(255), uploadedBy)
      .query(`
        INSERT INTO NoteArchive
          (ClientID, FileName, BlobPath, FileSize, MimeType, UploadedBy, UploadedAt)
        OUTPUT INSERTED.NoteArchiveID
        VALUES
          (@ClientID, @FileName, @BlobPath, @FileSize, @MimeType, @UploadedBy, GETUTCDATE())
      `);

    const noteArchiveID = result.recordset[0].NoteArchiveID;

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      noteArchiveID,
      fileName: file.originalname,
      fileSize: file.size,
      blobPath: blobName,
      fileUrl: `/api/note-archive/${noteArchiveID}/download`,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ NoteArchive upload error:', error);
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

module.exports = router;