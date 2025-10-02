// routes/noteUpload.js - Backend routes for file upload
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const sql = require("mssql");
const { connectToAzureSQL } = require("../db");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/notes';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, XLS, XLSX files are allowed.'), false);
  }
};

// Configure multer with limits and file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter
});

// POST /api/notes/upload - Upload a note file
router.post("/notes/upload", upload.single('noteFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const {
      uploadType = 'note-archive',
      description = '',
      clientID = null
    } = req.body;

    // Save file info to database
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("originalName", sql.NVarChar, req.file.originalname)
      .input("fileName", sql.NVarChar, req.file.filename)
      .input("filePath", sql.NVarChar, req.file.path)
      .input("fileSize", sql.BigInt, req.file.size)
      .input("mimeType", sql.NVarChar, req.file.mimetype)
      .input("uploadType", sql.NVarChar, uploadType)
      .input("description", sql.NVarChar, description)
      .input("clientID", sql.NVarChar, clientID)
      .input("uploadedBy", sql.NVarChar, req.user?.email || 'system') // Assuming auth middleware
      .input("uploadedAt", sql.DateTime, new Date())
      .query(`
        INSERT INTO UploadedFiles (
          originalName, fileName, filePath, fileSize, mimeType,
          uploadType, description, clientID, uploadedBy, uploadedAt
        )
        OUTPUT INSERTED.fileID,
               INSERTED.originalName,
               INSERTED.fileName,
               INSERTED.fileSize,
               INSERTED.uploadedAt
        VALUES (
          @originalName, @fileName, @filePath, @fileSize, @mimeType,
          @uploadType, @description, @clientID, @uploadedBy, @uploadedAt
        )
      `);

    const savedFile = result.recordset[0];
    
    // Generate file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/api/notes/download/${savedFile.fileName}`;

    console.log(`✅ File uploaded successfully: ${req.file.originalname}`);
    
    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      fileId: savedFile.fileID,
      fileName: savedFile.originalName,
      fileUrl: fileUrl,
      fileSize: savedFile.fileSize,
      uploadedAt: savedFile.uploadedAt
    });

  } catch (err) {
    // Clean up uploaded file if database save fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error("❌ Error uploading file:", err);
    res.status(500).json({
      success: false,
      message: "File upload failed",
      details: err.message
    });
  }
});

// GET /api/notes/uploads - Get list of uploaded files
router.get("/notes/uploads", async (req, res) => {
  try {
    const {
      uploadType = 'note-archive',
      clientID = null,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    const pool = await connectToAzureSQL();
    
    let query = `
      SELECT 
        fileID as id,
        originalName as fileName,
        fileSize,
        uploadType,
        description,
        clientID,
        uploadedBy,
        uploadedAt
      FROM UploadedFiles 
      WHERE uploadType = @uploadType
    `;
    
    const request = pool.request()
      .input("uploadType", sql.NVarChar, uploadType)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, parseInt(limit));

    if (clientID) {
      query += " AND clientID = @clientID";
      request.input("clientID", sql.NVarChar, clientID);
    }

    query += `
      ORDER BY uploadedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const result = await request.query(query);
    
    // Add file URLs to response
    const filesWithUrls = result.recordset.map(file => ({
      ...file,
      fileUrl: `${req.protocol}://${req.get('host')}/api/notes/download/${file.fileName}`
    }));

    res.json(filesWithUrls);

  } catch (err) {
    console.error("❌ Error fetching uploaded files:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch uploaded files",
      details: err.message
    });
  }
});

// GET /api/notes/download/:fileName - Download a file
router.get("/notes/download/:fileName", async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Get file info from database
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("fileName", sql.NVarChar, fileName)
      .query(`
        SELECT originalName, filePath, mimeType, fileSize
        FROM UploadedFiles
        WHERE fileName = @fileName
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    const fileInfo = result.recordset[0];
    
    // Check if file exists on disk
    if (!fs.existsSync(fileInfo.filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on disk"
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Length', fileInfo.fileSize);

    // Stream file to response
    const fileStream = fs.createReadStream(fileInfo.filePath);
    fileStream.pipe(res);

  } catch (err) {
    console.error("❌ Error downloading file:", err);
    res.status(500).json({
      success: false,
      message: "File download failed",
      details: err.message
    });
  }
});

// DELETE /api/notes/uploads/:fileId - Delete an uploaded file
router.delete("/notes/uploads/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const pool = await connectToAzureSQL();
    
    // Get file info before deletion
    const fileResult = await pool
      .request()
      .input("fileId", sql.Int, fileId)
      .query(`
        SELECT fileName, filePath, originalName
        FROM UploadedFiles
        WHERE fileID = @fileId
      `);

    if (fileResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    const fileInfo = fileResult.recordset[0];

    // Delete from database
    const deleteResult = await pool
      .request()
      .input("fileId", sql.Int, fileId)
      .query(`DELETE FROM UploadedFiles WHERE fileID = @fileId`);

    // Delete physical file
    if (fs.existsSync(fileInfo.filePath)) {
      fs.unlinkSync(fileInfo.filePath);
    }

    console.log(`✅ File deleted successfully: ${fileInfo.originalName}`);
    
    res.json({
      success: true,
      message: "File deleted successfully",
      fileName: fileInfo.originalName
    });

  } catch (err) {
    console.error("❌ Error deleting file:", err);
    res.status(500).json({
      success: false,
      message: "File deletion failed",
      details: err.message
    });
  }
});

// GET /api/notes/uploads/stats - Get upload statistics
router.get("/notes/uploads/stats", async (req, res) => {
  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .query(`
        SELECT 
          COUNT(*) as totalFiles,
          SUM(fileSize) as totalSize,
          COUNT(CASE WHEN uploadedAt >= DATEADD(DAY, -30, GETDATE()) THEN 1 END) as filesLast30Days,
          COUNT(CASE WHEN uploadType = 'note-archive' THEN 1 END) as noteArchiveFiles,
          AVG(CAST(fileSize as FLOAT)) as avgFileSize
        FROM UploadedFiles
      `);

    const stats = result.recordset[0];
    
    res.json({
      ...stats,
      totalSizeFormatted: formatFileSize(stats.totalSize || 0),
      avgFileSizeFormatted: formatFileSize(stats.avgFileSize || 0)
    });

  } catch (err) {
    console.error("❌ Error fetching upload stats:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      details: err.message
    });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;