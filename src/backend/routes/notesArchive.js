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

// GET /api/note-archive/:id/download
// Streams the blob back to the client. Uses Managed Identity — no SAS tokens needed.
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Look up the blob path + filename from SQL
    const pool = await getPool();
    const result = await pool.request()
      .input('NoteArchiveID', sql.Int, parseInt(id, 10))
      .query(`
        SELECT FileName, BlobPath, MimeType
        FROM NoteArchive
        WHERE NoteArchiveID = @NoteArchiveID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const { FileName, BlobPath, MimeType } = result.recordset[0];

    // 2. Stream the blob
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(BlobPath);

    const downloadResponse = await blockBlobClient.download();

    res.setHeader('Content-Type', MimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${FileName.replace(/"/g, '')}"`
    );

    downloadResponse.readableStreamBody.pipe(res);
  } catch (error) {
    console.error('❌ NoteArchive download error:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: 'Blob not found in storage' });
    }
    return res.status(500).json({ error: error.message || 'Download failed' });
  }
});

// GET /api/note-archive/:clientID
// List files for a client (used by the fetchNoteArchiveFiles thunk).
// Note: registered AFTER /:id/download so 'download' isn't treated as a clientID.
// But because :clientID and :id are both single segments, Express matches by
// order — keep this BELOW the download route to avoid shadowing.
router.get('/list/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('ClientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT NoteArchiveID, ClientID, FileName, BlobPath, FileSize,
               MimeType, UploadedBy, UploadedAt
        FROM NoteArchive
        WHERE ClientID = @ClientID
        ORDER BY UploadedAt DESC
      `);

    const files = result.recordset.map(r => ({
      noteArchiveID: r.NoteArchiveID,
      clientID: r.ClientID,
      fileName: r.FileName,
      fileSize: r.FileSize,
      mimeType: r.MimeType,
      uploadedBy: r.UploadedBy,
      uploadedAt: r.UploadedAt,
      fileUrl: `/api/note-archive/${r.NoteArchiveID}/download`
    }));

    res.json(files);
  } catch (error) {
    console.error('❌ NoteArchive list error:', error);
    res.status(500).json({ error: error.message || 'Failed to list files' });
  }
});

module.exports = router;