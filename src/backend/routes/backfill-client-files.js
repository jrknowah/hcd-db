/**
 * backfill-client-files.js
 *
 * Scans all blobs in Azure Blob Storage and inserts any missing records
 * into the ClientFiles table. Safe to run multiple times — skips blobs
 * that already have a DB record.
 *
 * Usage:
 *   node backfill-client-files.js
 *   node backfill-client-files.js --dry-run      (preview only, no writes)
 *   node backfill-client-files.js --client BB31481F1  (single client only)
 *
 * Requires the same .env as your backend (AZURE_STORAGE_CONNECTION_STRING,
 * AZURE_BLOB_CONTAINER, and your SQL connection vars).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME    = process.env.AZURE_BLOB_CONTAINER || 'client-docs';

const DRY_RUN      = process.argv.includes('--dry-run');
const CLIENT_FILTER = (() => {
  const idx = process.argv.indexOf('--client');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse blobName segments: "{clientID}/{docType}/{timestamp}-{fileName}"
 * Returns { clientID, docType, fileName } or null if the path is unexpected.
 */
function parseBlobName(blobName) {
  const parts = blobName.split('/');
  if (parts.length < 3) return null;
  return {
    clientID: parts[0],
    docType:  parts[1],
    fileName: parts.slice(2).join('/'), // preserve any sub-path in filename
  };
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=======================================================');
  console.log(' ClientFiles Backfill Script');
  console.log('=======================================================');
  console.log(`  Container  : ${CONTAINER_NAME}`);
  console.log(`  Dry run    : ${DRY_RUN}`);
  console.log(`  Client     : ${CLIENT_FILTER || '(all)'}`);
  console.log('=======================================================\n');

  if (!CONNECTION_STRING) {
    console.error('❌ AZURE_STORAGE_CONNECTION_STRING is not set in .env');
    process.exit(1);
  }

  // ── Connect to Azure Blob ──────────────────────────────────────────────────
  console.log('🔗 Connecting to Azure Blob Storage...');
  const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const containerClient   = blobServiceClient.getContainerClient(CONTAINER_NAME);

  const exists = await containerClient.exists();
  if (!exists) {
    console.error(`❌ Container '${CONTAINER_NAME}' not found`);
    process.exit(1);
  }
  console.log(`✅ Connected to container '${CONTAINER_NAME}'\n`);

  // ── Connect to SQL ─────────────────────────────────────────────────────────
  console.log('🔗 Connecting to Azure SQL...');
  let pool;
  try {
    const { connectToAzureSQL } = require('../store/azureSql');
    pool = await connectToAzureSQL();
    console.log('✅ SQL connected\n');
  } catch (err) {
    console.error('❌ SQL connection failed:', err.message);
    process.exit(1);
  }

  // ── Load existing blobNames from DB ───────────────────────────────────────
  console.log('📋 Loading existing ClientFiles records...');
  const existingResult = await pool.request().query(`
    SELECT blobName FROM ClientFiles WHERE isDeleted = 0 OR isDeleted IS NULL
  `);
  const existingBlobNames = new Set(existingResult.recordset.map(r => r.blobName));
  console.log(`   Found ${existingBlobNames.size} existing records in DB\n`);

  // ── Scan blobs ─────────────────────────────────────────────────────────────
  console.log('🔍 Scanning blobs...');
  const prefix = CLIENT_FILTER ? `${CLIENT_FILTER}/` : undefined;

  const toInsert  = [];
  const skipped   = [];
  const malformed = [];

  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    const parsed = parseBlobName(blob.name);

    if (!parsed) {
      malformed.push(blob.name);
      continue;
    }

    if (existingBlobNames.has(blob.name)) {
      skipped.push(blob.name);
      continue;
    }

    toInsert.push({
      blobName:    blob.name,
      clientID:    parsed.clientID,
      fileName:    parsed.fileName,
      docType:     parsed.docType,
      fileSize:    blob.properties.contentLength || 0,
      contentType: blob.properties.contentType  || 'application/octet-stream',
      uploadDate:  blob.properties.lastModified  || new Date(),
    });
  }

  console.log(`   Blobs to insert : ${toInsert.length}`);
  console.log(`   Already in DB   : ${skipped.length}`);
  console.log(`   Malformed paths : ${malformed.length}`);

  if (malformed.length > 0) {
    console.log('\n⚠️  Malformed blob paths (skipped):');
    malformed.forEach(n => console.log(`     ${n}`));
  }

  if (toInsert.length === 0) {
    console.log('\n✅ Nothing to insert — ClientFiles is already up to date.');
    await pool.close();
    return;
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  console.log('\n📄 Blobs to insert:');
  toInsert.forEach(f => {
    console.log(`   [${f.clientID}] ${f.docType}/${f.fileName} (${formatBytes(f.fileSize)})`);
  });

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no records written. Remove --dry-run to apply.');
    await pool.close();
    return;
  }

  // ── Insert ─────────────────────────────────────────────────────────────────
  console.log('\n💾 Inserting records...');
  let inserted = 0;
  let failed   = 0;

  for (const f of toInsert) {
    try {
      await pool.request()
        .input('clientID',    sql.NVarChar(50),  f.clientID)
        .input('fileName',    sql.NVarChar(255), f.fileName)
        .input('blobName',    sql.NVarChar(500), f.blobName)
        .input('blobUrl',     sql.NVarChar(500), '')
        .input('docType',     sql.NVarChar(100), f.docType)
        .input('fileSize',    sql.BigInt,        f.fileSize)
        .input('contentType', sql.NVarChar(100), f.contentType)
        .input('uploadDate',  sql.DateTime,      f.uploadDate)
        .query(`
          INSERT INTO ClientFiles
            (clientID, fileName, blobName, blobUrl, docType, fileSize, contentType,
             uploadedBy, uploadDate, isDeleted)
          VALUES
            (@clientID, @fileName, @blobName, @blobUrl, @docType, @fileSize, @contentType,
             'backfill-script', @uploadDate, 0)
        `);

      console.log(`   ✅ ${f.blobName}`);
      inserted++;
    } catch (err) {
      console.error(`   ❌ ${f.blobName} — ${err.message}`);
      failed++;
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=======================================================');
  console.log(' Summary');
  console.log('=======================================================');
  console.log(`  Inserted  : ${inserted}`);
  console.log(`  Failed    : ${failed}`);
  console.log(`  Skipped   : ${skipped.length} (already in DB)`);
  console.log(`  Malformed : ${malformed.length} (unexpected blob path)`);
  console.log('=======================================================');

  await pool.close();
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
