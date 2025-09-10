const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const sql = require("mssql");
const { poolPromise } = require("../store/azureSql");

// ✅ FIXED: Handle missing Azure Storage connection string gracefully
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
let blobServiceClient = null;

if (AZURE_STORAGE_CONNECTION_STRING) {
  try {
    const { BlobServiceClient } = require('@azure/storage-blob');
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    console.log('✅ Azure Blob Storage initialized for referrals');
  } catch (error) {
    console.warn('⚠️ Azure Blob Storage initialization failed for referrals:', error.message);
  }
} else {
  console.warn('⚠️ AZURE_STORAGE_CONNECTION_STRING not found - referral file uploads will use local storage');
}

const CONTAINER_NAME = "client-docs";

// ✅ Configure multer for local storage as fallback
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ✅ Middleware for logging
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ===================================================================
// GET ROUTES
// ===================================================================

// GET /api/clientReferrals/:clientID - Get referral data for a client
router.get("/clientReferrals/:clientID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("clientID", sql.Int, req.params.clientID)
      .query("SELECT lahsaReferral, odrReferral, dhsReferral FROM ClientReferrals WHERE clientID = @clientID");

    console.log(`✅ Retrieved referrals for client ${req.params.clientID}`);
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error("❌ Error fetching referrals:", err);
    res.status(500).json({ 
      error: "Error fetching referrals",
      details: err.message 
    });
  }
});

// GET /api/referralFiles/:clientID - Get uploaded files for a client
router.get("/referralFiles/:clientID", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input("clientID", sql.Int, req.params.clientID)
      .query(`
        SELECT 
          fileID,
          clientID,
          referralType,
          fileName,
          filePath,
          uploadedBy,
          uploadedAt
        FROM ReferralFiles 
        WHERE clientID = @clientID 
        ORDER BY uploadedAt DESC
      `);

    console.log(`✅ Retrieved ${result.recordset.length} referral files for client ${req.params.clientID}`);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching referral files:", err);
    res.status(500).json({ 
      error: "Error fetching referral files",
      details: err.message 
    });
  }
});

// ===================================================================
// POST ROUTES
// ===================================================================

// POST /api/saveClientReferrals - Save referral notes
router.post("/saveClientReferrals", async (req, res) => {
  const { clientID, lahsaReferral, odrReferral, dhsReferral } = req.body;

  // Validation
  if (!clientID) {
    return res.status(400).json({ 
      error: "Missing required field: clientID" 
    });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input("clientID", sql.Int, clientID)
      .input("lahsaReferral", sql.VarChar, lahsaReferral || '')
      .input("odrReferral", sql.VarChar, odrReferral || '')
      .input("dhsReferral", sql.VarChar, dhsReferral || '')
      .query(`
        MERGE ClientReferrals AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET 
            lahsaReferral = @lahsaReferral, 
            odrReferral = @odrReferral, 
            dhsReferral = @dhsReferral,
            updatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (clientID, lahsaReferral, odrReferral, dhsReferral, createdAt, updatedAt)
          VALUES (@clientID, @lahsaReferral, @odrReferral, @dhsReferral, GETDATE(), GETDATE());
      `);

    console.log(`✅ Saved referral notes for client ${clientID}`);
    res.json({ 
      success: true, 
      message: "Referral notes saved successfully",
      clientID 
    });
  } catch (err) {
    console.error("❌ Error saving referral notes:", err);
    res.status(500).json({ 
      error: "Error saving referral notes",
      details: err.message 
    });
  }
});

// POST /api/uploadReferral - Upload referral file
router.post("/uploadReferral", upload.single("file"), async (req, res) => {
  const { clientID, type } = req.body;

  // Validation
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!clientID || !type) {
    return res.status(400).json({ 
      error: "Missing required fields: clientID, type" 
    });
  }

  const fileName = req.file.originalname;
  let filePath = `/uploads/${req.file.filename}`;
  let fileUrl = filePath;

  try {
    // ✅ Try to upload to Azure Blob Storage if available
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blobName = `referrals/${clientID}/${Date.now()}-${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Upload file to Azure
        const fs = require('fs');
        const uploadBlobResponse = await blockBlobClient.uploadFile(req.file.path);
        
        // Update file path to Azure URL
        filePath = blobName;
        fileUrl = blockBlobClient.url;
        
        // Clean up local file
        fs.unlinkSync(req.file.path);
        
        console.log('✅ File uploaded to Azure Blob Storage:', blobName);
      } catch (azureError) {
        console.warn('⚠️ Azure upload failed, using local storage:', azureError.message);
        // Keep using local file path as fallback
      }
    }

    // Save file info to database
    const pool = await poolPromise;
    const result = await pool.request()
      .input("clientID", sql.Int, clientID)
      .input("referralType", sql.VarChar, type)
      .input("fileName", sql.VarChar, fileName)
      .input("filePath", sql.VarChar, filePath)
      .input("fileUrl", sql.VarChar, fileUrl)
      .input("uploadedBy", sql.VarChar, req.user?.email || 'System')
      .input("uploadedAt", sql.DateTime, new Date())
      .query(`
        INSERT INTO ReferralFiles (clientID, referralType, fileName, filePath, fileUrl, uploadedBy, uploadedAt)
        OUTPUT INSERTED.fileID, INSERTED.fileName, INSERTED.filePath, INSERTED.uploadedAt
        VALUES (@clientID, @referralType, @fileName, @filePath, @fileUrl, @uploadedBy, @uploadedAt);
      `);

    console.log(`✅ Referral file uploaded for client ${clientID}`);
    res.status(200).json({ 
      success: true,
      message: "File uploaded successfully", 
      file: result.recordset[0],
      fileUrl
    });
  } catch (err) {
    console.error("❌ Error saving referral file:", err);
    res.status(500).json({ 
      error: "Error uploading referral file",
      details: err.message 
    });
  }
});

// ===================================================================
// DELETE ROUTES
// ===================================================================

// DELETE /api/referralFiles/:fileID - Delete a referral file
router.delete("/referralFiles/:fileID", async (req, res) => {
  const { fileID } = req.params;

  try {
    const pool = await poolPromise;
    
    // First get file info
    const fileResult = await pool.request()
      .input("fileID", sql.Int, fileID)
      .query("SELECT * FROM ReferralFiles WHERE fileID = @fileID");

    if (fileResult.recordset.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileInfo = fileResult.recordset[0];

    // Delete from Azure Blob Storage if applicable
    if (blobServiceClient && fileInfo.filePath.startsWith('referrals/')) {
      try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blockBlobClient = containerClient.getBlockBlobClient(fileInfo.filePath);
        await blockBlobClient.delete();
        console.log('✅ File deleted from Azure Blob Storage');
      } catch (azureError) {
        console.warn('⚠️ Azure delete failed:', azureError.message);
      }
    } else if (fileInfo.filePath.startsWith('/uploads/')) {
      // Delete local file
      try {
        const fs = require('fs');
        const localPath = path.join(__dirname, '..', fileInfo.filePath);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log('✅ Local file deleted');
        }
      } catch (fsError) {
        console.warn('⚠️ Local file delete failed:', fsError.message);
      }
    }

    // Delete from database
    await pool.request()
      .input("fileID", sql.Int, fileID)
      .query("DELETE FROM ReferralFiles WHERE fileID = @fileID");

    console.log(`✅ Referral file ${fileID} deleted successfully`);
    res.json({ 
      success: true, 
      message: "File deleted successfully",
      fileID 
    });
  } catch (err) {
    console.error("❌ Error deleting referral file:", err);
    res.status(500).json({ 
      error: "Error deleting referral file",
      details: err.message 
    });
  }
});

// ===================================================================
// ERROR HANDLING
// ===================================================================

// Error handling middleware
router.use((error, req, res, next) => {
  console.error("❌ Referrals Routes Error:", error);
  res.status(500).json({
    error: "Internal server error in referrals routes",
    details: error.message
  });
});

module.exports = router;