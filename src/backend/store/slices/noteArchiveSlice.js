// src/store/apps/notes/noteArchiveSlice.js - CREATE THIS FILE
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && !forceRealData;
};
// Mock response for development
const MOCK_UPLOAD_RESPONSE = {
  success: true,
  message: "File uploaded successfully",
  fileUrl: "https://example.com/uploads/mock-file.pdf",
  fileName: "mock-uploaded-file.pdf",
  fileSize: 1024000,
  uploadedAt: new Date().toISOString()
};

// 📤 Async thunk to upload note file
export const uploadNoteFile = createAsyncThunk(
  "noteArchive/uploadNoteFile",
  async (file, thunkAPI) => {
    // ✅ PROTECTION: Return mock data in development
    if (shouldUseMockData()) {
      console.log("🔧 Mock mode: Simulating file upload for", file.name);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        ...MOCK_UPLOAD_RESPONSE,
        fileName: file.name,
        fileSize: file.size
      };
    }

    try {
      // Real API call would go here
      const formData = new FormData();
      formData.append('noteFile', file);
      
      // Replace with your actual API endpoint
      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error("❌ Error uploading file:", error);
      return thunkAPI.rejectWithValue(error.message || "File upload failed");
    }
  }
);

const initialState = {
  // Upload state
  loading: false,
  error: null,
  successMessage: null,
  fileUrl: null,
  uploadProgress: 0,
  
  // Files list state
  uploadedFiles: [],
  filesLoading: false,
  filesError: null,
};

const noteArchiveSlice = createSlice({
  name: "noteArchive",
  initialState,
  reducers: {
    // Clear upload status
    clearUploadStatus(state) {
      state.loading = false;
      state.error = null;
      state.successMessage = null;
      state.fileUrl = null;
      state.uploadProgress = 0;
    },
    
    // Set upload progress
    setUploadProgress(state, action) {
      state.uploadProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload file
      .addCase(uploadNoteFile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadNoteFile.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message || "File uploaded successfully!";
        state.fileUrl = action.payload.fileUrl;
        state.uploadProgress = 100;
        state.error = null;
      })
      .addCase(uploadNoteFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Upload failed";
        state.successMessage = null;
        state.uploadProgress = 0;
      });
  },
});

export const {
  clearUploadStatus,
  setUploadProgress,
} = noteArchiveSlice.actions;

// ✅ DEFAULT EXPORT
export default noteArchiveSlice.reducer;