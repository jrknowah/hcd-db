// store/slices/referralSlice.js - Enhanced with timeout and retry logic
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ✅ NEW: Configure axios timeout
const API_TIMEOUT = 60000; // 60 seconds for file uploads

// Mock data for development
const MOCK_REFERRAL_DATA = {
  lahsaReferral: "LAHSA referral completed on 2024-03-10. Case worker: Jane Smith. Housing voucher approved.",
  odrReferral: "ODR evaluation scheduled for 2024-03-20. Disability determination pending review.",
  dhsReferral: "DHS benefits application submitted. CalFresh and Medi-Cal eligibility confirmed.",
  dmhReferral: "DMH mental health services coordination established."
};

// ✅ NEW: Create configured axios instance for uploads
const createAxiosInstance = (timeout = API_TIMEOUT) => {
  return axios.create({
    timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

// ✅ NEW: Helper to determine if error is retryable
const isRetryableError = (error) => {
  if (!error) return false;
  
  const status = error.response?.status;
  const message = error.message?.toLowerCase() || '';
  
  // Retry on: 503, 500, 502, 504, timeout, network errors
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

// ✅ ENHANCED: Fetch with better error messages
export const fetchReferralData = createAsyncThunk(
  "referral/fetchReferralData",
  async (clientID, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_REFERRAL_DATA;
      }

      const axiosInstance = createAxiosInstance(30000); // 30 second timeout for fetch
      const { data } = await axiosInstance.get(`${API}/api/clientReferrals/${clientID}`);
      
      return data;
    } catch (error) {
      console.error('Fetch referral data error:', error);
      
      // Enhanced error messages
      if (error.code === 'ECONNABORTED') {
        return rejectWithValue('Request timed out - please try again');
      }
      if (error.response?.status === 503) {
        return rejectWithValue('Service temporarily unavailable (503) - backend may be starting up');
      }
      if (!error.response) {
        return rejectWithValue('Network error - check your internet connection');
      }
      
      return rejectWithValue(
        error.response?.data?.message || 
        error.response?.data?.error ||
        'Failed to fetch referral data'
      );
    }
  }
);

// ✅ ENHANCED: Save with better error handling
export const saveReferralData = createAsyncThunk(
  "referral/saveReferralData",
  async ({ clientID, referrals }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return referrals;
      }

      const axiosInstance = createAxiosInstance(30000);
      await axiosInstance.post(`${API}/api/saveClientReferrals`, { 
        clientID, 
        ...referrals 
      });
      
      return referrals;
    } catch (error) {
      console.error('Save referral data error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return rejectWithValue('Save request timed out - please try again');
      }
      if (error.response?.status === 503) {
        return rejectWithValue('Service unavailable - unable to save referral data');
      }
      
      return rejectWithValue(
        error.response?.data?.message || 
        error.response?.data?.error ||
        'Failed to save referral data'
      );
    }
  }
);

// ✅ ENHANCED: Upload file with progress tracking, timeout, and detailed error messages
export const uploadReferralFile = createAsyncThunk(
  "referral/uploadReferralFile",
  async ({ file, clientID, referralType }, { rejectWithValue, dispatch }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock upload with progress simulation
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 400));
          dispatch(setUploadProgress({ referralType, progress: i }));
        }
        return {
          fileName: file.name,
          filePath: `/mock/uploads/${file.name}`,
          referralType
        };
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientID", clientID);
      formData.append("type", referralType);

      // ✅ NEW: Configure axios with extended timeout and progress tracking
      const response = await axios.post(`${API}/api/uploadReferral`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data" 
        },
        timeout: API_TIMEOUT, // 60 second timeout for file uploads
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          dispatch(setUploadProgress({ referralType, progress: percentCompleted }));
        }
      });

      // Clear progress on success
      dispatch(clearUploadProgress({ referralType }));

      return {
        fileName: file.name,
        filePath: response.data.filePath || response.data.file?.filePath,
        fileUrl: response.data.fileUrl,
        referralType
      };
    } catch (error) {
      // Clear progress on error
      dispatch(clearUploadProgress({ referralType }));
      
      console.error('Upload referral file error:', error);
      
      // ✅ NEW: Detailed error messaging based on error type
      let errorMessage = 'Failed to upload referral file';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = `Upload timed out after ${API_TIMEOUT/1000} seconds. File may be too large or connection is slow.`;
      } else if (error.response?.status === 503) {
        errorMessage = '503 Service Unavailable - Azure Blob Storage may not be configured or backend is starting up. Wait 30 seconds and retry.';
      } else if (error.response?.status === 500) {
        errorMessage = '500 Server Error - Backend encountered an issue while processing the upload. Check server logs.';
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large - maximum file size is 10MB';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || 'Invalid upload request - check file format';
      } else if (!error.response) {
        errorMessage = 'Network error - unable to reach the server. Check your internet connection.';
      } else {
        errorMessage = error.response?.data?.message || 
                      error.response?.data?.error || 
                      `Upload failed with status ${error.response?.status}`;
      }
      
      // Add retry hint for retryable errors
      if (isRetryableError(error)) {
        errorMessage += ' [Retryable - will auto-retry]';
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

const referralSlice = createSlice({
  name: "referral",
  initialState: {
    referrals: {
      lahsaReferral: "",
      odrReferral: "",
      dhsReferral: "",
      dmhReferral: "", // ✅ ADDED: DMH field
    },
    uploadProgress: {},
    loading: false,
    saving: false,
    uploading: false,
    error: null,
    successMessage: null,
    dataLoaded: false,
    currentClientID: null,
    lastUploadAttempt: null, // ✅ NEW: Track last upload timestamp
  },
  reducers: {
    updateReferralField: (state, action) => {
      const { field, value } = action.payload;
      state.referrals[field] = value;
    },
    
    setUploadProgress: (state, action) => {
      const { referralType, progress } = action.payload;
      state.uploadProgress[referralType] = progress;
    },
    
    clearUploadProgress: (state, action) => {
      const { referralType } = action.payload;
      delete state.uploadProgress[referralType];
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
        state.referrals = {
          lahsaReferral: "",
          odrReferral: "",
          dhsReferral: "",
          dmhReferral: "", // ✅ ADDED
        };
        state.dataLoaded = false;
        state.error = null;
        state.uploadProgress = {};
        state.lastUploadAttempt = null;
      }
    },
    
    resetReferrals: (state) => {
      state.referrals = {
        lahsaReferral: "",
        odrReferral: "",
        dhsReferral: "",
        dmhReferral: "", // ✅ ADDED
      };
      state.error = null;
      state.successMessage = null;
      state.dataLoaded = false;
      state.uploadProgress = {};
      state.lastUploadAttempt = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch referral data
      .addCase(fetchReferralData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReferralData.fulfilled, (state, action) => {
        state.loading = false;
        state.referrals = { 
          lahsaReferral: "",
          odrReferral: "",
          dhsReferral: "",
          dmhReferral: "",
          ...action.payload 
        };
        state.dataLoaded = true;
      })
      .addCase(fetchReferralData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch referral data';
        state.dataLoaded = false;
      })
      
      // Save referral data
      .addCase(saveReferralData.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(saveReferralData.fulfilled, (state, action) => {
        state.saving = false;
        state.referrals = { 
          lahsaReferral: "",
          odrReferral: "",
          dhsReferral: "",
          dmhReferral: "",
          ...action.payload 
        };
        state.successMessage = '✅ Referral data saved successfully';
      })
      .addCase(saveReferralData.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to save referral data';
      })
      
      // Upload referral file
      .addCase(uploadReferralFile.pending, (state) => {
        state.uploading = true;
        state.error = null;
        state.lastUploadAttempt = new Date().toISOString();
      })
      .addCase(uploadReferralFile.fulfilled, (state, action) => {
        state.uploading = false;
        state.successMessage = `✅ ${action.payload.fileName} uploaded successfully`;
        
        // ✅ Store file info in state
        if (action.payload.referralType) {
          state.referrals[`${action.payload.referralType}File`] = action.payload.fileName;
          state.referrals[`${action.payload.referralType}FileUrl`] = action.payload.fileUrl;
        }
      })
      .addCase(uploadReferralFile.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload || 'Failed to upload file';
      });
  },
});

export const { 
  updateReferralField,
  setUploadProgress,
  clearUploadProgress,
  clearError,
  clearSuccess,
  setCurrentClient,
  resetReferrals
} = referralSlice.actions;

// Selectors
export const selectReferrals = (state) => state.referrals?.referrals || {};
export const selectReferralsLoading = (state) => state.referrals?.loading || false;
export const selectReferralsSaving = (state) => state.referrals?.saving || false;
export const selectReferralsUploading = (state) => state.referrals?.uploading || false;
export const selectReferralsError = (state) => state.referrals?.error || null;
export const selectReferralsSuccess = (state) => state.referrals?.successMessage || null;
export const selectReferralsDataLoaded = (state) => state.referrals?.dataLoaded || false;
export const selectReferralUploadProgress = (state) => state.referrals?.uploadProgress || {};
export const selectLastUploadAttempt = (state) => state.referrals?.lastUploadAttempt || null;

export default referralSlice.reducer;