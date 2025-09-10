// services/azureBlobService.js
import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = import.meta.env.VITE_AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "client-docs";

class AzureBlobService {
  constructor() {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      console.warn('⚠️ Azure Storage connection string not found in environment variables');
      this.isConfigured = false;
      return;
    }
    
    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
      this.isConfigured = true;
    } catch (error) {
      console.error('❌ Failed to initialize Azure Blob Service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   * @param {File} file - The file to upload
   * @param {string} clientID - Client identifier
   * @param {string} docType - Document type/category
   * @returns {Promise<Object>} Upload result with blob URL and metadata
   */
  async uploadFile(file, clientID, docType) {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not properly configured');
    }

    try {
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = file.name.split('.').pop();
      const blobName = `${clientID}/${docType}/${timestamp}_${file.name}`;
      
      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      
      // Ensure container exists
      await containerClient.createIfNotExists({
        access: 'blob' // Allow public read access to blobs
      });
      
      // Get blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      // Set blob metadata
      const metadata = {
        clientID: clientID.toString(),
        docType: docType,
        originalName: file.name,
        uploadDate: new Date().toISOString(),
        fileSize: file.size.toString(),
        contentType: file.type || 'application/octet-stream'
      };
      
      // Upload options
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: file.type || 'application/octet-stream'
        },
        metadata: metadata,
        tags: {
          clientID: clientID.toString(),
          docType: docType,
          uploadDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        }
      };
      
      // Upload the file
      console.log(`📤 Uploading ${file.name} to Azure Blob Storage...`);
      const uploadResponse = await blockBlobClient.uploadData(file, uploadOptions);
      
      console.log(`✅ Successfully uploaded ${file.name}`, uploadResponse);
      
      return {
        success: true,
        blobName: blobName,
        blobUrl: blockBlobClient.url,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        uploadDate: new Date().toISOString(),
        etag: uploadResponse.etag,
        requestId: uploadResponse.requestId
      };
      
    } catch (error) {
      console.error(`❌ Failed to upload ${file.name}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * List files for a specific client
   * @param {string} clientID - Client identifier
   * @param {string} docType - Optional document type filter
   * @returns {Promise<Array>} List of client files
   */
  async listClientFiles(clientID, docType = null) {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not properly configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      const prefix = docType ? `${clientID}/${docType}/` : `${clientID}/`;
      
      const files = [];
      
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        const blobClient = containerClient.getBlobClient(blob.name);
        
        files.push({
          fileName: blob.metadata?.originalName || blob.name.split('/').pop(),
          blobName: blob.name,
          blobUrl: blobClient.url,
          fileSize: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          uploadDate: blob.metadata?.uploadDate || blob.properties.lastModified,
          docType: blob.metadata?.docType || 'unknown',
          etag: blob.etag
        });
      }
      
      return files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      
    } catch (error) {
      console.error(`❌ Failed to list files for client ${clientID}:`, error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   * @param {string} blobName - Full blob name/path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(blobName) {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not properly configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      const blobClient = containerClient.getBlobClient(blobName);
      
      await blobClient.deleteIfExists();
      console.log(`🗑️ Successfully deleted ${blobName}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete ${blobName}:`, error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Generate a temporary download URL with SAS token
   * @param {string} blobName - Full blob name/path
   * @param {number} expiryHours - Hours until expiry (default: 1)
   * @returns {Promise<string>} Temporary download URL
   */
  async generateDownloadUrl(blobName, expiryHours = 1) {
    if (!this.isConfigured) {
      throw new Error('Azure Blob Storage is not properly configured');
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(CONTAINER_NAME);
      const blobClient = containerClient.getBlobClient(blobName);
      
      // For simplicity, return the blob URL directly if container has public access
      // In production, you might want to generate SAS tokens for private containers
      return blobClient.url;
      
    } catch (error) {
      console.error(`❌ Failed to generate download URL for ${blobName}:`, error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }
}

// Export singleton instance
export const azureBlobService = new AzureBlobService();
export default azureBlobService;