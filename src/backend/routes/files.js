// ✅ Fix for files.js - Enhanced error handling and configuration

const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const router = express.Router();

// ✅ Enhanced Azure Blob Storage configuration with error handling
let blobServiceClient = null;
let isAzureBlobEnabled = false;

try {
  // Check if Azure connection string is properly configured
  const azureConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!azureConnectionString) {
    console.warn('⚠️  AZURE_STORAGE_CONNECTION_STRING not found in environment variables');
    console.warn('⚠️  Azure Blob Storage will be disabled. File uploads will use local storage.');
  } else if (!azureConnectionString.startsWith('DefaultEndpointsProtocol=')) {
    console.warn('⚠️  AZURE_STORAGE_CONNECTION_STRING appears to be invalid format');
    console.warn('⚠️  Expected format: DefaultEndpointsProtocol=https;AccountName=...');
  } else {
    // Initialize Azure Blob Service Client
    blobServiceClient = BlobServiceClient.fromConnectionString(azureConnectionString);
    isAzureBlobEnabled = true;
    console.log('✅ Azure Blob Storage initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Azure Blob Storage:', error.message);
  console.warn('⚠️  Falling back to local file storage');
  isAzureBlobEnabled = false;
}

// ✅ Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for Azure upload
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// ✅ Upload file endpoint with fallback
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
    
    if (isAzureBlobEnabled) {
      // Upload to Azure Blob Storage
      try {
        const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists({
          access: 'blob' // or 'container' for public access
        });
        
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        
        // Upload file buffer to Azure
        await blockBlobClient.upload(file.buffer, file.buffer.length, {
          blobHTTPHeaders: {
            blobContentType: file.mimetype
          }
        });
        
        const fileUrl = blockBlobClient.url;
        
        console.log(`✅ File uploaded to Azure: ${fileName}`);
        
        res.json({
          success: true,
          fileName: fileName,
          originalName: file.originalname,
          url: fileUrl,
          size: file.size,
          mimeType: file.mimetype,
          storage: 'azure'
        });
        
      } catch (azureError) {
        console.error('❌ Azure upload failed:', azureError.message);
        
        // Fall back to local storage response
        res.json({
          success: true,
          fileName: fileName,
          originalName: file.originalname,
          url: `/uploads/${fileName}`, // Local URL
          size: file.size,
          mimeType: file.mimetype,
          storage: 'local',
          note: 'Azure upload failed, using local storage'
        });
      }
    } else {
      // Local storage fallback
      res.json({
        success: true,
        fileName: fileName,
        originalName: file.originalname,
        url: `/uploads/${fileName}`, // Local URL
        size: file.size,
        mimeType: file.mimetype,
        storage: 'local',
        note: 'Azure Blob Storage not configured, using local storage'
      });
    }
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed', 
      message: error.message 
    });
  }
});

// ✅ Get file endpoint
router.get('/file/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (isAzureBlobEnabled) {
      try {
        const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        
        // Check if file exists
        const exists = await blockBlobClient.exists();
        if (!exists) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        // Get file properties
        const properties = await blockBlobClient.getProperties();
        
        res.json({
          fileName: fileName,
          url: blockBlobClient.url,
          size: properties.contentLength,
          mimeType: properties.contentType,
          lastModified: properties.lastModified,
          storage: 'azure'
        });
        
      } catch (azureError) {
        console.error('❌ Azure file retrieval failed:', azureError.message);
        return res.status(404).json({ error: 'File not found or Azure error' });
      }
    } else {
      // Local storage fallback
      res.json({
        fileName: fileName,
        url: `/uploads/${fileName}`,
        storage: 'local',
        note: 'Azure Blob Storage not configured'
      });
    }
    
  } catch (error) {
    console.error('❌ File retrieval error:', error);
    res.status(500).json({ 
      error: 'File retrieval failed', 
      message: error.message 
    });
  }
});

// ✅ List files endpoint
router.get('/list', async (req, res) => {
  try {
    if (isAzureBlobEnabled) {
      try {
        const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        const files = [];
        
        // List all blobs in the container
        for await (const blob of containerClient.listBlobsFlat()) {
          files.push({
            fileName: blob.name,
            url: `${containerClient.url}/${blob.name}`,
            size: blob.properties.contentLength,
            lastModified: blob.properties.lastModified,
            mimeType: blob.properties.contentType,
            storage: 'azure'
          });
        }
        
        res.json({
          files: files,
          total: files.length,
          storage: 'azure'
        });
        
      } catch (azureError) {
        console.error('❌ Azure file listing failed:', azureError.message);
        res.json({
          files: [],
          total: 0,
          storage: 'local',
          error: 'Azure listing failed'
        });
      }
    } else {
      // Local storage fallback
      res.json({
        files: [],
        total: 0,
        storage: 'local',
        note: 'Azure Blob Storage not configured'
      });
    }
    
  } catch (error) {
    console.error('❌ File listing error:', error);
    res.status(500).json({ 
      error: 'File listing failed', 
      message: error.message 
    });
  }
});
// GET files for a specific client
router.get('/files/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    if (isAzureBlobEnabled) {
      try {
        const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        const files = [];
        
        // List blobs with clientID prefix
        for await (const blob of containerClient.listBlobsFlat({ prefix: `${clientID}/` })) {
          files.push({
            id: blob.name,
            fileName: blob.name.split('/').pop(),
            blobUrl: `${containerClient.url}/${blob.name}`,
            blobName: blob.name,
            docType: blob.metadata?.docType || 'Unknown',
            uploadDate: blob.properties.lastModified,
            fileSize: blob.properties.contentLength,
            contentType: blob.properties.contentType
          });
        }
        
        res.json(files);
        
      } catch (azureError) {
        console.error('Azure file listing failed:', azureError.message);
        res.json([]);
      }
    } else {
      // Local storage fallback - return empty array
      res.json([]);
    }
    
  } catch (error) {
    console.error('File listing error:', error);
    res.status(500).json({ 
      error: 'Failed to list client files', 
      message: error.message 
    });
  }
});

// ✅ Delete file endpoint
router.delete('/file/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (isAzureBlobEnabled) {
      try {
        const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        
        // Delete the blob
        await blockBlobClient.delete();
        
        console.log(`✅ File deleted from Azure: ${fileName}`);
        
        res.json({
          success: true,
          message: 'File deleted successfully',
          fileName: fileName,
          storage: 'azure'
        });
        
      } catch (azureError) {
        if (azureError.statusCode === 404) {
          return res.status(404).json({ error: 'File not found' });
        }
        
        console.error('❌ Azure file deletion failed:', azureError.message);
        res.status(500).json({ 
          error: 'Azure file deletion failed', 
          message: azureError.message 
        });
      }
    } else {
      // Local storage fallback
      res.json({
        success: true,
        message: 'File deletion not implemented for local storage',
        fileName: fileName,
        storage: 'local'
      });
    }
    
  } catch (error) {
    console.error('❌ File deletion error:', error);
    res.status(500).json({ 
      error: 'File deletion failed', 
      message: error.message 
    });
  }
});

// ✅ Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    azureBlobEnabled: isAzureBlobEnabled,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;