// src/store/apps/notes/medScreeningSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = '';

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// Mock medical screening data for development
const MOCK_MEDICAL_SCREENING = {
  id: 1,
  clientID: 'mock-123',
  clientMedConditions: JSON.stringify([
    { value: 'wheelchair', label: 'Wheelchair' },
    { value: 'walker', label: 'Walker' }
  ]),
  clientHepAB: JSON.stringify([
    { value: 'hepatitis_b', label: 'Hepatitis B' }
  ]),
  clientAlcoholRisk: 'No',
  clientAlcoholRiskMed: 'No',
  clientLastTBTest: '2024-01-15',
  clientLastTBTestResults: 'Negative',
  clientLastTBTestResultsTreatment: 'No',
  clientLastTBTestResultsTreatmentOutcome: '',
  tbCough: 'No',
  tbCoughBlood: 'No',
  medSweat: 'No',
  clientFever: 'No',
  clientWeightLoss: 'No',
  clientMedications: JSON.stringify([
    {
      clientMedName: 'Metformin',
      clientMedDose: '500mg twice daily',
      clientMedSideEffects: 'Mild nausea',
      clientMedTaking: 'Yes'
    },
    {
      clientMedName: 'Lisinopril',
      clientMedDose: '10mg daily',
      clientMedSideEffects: 'None reported',
      clientMedTaking: 'Yes'
    }
  ]),
  clientSurgeries: JSON.stringify([
    {
      clientSurgeryType: 'Appendectomy',
      clientSurgeryDate: '2020-05-15'
    }
  ]),
  clientBC: 'No',
  clientBCName: '',
  clientBCDate: '',
  clientBCLoc: '',
  clientBCPreg: '0',
  clientBCPregDate: '',
  clientBCPap: '2023-06-10',
  clientBCMam: '2023-08-20',
  clientSexLastYear: 'One',
  clientSexLastMonth: 'None',
  clientLastSexDate: '2023-12-15',
  clientSexRelations: 'Men',
  clientRiskFactors: JSON.stringify([
    { value: 'multiple_partners', label: 'Multiple partners' }
  ]),
  clientSTDDate: '2023-06-01',
  clientSTDStatus: JSON.stringify([
    { value: 'none', label: 'None' }
  ]),
  createdBy: 'test@example.com',
  createdAt: '2024-03-01T10:00:00Z',
  updatedBy: null,
  updatedAt: null
};

// 🔄 Async thunk to fetch medical screening data
export const fetchMedScreening = createAsyncThunk(
  "medScreening/fetchMedScreening",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock medical screening for", clientID);
      return [MOCK_MEDICAL_SCREENING];
    }

    try {
      const response = await axios.get(`/api/medical-screening/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching medical screening:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save medical screening data
export const saveMedScreening = createAsyncThunk(
  "medScreening/saveMedScreening",
  async (screeningData, thunkAPI) => {
    const { clientID, ...data } = screeningData;
    
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating medical screening save for", clientID);
      return {
        ...data,
        clientID,
        id: Date.now(),
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`/api/medical-screening/${clientID}`, data);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving medical screening:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to update medical screening data
export const updateMedScreening = createAsyncThunk(
  "medScreening/updateMedScreening",
  async ({ screeningID, screeningData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(screeningData.clientID)) {
      console.log("🔧 Mock mode: Simulating medical screening update for", screeningID);
      return {
        ...screeningData,
        id: screeningID,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(`/api/medical-screening/${screeningID}`, screeningData);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating medical screening:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

// 🔄 Async thunk to get medical screening summary/stats
export const getMedScreeningSummary = createAsyncThunk(
  "medScreening/getMedScreeningSummary",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock screening summary for", clientID);
      return {
        clientID,
        totalConditions: 2,
        totalMedications: 2,
        totalSurgeries: 1,
        hasTBClearance: true,
        lastScreeningDate: '2024-03-01',
        riskFactorsCount: 1,
        needsFollowUp: false
      };
    }

    try {
      const response = await axios.get(`/api/medical-screening/${clientID}/summary`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching screening summary:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

const initialState = {
  // Medical screening data
  data: [],
  loading: false,
  error: null,
  
  // Summary/stats
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Save states
  saving: false,
  saveError: null,
  saveSuccess: false,
};

const medScreeningSlice = createSlice({
  name: "medScreening",
  initialState,
  reducers: {
    clearMedScreeningError(state) {
      state.error = null;
      state.saveError = null;
      state.summaryError = null;
    },
    clearSaveSuccess(state) {
      state.saveSuccess = false;
    },
    resetMedScreeningState(state) {
      return initialState;
    },
    // Local state updates for optimistic updates
    updateMedScreeningLocal(state, action) {
      if (state.data.length > 0) {
        state.data[0] = {
          ...state.data[0],
          ...action.payload,
          updatedAt: new Date().toISOString()
        };
      } else {
        state.data = [{
          ...action.payload,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString()
        }];
      }
    },
    addMedicationLocal(state, action) {
      if (state.data.length > 0) {
        const currentMeds = JSON.parse(state.data[0].clientMedications || '[]');
        currentMeds.push(action.payload);
        state.data[0].clientMedications = JSON.stringify(currentMeds);
        state.data[0].updatedAt = new Date().toISOString();
      }
    },
    removeMedicationLocal(state, action) {
      if (state.data.length > 0) {
        const currentMeds = JSON.parse(state.data[0].clientMedications || '[]');
        const updatedMeds = currentMeds.filter((_, index) => index !== action.payload);
        state.data[0].clientMedications = JSON.stringify(updatedMeds);
        state.data[0].updatedAt = new Date().toISOString();
      }
    },
    addSurgeryLocal(state, action) {
      if (state.data.length > 0) {
        const currentSurgeries = JSON.parse(state.data[0].clientSurgeries || '[]');
        currentSurgeries.push(action.payload);
        state.data[0].clientSurgeries = JSON.stringify(currentSurgeries);
        state.data[0].updatedAt = new Date().toISOString();
      }
    },
    removeSurgeryLocal(state, action) {
      if (state.data.length > 0) {
        const currentSurgeries = JSON.parse(state.data[0].clientSurgeries || '[]');
        const updatedSurgeries = currentSurgeries.filter((_, index) => index !== action.payload);
        state.data[0].clientSurgeries = JSON.stringify(updatedSurgeries);
        state.data[0].updatedAt = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch medical screening
      .addCase(fetchMedScreening.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedScreening.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchMedScreening.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Save medical screening
      .addCase(saveMedScreening.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(saveMedScreening.fulfilled, (state, action) => {
        state.saving = false;
        state.saveSuccess = true;
        state.saveError = null;
        // Update the data array
        if (state.data.length > 0) {
          state.data[0] = action.payload;
        } else {
          state.data = [action.payload];
        }
      })
      .addCase(saveMedScreening.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
        state.saveSuccess = false;
      })
      
      // Update medical screening
      .addCase(updateMedScreening.pending, (state) => {
        state.saving = true;
        state.saveError = null;
      })
      .addCase(updateMedScreening.fulfilled, (state, action) => {
        state.saving = false;
        state.saveSuccess = true;
        state.saveError = null;
        // Update the data array
        const index = state.data.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.data[index] = action.payload;
        }
      })
      .addCase(updateMedScreening.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      })
      
      // Get medical screening summary
      .addCase(getMedScreeningSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(getMedScreeningSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(getMedScreeningSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      });
  },
});

export const {
  clearMedScreeningError,
  clearSaveSuccess,
  resetMedScreeningState,
  updateMedScreeningLocal,
  addMedicationLocal,
  removeMedicationLocal,
  addSurgeryLocal,
  removeSurgeryLocal,
} = medScreeningSlice.actions;

// Selectors
export const selectMedScreeningData = (state) => state.medScreening?.data || [];
export const selectMedScreeningLoading = (state) => state.medScreening?.loading || false;
export const selectMedScreeningError = (state) => state.medScreening?.error || null;
export const selectMedScreeningSaving = (state) => state.medScreening?.saving || false;
export const selectMedScreeningSaveSuccess = (state) => state.medScreening?.saveSuccess || false;
export const selectMedScreeningSummary = (state) => state.medScreening?.summary || {};

// ✅ DEFAULT EXPORT
export default medScreeningSlice.reducer;