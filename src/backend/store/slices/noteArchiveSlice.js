// src/store/apps/notes/noteArchiveSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { msalInstance } from "../../../auth/msalInstance"; // adjust path to your msal export

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = () => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  return isDevelopment && !forceRealData;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Acquire an idToken from MSAL — your backend auth middleware expects idToken, not accessToken
const getIdToken = async () => {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("No MSAL account found — user not signed in");

  const response = await msalInstance.acquireTokenSilent({
    scopes: ["openid", "profile"],
    account
  });
  return response.idToken;
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
    if (shouldUseMockData()) {
      console.log("🔧 Mock mode: Simulating file upload for", file.name);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        ...MOCK_UPLOAD_RESPONSE,
        fileName: file.name,
        fileSize: file.size
      };
    }

    try {
      const idToken = await getIdToken();

      const formData = new FormData();
      formData.append('noteFile', file);
      // formData.append('clientID', clientID); // pass through if/when you wire it up

      const response = await fetch(`${API_BASE_URL}/api/note-archive/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`
          // NOTE: do NOT set Content-Type — the browser sets the multipart boundary
        },
        body: formData
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Upload failed (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Error uploading file:", error);
      return thunkAPI.rejectWithValue(error.message || "File upload failed");
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  successMessage: null,
  fileUrl: null,
  uploadProgress: 0,
  uploadedFiles: [],
  filesLoading: false,
  filesError: null
};

const noteArchiveSlice = createSlice({
  name: "noteArchive",
  initialState,
  reducers: {
    clearUploadStatus(state) {
      state.loading = false;
      state.error = null;
      state.successMessage = null;
      state.fileUrl = null;
      state.uploadProgress = 0;
    },
    setUploadProgress(state, action) {
      state.uploadProgress = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
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
  }
});

export const { clearUploadStatus, setUploadProgress } = noteArchiveSlice.actions;
export default noteArchiveSlice.reducer;