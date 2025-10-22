// services/azureBlobService.js - Browser Compatible Version
import axios from 'axios';

class AzureBlobService {
  constructor() {
    // Use backend API for all Azure operations since we're in browser
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.isConfigured = true;
    // const isDevelopment = import.meta.env.VITE_USE_MOCK_DATA === 'true'
    // Check if we should use mock mode
    this.useMockMode = import.meta.env.VITE_USE_REAL_DATA === 'false' || 
                       import.meta.env.VITE_USE_MOCK_DATA === 'true';
    
    console.log('Azure Blob Service initialized');
    console.log('API URL:', this.apiUrl);
    console.log('Mode:', this.useMockMode ? 'Mock' : 'Backend API');
  }

  /**
   * Upload a file to Azure Blob Storage via backend
   * @param {File} file - The file to upload
   * @param {string} clientID - Client identifier
   * @param {string} docType - Document type/category
   * @returns {Promise<Object>} Upload result with blob URL and metadata
   */
  async uploadFile(file, clientID, docType) {
    try {
      // For mock mode, simulate upload
      if (this.useMockMode) {
        console.log(`Mock uploading ${file.name}...`);
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const mockBlobName = `${clientID}/${docType}/${timestamp}_${file.name}`;
        
        return {
          success: true,
          blobName: mockBlobName,
          blobUrl: `/mock/storage/${mockBlobName}`,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          uploadDate: new Date().toISOString(),
          docType: docType,
          mock: true
        };
      }

      // Real upload through backend API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientID', clientID);
      formData.append('docType', docType);

      console.log(`Uploading ${file.name} to backend...`);

      const response = await axios.post(
        `${this.apiUrl}/api/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`Upload Progress: ${percentCompleted}%`);
            }
          }
        }
      );

      console.log(`Successfully uploaded ${file.name}`, response.data);
      return {
        success: true,
        ...response.data
      };
      
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      
      // If backend fails in development, fall back to mock
      if (this.useMockMode && (error.response?.status === 404 || error.code === 'ERR_NETWORK')) {
        console.log('Backend unavailable, using mock upload');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const mockBlobName = `${clientID}/${docType}/${timestamp}_${file.name}`;
        
        return {
          success: true,
          blobName: mockBlobName,
          blobUrl: `/mock/storage/${mockBlobName}`,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          uploadDate: new Date().toISOString(),
          docType: docType,
          mock: true,
          fallback: true
        };
      }
      
      throw new Error(`Upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List files for a specific client
   * @param {string} clientID - Client identifier
   * @param {string} docType - Optional document type filter
   * @returns {Promise<Array>} List of client files
   */
  async listClientFiles(clientID, docType = null) {
    try {
      // For mock mode, return sample files
      if (this.useMockMode) {
        console.log(`Mock listing files for client ${clientID}`);
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return [
          {
            fileName: 'sample_id_card.pdf',
            blobName: `${clientID}/Identification Card/sample_id_card.pdf`,
            blobUrl: '/mock/storage/sample_id_card.pdf',
            fileSize: 1024000,
            contentType: 'application/pdf',
            uploadDate: new Date(Date.now() - 86400000).toISOString(),
            docType: 'Identification Card',
            mock: true
          },
          {
            fileName: 'sample_insurance.pdf',
            blobName: `${clientID}/Insurance/sample_insurance.pdf`,
            blobUrl: '/mock/storage/sample_insurance.pdf',
            fileSize: 2048000,
            contentType: 'application/pdf',
            uploadDate: new Date(Date.now() - 172800000).toISOString(),
            docType: 'Insurance',
            mock: true
          }
        ];
      }

      // Real API call
      console.log(`Fetching files for client ${clientID} from backend...`);
      
      const params = { clientID };
      if (docType) params.docType = docType;
      
      const response = await axios.get(`${this.apiUrl}/api/files/${clientID}`);
      
      console.log(`Found ${response.data.length} files for client ${clientID}`);
      return response.data;
      
    } catch (error) {
      console.error(`Failed to list files for client ${clientID}:`, error);
      
      // Return empty array on error instead of throwing
      if (error.response?.status === 404) {
        console.log('No files found for client');
        return [];
      }
      
      // If backend is unavailable in mock mode, return sample data
      if (this.useMockMode && error.code === 'ERR_NETWORK') {
        console.log('Backend unavailable, returning mock files');
        return [
          {
            fileName: 'fallback_document.pdf',
            blobName: `${clientID}/Document/fallback_document.pdf`,
            blobUrl: '/mock/storage/fallback_document.pdf',
            fileSize: 512000,
            contentType: 'application/pdf',
            uploadDate: new Date().toISOString(),
            docType: 'Document',
            mock: true,
            fallback: true
          }
        ];
      }
      
      return []; // Return empty array on other errors
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   * @param {string} blobName - Full blob name/path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(blobName) {
    try {
      // For mock mode, simulate deletion
      if (this.useMockMode) {
        console.log(`Mock deleting ${blobName}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }

      // Real API call
      console.log(`Deleting ${blobName} via backend...`);
      
      const response = await axios.delete(`${this.apiUrl}/api/file`, {
        data: { blobName }
      });
      
      console.log(`Successfully deleted ${blobName}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to delete ${blobName}:`, error);
      
      // In mock mode, consider delete successful
      if (this.useMockMode) {
        console.log('Mock delete considered successful');
        return true;
      }
      
      throw new Error(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate a temporary download URL
   * @param {string} blobName - Full blob name/path
   * @param {number} expiryHours - Hours until expiry (default: 1)
   * @returns {Promise<string>} Temporary download URL
   */
  async generateDownloadUrl(blobName, expiryHours = 1) {
    try {
      // For mock mode, return a mock URL
      if (this.useMockMode) {
        const mockUrl = `${window.location.origin}/mock/downloads/${encodeURIComponent(blobName)}`;
        console.log(`Mock download URL: ${mockUrl}`);
        return mockUrl;
      }

      // Real API call
      console.log(`Getting download URL for ${blobName} from backend...`);
      
      const response = await axios.get(`${this.apiUrl}/api/file/download-url`, {
        params: { blobName, expiryHours }
      });
      
      return response.data.url;
      
    } catch (error) {
      console.error(`Failed to generate download URL for ${blobName}:`, error);
      
      // Fallback to direct backend download endpoint
      const fallbackUrl = `${this.apiUrl}/api/file/download/${encodeURIComponent(blobName)}`;
      console.log(`Using fallback download URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }
}

// Export singleton instance
export const azureBlobService = new AzureBlobService();
export default azureBlobService;