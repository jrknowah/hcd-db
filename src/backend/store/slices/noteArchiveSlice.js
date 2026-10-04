// src/store/apps/notes/noteArchiveSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { azureBlobService } from "../../services/azureBlobService";

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const FETCH_TIMEOUT = 30000; // 30 seconds

// Configured axios instance
const createAxiosInstance = (timeout = FETCH_TIMEOUT) => {
  return axios.create({
    timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// CM note files share the same blob storage pipeline as every other section's
// uploads (/api/upload + /api/files/:clientID), stored under
// {clientID}/CM_Notes_Archive/. The old /api/note-archive route wrote to a
// separate path + SQL table that this tab couldn't reliably read back.
export const CM_NOTES_DOC_TYPE = 'CM_Notes_Archive';

const toArchiveFile = (f) => ({
  fileName: f.fileName,
  blobName: f.blobName,
  fileSize: f.fileSize,
  docType: f.docType,
  uploadedAt: f.uploadDate || f.uploadedAt || null
});

// 📤 Upload note file
export const uploadNoteFile = createAsyncThunk(
  "noteArchive/uploadNoteFile",
  async (fileOrPayload, { rejectWithValue }) => {
    // Support both signatures: dispatch(uploadNoteFile(file)) OR dispatch(uploadNoteFile({ file, clientID }))
    const file = fileOrPayload?.file || fileOrPayload;
    const clientID = fileOrPayload?.clientID || null;

    if (!clientID) {
      return rejectWithValue('No client selected - select a client before uploading');
    }

    try {
      const result = await azureBlobService.uploadFile(file, clientID, CM_NOTES_DOC_TYPE);
      return {
        message: 'File uploaded successfully',
        ...toArchiveFile({ ...result, fileName: result.fileName || file.name, fileSize: result.fileSize ?? file.size })
      };
    } catch (error) {
      console.error('❌ Upload note file error:', error);
      return rejectWithValue(error.message || 'Failed to upload file');
    }
  }
);

// Fetch the client's CM note files (plus any legacy /api/note-archive records)
export const fetchNoteArchiveFiles = createAsyncThunk(
  "noteArchive/fetchNoteArchiveFiles",
  async (clientID, { rejectWithValue }) => {
    try {
      const allFiles = await azureBlobService.listClientFiles(clientID);
      const files = (allFiles || [])
        .filter(f => f.docType === CM_NOTES_DOC_TYPE)
        .map(toArchiveFile);

      // Files uploaded through the old note-archive route, if that route exists
      let legacy = [];
      try {
        const { data } = await createAxiosInstance(FETCH_TIMEOUT)
          .get(`${API}/api/note-archive/list/${encodeURIComponent(clientID)}`);
        if (Array.isArray(data)) legacy = data;
      } catch (legacyErr) {
        console.warn('⚠️ Legacy note-archive list unavailable:', legacyErr.message);
      }

      return [...files, ...legacy].sort(
        (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)
      );
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch note archive files');
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
        state.uploadProgress = 100;
        state.error = null;

        // Prepend to file list for immediate UI feedback (list is newest-first)
        const { message, ...file } = action.payload;
        state.uploadedFiles.unshift({
          ...file,
          uploadedAt: file.uploadedAt || new Date().toISOString()
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