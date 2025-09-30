// src/store/apps/notes/nursingAdmissionSlice.js
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

// Mock data for development
const MOCK_NURSING_ADMISSION = {
  clientID: 'mock-123',
  // Basic Assessment
  loc: ['Alert'],
  orientedToList: ['Person', 'Place', 'Time'],
  orientedToRoomList: ['Room Layout', 'Call Bell', 'Bathroom Location'],
  
  // Cardio-Pulmonary
  cpT: '98.6',
  cpP: '72',
  cpR: '16',
  cpBP: '120/80',
  tList: ['Oral'],
  pList: ['Regular', 'Strong'],
  rList: ['Regular', 'Unlabored'],
  historyOf: ['Hypertension', 'Diabetes Type 2'],
  edema: ['None'],
  edemaLocation: '',
  
  // Pain Assessment
  clientPain: ['No Pain'],
  painHistory: ['Chronic back pain - managed with medication'],
  lungSounds: ['Clear bilaterally'],
  
  // Bowel & Bladder
  bowelBladder: ['Independent'],
  cathType: '',
  cathSize: '',
  cathDiag: '',
  elimMethUsed: ['Toilet'],
  lastBowelDate: '2025-07-15',
  lastVoidDate: '2025-07-16',
  abdomen: ['Soft', 'Non-tender'],
  
  // Physical & Functional Status
  physicalFuncStat: ['Ambulates independently'],
  clientPhysicalFuncNotes: 'Client demonstrates steady gait and good balance. No assistive devices needed.',
  weightBearing: ['Full weight bearing'],
  transfers: ['Independent'],
  ambulation: ['Independent'],
  mobDevices: ['None'],
  
  // Nutrition & Communication
  nutrHyd: ['Independent oral intake'],
  enteral: ['None'],
  oral: ['Regular diet', 'Good appetite'],
  hearing: ['Normal'],
  vision: ['Corrected with glasses'],
  communication: ['English', 'Clear speech'],
  
  // ADL Levels
  bathing: ['Independent'],
  eating: ['Independent'],
  toileting: ['Independent'],
  bedMobility: ['Independent'],
  
  // Body Inspection
  frontBodyInspection: {
    clientBodyFace: 'Normal appearance, no lesions or abnormalities noted',
    clientBodyChest: 'Symmetrical chest expansion, no deformities',
    clientBodyRUQ: 'Soft, non-tender, no masses palpated',
    clientBodyLUQ: 'Soft, non-tender, normal bowel sounds',
    clientBodyRLO: 'Soft, non-tender, no guarding',
    clientBodyLLQ: 'Soft, non-tender, no masses',
    clientBodyLUA: 'Full range of motion, no swelling',
    clientBodyLLA: 'Normal appearance, good circulation',
    clientBodyRUA: 'Full range of motion, no swelling',
    clientBodyRLA: 'Normal appearance, good circulation',
    clientBodyLT: 'Normal muscle tone, no edema',
    clientBodyRT: 'Normal muscle tone, no edema',
    clientBodyLK: 'Full range of motion, no swelling',
    clientBodyRK: 'Full range of motion, no swelling',
    clientBodyLS: 'Normal appearance, no lesions',
    clientBodyRS: 'Normal appearance, no lesions',
    clientBodyLA: 'No swelling, good range of motion',
    clientBodyRA: 'No swelling, good range of motion',
    clientBodyLF: 'Normal appearance, good circulation',
    clientBodyRF: 'Normal appearance, good circulation'
  },
  
  rearBodyInspection: {
    clientBodyHead: 'No abnormalities noted, scalp intact',
    clientBodyNeck: 'Full range of motion, no masses',
    clientBodyUB: 'Normal spine alignment, no deformities',
    clientBodyLB: 'Lower back area normal, no pressure sores',
    clientBodyRearLUA: 'Normal muscle tone, no lesions',
    clientBodyRearRUA: 'Normal muscle tone, no lesions',
    clientBodyLG: 'No pressure sores, normal appearance',
    clientBodyRG: 'No pressure sores, normal appearance',
    clientBodyLUT: 'Normal muscle tone, no edema',
    clientBodyRUT: 'Normal muscle tone, no edema',
    clientBodyLLC: 'Normal appearance, good circulation',
    clientBodyRLC: 'Normal appearance, good circulation',
    clientBodyRearLA: 'No swelling, normal appearance',
    clientBodyRearRA: 'No swelling, normal appearance',
    clientBodyRearLF: 'Normal appearance, good circulation',
    clientBodyRearRF: 'Normal appearance, good circulation'
  }
};

const MOCK_SUMMARY = {
  totalAssessments: 1,
  lastAssessmentDate: '2025-07-16',
  overallStatus: 'Independent',
  adlScore: 16, // Maximum independence
  riskFactors: ['Diabetes', 'Hypertension'],
  followUpRequired: false
};

const MOCK_VITALS_HISTORY = [
  {
    date: '2025-07-16',
    temperature: '98.6',
    pulse: '72',
    respiration: '16',
    bloodPressure: '120/80'
  },
  {
    date: '2025-07-15',
    temperature: '98.4',
    pulse: '74',
    respiration: '18',
    bloodPressure: '118/78'
  }
];

// ===== ASYNC THUNKS (MUST BE DEFINED BEFORE SLICE) =====

// 🔄 Async thunk to fetch nursing admission data
export const fetchNursingAdmission = createAsyncThunk(
  "nursingAdmission/fetchNursingAdmission",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock nursing admission for", clientID);
      return MOCK_NURSING_ADMISSION;
    }

    try {
      const response = await axios.get(`/api/nursing-admission/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching nursing admission:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save nursing admission data
export const saveNursingAdmission = createAsyncThunk(
  "nursingAdmission/saveNursingAdmission",
  async ({ clientID, formData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating nursing admission save for", clientID);
      return {
        ...formData,
        clientID,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`/api/nursing-admission/${clientID}`, formData);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving nursing admission:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to fetch admission summary
export const fetchAdmissionSummary = createAsyncThunk(
  "nursingAdmission/fetchAdmissionSummary",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock admission summary for", clientID);
      return MOCK_SUMMARY;
    }

    try {
      const response = await axios.get(`/api/nursing-admission/${clientID}/summary`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching admission summary:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 🔄 Async thunk to fetch body inspection data
export const fetchBodyInspection = createAsyncThunk(
  "nursingAdmission/fetchBodyInspection",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock body inspection for", clientID);
      return {
        frontBodyInspection: MOCK_NURSING_ADMISSION.frontBodyInspection,
        rearBodyInspection: MOCK_NURSING_ADMISSION.rearBodyInspection
      };
    }

    try {
      const response = await axios.get(`/api/nursing-admission/${clientID}/body-inspection`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching body inspection:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 🔄 Async thunk to fetch vitals history
export const fetchVitalsHistory = createAsyncThunk(
  "nursingAdmission/fetchVitalsHistory",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock vitals history for", clientID);
      return MOCK_VITALS_HISTORY;
    }

    try {
      const response = await axios.get(`/api/nursing-admission/${clientID}/vitals`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching vitals history:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// ✏️ Async thunk to update nursing admission
export const updateNursingAdmission = createAsyncThunk(
  "nursingAdmission/updateNursingAdmission",
  async ({ admissionID, updatedData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Simulating nursing admission update for", admissionID);
      return {
        admissionID,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(`/api/nursing-admission/${admissionID}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating nursing admission:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

// 🗑️ Async thunk to delete nursing admission
export const deleteNursingAdmission = createAsyncThunk(
  "nursingAdmission/deleteNursingAdmission",
  async (admissionID, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Simulating nursing admission delete for", admissionID);
      return admissionID;
    }

    try {
      await axios.delete(`/api/nursing-admission/${admissionID}`);
      return admissionID;
    } catch (error) {
      console.error("❌ Error deleting nursing admission:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

// ===== INITIAL STATE =====

const initialState = {
  // Main admission data
  data: {},
  loading: false,
  error: null,
  
  // Summary/statistics
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Body inspection data
  bodyInspection: {},
  bodyInspectionLoading: false,
  bodyInspectionError: null,
  
  // Vitals history
  vitalsHistory: [],
  vitalsLoading: false,
  vitalsError: null,
  
  // Save states
  saving: false,
  saveError: null,
  saveSuccess: false,
  
  // Update states
  updating: false,
  updateError: null,
  updateSuccess: false,
  
  // Delete states
  deleting: false,
  deleteError: null,
  deleteSuccess: false,
  
  // Mock data flag for development
  useMockData: import.meta.env.MODE === 'development'
};

// ===== SLICE DEFINITION =====

const nursingAdmissionSlice = createSlice({
  name: "nursingAdmission",
  initialState,
  reducers: {
    clearAdmissionError(state) {
      state.error = null;
      state.saveError = null;
      state.updateError = null;
      state.deleteError = null;
      state.summaryError = null;
      state.bodyInspectionError = null;
      state.vitalsError = null;
    },
    
    clearAdmissionSuccess(state) {
      state.saveSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
    },
    
    resetAdmissionState(state) {
      return initialState;
    },
    
    // Mock data management
    setMockData(state, action) {
      const { admissionData, summary, bodyInspection, vitalsHistory } = action.payload;
      if (admissionData) {
        state.data = admissionData;
      }
      if (summary) {
        state.summary = summary;
      }
      if (bodyInspection) {
        state.bodyInspection = bodyInspection;
      }
      if (vitalsHistory) {
        state.vitalsHistory = vitalsHistory;
      }
      // Clear loading states
      state.loading = false;
      state.summaryLoading = false;
      state.bodyInspectionLoading = false;
      state.vitalsLoading = false;
      state.saving = false;
      state.updating = false;
      state.deleting = false;
      // Clear error states
      state.error = null;
      state.summaryError = null;
      state.bodyInspectionError = null;
      state.vitalsError = null;
      state.saveError = null;
      state.updateError = null;
      state.deleteError = null;
    },
    
    // Local state updates for optimistic updates
    updateAdmissionLocal(state, action) {
      state.data = { ...state.data, ...action.payload };
      state.saving = false;
      state.saveSuccess = true;
      state.saveError = null;
    },
    
    updateBodyInspectionLocal(state, action) {
      const { section, data } = action.payload;
      if (section === 'front') {
        state.bodyInspection.frontBodyInspection = { 
          ...state.bodyInspection.frontBodyInspection, 
          ...data 
        };
      } else if (section === 'rear') {
        state.bodyInspection.rearBodyInspection = { 
          ...state.bodyInspection.rearBodyInspection, 
          ...data 
        };
      }
    },
    
    addVitalSignsLocal(state, action) {
      state.vitalsHistory.unshift({
        ...action.payload,
        date: new Date().toISOString().split('T')[0]
      });
    },
    
    // Toggle mock data mode
    toggleMockData(state) {
      state.useMockData = !state.useMockData;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch nursing admission
      .addCase(fetchNursingAdmission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNursingAdmission.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchNursingAdmission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Save nursing admission
      .addCase(saveNursingAdmission.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(saveNursingAdmission.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.saveSuccess = true;
        state.saveError = null;
      })
      .addCase(saveNursingAdmission.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
        state.saveSuccess = false;
      })
      
      // Update nursing admission
      .addCase(updateNursingAdmission.pending, (state) => {
        state.updating = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(updateNursingAdmission.fulfilled, (state, action) => {
        state.updating = false;
        state.data = { ...state.data, ...action.payload };
        state.updateSuccess = true;
        state.updateError = null;
      })
      .addCase(updateNursingAdmission.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
        state.updateSuccess = false;
      })
      
      // Delete nursing admission
      .addCase(deleteNursingAdmission.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(deleteNursingAdmission.fulfilled, (state, action) => {
        state.deleting = false;
        state.data = {};
        state.deleteSuccess = true;
        state.deleteError = null;
      })
      .addCase(deleteNursingAdmission.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
        state.deleteSuccess = false;
      })
      
      // Fetch admission summary
      .addCase(fetchAdmissionSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchAdmissionSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchAdmissionSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      })
      
      // Fetch body inspection
      .addCase(fetchBodyInspection.pending, (state) => {
        state.bodyInspectionLoading = true;
        state.bodyInspectionError = null;
      })
      .addCase(fetchBodyInspection.fulfilled, (state, action) => {
        state.bodyInspectionLoading = false;
        state.bodyInspection = action.payload;
        state.bodyInspectionError = null;
      })
      .addCase(fetchBodyInspection.rejected, (state, action) => {
        state.bodyInspectionLoading = false;
        state.bodyInspectionError = action.payload;
      })
      
      // Fetch vitals history
      .addCase(fetchVitalsHistory.pending, (state) => {
        state.vitalsLoading = true;
        state.vitalsError = null;
      })
      .addCase(fetchVitalsHistory.fulfilled, (state, action) => {
        state.vitalsLoading = false;
        state.vitalsHistory = action.payload;
        state.vitalsError = null;
      })
      .addCase(fetchVitalsHistory.rejected, (state, action) => {
        state.vitalsLoading = false;
        state.vitalsError = action.payload;
      });
  },
});

// ===== EXPORTS =====

export const {
  clearAdmissionError,
  clearAdmissionSuccess,
  resetAdmissionState,
  setMockData,
  updateAdmissionLocal,
  updateBodyInspectionLocal,
  addVitalSignsLocal,
  toggleMockData
} = nursingAdmissionSlice.actions;

// Selectors
export const selectNursingAdmissionData = (state) => state.nursingAdmission?.data || {};
export const selectAdmissionLoading = (state) => state.nursingAdmission?.loading || false;
export const selectAdmissionError = (state) => state.nursingAdmission?.error || null;
export const selectAdmissionSummary = (state) => state.nursingAdmission?.summary || {};
export const selectBodyInspection = (state) => state.nursingAdmission?.bodyInspection || {};
export const selectVitalsHistory = (state) => state.nursingAdmission?.vitalsHistory || [];
export const selectSaveStatus = (state) => ({
  saving: state.nursingAdmission?.saving || false,
  saveError: state.nursingAdmission?.saveError || null,
  saveSuccess: state.nursingAdmission?.saveSuccess || false
});

// ✅ DEFAULT EXPORT
export default nursingAdmissionSlice.reducer;