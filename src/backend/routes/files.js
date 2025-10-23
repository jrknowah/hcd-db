const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();


const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER || 'client-docs';
const ENABLE_LOCAL_FALLBACK = String(process.env.ENABLE_LOCAL_FALLBACK || 'true').toLowerCase() === 'true';

// Determine authentication method
const HAS_CONNECTION_STRING = !!CONNECTION_STRING;
const HAS_MANAGED_IDENTITY = !!STORAGE_ACCOUNT && !CONNECTION_STRING;
const IS_LOCAL = !CONNECTION_STRING && !STORAGE_ACCOUNT;

console.log('=== Azure Blob Storage Configuration ===');
console.log('Environment:', IS_LOCAL ? '🏠 Local Development' : '☁️  Azure Production');
console.log('Auth Method:', HAS_CONNECTION_STRING ? '🔑 Connection String' : HAS_MANAGED_IDENTITY ? '🔐 Managed Identity' : '💾 Local Storage');
console.log('Storage Account:', STORAGE_ACCOUNT || CONNECTION_STRING?.match(/AccountName=([^;]+)/)?.[1] || 'Not set');
console.log('Container Name:', CONTAINER_NAME);
console.log('Local Fallback Enabled:', ENABLE_LOCAL_FALLBACK);

/* --------------------------- Azure Blob Clients --------------------------- */

let blobServiceClient = null;
let _containerClient = null;

// Initialize Azure SDK based on available credentials
if (HAS_CONNECTION_STRING) {
  try {
    console.log('🔑 Initializing with Connection String...');
    const { BlobServiceClient } = require('@azure/storage-blob');
    blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    console.log('✅ BlobServiceClient initialized with Connection String');
  } catch (error) {
    console.error('❌ Failed to initialize with Connection String:', error.message);
    blobServiceClient = null;
  }
} else if (HAS_MANAGED_IDENTITY) {
  try {
    console.log('🔐 Initializing with Managed Identity...');
    const { DefaultAzureCredential } = require('@azure/identity');
    const { BlobServiceClient } = require('@azure/storage-blob');
    
    const credential = new DefaultAzureCredential({
      loggingOptions: {
        allowLoggingAccountIdentifiers: true,
        logLevel: 'info'
      }
    });
    
    blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
      credential
    );
    console.log('✅ BlobServiceClient initialized with Managed Identity');
  } catch (error) {
    console.error('❌ Failed to initialize with Managed Identity:', error.message);
    blobServiceClient = null;
  }
} else {
  console.log('🏠 Running in LOCAL mode - Azure storage disabled');
  console.log('   Files will be stored in ./uploads directory');
  console.log('   Set AZURE_STORAGE_ACCOUNT or AZURE_STORAGE_CONNECTION_STRING for Azure storage');
}

console.log('=========================================');

/**
 * Get or create container client
 * PRODUCTION FIX: Skip container creation, just access existing container
 */
async function getContainerClient() {
  if (_containerClient) return _containerClient;
  
  if (!blobServiceClient) {
    throw new Error('Azure Blob Storage not configured. Using local storage.');
  }
  
  try {
    console.log(`🔍 Accessing container: ${CONTAINER_NAME}`);
    
    const client = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // PRODUCTION FIX: Don't try to create - just verify it exists
    // Container should already exist in Azure Portal
    const exists = await client.exists();
    if (!exists) {
      throw new Error(`Container '${CONTAINER_NAME}' does not exist. Please create it in Azure Portal first.`);
    }
    
    console.log(`✅ Successfully connected to container '${CONTAINER_NAME}'`);
    _containerClient = client;
    return _containerClient;
    
  } catch (error) {
    console.error('❌ Failed to access container:', error.message);
    if (error.code) console.error('   Error code:', error.code);
    if (error.statusCode) console.error('   Status code:', error.statusCode);
    
    _containerClient = null;
    throw error;
  }
}

/* ------------------------------- Utilities -------------------------------- */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = new Set([
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]);
    if (allowedTypes.has(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

function sanitizeSegment(s) {
  return String(s || '')
    .replace(/[^\w\- ]+/g, '_')
    .trim()
    .replace(/\s+/g, '_');
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function buildBlobName({ clientID, docType, originalName }) {
  const ext = path.extname(originalName || '');
  const base = path.basename(originalName || 'file', ext);

  const safeClient = sanitizeSegment(clientID || 'unknown');
  const safeDoc = sanitizeSegment(docType || 'General');
  const safeBase = sanitizeSegment(base);

  return `${safeClient}/${safeDoc}/${timestamp()}-${safeBase}${ext}`;
}

// Ensure local uploads directory exists
const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (IS_LOCAL || ENABLE_LOCAL_FALLBACK) {
  try {
    if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
      fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
      console.log(`📁 Created local uploads directory: ${LOCAL_UPLOAD_DIR}`);
    }
  } catch (err) {
    console.warn('⚠️  Could not create uploads directory:', err.message);
  }
}

/* --------------------------------- Routes --------------------------------- */

/**
 * POST /upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { clientID, docType } = req.body;

    console.log(`📤 Upload request - Client: ${clientID}, DocType: ${docType}, File: ${file?.originalname}`);

    if (!file) {
      console.warn('❌ No file in upload request');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    if (!clientID || !docType) {
      console.warn('❌ Missing clientID or docType');
      return res.status(400).json({ success: false, message: 'clientID and docType are required' });
    }

    const blobName = buildBlobName({ clientID, docType, originalName: file.originalname });

    // Try Azure first
    if (blobServiceClient) {
      try {
        const containerClient = await getContainerClient();
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        console.log(`   Uploading ${file.size} bytes to Azure...`);
        
        await blockBlobClient.uploadData(file.buffer, {
          blobHTTPHeaders: {
            blobContentType: file.mimetype || 'application/octet-stream',
            blobCacheControl: 'no-cache'
          }
        });

        console.log(`   ✅ Upload successful to Azure: ${blockBlobClient.url}`);

        return res.json({
          success: true,
          storage: 'azure',
          fileName: path.basename(blobName),
          blobName,
          originalName: file.originalname,
          url: blockBlobClient.url,
          size: file.size,
          mimeType: file.mimetype
        });
        
      } catch (azureErr) {
        console.error('❌ Azure upload failed:', azureErr.message);
        console.error('   Error code:', azureErr.code);
        console.error('   Status code:', azureErr.statusCode);

        if (!ENABLE_LOCAL_FALLBACK) {
          return res.status(502).json({
            success: false,
            message: `Azure upload failed: ${azureErr.message}`,
            detail: azureErr.code || 'Unknown error'
          });
        }
        
        console.log('   ⚠️  Falling back to local storage...');
      }
    }

    // Local storage fallback
    if (ENABLE_LOCAL_FALLBACK || IS_LOCAL) {
      try {
        const localFileName = `${Date.now()}-${sanitizeSegment(file.originalname)}`;
        const localPath = path.join(LOCAL_UPLOAD_DIR, localFileName);
        
        fs.writeFileSync(localPath, file.buffer);
        console.log(`   ✅ Saved to local storage: ${localPath}`);

        return res.json({
          success: true,
          storage: 'local',
          fileName: localFileName,
          originalName: file.originalname,
          url: `/uploads/${localFileName}`,
          localPath: localPath,
          size: file.size,
          mimeType: file.mimetype,
          note: IS_LOCAL ? 'Running in local development mode' : 'Azure failed, used local fallback'
        });
      } catch (localErr) {
        console.error('❌ Local storage also failed:', localErr.message);
        return res.status(500).json({
          success: false,
          message: 'Both Azure and local storage failed',
          detail: localErr.message
        });
      }
    }

    return res.status(503).json({
      success: false,
      message: 'Azure Blob Storage not configured and local fallback is disabled'
    });
    
  } catch (err) {
    console.error('❌ File upload error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'File upload failed', 
      detail: err.message 
    });
  }
});

/**
 * GET /file/:fileName
 */
router.get('/file/:fileName', async (req, res) => {
  try {
    const blobName = req.query.blobName || req.params.fileName;
    if (!blobName) {
      return res.status(400).json({ message: 'blobName required' });
    }

    console.log(`📥 Retrieving file info: ${blobName}`);

    // Try Azure first
    if (blobServiceClient) {
      try {
        const containerClient = await getContainerClient();
        const blobClient = containerClient.getBlobClient(blobName);

        const exists = await blobClient.exists();
        if (!exists) {
          console.warn(`   ⚠️  File not found in Azure: ${blobName}`);
          if (!ENABLE_LOCAL_FALLBACK) {
            return res.status(404).json({ message: 'File not found' });
          }
        } else {
          const props = await blobClient.getProperties();
          console.log(`   ✅ File found in Azure, size: ${props.contentLength} bytes`);

          return res.json({
            blobName,
            fileName: path.basename(blobName),
            url: blobClient.url,
            size: props.contentLength,
            mimeType: props.contentType,
            lastModified: props.lastModified,
            storage: 'azure'
          });
        }
      } catch (azureErr) {
        console.error('❌ Azure retrieval failed:', azureErr.message);
        if (!ENABLE_LOCAL_FALLBACK) {
          return res.status(500).json({ message: 'File retrieval failed', detail: azureErr.message });
        }
      }
    }

    // Local storage fallback
    if (ENABLE_LOCAL_FALLBACK || IS_LOCAL) {
      const localPath = path.join(LOCAL_UPLOAD_DIR, path.basename(blobName));
      
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        console.log(`   ✅ File found locally: ${localPath}`);
        
        return res.json({
          fileName: path.basename(blobName),
          url: `/uploads/${path.basename(blobName)}`,
          size: stats.size,
          lastModified: stats.mtime,
          storage: 'local'
        });
      }
    }

    return res.status(404).json({ message: 'File not found in any storage' });
    
  } catch (err) {
    console.error('❌ File retrieval failed:', err);
    return res.status(500).json({ message: 'File retrieval failed', detail: err.message });
  }
});

/**
 * GET /list
 */
router.get('/list', async (_req, res) => {
  try {
    console.log('📋 Listing files...');
    
    // Try Azure first
    if (blobServiceClient) {
      try {
        const containerClient = await getContainerClient();
        const files = [];

        for await (const blob of containerClient.listBlobsFlat()) {
          files.push({
            blobName: blob.name,
            fileName: path.basename(blob.name),
            url: `${containerClient.url}/${blob.name}`,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
            mimeType: blob.properties.contentType,
            storage: 'azure'
          });
        }

        console.log(`   ✅ Found ${files.length} files in Azure`);
        return res.json({ files, total: files.length, storage: 'azure' });
      } catch (azureErr) {
        console.error('❌ Azure listing failed:', azureErr.message);
        if (!ENABLE_LOCAL_FALLBACK) {
          return res.status(500).json({ 
            message: 'Azure listing failed', 
            detail: azureErr.message 
          });
        }
      }
    }

    // Local storage fallback
    if (ENABLE_LOCAL_FALLBACK || IS_LOCAL) {
      try {
        const files = [];
        
        if (fs.existsSync(LOCAL_UPLOAD_DIR)) {
          const localFiles = fs.readdirSync(LOCAL_UPLOAD_DIR);
          
          for (const file of localFiles) {
            const filePath = path.join(LOCAL_UPLOAD_DIR, file);
            const stats = fs.statSync(filePath);
            
            files.push({
              fileName: file,
              url: `/uploads/${file}`,
              size: stats.size,
              lastModified: stats.mtime,
              storage: 'local'
            });
          }
        }

        console.log(`   ✅ Found ${files.length} files locally`);
        return res.json({ files, total: files.length, storage: 'local' });
      } catch (localErr) {
        console.error('❌ Local listing failed:', localErr.message);
        return res.status(500).json({ 
          message: 'Local listing failed', 
          detail: localErr.message 
        });
      }
    }

    return res.json({ files: [], total: 0, storage: 'none' });
    
  } catch (err) {
    console.error('❌ Listing failed:', err);
    return res.status(500).json({ message: 'Listing failed', detail: err.message });
  }
});

/**
 * GET /files/:clientID
 */
router.get('/files/:clientID', async (req, res) => {
  try {
    const clientID = sanitizeSegment(req.params.clientID);
    console.log(`📂 Listing files for client: ${clientID}`);
    
    const prefix = `${clientID}/`;

    // Try Azure first
    if (blobServiceClient) {
      try {
        const containerClient = await getContainerClient();
        const files = [];

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          files.push({
            id: blob.name,
            blobName: blob.name,
            fileName: blob.name.split('/').pop(),
            blobUrl: `${containerClient.url}/${blob.name}`,
            docType: blob.name.split('/')[1] || 'Unknown',
            uploadDate: blob.properties.lastModified,
            fileSize: blob.properties.contentLength,
            contentType: blob.properties.contentType
          });
        }
        
        console.log(`   ✅ Found ${files.length} files in Azure for client ${clientID}`);
        return res.json(files);
      } catch (azureErr) {
        console.error('❌ Azure listing failed:', azureErr.message);
        if (!ENABLE_LOCAL_FALLBACK) {
          return res.status(500).json({ 
            message: 'Azure listing failed', 
            detail: azureErr.message 
          });
        }
      }
    }

    // Local storage fallback (simplified - no client prefix)
    if (ENABLE_LOCAL_FALLBACK || IS_LOCAL) {
      console.log(`   ⚠️  Local storage doesn't support client filtering`);
      return res.json([]);
    }

    return res.json([]);
    
  } catch (err) {
    console.error('❌ Client file listing failed:', err);
    return res.status(500).json({ message: 'Failed to list client files', detail: err.message });
  }
});

/**
 * DELETE /file/:fileName
 */
router.delete('/file/:fileName', async (req, res) => {
  try {
    const blobName = req.query.blobName || req.params.fileName;
    if (!blobName) {
      return res.status(400).json({ message: 'blobName required' });
    }

    console.log(`🗑️  Deleting file: ${blobName}`);

    // Try Azure first
    if (blobServiceClient) {
      try {
        const containerClient = await getContainerClient();
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const exists = await blockBlobClient.exists();
        if (!exists) {
          console.warn(`   ⚠️  File not found in Azure: ${blobName}`);
          if (!ENABLE_LOCAL_FALLBACK) {
            return res.status(404).json({ message: 'File not found' });
          }
        } else {
          await blockBlobClient.delete();
          console.log(`   ✅ File deleted from Azure`);

          return res.json({
            success: true,
            message: 'File deleted successfully',
            blobName,
            storage: 'azure'
          });
        }
      } catch (azureErr) {
        console.error('❌ Azure deletion failed:', azureErr.message);
        if (!ENABLE_LOCAL_FALLBACK) {
          return res.status(500).json({ message: 'Deletion failed', detail: azureErr.message });
        }
      }
    }

    // Local storage fallback
    if (ENABLE_LOCAL_FALLBACK || IS_LOCAL) {
      const localPath = path.join(LOCAL_UPLOAD_DIR, path.basename(blobName));
      
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`   ✅ File deleted from local storage`);
        
        return res.json({
          success: true,
          message: 'File deleted successfully',
          fileName: path.basename(blobName),
          storage: 'local'
        });
      }
    }

    return res.status(404).json({ message: 'File not found in any storage' });
    
  } catch (err) {
    console.error('❌ File deletion failed:', err);
    return res.status(500).json({ message: 'Deletion failed', detail: err.message });
  }
});

// POST /api/mental-archive-metadata - Save metadata after blob upload
router.post('/mental-archive-metadata', async (req, res) => {
  try {
    const { DefaultAzureCredential } = require('@azure/identity');
    const { connectToAzureSQL } = require('../store/azureSql'); // Adjust path as needed
    const sql = require('mssql');
    const { v4: uuidv4 } = require('uuid');
    
    const pool = await connectToAzureSQL();
    const userEmail = req.user?.email || 'system@example.com';
    
    const { fileId, clientID, originalName, fileName, blobName, blobUrl, 
            fileSize, mimeType, documentType, description, archiveDate, 
            originalDate } = req.body;
    
    await pool.request()
      .input('fileId', sql.VarChar, fileId || uuidv4())
      .input('clientID', sql.NVarChar, clientID)
      .input('originalName', sql.NVarChar, originalName)
      .input('fileName', sql.VarChar, fileName)
      .input('filePath', sql.VarChar, null)
      .input('blobName', sql.NVarChar, blobName)
      .input('blobUrl', sql.NVarChar, blobUrl)
      .input('fileSize', sql.BigInt, fileSize)
      .input('mimeType', sql.VarChar, mimeType)
      .input('documentType', sql.VarChar, documentType)
      .input('description', sql.NVarChar, description || null)
      .input('category', sql.VarChar, 'Mental Archive')
      .input('archiveDate', sql.Date, archiveDate || null)
      .input('originalDate', sql.Date, originalDate || null)
      .input('uploadedBy', sql.VarChar, userEmail)
      .input('storageType', sql.VarChar, 'blob')
      .query(`
        INSERT INTO MentalArchiveFiles (
          fileId, clientID, originalName, fileName, filePath, blobName, blobUrl,
          fileSize, mimeType, documentType, description, category,
          archiveDate, originalDate, uploadedBy, storageType
        ) VALUES (
          @fileId, @clientID, @originalName, @fileName, @filePath, @blobName, @blobUrl,
          @fileSize, @mimeType, @documentType, @description, @category,
          @archiveDate, @originalDate, @uploadedBy, @storageType
        )
      `);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mental-archive-metadata/:clientID
router.get('/mental-archive-metadata/:clientID', async (req, res) => {
  try {
    const { connectToAzureSQL } = require('../store/azureSql');
    const sql = require('mssql');
    
    const { clientID } = req.params;
    const pool = await connectToAzureSQL();
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT 
          fileId, clientID, originalName, fileName, blobName, blobUrl,
          fileSize, mimeType, documentType, description, category,
          archiveDate, originalDate, uploadedBy, uploadDate, storageType
        FROM MentalArchiveFiles 
        WHERE clientID = @clientID AND archived = 1
        ORDER BY uploadDate DESC
      `);

    res.json({ files: result.recordset });
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add to files.js before module.exports = router;

/**
 * GET /mental-archive/:clientID - Get only mental health archive files
 */
router.get('/mental-archive/:clientID', async (req, res) => {
  try {
    const clientID = sanitizeSegment(req.params.clientID);
    
    // Mental health document types
    const mentalHealthTypes = [
      'Mental Health Archive', 'Assessment Report', 'Treatment Plan',
      'Progress Notes', 'Discharge Summary', 'Psychiatric Evaluation',
      'Therapy Notes', 'Medication Records', 'Crisis Intervention',
      'Family Session Notes', 'Group Therapy Notes', 'Court Documents',
      'Insurance Forms', 'Medical Records', 'Lab Results', 
      'Imaging Studies', 'Historical Document', 'Paper Conversion', 'Other'
    ];

    const containerClient = await getContainerClient();
    const files = [];

    // List all files for this client
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${clientID}/` })) {
      const docType = blob.name.split('/')[1] || 'Unknown';
      
      // Only include mental health document types
      if (mentalHealthTypes.includes(docType)) {
        files.push({
          id: blob.name,
          blobName: blob.name,
          fileName: blob.name.split('/').pop(),
          blobUrl: `${containerClient.url}/${blob.name}`,
          docType: docType,
          uploadDate: blob.properties.lastModified,
          fileSize: blob.properties.contentLength,
          contentType: blob.properties.contentType
        });
      }
    }

    return res.json(files);
  } catch (err) {
    console.error('Mental archive file listing failed:', err);
    return res.status(500).json({ message: 'Failed to list mental archive files', detail: err.message });
  }
});

/**
 * Health
 */
router.get('/health', async (_req, res) => {
  try {
    const containerClient = await getContainerClient();
    await containerClient.getProperties(); // quick auth check
    return res.json({
      status: 'ok',
      azureBlobEnabled: true,
      container: CONTAINER_NAME,
      account: STORAGE_ACCOUNT,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      azureBlobEnabled: false,
      message: err.message
    });
  }
});

module.exports = router;
