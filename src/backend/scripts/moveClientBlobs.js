/**
 * moveClientBlobs.js
 *
 * Moves every blob under one client folder to another in Azure Blob Storage,
 * e.g. after renaming client ' Client ID 231257' to '231257' with
 * store/dbScripts/trimClientIDs.sql.
 *
 * Usage (from src/backend):
 *   node scripts/moveClientBlobs.js <oldFolder> <newFolder>           (preview only)
 *   node scripts/moveClientBlobs.js <oldFolder> <newFolder> --apply
 *
 *   node scripts/moveClientBlobs.js Client_ID_231257 231257 --apply
 *
 * Each blob is copied, verified (same size), and only then deleted from the old
 * folder. Blobs whose destination already exists are skipped, never overwritten.
 * Re-running is safe. To undo, swap the two folder names.
 *
 * Auth (same as the backend, from the same .env):
 *   - AZURE_STORAGE_CONNECTION_STRING, or
 *   - AZURE_STORAGE_ACCOUNT + an Azure sign-in (run `az login` first; your account
 *     needs the "Storage Blob Data Contributor" role on the storage account)
 * Optional: AZURE_BLOB_CONTAINER (default 'client-docs').
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { BlobServiceClient } = require('@azure/storage-blob');

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const STORAGE_ACCOUNT   = process.env.AZURE_STORAGE_ACCOUNT;
const CONTAINER_NAME    = process.env.AZURE_BLOB_CONTAINER || 'client-docs';

const args  = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');
const [oldFolder, newFolder] = args.map((a) => String(a).replace(/\/+$/, ''));

async function main() {
  if (!oldFolder || !newFolder || oldFolder === newFolder) {
    console.error('Usage: node scripts/moveClientBlobs.js <oldFolder> <newFolder> [--apply]');
    process.exit(1);
  }
  let serviceClient;
  if (CONNECTION_STRING) {
    serviceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    console.log('Auth      : connection string');
  } else if (STORAGE_ACCOUNT) {
    const { DefaultAzureCredential } = require('@azure/identity');
    serviceClient = new BlobServiceClient(
      `https://${STORAGE_ACCOUNT}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );
    console.log(`Auth      : Azure sign-in (account ${STORAGE_ACCOUNT})`);
  } else {
    console.error('❌ Neither AZURE_STORAGE_CONNECTION_STRING nor AZURE_STORAGE_ACCOUNT is set in .env');
    process.exit(1);
  }

  console.log(`Container : ${CONTAINER_NAME}`);
  console.log(`Move      : ${oldFolder}/  ->  ${newFolder}/`);
  console.log(`Mode      : ${APPLY ? 'APPLY' : 'PREVIEW (add --apply to move)'}\n`);

  const container = serviceClient.getContainerClient(CONTAINER_NAME);

  const prefix = `${oldFolder}/`;
  let moved = 0, skipped = 0, failed = 0, found = 0;

  for await (const blob of container.listBlobsFlat({ prefix, includeMetadata: true })) {
    found++;
    const target = `${newFolder}/${blob.name.slice(prefix.length)}`;
    const src = container.getBlockBlobClient(blob.name);
    const dst = container.getBlockBlobClient(target);

    if (await dst.exists()) {
      console.warn(`⚠️  skip (destination exists): ${target}`);
      skipped++;
      continue;
    }

    console.log(`${APPLY ? '➡️ ' : '👀'} ${blob.name}  ->  ${target}`);
    if (!APPLY) continue;

    try {
      const buffer = await src.downloadToBuffer();
      await dst.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: blob.properties.contentType || 'application/octet-stream',
          blobCacheControl: blob.properties.cacheControl,
          blobContentDisposition: blob.properties.contentDisposition,
        },
        metadata: blob.metadata || {},
      });

      const copied = await dst.getProperties();
      if (copied.contentLength !== blob.properties.contentLength) {
        throw new Error(`size mismatch (${copied.contentLength} vs ${blob.properties.contentLength}); original kept`);
      }

      await src.delete();
      moved++;
    } catch (err) {
      console.error(`❌ ${blob.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nFound ${found} blob(s) under ${prefix}`);
  if (APPLY) console.log(`Moved ${moved}, skipped ${skipped}, failed ${failed}`);
  else if (found) console.log('Preview only. Re-run with --apply to move them.');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
