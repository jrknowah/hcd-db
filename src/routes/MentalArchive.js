const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sql = require('mssql');
const { connectToAzureSQL } = require('../store/azureSql');

// ===== FILE UPLOAD CONFIGURATION =====

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/mental-archive';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and UUID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = uuidv4().substring(0, 8);
    const extension = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    const filename = `${timestamp}_${uniqueId}_${sanitizedName}`;
    cb(null, filename);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/tiff',
    'image/bmp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Please upload PDF, images, or Office documents.`), false);
  }
};

// Configure multer with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files at once
  }
});

// ===== UTILITY FUNCTIONS =====

const logUserAction = async (user, action, details = {}) => {
  try {
    const userEmail = user?.email || 'system@example.com';
    console.log('🔍 Mental Archive Action:', {
      userEmail,
      actionType: action,
      timestamp: new Date().toISOString(),
      details,
    });
  } catch (error) {
    console.error('❌ Failed to log user action:', error);
  }
};

const formatFileData = (file, clientID, documentType, description, uploadedBy) => {
  return {
    fileId: uuidv4(),
    clientID: clientID,
    originalName: file.originalname,
    fileName: file.filename,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype,
    documentType: documentType || 'Mental Health Archive',
    description: description || '',
    uploadedBy: uploadedBy,
    uploadDate: new Date().toISOString(),
    archived: true,
    category: 'Mental Archive'
  };
};

// ===== MENTAL ARCHIVE ROUTES =====

// 🔸 POST /api/mental-archive/upload/:clientID - Upload mental archive files
router.post('/upload/:clientID', upload.array('files', 10), async (req, res) => {
  const { clientID } = req.params;
  const { documentType, description, archiveDate, originalDate } = req.body;
  const files = req.files;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ 
      error: 'No files uploaded' 
    });
  }

  try {
    const pool = await connectToAzureSQL();
    const userEmail = req.user?.email || 'system@example.com';
    const uploadedFiles = [];

    // Process each uploaded file
    for (const file of files) {
      const fileData = formatFileData(file, clientID, documentType, description, userEmail);
      
      // Insert file record into database
      const insertQuery = `
        INSERT INTO MentalArchiveFiles (
          fileId, clientID, originalName, fileName, filePath, fileSize, 
          mimeType, documentType, description, uploadedBy, uploadDate,
          archiveDate, originalDate, archived, category, createdAt
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @fileId, @clientID, @originalName, @fileName, @filePath, @fileSize,
          @mimeType, @documentType, @description, @uploadedBy, @uploadDate,
          @archiveDate, @originalDate, @archived, @category, GETDATE()
        )
      `;
      
      const result = await pool.request()
        .input('fileId', sql.VarChar, fileData.fileId)
        .input('clientID', sql.VarChar, clientID)
        .input('originalName', sql.NVarChar, fileData.originalName)
        .input('fileName', sql.VarChar, fileData.fileName)
        .input('filePath', sql.VarChar, fileData.filePath)
        .input('fileSize', sql.BigInt, fileData.fileSize)
        .input('mimeType', sql.VarChar, fileData.mimeType)
        .input('documentType', sql.VarChar, documentType || 'Mental Health Archive')
        .input('description', sql.NVarChar, description || '')
        .input('uploadedBy', sql.VarChar, userEmail)
        .input('uploadDate', sql.DateTime, new Date())
        .input('archiveDate', sql.Date, archiveDate || null)
        .input('originalDate', sql.Date, originalDate || null)
        .input('archived', sql.Bit, true)
        .input('category', sql.VarChar, 'Mental Archive')
        .query(insertQuery);

      uploadedFiles.push(result.recordset[0]);
    }

    await logUserAction(req.user, 'UPLOAD_MENTAL_ARCHIVE_FILES', {
      clientID,
      filesCount: files.length,
      documentType,
      totalSize: files.reduce((sum, file) => sum + file.size, 0)
    });

    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully to mental archive`,
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('Error uploading mental archive files:', error);
    
    // Clean up uploaded files on error
    if (files) {
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    await logUserAction(req.user, 'UPLOAD_MENTAL_ARCHIVE_ERROR', {
      clientID,
      error: error.message
    });

    res.status(500).json({ 
      error: 'Failed to upload mental archive files',
      details: error.message 
    });
  }
});

// 🔸 GET /api/mental-archive/:clientID - Get all mental archive files for client
router.get('/:clientID', async (req, res) => {
  const { clientID } = req.params;
  const { documentType, category, limit = 50, offset = 0 } = req.query;
  
  try {
    const pool = await connectToAzureSQL();
    
    let whereClause = 'WHERE clientID = @clientID AND archived = 1';
    const inputs = [
      { name: 'clientID', type: sql.VarChar, value: clientID },
      { name: 'limit', type: sql.Int, value: parseInt(limit) },
      { name: 'offset', type: sql.Int, value: parseInt(offset) }
    ];

    if (documentType) {
      whereClause += ' AND documentType = @documentType';
      inputs.push({ name: 'documentType', type: sql.VarChar, value: documentType });
    }

    if (category) {
      whereClause += ' AND category = @category';
      inputs.push({ name: 'category', type: sql.VarChar, value: category });
    }

    const query = `
      SELECT 
        fileId,
        clientID,
        originalName,
        fileName,
        fileSize,
        mimeType,
        documentType,
        description,
        uploadedBy,
        uploadDate,
        archiveDate,
        originalDate,
        category,
        createdAt
      FROM MentalArchiveFiles 
      ${whereClause}
      ORDER BY uploadDate DESC, createdAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const request = pool.request();
    inputs.forEach(input => {
      request.input(input.name, input.type, input.value);
    });

    const result = await request.query(query);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM MentalArchiveFiles 
      ${whereClause}
    `;

    const countRequest = pool.request();
    inputs.slice(0, -2).forEach(input => { // Exclude limit and offset
      countRequest.input(input.name, input.type, input.value);
    });

    const countResult = await countRequest.query(countQuery);
    const totalFiles = countResult.recordset[0].total;

    res.json({
      files: result.recordset,
      total: totalFiles,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: totalFiles > (parseInt(offset) + parseInt(limit))
    });

  } catch (error) {
    console.error('Error fetching mental archive files:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mental archive files',
      details: error.message 
    });
  }
});

// 🔸 GET /api/mental-archive/file/:fileId/download - Download mental archive file
router.get('/file/:fileId/download', async (req, res) => {
  const { fileId } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    
    const query = `
      SELECT filePath, originalName, mimeType, clientID
      FROM MentalArchiveFiles 
      WHERE fileId = @fileId AND archived = 1
    `;
    
    const result = await pool.request()
      .input('fileId', sql.VarChar, fileId)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.recordset[0];
    
    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    await logUserAction(req.user, 'DOWNLOAD_MENTAL_ARCHIVE_FILE', {
      fileId,
      clientID: file.clientID,
      fileName: file.originalName
    });

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    
    // Send file
    res.sendFile(path.resolve(file.filePath));

  } catch (error) {
    console.error('Error downloading mental archive file:', error);
    res.status(500).json({ 
      error: 'Failed to download file',
      details: error.message 
    });
  }
});

// 🔸 DELETE /api/mental-archive/file/:fileId - Delete mental archive file
router.delete('/file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const userEmail = req.user?.email || 'system@example.com';
    
    // Get file info before deletion
    const getFileQuery = `
      SELECT filePath, originalName, clientID 
      FROM MentalArchiveFiles 
      WHERE fileId = @fileId
    `;
    
    const fileResult = await pool.request()
      .input('fileId', sql.VarChar, fileId)
      .query(getFileQuery);

    if (fileResult.recordset.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.recordset[0];

    // Soft delete - mark as not archived
    const deleteQuery = `
      UPDATE MentalArchiveFiles 
      SET 
        archived = 0,
        deletedBy = @deletedBy,
        deletedAt = GETDATE()
      WHERE fileId = @fileId
    `;
    
    await pool.request()
      .input('fileId', sql.VarChar, fileId)
      .input('deletedBy', sql.VarChar, userEmail)
      .query(deleteQuery);

    await logUserAction(req.user, 'DELETE_MENTAL_ARCHIVE_FILE', {
      fileId,
      clientID: file.clientID,
      fileName: file.originalName
    });

    res.json({ 
      success: true,
      message: 'Mental archive file deleted successfully',
      fileId: fileId
    });

  } catch (error) {
    console.error('Error deleting mental archive file:', error);
    await logUserAction(req.user, 'DELETE_MENTAL_ARCHIVE_ERROR', {
      fileId,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to delete mental archive file',
      details: error.message 
    });
  }
});

// 🔸 GET /api/mental-archive/:clientID/summary - Get mental archive summary
router.get('/:clientID/summary', async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalFiles,
        SUM(fileSize) as totalSize,
        COUNT(DISTINCT documentType) as documentTypes,
        MIN(uploadDate) as oldestUpload,
        MAX(uploadDate) as newestUpload,
        COUNT(CASE WHEN uploadDate >= DATEADD(day, -30, GETDATE()) THEN 1 END) as recentFiles
      FROM MentalArchiveFiles 
      WHERE clientID = @clientID AND archived = 1
    `;
    
    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(summaryQuery);

    const summary = result.recordset[0];
    
    // Get document type breakdown
    const typesQuery = `
      SELECT 
        documentType,
        COUNT(*) as count,
        SUM(fileSize) as totalSize
      FROM MentalArchiveFiles 
      WHERE clientID = @clientID AND archived = 1
      GROUP BY documentType
      ORDER BY count DESC
    `;
    
    const typesResult = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(typesQuery);

    res.json({
      summary: {
        totalFiles: summary.totalFiles || 0,
        totalSize: summary.totalSize || 0,
        documentTypes: summary.documentTypes || 0,
        oldestUpload: summary.oldestUpload,
        newestUpload: summary.newestUpload,
        recentFiles: summary.recentFiles || 0
      },
      documentTypeBreakdown: typesResult.recordset
    });

  } catch (error) {
    console.error('Error fetching mental archive summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mental archive summary',
      details: error.message 
    });
  }
});

// 🔸 PUT /api/mental-archive/file/:fileId - Update mental archive file metadata
router.put('/file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const { documentType, description, archiveDate, originalDate } = req.body;
  
  try {
    const pool = await connectToAzureSQL();
    const userEmail = req.user?.email || 'system@example.com';
    
    const updateQuery = `
      UPDATE MentalArchiveFiles 
      SET 
        documentType = @documentType,
        description = @description,
        archiveDate = @archiveDate,
        originalDate = @originalDate,
        updatedBy = @updatedBy,
        updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE fileId = @fileId AND archived = 1
    `;
    
    const result = await pool.request()
      .input('fileId', sql.VarChar, fileId)
      .input('documentType', sql.VarChar, documentType)
      .input('description', sql.NVarChar, description || '')
      .input('archiveDate', sql.Date, archiveDate || null)
      .input('originalDate', sql.Date, originalDate || null)
      .input('updatedBy', sql.VarChar, userEmail)
      .query(updateQuery);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    await logUserAction(req.user, 'UPDATE_MENTAL_ARCHIVE_FILE', {
      fileId,
      documentType,
      description
    });

    res.json({
      success: true,
      message: 'Mental archive file updated successfully',
      file: result.recordset[0]
    });

  } catch (error) {
    console.error('Error updating mental archive file:', error);
    res.status(500).json({ 
      error: 'Failed to update mental archive file',
      details: error.message 
    });
  }
});

module.exports = router;