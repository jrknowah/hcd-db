// src/backend/store/slices/medObservationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_MEDICATIONS = [
  {
    marID: 1,
    clientID: 'mock-123',
    medicationName: 'OMEPAZOLE DR 20 MG CAP',
    dosage: '20 mg',
    route: 'PO',
    frequency: 'Daily',
    scheduledTime: '08:00',
    administeredDate: '2024-03-15',
    administeredTime: '2024-03-15T08:05:00Z',
    administeredBy: 'J. Smith, RN',
    status: 'Given',
    notes: '',
    createdAt: '2024-03-15T08:05:00Z'
  },
  {
    marID: 2,
    clientID: 'mock-123',
    medicationName: 'BUPROPION HCL 100 MG TAB',
    dosage: '100 mg',
    route: 'PO',
    frequency: 'Daily',
    scheduledTime: '08:00',
    administeredDate: '2024-03-15',
    administeredTime: '2024-03-15T08:05:00Z',
    administeredBy: 'J. Smith, RN',
    status: 'Given',
    notes: '',
    createdAt: '2024-03-15T08:05:00Z'
  },
  {
    marID: 3,
    clientID: 'mock-123',
    medicationName: 'VITAMIN D2 1.25 MG 50,000 UNIT',
    dosage: '50,000 IU',
    route: 'PO',
    frequency: 'Weekly',
    scheduledTime: '08:00',
    administeredDate: '2024-03-15',
    administeredTime: '2024-03-15T08:05:00Z',
    administeredBy: 'J. Smith, RN',
    status: 'Given',
    notes: 'Weekly dose administered',
    createdAt: '2024-03-15T08:05:00Z'
  }
];

const MOCK_VITAL_SIGNS = [
  {
    vitalSignID: 1,
    clientID: 'mock-123',
    recordDate: '2024-03-15',
    recordTime: '08:00',
    bloodPressureSystolic: 128,
    bloodPressureDiastolic: 82,
    temperature: 98.6,
    pulse: 76,
    respirations: 16,
    oxygenSaturation: 98,
    weight: 165.5,
    bloodGlucose: null,
    painLevel: 2,
    notes: 'Patient reports feeling well',
    recordedBy: 'J. Smith, RN',
    createdAt: '2024-03-15T08:00:00Z'
  },
  {
    vitalSignID: 2,
    clientID: 'mock-123',
    recordDate: '2024-03-14',
    recordTime: '08:00',
    bloodPressureSystolic: 130,
    bloodPressureDiastolic: 85,
    temperature: 98.4,
    pulse: 78,
    respirations: 18,
    oxygenSaturation: 97,
    weight: 165.8,
    bloodGlucose: null,
    painLevel: 3,
    notes: 'Slight headache reported',
    recordedBy: 'M. Johnson, RN',
    createdAt: '2024-03-14T08:00:00Z'
  }
];

const MOCK_OBSERVATIONS = [
  {
    observationID: 1,
    clientID: 'mock-123',
    observationDate: '2024-03-15',
    generalCondition: 'Good',
    moodBehavior: 'Calm and cooperative',
    sleepQuality: 'Good - 7 hours',
    appetiteIntake: 'Good - ate 80% of meals',
    bowelMovement: 'Regular',
    urinaryOutput: 'Normal',
    skinIntegrity: 'Intact, no concerns',
    fallRisk: 'Low',
    activityLevel: 'Moderate - participated in group activities',
    painAssessment: 'Mild - 2/10, manageable',
    observationNotes: 'Patient engaged in morning activities, social interaction improved',
    recordedBy: 'J. Smith, RN',
    createdAt: '2024-03-15T16:00:00Z'
  }
];

// ============================================================================
// ASYNC THUNKS
// ============================================================================

// Medication Administration Records
export const fetchMedicationRecords = createAsyncThunk(
  "medObservation/fetchMedicationRecords",
  async ({ clientID, startDate, endDate }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock medication records");
      return MOCK_MEDICATIONS;
    }

    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get(
        `${API_URL}/api/medication-admin/${clientID}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching medication records:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

export const saveMedicationRecord = createAsyncThunk(
  "medObservation/saveMedicationRecord",
  async ({ clientID, medicationData }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating medication record save");
      return {
        ...medicationData,
        marID: Date.now(),
        clientID,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/medication-admin/${clientID}`,
        medicationData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error saving medication record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

export const updateMedicationRecord = createAsyncThunk(
  "medObservation/updateMedicationRecord",
  async ({ marID, medicationData }, thunkAPI) => {
    if (shouldUseMockData(medicationData.clientID)) {
      console.log("🔧 Mock mode: Simulating medication record update");
      return {
        ...medicationData,
        marID,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/medication-admin/${marID}`,
        medicationData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error updating medication record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

export const deleteMedicationRecord = createAsyncThunk(
  "medObservation/deleteMedicationRecord",
  async ({ clientID, marID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating medication record delete");
      return marID;
    }

    try {
      await axios.delete(`${API_URL}/api/medication-admin/${marID}`);
      return marID;
    } catch (error) {
      console.error("❌ Error deleting medication record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

// Vital Signs
export const fetchVitalSigns = createAsyncThunk(
  "medObservation/fetchVitalSigns",
  async ({ clientID, startDate, endDate, limit }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock vital signs");
      return MOCK_VITAL_SIGNS;
    }

    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (limit) params.limit = limit;
      
      const response = await axios.get(
        `${API_URL}/api/vital-signs/${clientID}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching vital signs:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

export const saveVitalSigns = createAsyncThunk(
  "medObservation/saveVitalSigns",
  async ({ clientID, vitalData }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating vital signs save");
      return {
        ...vitalData,
        vitalSignID: Date.now(),
        clientID,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/vital-signs/${clientID}`,
        vitalData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error saving vital signs:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

export const updateVitalSigns = createAsyncThunk(
  "medObservation/updateVitalSigns",
  async ({ vitalSignID, vitalData }, thunkAPI) => {
    if (shouldUseMockData(vitalData.clientID)) {
      console.log("🔧 Mock mode: Simulating vital signs update");
      return {
        ...vitalData,
        vitalSignID,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/vital-signs/${vitalSignID}`,
        vitalData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error updating vital signs:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

export const deleteVitalSigns = createAsyncThunk(
  "medObservation/deleteVitalSigns",
  async ({ clientID, vitalSignID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating vital signs delete");
      return vitalSignID;
    }

    try {
      await axios.delete(`${API_URL}/api/vital-signs/${vitalSignID}`);
      return vitalSignID;
    } catch (error) {
      console.error("❌ Error deleting vital signs:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

export const fetchVitalSignsTrends = createAsyncThunk(
  "medObservation/fetchVitalSignsTrends",
  async ({ clientID, days = 30 }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock vital signs trends");
      return MOCK_VITAL_SIGNS;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/vital-signs/${clientID}/trends`,
        { params: { days } }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching vital signs trends:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// Daily Observations
export const fetchDailyObservations = createAsyncThunk(
  "medObservation/fetchDailyObservations",
  async ({ clientID, startDate, endDate }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock daily observations");
      return MOCK_OBSERVATIONS;
    }

    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get(
        `${API_URL}/api/daily-observations/${clientID}`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching daily observations:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

export const saveDailyObservation = createAsyncThunk(
  "medObservation/saveDailyObservation",
  async ({ clientID, observationData }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating daily observation save");
      return {
        ...observationData,
        observationID: Date.now(),
        clientID,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/daily-observations/${clientID}`,
        observationData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error saving daily observation:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

export const updateDailyObservation = createAsyncThunk(
  "medObservation/updateDailyObservation",
  async ({ observationID, observationData }, thunkAPI) => {
    if (shouldUseMockData(observationData.clientID)) {
      console.log("🔧 Mock mode: Simulating daily observation update");
      return {
        ...observationData,
        observationID,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(
        `${API_URL}/api/daily-observations/${observationID}`,
        observationData
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error updating daily observation:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

export const deleteDailyObservation = createAsyncThunk(
  "medObservation/deleteDailyObservation",
  async ({ clientID, observationID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating daily observation delete");
      return observationID;
    }

    try {
      await axios.delete(`${API_URL}/api/daily-observations/${observationID}`);
      return observationID;
    } catch (error) {
      console.error("❌ Error deleting daily observation:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

// Summary
export const fetchMedicalObservationSummary = createAsyncThunk(
  "medObservation/fetchMedicalObservationSummary",
  async (clientID, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock summary");
      return {
        medicationsLast30Days: 45,
        activeMedications: 3,
        vitalSignsLast7Days: 7,
        observationsLast7Days: 7,
        lastVitalSignsDate: '2024-03-15',
        lastObservationDate: '2024-03-15'
      };
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/medical-observation/${clientID}/summary`
      );
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching summary:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  // Medication Administration Records
  medicationRecords: [],
  medicationLoading: false,
  medicationError: null,
  
  // Vital Signs
  vitalSigns: [],
  vitalSignsTrends: [],
  vitalSignsLoading: false,
  vitalSignsError: null,
  
  // Daily Observations
  dailyObservations: [],
  observationsLoading: false,
  observationsError: null,
  
  // Summary
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // General
  loading: false,
  error: null,
};

// ============================================================================
// SLICE DEFINITION
// ============================================================================

const medObservationSlice = createSlice({
  name: "medObservation",
  initialState,
  reducers: {
    clearMedicationError(state) {
      state.medicationError = null;
      state.error = null;
    },
    clearVitalSignsError(state) {
      state.vitalSignsError = null;
      state.error = null;
    },
    clearObservationsError(state) {
      state.observationsError = null;
      state.error = null;
    },
    resetMedObservationState(state) {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Medication Records
      .addCase(fetchMedicationRecords.pending, (state) => {
        state.medicationLoading = true;
        state.loading = true;
        state.medicationError = null;
      })
      .addCase(fetchMedicationRecords.fulfilled, (state, action) => {
        state.medicationLoading = false;
        state.loading = false;
        state.medicationRecords = action.payload;
        state.medicationError = null;
      })
      .addCase(fetchMedicationRecords.rejected, (state, action) => {
        state.medicationLoading = false;
        state.loading = false;
        state.medicationError = action.payload;
        state.error = action.payload;
      })
      
      .addCase(saveMedicationRecord.fulfilled, (state, action) => {
        state.medicationRecords.unshift(action.payload);
        state.medicationError = null;
      })
      
      .addCase(updateMedicationRecord.fulfilled, (state, action) => {
        const index = state.medicationRecords.findIndex(
          record => record.marID === action.payload.marID
        );
        if (index !== -1) {
          state.medicationRecords[index] = action.payload;
        }
        state.medicationError = null;
      })
      
      .addCase(deleteMedicationRecord.fulfilled, (state, action) => {
        state.medicationRecords = state.medicationRecords.filter(
          record => record.marID !== action.payload
        );
      })
      
      // Vital Signs
      .addCase(fetchVitalSigns.pending, (state) => {
        state.vitalSignsLoading = true;
        state.loading = true;
        state.vitalSignsError = null;
      })
      .addCase(fetchVitalSigns.fulfilled, (state, action) => {
        state.vitalSignsLoading = false;
        state.loading = false;
        state.vitalSigns = action.payload;
        state.vitalSignsError = null;
      })
      .addCase(fetchVitalSigns.rejected, (state, action) => {
        state.vitalSignsLoading = false;
        state.loading = false;
        state.vitalSignsError = action.payload;
        state.error = action.payload;
      })
      
      .addCase(saveVitalSigns.fulfilled, (state, action) => {
        state.vitalSigns.unshift(action.payload);
        state.vitalSignsError = null;
      })
      
      .addCase(updateVitalSigns.fulfilled, (state, action) => {
        const index = state.vitalSigns.findIndex(
          vital => vital.vitalSignID === action.payload.vitalSignID
        );
        if (index !== -1) {
          state.vitalSigns[index] = action.payload;
        }
        state.vitalSignsError = null;
      })
      
      .addCase(deleteVitalSigns.fulfilled, (state, action) => {
        state.vitalSigns = state.vitalSigns.filter(
          vital => vital.vitalSignID !== action.payload
        );
      })
      
      .addCase(fetchVitalSignsTrends.fulfilled, (state, action) => {
        state.vitalSignsTrends = action.payload;
      })
      
      // Daily Observations
      .addCase(fetchDailyObservations.pending, (state) => {
        state.observationsLoading = true;
        state.loading = true;
        state.observationsError = null;
      })
      .addCase(fetchDailyObservations.fulfilled, (state, action) => {
        state.observationsLoading = false;
        state.loading = false;
        state.dailyObservations = action.payload;
        state.observationsError = null;
      })
      .addCase(fetchDailyObservations.rejected, (state, action) => {
        state.observationsLoading = false;
        state.loading = false;
        state.observationsError = action.payload;
        state.error = action.payload;
      })
      
      .addCase(saveDailyObservation.fulfilled, (state, action) => {
        state.dailyObservations.unshift(action.payload);
        state.observationsError = null;
      })
      
      .addCase(updateDailyObservation.fulfilled, (state, action) => {
        const index = state.dailyObservations.findIndex(
          obs => obs.observationID === action.payload.observationID
        );
        if (index !== -1) {
          state.dailyObservations[index] = action.payload;
        }
        state.observationsError = null;
      })
      
      .addCase(deleteDailyObservation.fulfilled, (state, action) => {
        state.dailyObservations = state.dailyObservations.filter(
          obs => obs.observationID !== action.payload
        );
      })
      
      // Summary
      .addCase(fetchMedicalObservationSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchMedicalObservationSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchMedicalObservationSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      });
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  clearMedicationError,
  clearVitalSignsError,
  clearObservationsError,
  resetMedObservationState,
} = medObservationSlice.actions;

// Selectors
export const selectMedicationRecords = (state) => state.medObservation?.medicationRecords || [];
export const selectVitalSigns = (state) => state.medObservation?.vitalSigns || [];
export const selectVitalSignsTrends = (state) => state.medObservation?.vitalSignsTrends || [];
export const selectDailyObservations = (state) => state.medObservation?.dailyObservations || [];
export const selectMedObservationSummary = (state) => state.medObservation?.summary || {};
export const selectMedObservationLoading = (state) => state.medObservation?.loading || false;
export const selectMedicationLoading = (state) => state.medObservation?.medicationLoading || false;
export const selectVitalSignsLoading = (state) => state.medObservation?.vitalSignsLoading || false;
export const selectObservationsLoading = (state) => state.medObservation?.observationsLoading || false;

export default medObservationSlice.reducer;