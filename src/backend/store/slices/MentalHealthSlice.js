// src/store/apps/notes/mentalHealthSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = '';

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// Mock data for development
const MOCK_MENTAL_HEALTH_DATA = {
  id: 1,
  clientID: 'mock-123',
  mentalHealthHistory: 'Yes',
  mentalHealthDiagnosis: ['Depression', 'Anxiety'],
  mentalHealthTreatment: 'Yes',
  mentalHealthCurrentTreatment: 'Yes',
  mhSad: 'Several Days',
  mhAnxious: 'Over Half the Days',
  mhSleepPattern: 'Sleep too little',
  mhEnergyLevel: 'Low',
  mhConcentrate: 'Yes',
  mhThoughts: 'No',
  mhVoices: 'No',
  mhVoicesSay: '',
  mhFollowing: 'No',
  mhSomeone: '',
  mhFamHistory: 'Yes',
  mhSummary: 'Client shows signs of depression and anxiety, manageable with current treatment.',
  mhAbuse: ['History of physical/sexual/emotional abuse'],
  clientRisk: ['Denies thoughts'],
  mhSelfHarm: 'No',
  mhSelfHarmOccurrence: '',
  mhSuicide: 'No',
  mhSuicideLast: '',
  mhRiskSummary: 'Low risk assessment, no immediate concerns.',
  mhSubAbuseHelp: 'No',
  mhSubAbSum: 'No current substance abuse issues.',
  clientLegalIssues: [],
  clientLegalProbation: '',
  clientLegalParole: '',
  arrestMeth: 'No',
  arrestDrugAlcohol: 'No',
  arrestViolent: 'No',
  arrestArson: 'No',
  arrestSexCrime: 'No',
  regSexOffender: 'No',
  arrestCrime: 'Yes',
  mhLegalSum: 'Previous minor infractions, no current legal issues.',
  clientPatFamNeeds: ['Mental Health', 'Housing'],
  mhNeedsSum: 'Client requires ongoing mental health support and stable housing.',
  cmOb1: ['Well Groomed'],
  cmOb2: ['Normal for culture'],
  cmOb3: ['Calm'],
  cmOb4: ['Unimpaired'],
  cmOb5: ['Cooperative'],
  cmOb6: ['Unhappy'],
  cmOb7: ['Appropriate'],
  cmOb8: ['Unimpaired'],
  cmOb9: [],
  cmOb10: ['None'],
  cmOb11: [],
  cmObNone: [],
  cmObvSum: 'Client appears stable but shows signs of underlying depression. Cooperative during assessment.',
  currentProvider: [
    {
      id: 1,
      agency: 'Community Mental Health Center',
      worker: 'Dr. Sarah Johnson',
      phone: '(555) 123-4567',
      lastAppointment: '2024-03-10',
      nextAppointment: '2024-03-17'
    }
  ],
  hospitalizations: [
    {
      id: 1,
      location: 'UCLA Medical Center',
      reasons: 'Severe depression, suicidal ideation',
      date: '2020-06-15'
    }
  ],
  medications: [
    {
      id: 1,
      name: 'Sertraline',
      dose: '50mg daily',
      sideEffects: 'Mild nausea, effective for depression'
    }
  ],
  substanceData: {
    'Alcohol': { use: 'past', frequency: '', method: 'Drinking', yearStarted: '2015', yearQuit: '2020' },
    'Tobacco': { use: 'no', frequency: '', method: '', yearStarted: '', yearQuit: '' }
  }
};

// 🔄 Async thunk to fetch mental health data
export const fetchMentalHealthData = createAsyncThunk(
  "mentalHealth/fetchMentalHealthData",
  async (clientID, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock mental health data for", clientID);
      return MOCK_MENTAL_HEALTH_DATA;
    }

    try {
      const response = await axios.get(`/api/mental-health/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching mental health data:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save mental health data
export const saveMentalHealthData = createAsyncThunk(
  "mentalHealth/saveMentalHealthData",
  async ({ clientId, formData, user }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      console.log("🔧 Mock mode: Simulating mental health data save for", clientId);
      return { ...formData, id: Date.now() };
    }

    try {
      const response = await axios.post(`/api/mental-health/${clientId}`, {
        ...formData,
        updatedBy: user?.email || "unknown",
        updatedAt: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error saving mental health data:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// Provider actions
export const addMentalHealthProvider = createAsyncThunk(
  "mentalHealth/addProvider",
  async ({ clientId, providerData }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      return { ...providerData, id: Date.now() };
    }

    try {
      const response = await axios.post(`/api/mental-health/${clientId}/providers`, providerData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Add provider failed");
    }
  }
);

export const removeMentalHealthProvider = createAsyncThunk(
  "mentalHealth/removeProvider",
  async ({ clientId, providerId }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      return providerId;
    }

    try {
      await axios.delete(`/api/mental-health/${clientId}/providers/${providerId}`);
      return providerId;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Remove provider failed");
    }
  }
);

// Hospitalization actions
export const addHospitalization = createAsyncThunk(
  "mentalHealth/addHospitalization",
  async ({ clientId, hospitalizationData }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      return { ...hospitalizationData, id: Date.now() };
    }

    try {
      const response = await axios.post(`/api/mental-health/${clientId}/hospitalizations`, hospitalizationData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Add hospitalization failed");
    }
  }
);

// Medication actions
export const addMedication = createAsyncThunk(
  "mentalHealth/addMedication",
  async ({ clientId, medicationData }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      return { ...medicationData, id: Date.now() };
    }

    try {
      const response = await axios.post(`/api/mental-health/${clientId}/medications`, medicationData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Add medication failed");
    }
  }
);

const initialState = {
  data: {},
  providers: [],
  hospitalizations: [],
  medications: [],
  status: "idle",
  error: null,
};

const mentalHealthSlice = createSlice({
  name: "mentalHealth",
  initialState,
  reducers: {
    clearMentalHealthData(state) {
      state.data = {};
      state.providers = [];
      state.hospitalizations = [];
      state.medications = [];
      state.status = "idle";
      state.error = null;
    },
    setMentalHealthData(state, action) {
      state.data = action.payload;
    },
    addProviderLocal(state, action) {
      if (!state.data.currentProvider) {
        state.data.currentProvider = [];
      }
      state.data.currentProvider.push({ ...action.payload, id: Date.now() });
    },
    removeProviderLocal(state, action) {
      if (state.data.currentProvider) {
        state.data.currentProvider.splice(action.payload, 1);
      }
    },
    addHospitalizationLocal(state, action) {
      if (!state.data.hospitalizations) {
        state.data.hospitalizations = [];
      }
      state.data.hospitalizations.push({ ...action.payload, id: Date.now() });
    },
    removeHospitalizationLocal(state, action) {
      if (state.data.hospitalizations) {
        state.data.hospitalizations.splice(action.payload, 1);
      }
    },
    addMedicationLocal(state, action) {
      if (!state.data.medications) {
        state.data.medications = [];
      }
      state.data.medications.push({ ...action.payload, id: Date.now() });
    },
    removeMedicationLocal(state, action) {
      if (state.data.medications) {
        state.data.medications.splice(action.payload, 1);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch mental health data
      .addCase(fetchMentalHealthData.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMentalHealthData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchMentalHealthData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Save mental health data
      .addCase(saveMentalHealthData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(saveMentalHealthData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = { ...state.data, ...action.payload };
        state.error = null;
      })
      .addCase(saveMentalHealthData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Provider actions
      .addCase(addMentalHealthProvider.fulfilled, (state, action) => {
        if (!state.data.currentProvider) {
          state.data.currentProvider = [];
        }
        state.data.currentProvider.push(action.payload);
      })
      .addCase(removeMentalHealthProvider.fulfilled, (state, action) => {
        if (state.data.currentProvider) {
          state.data.currentProvider = state.data.currentProvider.filter(p => p.id !== action.payload);
        }
      })
      // Hospitalization actions
      .addCase(addHospitalization.fulfilled, (state, action) => {
        if (!state.data.hospitalizations) {
          state.data.hospitalizations = [];
        }
        state.data.hospitalizations.push(action.payload);
      })
      // Medication actions
      .addCase(addMedication.fulfilled, (state, action) => {
        if (!state.data.medications) {
          state.data.medications = [];
        }
        state.data.medications.push(action.payload);
      });
  },
});

export const {
  clearMentalHealthData,
  setMentalHealthData,
  addProviderLocal,
  removeProviderLocal,
  addHospitalizationLocal,
  removeHospitalizationLocal,
  addMedicationLocal,
  removeMedicationLocal,
} = mentalHealthSlice.actions;

export default mentalHealthSlice.reducer;