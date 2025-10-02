const express = require('express');
const router = express.Router();
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const { logUserAction } = require('../backend/config/logAction');

// ✅ Database connection configuration
// Update this to match your Azure SQL configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

// ✅ File upload configuration
const uploadPath = process.env.UPLOAD_PATH || './uploads/nursing-archive';

// Create upload directory if it doesn't exist
const createUploadDir = async () => {
    try {
        await fs.mkdir(uploadPath, { recursive: true });
    } catch (error) {
        console.error('Error creating upload directory:', error);
    }
};

// Initialize upload directory
createUploadDir();

// ✅ Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        const filename = `${uniqueId}${extension}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10 // Maximum 10 files per upload
    }
});

// ✅ Helper function to calculate file checksum
const calculateChecksum = async (filePath) => {
    try {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
        console.error('Error calculating checksum:', error);
        return null;
    }
};

// ✅ Helper function to validate file content (basic virus scan simulation)
const validateFileContent = async (filePath, mimeType) => {
    try {
        // In production, integrate with actual virus scanning service
        // For now, perform basic file validation
        const stats = await fs.stat(filePath);
        
        // Check file size is reasonable
        if (stats.size === 0) {
            return { safe: false, reason: 'Empty file' };
        }
        
        // Additional checks can be added here
        return { safe: true, reason: 'File appears safe' };
    } catch (error) {
        return { safe: false, reason: 'Error validating file' };
    }
};

// ✅ GET /api/nursing-archive/:clientID - Get all documents for client
router.get('/nursing-archive/:clientID', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { category, search, startDate, endDate } = req.query;
        
        const pool = await sql.connect(dbConfig);
        let query = `
            SELECT 
                na.*,
                dc.categoryName,
                dc.categoryDescription
            FROM dbo.NursingArchive na
            LEFT JOIN dbo.DocumentCategories dc ON na.categoryID = dc.categoryID
            WHERE na.clientID = @clientID
        `;
        
        const request = pool.request().input('clientID', sql.VarChar(50), clientID);
        
        // Add filters
        if (category) {
            query += ' AND dc.categoryName = @category';
            request.input('category', sql.VarChar(100), category);
        }
        
        if (search) {
            query += ' AND (na.documentName LIKE @search OR na.description LIKE @search OR na.keywords LIKE @search)';
            request.input('search', sql.VarChar(500), `%${search}%`);
        }
        
        if (startDate) {
            query += ' AND na.documentDate >= @startDate';
            request.input('startDate', sql.Date, startDate);
        }
        
        if (endDate) {
            query += ' AND na.documentDate <= @endDate';
            request.input('endDate', sql.Date, endDate);
        }
        
        query += ' ORDER BY na.uploadedAt DESC';
        
        const result = await request.query(query);
        
        await logUserAction(req, 'GET', 'NursingArchive', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ 
            message: 'Failed to fetch documents', 
            error: error.message 
        });
    }
});

// ✅ POST /api/nursing-archive/:clientID/upload - Upload new document(s)
router.post('/nursing-archive/:clientID/upload', upload.array('files', 10), async (req, res) => {
    try {
        const { clientID } = req.params;
        const { 
            category, 
            description, 
            documentDate, 
            confidentialityLevel = 'Standard',
            keywords 
        } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        if (!category) {
            return res.status(400).json({ message: 'Category is required' });
        }
        
        const pool = await sql.connect(dbConfig);
        const uploadedDocuments = [];
        
        // Get category ID
        const categoryResult = await pool.request()
            .input('categoryName', sql.VarChar(100), category)
            .query('SELECT categoryID FROM dbo.DocumentCategories WHERE categoryName = @categoryName');
        
        if (categoryResult.recordset.length === 0) {
            return res.status(400).json({ message: 'Invalid category' });
        }
        
        const categoryID = categoryResult.recordset[0].categoryID;
        
        // Process each uploaded file
        for (const file of req.files) {
            try {
                // Calculate checksum
                const checksum = await calculateChecksum(file.path);
                
                // Validate file content
                const validation = await validateFileContent(file.path, file.mimetype);
                
                if (!validation.safe) {
                    // Delete unsafe file
                    await fs.unlink(file.path);
                    continue; // Skip this file
                }
                
                // Insert document record
                const insertResult = await pool.request()
                    .input('clientID', sql.VarChar(50), clientID)
                    .input('documentName', sql.NVarChar(255), file.originalname.replace(path.extname(file.originalname), ''))
                    .input('originalFileName', sql.NVarChar(255), file.originalname)
                    .input('fileExtension', sql.NVarChar(10), path.extname(file.originalname).substring(1))
                    .input('filePath', sql.NVarChar(500), file.path)
                    .input('fileSize', sql.BigInt, file.size)
                    .input('mimeType', sql.NVarChar(100), file.mimetype)
                    .input('categoryID', sql.Int, categoryID)
                    .input('description', sql.NVarChar(sql.MAX), description || '')
                    .input('keywords', sql.NVarChar(500), keywords || '')
                    .input('documentDate', sql.Date, documentDate)
                    .input('confidentialityLevel', sql.NVarChar(20), confidentialityLevel)
                    .input('checksum', sql.NVarChar(64), checksum)
                    .input('virusScanStatus', sql.NVarChar(20), validation.safe ? 'Clean' : 'Infected')
                    .input('virusScanDate', sql.DateTime2, new Date())
                    .input('uploadedBy', sql.NVarChar(100), req.user?.email || 'System')
                    .input('uploadedAt', sql.DateTime2, new Date())
                    .query(`
                        INSERT INTO dbo.NursingArchive (
                            clientID, documentName, originalFileName, fileExtension, filePath, fileSize, mimeType,
                            categoryID, description, keywords, documentDate, confidentialityLevel,
                            versionNumber, isCurrentVersion, accessLevel, checksum, encryptionStatus,
                            virusScanStatus, virusScanDate, uploadedBy, uploadedAt, lastAccessedBy, lastAccessedAt, downloadCount
                        ) VALUES (
                            @clientID, @documentName, @originalFileName, @fileExtension, @filePath, @fileSize, @mimeType,
                            @categoryID, @description, @keywords, @documentDate, @confidentialityLevel,
                            1.0, 1, 'Standard', @checksum, 0,
                            @virusScanStatus, @virusScanDate, @uploadedBy, @uploadedAt, @uploadedBy, @uploadedAt, 0
                        );
                        
                        SELECT * FROM dbo.NursingArchive WHERE archiveID = SCOPE_IDENTITY();
                    `);
                
                const newDocument = insertResult.recordset[0];
                uploadedDocuments.push(newDocument);
                
                // Log document access
                await pool.request()
                    .input('archiveID', sql.Int, newDocument.archiveID)
                    .input('accessedBy', sql.NVarChar(100), req.user?.email || 'System')
                    .input('accessType', sql.NVarChar(20), 'UPLOAD')
                    .input('accessedAt', sql.DateTime2, new Date())
                    .input('ipAddress', sql.NVarChar(45), req.ip)
                    .input('userAgent', sql.NVarChar(500), req.get('User-Agent') || '')
                    .query(`
                        INSERT INTO dbo.DocumentAccess (archiveID, accessedBy, accessType, accessedAt, ipAddress, userAgent)
                        VALUES (@archiveID, @accessedBy, @accessType, @accessedAt, @ipAddress, @userAgent)
                    `);
                
            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                // Clean up file on error
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.error('Error deleting file:', unlinkError);
                }
            }
        }
        
        await logUserAction(req, 'UPLOAD', 'NursingArchive', clientID);
        
        res.json({
            message: `Successfully uploaded ${uploadedDocuments.length} document(s)`,
            documents: uploadedDocuments
        });
        
    } catch (error) {
        console.error('Error uploading documents:', error);
        
        // Clean up uploaded files on error
        if (req.files) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.error('Error deleting file:', unlinkError);
                }
            }
        }
        
        res.status(500).json({ 
            message: 'Failed to upload documents', 
            error: error.message 
        });
    }
});

// ✅ GET /api/nursing-archive/document/:documentID - Get specific document details
router.get('/nursing-archive/document/:documentID', async (req, res) => {
    try {
        const { documentID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('documentID', sql.Int, documentID)
            .query(`
                SELECT 
                    na.*,
                    dc.categoryName,
                    dc.categoryDescription
                FROM dbo.NursingArchive na
                LEFT JOIN dbo.DocumentCategories dc ON na.categoryID = dc.categoryID
                WHERE na.archiveID = @documentID
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        // Log access
        await pool.request()
            .input('archiveID', sql.Int, documentID)
            .input('accessedBy', sql.NVarChar(100), req.user?.email || 'System')
            .input('accessType', sql.NVarChar(20), 'VIEW')
            .input('accessedAt', sql.DateTime2, new Date())
            .input('ipAddress', sql.NVarChar(45), req.ip)
            .input('userAgent', sql.NVarChar(500), req.get('User-Agent') || '')
            .query(`
                INSERT INTO dbo.DocumentAccess (archiveID, accessedBy, accessType, accessedAt, ipAddress, userAgent)
                VALUES (@archiveID, @accessedBy, @accessType, @accessedAt, @ipAddress, @userAgent)
            `);
        
        await logUserAction(req, 'GET', 'NursingArchive', documentID);
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ 
            message: 'Failed to fetch document', 
            error: error.message 
        });
    }
});

// ✅ GET /api/nursing-archive/document/:documentID/download - Download document
router.get('/nursing-archive/document/:documentID/download', async (req, res) => {
    try {
        const { documentID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('documentID', sql.Int, documentID)
            .query('SELECT * FROM dbo.NursingArchive WHERE archiveID = @documentID');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const document = result.recordset[0];
        
        // Check if file exists
        try {
            await fs.access(document.filePath);
        } catch (error) {
            return res.status(404).json({ message: 'File not found on disk' });
        }
        
        // Update download count and last accessed
        await pool.request()
            .input('documentID', sql.Int, documentID)
            .input('accessedBy', sql.NVarChar(100), req.user?.email || 'System')
            .input('accessedAt', sql.DateTime2, new Date())
            .query(`
                UPDATE dbo.NursingArchive 
                SET downloadCount = downloadCount + 1,
                    lastAccessedBy = @accessedBy,
                    lastAccessedAt = @accessedAt
                WHERE archiveID = @documentID
            `);
        
        // Log download access
        await pool.request()
            .input('archiveID', sql.Int, documentID)
            .input('accessedBy', sql.NVarChar(100), req.user?.email || 'System')
            .input('accessType', sql.NVarChar(20), 'DOWNLOAD')
            .input('accessedAt', sql.DateTime2, new Date())
            .input('ipAddress', sql.NVarChar(45), req.ip)
            .input('userAgent', sql.NVarChar(500), req.get('User-Agent') || '')
            .query(`
                INSERT INTO dbo.DocumentAccess (archiveID, accessedBy, accessType, accessedAt, ipAddress, userAgent)
                VALUES (@archiveID, @accessedBy, @accessType, @accessedAt, @ipAddress, @userAgent)
            `);
        
        await logUserAction(req, 'DOWNLOAD', 'NursingArchive', documentID);
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
        res.setHeader('Content-Type', document.mimeType);
        
        // Stream file to response
        const fileStream = require('fs').createReadStream(document.filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ 
            message: 'Failed to download document', 
            error: error.message 
        });
    }
});

// ✅ PUT /api/nursing-archive/document/:documentID - Update document metadata
router.put('/nursing-archive/document/:documentID', async (req, res) => {
    try {
        const { documentID } = req.params;
        const { 
            documentName, 
            description, 
            keywords, 
            confidentialityLevel,
            documentDate 
        } = req.body;
        
        const pool = await sql.connect(dbConfig);
        
        // Check if document exists
        const existingDoc = await pool.request()
            .input('documentID', sql.Int, documentID)
            .query('SELECT archiveID FROM dbo.NursingArchive WHERE archiveID = @documentID');
        
        if (existingDoc.recordset.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        // Update document
        const result = await pool.request()
            .input('documentID', sql.Int, documentID)
            .input('documentName', sql.NVarChar(255), documentName)
            .input('description', sql.NVarChar(sql.MAX), description)
            .input('keywords', sql.NVarChar(500), keywords)
            .input('confidentialityLevel', sql.NVarChar(20), confidentialityLevel)
            .input('documentDate', sql.Date, documentDate)
            .input('updatedBy', sql.NVarChar(100), req.user?.email || 'System')
            .input('updatedAt', sql.DateTime2, new Date())
            .query(`
                UPDATE dbo.NursingArchive 
                SET documentName = @documentName,
                    description = @description,
                    keywords = @keywords,
                    confidentialityLevel = @confidentialityLevel,
                    documentDate = @documentDate,
                    updatedBy = @updatedBy,
                    updatedAt = @updatedAt
                WHERE archiveID = @documentID;
                
                SELECT * FROM dbo.NursingArchive WHERE archiveID = @documentID;
            `);
        
        await logUserAction(req, 'UPDATE', 'NursingArchive', documentID);
        
        res.json({
            message: 'Document updated successfully',
            document: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ 
            message: 'Failed to update document', 
            error: error.message 
        });
    }
});

// ✅ DELETE /api/nursing-archive/document/:documentID - Delete document
router.delete('/nursing-archive/document/:documentID', async (req, res) => {
    try {
        const { documentID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        
        // Get document details before deletion
        const docResult = await pool.request()
            .input('documentID', sql.Int, documentID)
            .query('SELECT * FROM dbo.NursingArchive WHERE archiveID = @documentID');
        
        if (docResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const document = docResult.recordset[0];
        
        // Delete document record
        await pool.request()
            .input('documentID', sql.Int, documentID)
            .query('DELETE FROM dbo.NursingArchive WHERE archiveID = @documentID');
        
        // Delete physical file
        try {
            await fs.unlink(document.filePath);
        } catch (fileError) {
            console.error('Error deleting file:', fileError);
            // Continue even if file deletion fails
        }
        
        await logUserAction(req, 'DELETE', 'NursingArchive', documentID);
        
        res.json({ 
            message: 'Document deleted successfully',
            documentID: documentID 
        });
        
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ 
            message: 'Failed to delete document', 
            error: error.message 
        });
    }
});

// ✅ GET /api/nursing-archive/categories - Get all document categories
router.get('/nursing-archive/categories', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .query(`
                SELECT 
                    dc.*,
                    COUNT(na.archiveID) as documentCount
                FROM dbo.DocumentCategories dc
                LEFT JOIN dbo.NursingArchive na ON dc.categoryID = na.categoryID
                WHERE dc.isActive = 1
                GROUP BY dc.categoryID, dc.categoryName, dc.categoryDescription, dc.parentCategoryID, 
                         dc.allowedFileTypes, dc.retentionPeriod, dc.isActive
                ORDER BY dc.categoryName
            `);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ 
            message: 'Failed to fetch categories', 
            error: error.message 
        });
    }
});

// ✅ GET /api/nursing-archive/:clientID/search - Search documents
router.get('/nursing-archive/:clientID/search', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { q, category, startDate, endDate, confidentiality } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        
        const pool = await sql.connect(dbConfig);
        let query = `
            SELECT 
                na.*,
                dc.categoryName,
                dc.categoryDescription
            FROM dbo.NursingArchive na
            LEFT JOIN dbo.DocumentCategories dc ON na.categoryID = dc.categoryID
            WHERE na.clientID = @clientID
            AND (
                na.documentName LIKE @searchTerm OR 
                na.description LIKE @searchTerm OR 
                na.keywords LIKE @searchTerm OR
                na.originalFileName LIKE @searchTerm
            )
        `;
        
        const request = pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('searchTerm', sql.VarChar(500), `%${q}%`);
        
        // Add additional filters
        if (category) {
            query += ' AND dc.categoryName = @category';
            request.input('category', sql.VarChar(100), category);
        }
        
        if (startDate) {
            query += ' AND na.documentDate >= @startDate';
            request.input('startDate', sql.Date, startDate);
        }
        
        if (endDate) {
            query += ' AND na.documentDate <= @endDate';
            request.input('endDate', sql.Date, endDate);
        }
        
        if (confidentiality) {
            query += ' AND na.confidentialityLevel = @confidentiality';
            request.input('confidentiality', sql.VarChar(20), confidentiality);
        }
        
        query += ' ORDER BY na.uploadedAt DESC';
        
        const result = await request.query(query);
        
        await logUserAction(req, 'SEARCH', 'NursingArchive', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error searching documents:', error);
        res.status(500).json({ 
            message: 'Failed to search documents', 
            error: error.message 
        });
    }
});

// ✅ GET /api/nursing-archive/:clientID/audit - Get document access audit
router.get('/nursing-archive/:clientID/audit', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { startDate, endDate, accessType } = req.query;
        
        const pool = await sql.connect(dbConfig);
        let query = `
            SELECT 
                da.*,
                na.documentName,
                na.originalFileName,
                dc.categoryName
            FROM dbo.DocumentAccess da
            INNER JOIN dbo.NursingArchive na ON da.archiveID = na.archiveID
            LEFT JOIN dbo.DocumentCategories dc ON na.categoryID = dc.categoryID
            WHERE na.clientID = @clientID
        `;
        
        const request = pool.request()
            .input('clientID', sql.VarChar(50), clientID);
        
        if (startDate) {
            query += ' AND da.accessedAt >= @startDate';
            request.input('startDate', sql.DateTime2, startDate);
        }
        
        if (endDate) {
            query += ' AND da.accessedAt <= @endDate';
            request.input('endDate', sql.DateTime2, endDate);
        }
        
        if (accessType) {
            query += ' AND da.accessType = @accessType';
            request.input('accessType', sql.VarChar(20), accessType);
        }
        
        query += ' ORDER BY da.accessedAt DESC';
        
        const result = await request.query(query);
        
        await logUserAction(req, 'AUDIT', 'NursingArchive', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ 
            message: 'Failed to fetch audit log', 
            error: error.message 
        });
    }
});

module.exports = router;