// CommonJS
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');

const account = process.env.AZURE_STORAGE_ACCOUNT;
if (!account) {
  throw new Error('AZURE_STORAGE_ACCOUNT is not set');
}

const credential = new DefaultAzureCredential();

// Use the *blob* endpoint (NOT file.core.windows.net)
const blobServiceClient = new BlobServiceClient(
  `https://clientintakestorage.blob.core.windows.net/`,
  credential
);

module.exports = { blobServiceClient };
