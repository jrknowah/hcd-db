const express = require('express');
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

// Database connection (assumes you have this configured)
// const { poolPromise } = require('../db/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/misc-documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx|ppt|pptx|rtf|odt|ods|odp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype.includes('officedocument') ||
                     file.mimetype.includes('opendocument');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents and images are allowed'));
    }
  }
});

// Helper function to generate file checksum
function generateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * GET /api/misc-documents/:clientID
 * Get miscellaneous documents for a specific client
 */
router.get('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { category, archived, limit = 50, offset = 0 } = req.query;
    
    const pool = await poolPromise;
    let sqlQuery = `
      SELECT 
        documentID,
        clientID,
        fileName,
        originalFileName,
        fileSize,
        mimeType,
        filePath,
        documentCategory,
        documentDescription,
        uploadDate,
        lastAccessed,
        accessCount,
        isArchived,
        retentionDate,
        confidentialityLevel,
        uploadedBy,
        approvedBy,
        approvalDate,
        version,
        checksum,
        tags,
        relatedDocuments,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt
      FROM dbo.MiscDocuments 
      WHERE clientID = @clientID
    `;
    
    const request = pool.request();
    request.input('clientID', sql.NVarChar(50), clientID);

    if (category) {
      sqlQuery += ` AND documentCategory = @category`;
      request.input('category', sql.NVarChar(100), category);
    }

    if (archived !== undefined) {
      sqlQuery += ` AND isArchived = @archived`;
      request.input('archived', sql.Bit, archived === 'true');
    }

    sqlQuery += ` ORDER BY uploadDate DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(sqlQuery);

    // Parse JSON fields
    const documents = result.recordset.map(doc => ({
      ...doc,
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      relatedDocuments: doc.relatedDocuments ? JSON.parse(doc.relatedDocuments) : []
    }));

    res.json(documents);
  } catch (error) {
    console.error('Error fetching misc documents:', error);
    res.status(500).json({ 
      message: 'Error fetching misc documents', 
      error: error.message 
    });
  }
});

/**
 * POST /api/misc-documents/:clientID/upload
 * Upload new miscellaneous document
 */
router.post('/:clientID/upload', upload.single('file'), async (req, res) => {
  try {
    const { clientID } = req.params;
    const {
      category = 'general',
      description = '',
      confidentialityLevel = 'Medium',
      tags = '',
      uploadedBy = 'system'
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Generate checksum
    const checksum = await generateChecksum(req.file.path);

    // Parse tags
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [category];

    // Calculate retention date based on category
    const retentionYears = getRetentionYears(category);
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);

    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('fileName', sql.NVarChar(255), req.file.filename)
      .input('originalFileName', sql.NVarChar(255), req.file.originalname)
      .input('fileSize', sql.BigInt, req.file.size)
      .input('mimeType', sql.NVarChar(100), req.file.mimetype)
      .input('filePath', sql.NVarChar(500), req.file.path)
      .input('documentCategory', sql.NVarChar(100), category)
      .input('documentDescription', sql.NVarChar(sql.MAX), description)
      .input('uploadDate', sql.Date, new Date())
      .input('retentionDate', sql.Date, retentionDate)
      .input('confidentialityLevel', sql.NVarChar(50), confidentialityLevel)
      .input('uploadedBy', sql.NVarChar(100), uploadedBy)
      .input('version', sql.Int, 1)
      .input('checksum', sql.NVarChar(100), checksum)
      .input('tags', sql.NVarChar(sql.MAX), JSON.stringify(tagsArray))
      .input('relatedDocuments', sql.NVarChar(sql.MAX), JSON.stringify([]))
      .input('createdBy', sql.NVarChar(100), uploadedBy)
      .query(`
        INSERT INTO dbo.MiscDocuments (
          clientID, fileName, originalFileName, fileSize, mimeType, filePath,
          documentCategory, documentDescription, uploadDate, lastAccessed,
          accessCount, isArchived, retentionDate, confidentialityLevel,
          uploadedBy, approvedBy, approvalDate, version, checksum, tags,
          relatedDocuments, createdBy, createdAt, updatedBy, updatedAt
        ) 
        OUTPUT inserted.*
        VALUES (
          @clientID, @fileName, @originalFileName, @fileSize, @mimeType, @filePath,
          @documentCategory, @documentDescription, @uploadDate, NULL,
          0, 0, @retentionDate, @confidentialityLevel,
          @uploadedBy, NULL, NULL, @version, @checksum, @tags,
          @relatedDocuments, @createdBy, GETDATE(), @createdBy, GETDATE()
        )
      `);

    const document = result.recordset[0];
    
    // Parse JSON fields for response
    document.tags = JSON.parse(document.tags);
    document.relatedDocuments = JSON.parse(document.relatedDocuments);

    res.json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Error uploading document', 
      error: error.message 
    });
  }
});

/**
 * PUT /api/misc-documents/:documentID
 * Update specific document metadata
 */
router.put('/:documentID', async (req, res) => {
  try {
    const { documentID } = req.params;
    const updateData = req.body;

    const pool = await poolPromise;
    
    // Build dynamic update query
    const updateFields = [];
    const inputs = {};
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'documentID' && key !== 'createdAt' && key !== 'createdBy' && key !== 'filePath') {
        updateFields.push(`${key} = @${key}`);
        inputs[key] = updateData[key];
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updatedAt = GETDATE()');

    const request = pool.request();
    request.input('documentID', sql.Int, documentID);
    
    Object.keys(inputs).forEach(key => {
      if (key.includes('Date')) {
        request.input(key, sql.Date, inputs[key]);
      } else if (key.includes('Size')) {
        request.input(key, sql.BigInt, inputs[key]);
      } else if (key.includes('Archived') || key.includes('Count')) {
        request.input(key, sql.Bit, inputs[key]);
      } else if (key === 'tags' || key === 'relatedDocuments') {
        request.input(key, sql.NVarChar(sql.MAX), JSON.stringify(inputs[key]));
      } else {
        request.input(key, sql.NVarChar(sql.MAX), inputs[key]);
      }
    });

    const result = await request.query(`
      UPDATE dbo.MiscDocuments 
      SET ${updateFields.join(', ')}
      OUTPUT inserted.*
      WHERE documentID = @documentID
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = result.recordset[0];
    
    // Parse JSON fields
    if (document.tags) document.tags = JSON.parse(document.tags);
    if (document.relatedDocuments) document.relatedDocuments = JSON.parse(document.relatedDocuments);

    res.json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ 
      message: 'Error updating document', 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/misc-documents/:documentID
 * Delete document
 */
router.delete('/:documentID', async (req, res) => {
  try {
    const { documentID } = req.params;

    const pool = await poolPromise;
    
    // First get file path to delete physical file
    const fileResult = await pool.request()
      .input('documentID', sql.Int, documentID)
      .query(`
        SELECT filePath 
        FROM dbo.MiscDocuments 
        WHERE documentID = @documentID
      `);

    const result = await pool.request()
      .input('documentID', sql.Int, documentID)
      .query(`
        DELETE FROM dbo.MiscDocuments 
        WHERE documentID = @documentID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete physical file
    if (fileResult.recordset.length > 0) {
      const filePath = fileResult.recordset[0].filePath;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      message: 'Error deleting document', 
      error: error.message 
    });
  }
});

/**
 * GET /api/misc-documents/:documentID/download
 * Download specific document
 */
router.get('/:documentID/download', async (req, res) => {
  try {
    const { documentID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('documentID', sql.Int, documentID)
      .query(`
        SELECT filePath, originalFileName, mimeType, accessCount
        FROM dbo.MiscDocuments 
        WHERE documentID = @documentID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = result.recordset[0];
    
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Update access count
    await pool.request()
      .input('documentID', sql.Int, documentID)
      .query(`
        UPDATE dbo.MiscDocuments 
        SET accessCount = accessCount + 1,
            lastAccessed = GETDATE()
        WHERE documentID = @documentID
      `);

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    // Stream file
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      message: 'Error downloading document', 
      error: error.message 
    });
  }
});

/**
 * GET /api/misc-documents/:clientID/categories
 * Get document categories with counts
 */
router.get('/:clientID/categories', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          documentCategory as category,
          COUNT(*) as count
        FROM dbo.MiscDocuments 
        WHERE clientID = @clientID AND isArchived = 0
        GROUP BY documentCategory
        ORDER BY count DESC
      `);

    // Add predefined categories with zero counts
    const predefinedCategories = [
      { category: 'general', label: 'General Documents', count: 0 },
      { category: 'medical', label: 'Medical Records', count: 0 },
      { category: 'legal', label: 'Legal Documents', count: 0 },
      { category: 'financial', label: 'Financial Records', count: 0 },
      { category: 'identification', label: 'Identification', count: 0 },
      { category: 'benefits', label: 'Benefits Documentation', count: 0 },
      { category: 'housing', label: 'Housing Documents', count: 0 },
      { category: 'employment', label: 'Employment Records', count: 0 },
      { category: 'other', label: 'Other', count: 0 }
    ];

    // Merge with actual counts
    const categoriesWithCounts = predefinedCategories.map(predefined => {
      const actual = result.recordset.find(r => r.category === predefined.category);
      return {
        ...predefined,
        count: actual ? actual.count : 0
      };
    });

    res.json(categoriesWithCounts);
  } catch (error) {
    console.error('Error fetching document categories:', error);
    res.status(500).json({ 
      message: 'Error fetching document categories', 
      error: error.message 
    });
  }
});

/**
 * GET /api/misc-documents/:clientID/summary
 * Get document summary statistics
 */
router.get('/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          COUNT(*) as totalDocuments,
          SUM(fileSize) as totalFileSize,
          SUM(CASE WHEN uploadDate >= DATEADD(day, -7, GETDATE()) THEN 1 ELSE 0 END) as recentUploads,
          SUM(CASE WHEN approvedBy IS NULL THEN 1 ELSE 0 END) as pendingApprovals,
          SUM(CASE WHEN isArchived = 1 THEN 1 ELSE 0 END) as archivedDocuments,
          AVG(CAST(fileSize AS FLOAT)) as averageFileSize,
          MAX(uploadDate) as lastUpload,
          SUM(CASE WHEN retentionDate <= DATEADD(day, 30, GETDATE()) THEN 1 ELSE 0 END) as retentionAlerts
        FROM dbo.MiscDocuments 
        WHERE clientID = @clientID
      `);

    const summary = result.recordset[0];
    
    // Get category breakdown
    const categoryResult = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          documentCategory,
          COUNT(*) as count
        FROM dbo.MiscDocuments 
        WHERE clientID = @clientID AND isArchived = 0
        GROUP BY documentCategory
      `);

    const documentsByCategory = {};
    categoryResult.recordset.forEach(row => {
      documentsByCategory[row.documentCategory] = row.count;
    });

    // Get most accessed document
    const accessResult = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT TOP 1 originalFileName
        FROM dbo.MiscDocuments 
        WHERE clientID = @clientID
        ORDER BY accessCount DESC
      `);

    const formattedSummary = {
      totalDocuments: summary.totalDocuments || 0,
      totalFileSize: parseInt(summary.totalFileSize) || 0,
      documentsByCategory,
      recentUploads: summary.recentUploads || 0,
      pendingApprovals: summary.pendingApprovals || 0,
      archivedDocuments: summary.archivedDocuments || 0,
      averageFileSize: parseFloat(summary.averageFileSize) || 0,
      lastUpload: summary.lastUpload ? summary.lastUpload.toISOString().split('T')[0] : null,
      mostAccessedDocument: accessResult.recordset[0]?.originalFileName || 'None',
      retentionAlerts: summary.retentionAlerts || 0
    };

    res.json(formattedSummary);
  } catch (error) {
    console.error('Error fetching document summary:', error);
    res.status(500).json({ 
      message: 'Error fetching document summary', 
      error: error.message 
    });
  }
});

/**
 * POST /api/misc-documents/:documentID/approve
 * Approve document
 */
router.post('/:documentID/approve', async (req, res) => {
  try {
    const { documentID } = req.params;
    const { approvedBy } = req.body;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('documentID', sql.Int, documentID)
      .input('approvedBy', sql.NVarChar(100), approvedBy)
      .input('approvalDate', sql.Date, new Date())
      .query(`
        UPDATE dbo.MiscDocuments 
        SET approvedBy = @approvedBy,
            approvalDate = @approvalDate,
            updatedAt = GETDATE()
        OUTPUT inserted.*
        WHERE documentID = @documentID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = result.recordset[0];
    
    // Parse JSON fields
    if (document.tags) document.tags = JSON.parse(document.tags);
    if (document.relatedDocuments) document.relatedDocuments = JSON.parse(document.relatedDocuments);

    res.json(document);
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({ 
      message: 'Error approving document', 
      error: error.message 
    });
  }
});

/**
 * POST /api/misc-documents/:documentID/archive
 * Archive/unarchive document
 */
router.post('/:documentID/archive', async (req, res) => {
  try {
    const { documentID } = req.params;
    const { isArchived } = req.body;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('documentID', sql.Int, documentID)
      .input('isArchived', sql.Bit, isArchived)
      .query(`
        UPDATE dbo.MiscDocuments 
        SET isArchived = @isArchived,
            updatedAt = GETDATE()
        OUTPUT inserted.*
        WHERE documentID = @documentID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = result.recordset[0];
    
    // Parse JSON fields
    if (document.tags) document.tags = JSON.parse(document.tags);
    if (document.relatedDocuments) document.relatedDocuments = JSON.parse(document.relatedDocuments);

    res.json(document);
  } catch (error) {
    console.error('Error archiving document:', error);
    res.status(500).json({ 
      message: 'Error archiving document', 
      error: error.message 
    });
  }
});

// Helper function to determine retention years based on category
function getRetentionYears(category) {
  const retentionMap = {
    'legal': 7,
    'medical': 5,
    'financial': 7,
    'benefits': 5,
    'employment': 3,
    'housing': 3,
    'identification': 10,
    'general': 2,
    'other': 2
  };
  
  return retentionMap[category] || 2;
}

module.exports = router;