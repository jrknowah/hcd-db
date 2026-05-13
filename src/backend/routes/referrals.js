const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const sql = require("mssql");
const { getPool } = require("../store/azureSql");
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

// Configure Azure Blob Storage using Managed Identity (no connection string needed)
const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'clientintakestorage';
const CONTAINER_NAME = "client-docs";

// Initialize blob service client via Managed Identity
let blobServiceClient = null;
try {
  const credential = new DefaultAzureCredential();
  blobServiceClient = new BlobServiceClient(
    `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    credential
  );
  console.log('✅ Azure Blob Storage initialized for referrals (Managed Identity)');
} catch (error) {
  console.error('❌ Failed to initialize Azure Blob Storage:', error.message);
}

// Configure multer to use memory storage for Azure uploads
const upload = multer({ 
  storage: multer.memoryStorage(),  // Keep file in memory for Azure upload
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ✅ GET /clientReferrals/:clientID - Get referral data (FIXED)
router.get('/clientReferrals/:clientID', async (req, res) => {
  const { clientID } = req.params;
  
  console.log(`${new Date().toISOString()} - GET /clientReferrals/${clientID}`);

  try {
    const pool = await getPool();  // ✅ FIXED: Use connectToAzureSQL() instead of sql.connect(azureConfig)
    
    // ✅ FIXED: Include ALL 4 referral fields in SELECT
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT 
          lahsaReferral,
          odrReferral,
          dhsReferral,
          dmhReferral
        FROM ClientReferrals
        WHERE clientID = @clientID
      `);

    if (result.recordset.length === 0) {
      // Return empty strings for all 4 fields if client not found
      return res.status(200).json({
        lahsaReferral: '',
        odrReferral: '',
        dhsReferral: '',
        dmhReferral: ''
      });
    }

    const referrals = result.recordset[0];
    
    // ✅ FIXED: Ensure all 4 fields are in response
    res.status(200).json({
      lahsaReferral: referrals.lahsaReferral || '',
      odrReferral: referrals.odrReferral || '',
      dhsReferral: referrals.dhsReferral || '',
      dmhReferral: referrals.dmhReferral || ''
    });

    console.log(`✅ Retrieved referrals for client ${clientID}`);

  } catch (error) {
    console.error('Error retrieving referrals:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve referral data',
      message: error.message 
    });
  }
});

// ✅ POST /saveClientReferrals - Save referral notes (FIXED)
router.post("/saveClientReferrals", async (req, res) => {
  const { clientID, lahsaReferral, odrReferral, dhsReferral, dmhReferral } = req.body;  // ✅ ADDED dmhReferral

  console.log(`${new Date().toISOString()} - POST /api/saveClientReferrals`);
  console.log('📤 Request body:', req.body);

  if (!clientID) {
    return res.status(400).json({ 
      error: "clientID is required" 
    });
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input("clientID", sql.NVarChar, clientID)
      .input("lahsaReferral", sql.NVarChar(sql.MAX), lahsaReferral || '')
      .input("odrReferral", sql.NVarChar(sql.MAX), odrReferral || '')
      .input("dhsReferral", sql.NVarChar(sql.MAX), dhsReferral || '')
      .input("dmhReferral", sql.NVarChar(sql.MAX), dmhReferral || '')  // ✅ ADDED dmhReferral
      .query(`
        MERGE ClientReferrals AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET 
            lahsaReferral = @lahsaReferral, 
            odrReferral = @odrReferral, 
            dhsReferral = @dhsReferral,
            dmhReferral = @dmhReferral
        WHEN NOT MATCHED THEN
          INSERT (clientID, lahsaReferral, odrReferral, dhsReferral, dmhReferral)
          VALUES (@clientID, @lahsaReferral, @odrReferral, @dhsReferral, @dmhReferral);
      `);

    console.log(`✅ Saved referral notes for client ${clientID}`);
    res.status(200).json({ 
        success: true, 
        message: 'Client referrals saved successfully' 
      });
    
  } catch (err) {
    console.error("❌ Error saving referral notes:", err);
    res.status(500).json({ 
      error: "Error saving referral notes",
      details: err.message 
    });
  }
});

// POST /uploadReferral - Upload referral file to Azure Blob Storage
router.post("/uploadReferral", upload.single("file"), async (req, res) => {
  const { clientID, type } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!clientID || !type) {
    return res.status(400).json({ 
      error: "Missing required fields: clientID, type" 
    });
  }

  const fileName = req.file.originalname;
  let filePath = '';
  let fileUrl = '';
  let storageLocation = 'local';

  try {
    // Try to upload to Azure Blob Storage
    if (blobServiceClient) {
      try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        
        // Generate unique blob name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blobName = `referrals/${clientID}/${type}/${timestamp}_${fileName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        // Upload file buffer directly to Azure
        console.log(`📤 Uploading ${fileName} to Azure Blob Storage...`);
        const uploadBlobResponse = await blockBlobClient.upload(
          req.file.buffer,
          req.file.buffer.length,
          {
            blobHTTPHeaders: {
              blobContentType: req.file.mimetype
            },
            metadata: {
              clientID: clientID,
              referralType: type,
              originalName: fileName
            }
          }
        );
        
        filePath = blobName;
        fileUrl = blockBlobClient.url;
        storageLocation = 'azure';
        
        console.log(`✅ File uploaded to Azure Blob Storage: ${blobName}`);
      } catch (azureError) {
        console.error('❌ Azure upload failed:', azureError.message);
        throw azureError; // Re-throw to handle in outer catch
      }
    } else {
      console.warn('⚠️ Azure Blob Storage not configured, cannot upload file');
      return res.status(503).json({ 
        error: "Storage service unavailable",
        details: "Azure Blob Storage is not configured on the server"
      });
    }

    // Save file info to database
    const pool = await getPool();
    const result = await pool.request()
      .input("clientID", sql.NVarChar, clientID)
      .input("referralType", sql.NVarChar, type)
      .input("fileName", sql.NVarChar, fileName)
      .input("filePath", sql.NVarChar, filePath)
      .input("fileUrl", sql.NVarChar, fileUrl)
      .input("storageLocation", sql.NVarChar, storageLocation)
      .input("uploadedBy", sql.NVarChar, req.user?.email || 'System')
      .input("uploadedAt", sql.DateTime, new Date())
      .query(`
        INSERT INTO ReferralFiles (clientID, referralType, fileName, filePath, fileUrl, uploadedBy, uploadedAt)
        OUTPUT INSERTED.fileID, INSERTED.fileName, INSERTED.filePath, INSERTED.fileUrl, INSERTED.uploadedAt
        VALUES (@clientID, @referralType, @fileName, @filePath, @fileUrl, @uploadedBy, @uploadedAt);
      `);

    console.log(`✅ File record saved to database for client ${clientID}`);
    res.status(200).json({ 
      success: true,
      message: "File uploaded successfully to Azure Blob Storage", 
      file: result.recordset[0],
      fileUrl,
      storageLocation
    });
  } catch (err) {
    console.error("❌ Error in file upload:", err);
    res.status(500).json({ 
      error: "Error uploading referral file",
      details: err.message 
    });
  }
});

// GET /referralFiles/:clientID - Get uploaded files
router.get("/referralFiles/:clientID", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("clientID", sql.NVarChar, req.params.clientID)
      .query(`
        SELECT 
          fileID,
          clientID,
          referralType,
          fileName,
          filePath,
          fileUrl,
          uploadedBy,
          uploadedAt
        FROM ReferralFiles 
        WHERE clientID = @clientID 
        ORDER BY uploadedAt DESC
      `);

    console.log(`✅ Retrieved ${result.recordset.length} files for client ${req.params.clientID}`);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching referral files:", err);
    res.status(500).json({ 
      error: "Error fetching referral files",
      details: err.message 
    });
  }
});

// DELETE /referralFiles/:fileID - Delete file from Azure and database
router.delete("/referralFiles/:fileID", async (req, res) => {
  const { fileID } = req.params;

  try {
    const pool = await getPool();
    
    // Get file info first
    const fileResult = await pool.request()
      .input("fileID", sql.Int, fileID)
      .query("SELECT * FROM ReferralFiles WHERE fileID = @fileID");

    if (fileResult.recordset.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileInfo = fileResult.recordset[0];

    // Delete from Azure Blob Storage if it's stored there
    if (blobServiceClient && fileInfo.filePath.includes('/')) {
      try {
        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
        const blockBlobClient = containerClient.getBlockBlobClient(fileInfo.filePath);
        await blockBlobClient.deleteIfExists();
        console.log(`✅ File deleted from Azure Blob Storage: ${fileInfo.filePath}`);
      } catch (azureError) {
        console.error('❌ Failed to delete from Azure:', azureError.message);
      }
    }

    // Delete from database
    await pool.request()
      .input("fileID", sql.Int, fileID)
      .query("DELETE FROM ReferralFiles WHERE fileID = @fileID");

    console.log(`✅ File record deleted from database: ${fileID}`);
    res.json({ 
      success: true, 
      message: "File deleted successfully",
      fileID 
    });
  } catch (err) {
    console.error("❌ Error deleting file:", err);
    res.status(500).json({ 
      error: "Error deleting file",
      details: err.message 
    });
  }
});

// GET /referralFiles/download/:fileID - Stream blob through backend (auth-gated)
router.get("/referralFiles/download/:fileID", async (req, res) => {
  const { fileID } = req.params;

  try {
    const pool = await getPool();
    const fileResult = await pool.request()
      .input("fileID", sql.Int, fileID)
      .query("SELECT fileName, filePath FROM ReferralFiles WHERE fileID = @fileID");

    if (fileResult.recordset.length === 0) {
      return res.status(404).json({ error: "File not found in database" });
    }

    const { fileName, filePath } = fileResult.recordset[0];

    if (!blobServiceClient) {
      return res.status(503).json({ error: "Blob storage not configured" });
    }

    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(filePath);

    // Download blob and stream to client
    const downloadResponse = await blockBlobClient.download();

    res.setHeader(
      "Content-Type",
      downloadResponse.contentType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(fileName)}"`
    );
    if (downloadResponse.contentLength) {
      res.setHeader("Content-Length", downloadResponse.contentLength);
    }

    downloadResponse.readableStreamBody.pipe(res);

    downloadResponse.readableStreamBody.on("error", (streamErr) => {
      console.error("❌ Stream error during blob download:", streamErr);
      if (!res.headersSent) {
        res.status(500).json({ error: "Stream failed" });
      }
    });

    console.log(`✅ Streamed blob ${filePath} for fileID ${fileID}`);
  } catch (err) {
    // Azure returns 404 BlobNotFound if the blob path is wrong
    if (err.statusCode === 404) {
      console.error(`❌ Blob not found in storage: fileID=${fileID}`);
      return res.status(404).json({ error: "File not found in storage" });
    }
    console.error("❌ Error downloading file:", err);
    res.status(500).json({ error: "Error downloading file", details: err.message });
  }
});

module.exports = router;