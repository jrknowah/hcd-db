// src/store/apps/notes/noteArchiveSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Timeouts
const API_TIMEOUT = 60000;   // 60 seconds for file uploads
const FETCH_TIMEOUT = 30000; // 30 seconds for fetch/save

// Mock response for development
const MOCK_UPLOAD_RESPONSE = {
  success: true,
  message: "File uploaded successfully",
  fileUrl: "https://example.com/uploads/mock-file.pdf",
  fileName: "mock-uploaded-file.pdf",
  fileSize: 1024000,
  uploadedAt: new Date().toISOString()
};

// Configured axios instance
const createAxiosInstance = (timeout = API_TIMEOUT) => {
  return axios.create({
    timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// Helper to determine if error is retryable
const isRetryableError = (error) => {
  if (!error) return false;
  const status = error.response?.status;
  const message = error.message?.toLowerCase() || '';
  return (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    message.includes('timeout') ||
    message.includes('network error') ||
    message.includes('econnaborted')
  );
};

// 📤 Upload note file
export const uploadNoteFile = createAsyncThunk(
  "noteArchive/uploadNoteFile",
  async (fileOrPayload, { rejectWithValue, dispatch }) => {
    // Support both signatures: dispatch(uploadNoteFile(file)) OR dispatch(uploadNoteFile({ file, clientID }))
    const file = fileOrPayload?.file || fileOrPayload;
    const clientID = fileOrPayload?.clientID || null;

    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;

      if (shouldUseMockData) {
        console.log("🔧 Mock mode: Simulating file upload for", file.name);
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 300));
          dispatch(setUploadProgress(i));
        }
        return {
          ...MOCK_UPLOAD_RESPONSE,
          fileName: file.name,
          fileSize: file.size
        };
      }

      const formData = new FormData();
      formData.append("noteFile", file);
      if (clientID) formData.append("clientID", clientID);

      const response = await axios.post(`${API}/api/note-archive/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        timeout: API_TIMEOUT,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          dispatch(setUploadProgress(percent));
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Upload note file error:', error);

      let errorMessage = 'Failed to upload file';

      if (error.code === 'ECONNABORTED') {
        errorMessage = `Upload timed out after ${API_TIMEOUT / 1000} seconds. File may be too large or connection is slow.`;
      } else if (error.response?.status === 503) {
        errorMessage = '503 Service Unavailable - Azure Blob Storage may not be configured or backend is starting up. Wait 30 seconds and retry.';
      } else if (error.response?.status === 500) {
        errorMessage = '500 Server Error - Backend encountered an issue while processing the upload. Check server logs.';
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large - maximum file size is 25MB';
      } else if (error.response?.status === 401) {
        errorMessage = '401 Unauthorized - your session may have expired. Refresh and sign in again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || 'Invalid upload request - check file format';
      } else if (!error.response) {
        errorMessage = 'Network error - unable to reach the server. Check your internet connection.';
      } else {
        errorMessage = error.response?.data?.message ||
                       error.response?.data?.error ||
                       `Upload failed with status ${error.response?.status}`;
      }

      if (isRetryableError(error)) {
        errorMessage += ' [Retryable]';
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// Optional: fetch list of uploaded note files for a client
export const fetchNoteArchiveFiles = createAsyncThunk(
  "noteArchive/fetchNoteArchiveFiles",
  async (clientID, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      if (isDevelopment && !import.meta.env.VITE_USE_REAL_DATA) {
        return [];
      }
      const axiosInstance = createAxiosInstance(FETCH_TIMEOUT);
      //const { data } = await axiosInstance.get(`${API}/api/note-archive/${clientID}`);
      const { data } = await axiosInstance.get(`${API}/api/note-archive/list/${clientID}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch note archive files');
    }
  }
);

const initialState = {
  // Upload state
  loading: false,
  uploading: false,
  error: null,
  successMessage: null,
  fileUrl: null,
  uploadProgress: 0,

  // Files list state
  uploadedFiles: [],
  filesLoaded: false,
  filesLoading: false,
  filesError: null,

  // Tracking
  currentClientID: null,
  lastUploadAttempt: null
};

const noteArchiveSlice = createSlice({
  name: "noteArchive",
  initialState,
  reducers: {
    clearUploadStatus(state) {
      state.loading = false;
      state.uploading = false;
      state.error = null;
      state.successMessage = null;
      state.fileUrl = null;
      state.uploadProgress = 0;
    },
    setUploadProgress(state, action) {
      state.uploadProgress = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccess(state) {
      state.successMessage = null;
    },
    setCurrentClient(state, action) {
      if (action.payload !== state.currentClientID) {
        state.currentClientID = action.payload;
        state.uploadedFiles = [];
        state.filesLoaded = false;
        state.error = null;
        state.successMessage = null;
        state.uploadProgress = 0;
        state.lastUploadAttempt = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Upload
      .addCase(uploadNoteFile.pending, (state) => {
        state.loading = true;
        state.uploading = true;
        state.error = null;
        state.successMessage = null;
        state.uploadProgress = 0;
        state.lastUploadAttempt = new Date().toISOString();
      })
      .addCase(uploadNoteFile.fulfilled, (state, action) => {
        state.loading = false;
        state.uploading = false;
        state.successMessage = action.payload.message || "✅ File uploaded successfully";
        state.fileUrl = action.payload.fileUrl;
        state.uploadProgress = 100;
        state.error = null;

        // Append to file list for immediate UI feedback
        state.uploadedFiles.push({
          fileName: action.payload.fileName,
          fileUrl: action.payload.fileUrl,
          fileSize: action.payload.fileSize,
          noteArchiveID: action.payload.noteArchiveID,
          uploadedAt: action.payload.uploadedAt || new Date().toISOString()
        });
      })
      .addCase(uploadNoteFile.rejected, (state, action) => {
        state.loading = false;
        state.uploading = false;
        state.error = action.payload || "Upload failed";
        state.successMessage = null;
        state.uploadProgress = 0;
      })

      // Fetch files list
      .addCase(fetchNoteArchiveFiles.pending, (state) => {
        state.filesLoading = true;
        state.filesError = null;
      })
      .addCase(fetchNoteArchiveFiles.fulfilled, (state, action) => {
        state.filesLoading = false;
        state.uploadedFiles = action.payload;
        state.filesLoaded = true;
      })
      .addCase(fetchNoteArchiveFiles.rejected, (state, action) => {
        state.filesLoading = false;
        state.filesError = action.payload;
        state.filesLoaded = true; // don't retry endlessly
      });
  }
});

export const {
  clearUploadStatus,
  setUploadProgress,
  clearError,
  clearSuccess,
  setCurrentClient
} = noteArchiveSlice.actions;

// Selectors
export const selectNoteArchiveLoading = (state) => state.noteArchive?.loading || false;
export const selectNoteArchiveUploading = (state) => state.noteArchive?.uploading || false;
export const selectNoteArchiveError = (state) => state.noteArchive?.error || null;
export const selectNoteArchiveSuccess = (state) => state.noteArchive?.successMessage || null;
export const selectNoteArchiveProgress = (state) => state.noteArchive?.uploadProgress || 0;
export const selectNoteArchiveFiles = (state) => state.noteArchive?.uploadedFiles || [];
export const selectNoteArchiveFileUrl = (state) => state.noteArchive?.fileUrl || null;

export default noteArchiveSlice.reducer;