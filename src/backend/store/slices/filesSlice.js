// store/slices/filesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

// Mock data for development
const MOCK_FILES = [
  {
    id: 1,
    fileName: 'mock_id_card.pdf',
    blobUrl: '/mock/path/id_card.pdf',
    docType: 'Identification Card',
    uploadDate: '2024-03-15T10:30:00Z',
    fileSize: 1024000,
    contentType: 'application/pdf'
  },
  {
    id: 2,
    fileName: 'mock_drivers_license.jpg',
    blobUrl: '/mock/path/drivers_license.jpg',
    docType: "Driver's License",
    uploadDate: '2024-03-14T15:45:00Z',
    fileSize: 2048000,
    contentType: 'image/jpeg'
  }
];

// ✅ Async thunks for file operations
export const uploadFile = createAsyncThunk(
  'files/uploadFile',
  async ({ file, clientID, docType }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock upload with progress simulation
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
          id: Date.now(),
          fileName: file.name,
          blobUrl: `/mock/uploads/${file.name}`,
          docType: docType,
          uploadDate: new Date().toISOString(),
          fileSize: file.size,
          contentType: file.type
        };
      }

      // Real upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientID', clientID);
      formData.append('docType', docType);

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        id: response.data.id || Date.now(),
        fileName: response.data.fileName,
        blobUrl: response.data.blobUrl,
        blobName: response.data.blobName,
        docType: docType,
        uploadDate: response.data.uploadDate,
        fileSize: response.data.fileSize,
        contentType: response.data.contentType || file.type
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Upload failed');
    }
  }
);

export const fetchClientFiles = createAsyncThunk(
  'files/fetchClientFiles',
  async (clientID, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock data with delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return MOCK_FILES;
      }

      // Real API call
      const response = await axios.get(`${API_URL}/files/${clientID}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch files');
    }
  }
);

export const deleteFile = createAsyncThunk(
  'files/deleteFile',
  async ({ fileId, fileName, blobName }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock delete
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { fileId, fileName };
      }

      // Real delete
      await axios.delete(`${API_URL}/files/${fileId}`);
      return { fileId, fileName };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete file');
    }
  }
);

export const downloadFile = createAsyncThunk(
  'files/downloadFile',
  async ({ fileId, fileName, blobUrl }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock download - just open the URL
        window.open(blobUrl, '_blank');
        return { fileName };
      }

      // Real download - get download URL from backend
      const response = await axios.get(`${API_URL}/files/${fileId}/download`);
      
      // Create download link
      const link = document.createElement('a');
      link.href = response.data.downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { fileName };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to download file');
    }
  }
);

// ✅ Files slice
const filesSlice = createSlice({
  name: 'files',
  initialState: {
    files: [],
    uploadProgress: {},
    loading: false,
    uploading: false,
    deleting: false,
    downloading: false,
    error: null,
    successMessage: null,
    currentClientID: null,
    filesLoaded: false
  },
  reducers: {
    setUploadProgress: (state, action) => {
      const { docType, progress } = action.payload;
      state.uploadProgress[docType] = progress;
    },
    
    clearUploadProgress: (state, action) => {
      const { docType } = action.payload;
      delete state.uploadProgress[docType];
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearSuccess: (state) => {
      state.successMessage = null;
    },
    
    setCurrentClient: (state, action) => {
      if (action.payload !== state.currentClientID) {
        state.currentClientID = action.payload;
        state.files = [];
        state.filesLoaded = false;
        state.error = null;
        state.successMessage = null;
        state.uploadProgress = {};
      }
    },
    
    resetFiles: (state) => {
      state.files = [];
      state.uploadProgress = {};
      state.error = null;
      state.successMessage = null;
      state.filesLoaded = false;
      state.currentClientID = null;
    },
    
    // Add a file to the list (for real-time updates)
    addFile: (state, action) => {
      state.files.unshift(action.payload);
    },
    
    // Remove a file from the list (for real-time updates)
    removeFile: (state, action) => {
      state.files = state.files.filter(file => file.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      // Upload file
      .addCase(uploadFile.pending, (state) => {
        state.uploading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.uploading = false;
        state.files.unshift(action.payload); // Add to beginning of array
        state.successMessage = `✅ ${action.payload.fileName} uploaded successfully`;
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload || 'Upload failed';
      })
      
      // Fetch files
      .addCase(fetchClientFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload || [];
        state.filesLoaded = true;
      })
      .addCase(fetchClientFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch files';
        state.files = [];
        state.filesLoaded = false;
      })
      
      // Delete file
      .addCase(deleteFile.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.deleting = false;
        state.files = state.files.filter(file => file.id !== action.payload.fileId);
        state.successMessage = `🗑️ ${action.payload.fileName} deleted successfully`;
      })
      .addCase(deleteFile.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload || 'Failed to delete file';
      })
      
      // Download file
      .addCase(downloadFile.pending, (state) => {
        state.downloading = true;
        state.error = null;
      })
      .addCase(downloadFile.fulfilled, (state, action) => {
        state.downloading = false;
        state.successMessage = `📥 ${action.payload.fileName} download initiated`;
      })
      .addCase(downloadFile.rejected, (state, action) => {
        state.downloading = false;
        state.error = action.payload || 'Failed to download file';
      });
  }
});

// ✅ Export actions
export const {
  setUploadProgress,
  clearUploadProgress,
  clearError,
  clearSuccess,
  setCurrentClient,
  resetFiles,
  addFile,
  removeFile
} = filesSlice.actions;

// ✅ Export selectors
export const selectFiles = (state) => state.files.files;
export const selectFilesLoading = (state) => state.files.loading;
export const selectFilesUploading = (state) => state.files.uploading;
export const selectFilesDeleting = (state) => state.files.deleting;
export const selectFilesDownloading = (state) => state.files.downloading;
export const selectFilesError = (state) => state.files.error;
export const selectFilesSuccess = (state) => state.files.successMessage;
export const selectUploadProgress = (state) => state.files.uploadProgress;
export const selectFilesLoaded = (state) => state.files.filesLoaded;
export const selectCurrentClientFiles = (state) => state.files.files;

// Selector to get files by document type
export const selectFilesByDocType = (docType) => (state) => 
  state.files.files.filter(file => file.docType === docType);

// Selector to get file count
export const selectFileCount = (state) => state.files.files.length;

// Selector to get total file size
export const selectTotalFileSize = (state) => 
  state.files.files.reduce((total, file) => total + (file.fileSize || 0), 0);

export default filesSlice.reducer;