// store/slices/referralSlice.js - Fixed API URLs
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Mock data for development
const MOCK_REFERRAL_DATA = {
  lahsaReferral: "LAHSA referral completed on 2024-03-10. Case worker: Jane Smith. Housing voucher approved.",
  odrReferral: "ODR evaluation scheduled for 2024-03-20. Disability determination pending review.",
  dhsReferral: "DHS benefits application submitted. CalFresh and Medi-Cal eligibility confirmed.",
};

export const fetchReferralData = createAsyncThunk(
  "referral/fetchReferralData",
  async (clientID, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock data with delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_REFERRAL_DATA;
      }

      // FIX: Add /api prefix to the URL
      const { data } = await axios.get(`${API}/api/clientReferrals/${clientID}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch referral data');
    }
  }
);

export const saveReferralData = createAsyncThunk(
  "referral/saveReferralData",
  async ({ clientID, referrals }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock save with delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return referrals;
      }

      // FIX: Add /api prefix to the URL
      await axios.post(`${API}/api/saveClientReferrals`, { clientID, ...referrals });
      return referrals;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save referral data');
    }
  }
);

// New async thunk for file uploads
export const uploadReferralFile = createAsyncThunk(
  "referral/uploadReferralFile",
  async ({ file, clientID, referralType }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock upload
        await new Promise(resolve => setTimeout(resolve, 2000));
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

      // FIX: Add /api prefix to the URL
      const response = await axios.post(`${API}/api/uploadReferral`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      return {
        fileName: file.name,
        filePath: response.data.filePath,
        referralType
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload referral file');
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
    },
    uploadProgress: {},
    loading: false,
    saving: false,
    uploading: false,
    error: null,
    successMessage: null,
    dataLoaded: false,
    currentClientID: null
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
        };
        state.dataLoaded = false;
        state.error = null;
        state.uploadProgress = {};
      }
    },
    
    resetReferrals: (state) => {
      state.referrals = {
        lahsaReferral: "",
        odrReferral: "",
        dhsReferral: "",
      };
      state.error = null;
      state.successMessage = null;
      state.dataLoaded = false;
      state.uploadProgress = {};
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
        state.referrals = { ...state.referrals, ...action.payload };
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
        state.referrals = action.payload;
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
      })
      .addCase(uploadReferralFile.fulfilled, (state, action) => {
        state.uploading = false;
        state.successMessage = `✅ ${action.payload.fileName} uploaded successfully`;
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

export default referralSlice.reducer;