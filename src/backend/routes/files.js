/**
 * files.js — Azure Blob (Managed Identity) upload/list/get/delete
 *
 * Env required:
 *   AZURE_STORAGE_ACCOUNT   = yourstorageacct (no protocol/domain)
 *   AZURE_BLOB_CONTAINER    = client-docs           (optional, default)
 *   ENABLE_LOCAL_FALLBACK   = false                 (optional; true only for dev)
 *
 * Notes:
 * - Uses System-assigned Managed Identity on your App Service
 * - Assign RBAC on the Storage Account: "Storage Blob Data Contributor"
 * - Container is created if missing, with PRIVATE access
 */

const express = require('express');
const multer = require('multer');
const path = require('path');

const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

const router = express.Router();

/* ----------------------------- Configuration ----------------------------- */

const STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT;
const CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER || 'client-docs';

// Safer default: no local fallback in production. Turn on only for local dev testing.
const ENABLE_LOCAL_FALLBACK = String(process.env.ENABLE_LOCAL_FALLBACK || 'false').toLowerCase() === 'true';

if (!STORAGE_ACCOUNT) {
  throw new Error('AZURE_STORAGE_ACCOUNT is not set. Set it in App Service → Configuration.');
}

/* --------------------------- Azure Blob Clients --------------------------- */

const credential = new DefaultAzureCredential({
  loggingOptions: {
    allowLoggingAccountIdentifiers: true,
    logLevel: 'info'
  }
});

console.log('🔐 Attempting to authenticate with DefaultAzureCredential...');
const blobServiceClient = new BlobServiceClient(
  `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential
);

// lazy-created container client
let _containerClient = null;
async function getContainerClient() {
  if (_containerClient) return _containerClient;
  const client = blobServiceClient.getContainerClient(CONTAINER_NAME);

  // PRIVATE container; do not expose blobs publicly
  await client.createIfNotExists({ access: 'private' }).catch(() => {});
  _containerClient = client;
  return _containerClient;
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
    .replace(/[^\w\- ]+/g, '_')  // keep letters, digits, underscore, hyphen, space
    .trim()
    .replace(/\s+/g, '_');       // collapse spaces to underscore
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Build a structured blob name:
 *   <clientID>/<docType>/<timestamp>-<sanitizedOriginalName><ext>
 */
function buildBlobName({ clientID, docType, originalName }) {
  const ext = path.extname(originalName || '');
  const base = path.basename(originalName || 'file', ext);

  const safeClient = sanitizeSegment(clientID || 'unknown');
  const safeDoc = sanitizeSegment(docType || 'General');
  const safeBase = sanitizeSegment(base);

  return `${safeClient}/${safeDoc}/${timestamp()}-${safeBase}${ext}`;
}

/* --------------------------------- Routes --------------------------------- */

/**
 * POST /upload
 * form-data: file (binary), clientID (text), docType (text)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { clientID, docType } = req.body;

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    if (!clientID || !docType) {
      return res.status(400).json({ success: false, message: 'clientID and docType are required' });
    }

    const blobName = buildBlobName({ clientID, docType, originalName: file.originalname });

    try {
      const containerClient = await getContainerClient();
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype || 'application/octet-stream',
          blobCacheControl: 'no-cache'
        }
      });

      return res.json({
        success: true,
        storage: 'azure',
        fileName: path.basename(blobName),
        blobName,                 // full path inside container
        originalName: file.originalname,
        url: blockBlobClient.url, // private URL (no SAS)
        size: file.size,
        mimeType: file.mimetype
      });
    } catch (azureErr) {
      console.error('Azure upload failed:', azureErr);

      if (ENABLE_LOCAL_FALLBACK) {
        const localName = `${Date.now()}-${sanitizeSegment(file.originalname)}`;
        return res.json({
          success: true,
          storage: 'local',
          fileName: localName,
          originalName: file.originalname,
          url: `/uploads/${localName}`,
          size: file.size,
          mimeType: file.mimetype,
          note: 'Azure upload failed, using local storage (dev only)'
        });
      }

      return res.status(502).json({
        success: false,
        message: `Azure upload failed: ${azureErr.message}`
      });
    }
  } catch (err) {
    console.error('File upload error:', err);
    return res.status(500).json({ success: false, message: 'File upload failed', detail: err.message });
  }
});

/**
 * GET /file/:fileName
 *   - Back-compat: uses path parameter as a simple file at container root
 *   - Prefer: GET /file?blobName=<clientID/docType/ts-name.ext>
 */
router.get('/file/:fileName', async (req, res) => {
  try {
    const blobName = req.query.blobName || req.params.fileName;
    if (!blobName) return res.status(400).json({ message: 'blobName required (query or param)' });

    const containerClient = await getContainerClient();
    const blobClient = containerClient.getBlobClient(blobName);

    const exists = await blobClient.exists();
    if (!exists) return res.status(404).json({ message: 'File not found' });

    const props = await blobClient.getProperties();

    return res.json({
      blobName,
      fileName: path.basename(blobName),
      url: blobClient.url, // private URL
      size: props.contentLength,
      mimeType: props.contentType,
      lastModified: props.lastModified,
      storage: 'azure'
    });
  } catch (err) {
    console.error('File retrieval failed:', err);
    return res.status(500).json({ message: 'File retrieval failed', detail: err.message });
  }
});

/**
 * GET /list
 * Lists all blobs in the container (useful for admin/debug)
 */
router.get('/list', async (_req, res) => {
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

    return res.json({ files, total: files.length, storage: 'azure' });
  } catch (err) {
    console.error('Azure listing failed:', err);
    return res.status(500).json({ message: 'Azure listing failed', detail: err.message, files: [], total: 0 });
  }
});

/**
 * GET /files/:clientID
 * Lists blobs under a client prefix
 */
router.get('/files/:clientID', async (req, res) => {
  try {
    const clientID = sanitizeSegment(req.params.clientID);
    const prefix = `${clientID}/`; // list everything for this client

    const containerClient = await getContainerClient();
    const files = [];

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      files.push({
        id: blob.name,
        blobName: blob.name,
        fileName: blob.name.split('/').pop(),
        blobUrl: `${containerClient.url}/${blob.name}`,
        docType: blob.name.split('/')[1] || 'Unknown', // infer from path: clientID/docType/...
        uploadDate: blob.properties.lastModified,
        fileSize: blob.properties.contentLength,
        contentType: blob.properties.contentType
      });
    }

    return res.json(files);
  } catch (err) {
    console.error('Client file listing failed:', err);
    return res.status(500).json({ message: 'Failed to list client files', detail: err.message });
  }
});

/**
 * DELETE /file/:fileName
 *   - Back-compat: deletes by simple name at root
 *   - Prefer: DELETE /fileblobName=<clientID/docType/ts-name.ext>
 */
router.delete('/file/:fileName', async (req, res) => {
  try {
    const blobName = req.query.blobName || req.params.fileName;
    if (!blobName) return res.status(400).json({ message: 'blobName required (query or param)' });

    const containerClient = await getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const exists = await blockBlobClient.exists();
    if (!exists) return res.status(404).json({ message: 'File not found' });

    await blockBlobClient.delete();

    return res.json({
      success: true,
      message: 'File deleted successfully',
      blobName,
      storage: 'azure'
    });
  } catch (err) {
    console.error('Azure file deletion failed:', err);
    return res.status(500).json({ message: 'Azure file deletion failed', detail: err.message });
  }
});

/**
 * (Optional) GET /file/download-url?blobName=...
 * Returns a time-limited SAS URL for private download (1 hour).
 * Requires MI permission to request a User Delegation Key.
 */
router.get('/file/download-url', async (req, res) => {
  try {
    const blobName = req.query.blobName;
    if (!blobName) return res.status(400).json({ message: 'blobName required' });

    const now = new Date();
    const expires = new Date(now.getTime() + 60 * 60 * 1000); // +1h

    // user delegation SAS (works with AAD/MI)
    const userDelegationKey = await blobServiceClient.getUserDelegationKey(now, expires);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: now,
        expiresOn: expires,
        protocol: 'https'
      },
      userDelegationKey,
      STORAGE_ACCOUNT
    ).toString();

    const blobClient = (await getContainerClient()).getBlobClient(blobName);
    const url = `${blobClient.url}?${sas}`;
    return res.json({ url, expiresOn: expires.toISOString() });
  } catch (err) {
    console.error('SAS generation failed:', err);
    return res.status(500).json({ message: 'Failed to generate download URL', detail: err.message });
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
