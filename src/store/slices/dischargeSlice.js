// store/slices/dischargeSlice.js - Enhanced version
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

// Mock data for development
const MOCK_DISCHARGE_DATA = {
  clientDischargeDate: "2024-03-15",
  clientDischargeDiag: "Acute myocardial infarction, resolved",
  clientDischargI: "Patient is a 65-year-old male who presented with acute MI. Recovery goals include cardiac rehabilitation and medication compliance.",
  clientDischargII: "Patient will be discharged to home with spouse as primary caregiver.",
  clientDischargIII: "Metoprolol 50mg BID, Lisinopril 10mg daily, Atorvastatin 40mg at bedtime. Take medications as prescribed.",
  clientDischargIV: "Blood pressure monitor, pill organizer, emergency contact list.",
  clientDischargV: "Home health nursing visits 2x weekly for vital signs and medication compliance assessment.",
  clientDischargVI: "Follow-up with cardiologist in 1 week, primary care physician in 2 weeks.",
  clientDischargVII: "Patient and spouse educated on heart-healthy diet, medication management, and when to seek emergency care.",
};

export const fetchClientDischarge = createAsyncThunk(
  "discharge/fetchClientDischarge",
  async (clientID, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock data with delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return MOCK_DISCHARGE_DATA;
      }

      const response = await axios.get(`${API}/getClientDischarge/${clientID}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch discharge data');
    }
  }
);

export const saveClientDischarge = createAsyncThunk(
  "discharge/saveClientDischarge",
  async ({ clientID, dischargeData }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        // Mock save with delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { ...dischargeData, clientID };
      }

      const payload = { ...dischargeData, clientID };
      await axios.post(`${API}/saveClientDischarge`, payload);
      return payload;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save discharge data');
    }
  }
);

const dischargeSlice = createSlice({
  name: "discharge",
  initialState: {
    data: {
      clientDischargeDate: "",
      clientDischargeDiag: "",
      clientDischargI: "",
      clientDischargII: "",
      clientDischargIII: "",
      clientDischargIV: "",
      clientDischargV: "",
      clientDischargVI: "",
      clientDischargVII: "",
    },
    loading: false,
    saving: false,
    error: null,
    successMessage: null,
    dataLoaded: false,
    currentClientID: null
  },
  reducers: {
    setDischargeForm: (state, action) => {
      state.data = { ...state.data, ...action.payload };
    },
    
    updateDischargeField: (state, action) => {
      const { field, value } = action.payload;
      state.data[field] = value;
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
        state.data = {
          clientDischargeDate: "",
          clientDischargeDiag: "",
          clientDischargI: "",
          clientDischargII: "",
          clientDischargIII: "",
          clientDischargIV: "",
          clientDischargV: "",
          clientDischargVI: "",
          clientDischargVII: "",
        };
        state.dataLoaded = false;
        state.error = null;
        state.successMessage = null;
      }
    },
    
    resetDischarge: (state) => {
      state.data = {
        clientDischargeDate: "",
        clientDischargeDiag: "",
        clientDischargI: "",
        clientDischargII: "",
        clientDischargIII: "",
        clientDischargIV: "",
        clientDischargV: "",
        clientDischargVI: "",
        clientDischargVII: "",
      };
      state.error = null;
      state.successMessage = null;
      state.dataLoaded = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch discharge data
      .addCase(fetchClientDischarge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientDischarge.fulfilled, (state, action) => {
        state.loading = false;
        state.data = { ...state.data, ...action.payload };
        state.dataLoaded = true;
      })
      .addCase(fetchClientDischarge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch discharge data';
        state.dataLoaded = false;
      })
      
      // Save discharge data
      .addCase(saveClientDischarge.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(saveClientDischarge.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.successMessage = '✅ Discharge data saved successfully';
      })
      .addCase(saveClientDischarge.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to save discharge data';
      });
  },
});

export const { 
  setDischargeForm,
  updateDischargeField,
  clearError,
  clearSuccess,
  setCurrentClient,
  resetDischarge
} = dischargeSlice.actions;

// Selectors
export const selectDischargeData = (state) => state.discharge.data;
export const selectDischargeLoading = (state) => state.discharge.loading;
export const selectDischargeSaving = (state) => state.discharge.saving;
export const selectDischargeError = (state) => state.discharge.error;
export const selectDischargeSuccess = (state) => state.discharge.successMessage;
export const selectDischargeDataLoaded = (state) => state.discharge.dataLoaded;

export default dischargeSlice.reducer;