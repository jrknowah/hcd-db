// src/backend/store/slices/MentalHealthSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// 🔄 Async thunk to fetch mental health data
export const fetchMentalHealthData = createAsyncThunk(
  "mentalHealth/fetchMentalHealthData",
  async (clientID, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock mental health data");
      return {}; // Return mock data if needed
    }

    try {
      const response = await axios.get(`${API_URL}/api/mental-health/${clientID}`);
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
      console.log("🔧 Mock mode: Simulating save");
      return { success: true, message: "Mock save successful" };
    }

    try {
      const response = await axios.post(`${API_URL}/api/mental-health/${clientId}`, formData);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving mental health data:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to add provider
export const addProvider = createAsyncThunk(
  "mentalHealth/addProvider",
  async ({ clientID, providerData, createdBy }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Adding provider locally");
      return { ...providerData, providerID: Date.now(), createdAt: new Date().toISOString() };
    }

    try {
      const response = await axios.post(`${API_URL}/api/mental-health/${clientID}/providers`, {
        ...providerData,
        createdBy: createdBy || 'unknown'
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error adding provider:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Add provider failed");
    }
  }
);

// 🗑️ Async thunk to remove provider
export const removeProvider = createAsyncThunk(
  "mentalHealth/removeProvider",
  async ({ clientID, providerID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Removing provider locally");
      return providerID;
    }

    try {
      await axios.delete(`${API_URL}/api/mental-health/${clientID}/providers/${providerID}`);
      return providerID;
    } catch (error) {
      console.error("❌ Error removing provider:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Remove provider failed");
    }
  }
);

// 🔄 Async thunk to add hospitalization
export const addHospitalization = createAsyncThunk(
  "mentalHealth/addHospitalization",
  async ({ clientID, hospitalizationData, createdBy }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Adding hospitalization locally");
      return { ...hospitalizationData, hospitalizationID: Date.now(), createdAt: new Date().toISOString() };
    }

    try {
      const response = await axios.post(`${API_URL}/api/mental-health/${clientID}/hospitalizations`, {
        ...hospitalizationData,
        createdBy: createdBy || 'unknown'
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error adding hospitalization:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Add hospitalization failed");
    }
  }
);

// 🗑️ Async thunk to remove hospitalization
export const removeHospitalization = createAsyncThunk(
  "mentalHealth/removeHospitalization",
  async ({ clientID, hospitalizationID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Removing hospitalization locally");
      return hospitalizationID;
    }

    try {
      await axios.delete(`${API_URL}/api/mental-health/${clientID}/hospitalizations/${hospitalizationID}`);
      return hospitalizationID;
    } catch (error) {
      console.error("❌ Error removing hospitalization:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Remove hospitalization failed");
    }
  }
);

// 🔄 Async thunk to add medication
export const addMedication = createAsyncThunk(
  "mentalHealth/addMedication",
  async ({ clientID, medicationData, createdBy }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Adding medication locally");
      return { ...medicationData, medicationID: Date.now(), createdAt: new Date().toISOString() };
    }

    try {
      const response = await axios.post(`${API_URL}/api/mental-health/${clientID}/medications`, {
        ...medicationData,
        createdBy: createdBy || 'unknown'
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error adding medication:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Add medication failed");
    }
  }
);

// 🗑️ Async thunk to remove medication
export const removeMedication = createAsyncThunk(
  "mentalHealth/removeMedication",
  async ({ clientID, medicationID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Removing medication locally");
      return medicationID;
    }

    try {
      await axios.delete(`${API_URL}/api/mental-health/${clientID}/medications/${medicationID}`);
      return medicationID;
    } catch (error) {
      console.error("❌ Error removing medication:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Remove medication failed");
    }
  }
);

const initialState = {
  data: {},
  status: "idle",
  error: null,
  saveStatus: "idle",
  saveError: null,
};

const mentalHealthSlice = createSlice({
  name: "mentalHealth",
  initialState,
  reducers: {
    clearMentalHealthData(state) {
      state.data = {};
      state.status = "idle";
      state.error = null;
    },
    // Keep local actions for backwards compatibility but mark as deprecated
    addProviderLocal(state, action) {
      console.warn("⚠️ addProviderLocal is deprecated - use addProvider thunk instead");
      if (!state.data.currentProvider) state.data.currentProvider = [];
      state.data.currentProvider.push(action.payload);
    },
    removeProviderLocal(state, action) {
      console.warn("⚠️ removeProviderLocal is deprecated - use removeProvider thunk instead");
      if (state.data.currentProvider) {
        state.data.currentProvider = state.data.currentProvider.filter((_, idx) => idx !== action.payload);
      }
    },
    addHospitalizationLocal(state, action) {
      console.warn("⚠️ addHospitalizationLocal is deprecated - use addHospitalization thunk instead");
      if (!state.data.hospitalizations) state.data.hospitalizations = [];
      state.data.hospitalizations.push(action.payload);
    },
    removeHospitalizationLocal(state, action) {
      console.warn("⚠️ removeHospitalizationLocal is deprecated - use removeHospitalization thunk instead");
      if (state.data.hospitalizations) {
        state.data.hospitalizations = state.data.hospitalizations.filter((_, idx) => idx !== action.payload);
      }
    },
    addMedicationLocal(state, action) {
      console.warn("⚠️ addMedicationLocal is deprecated - use addMedication thunk instead");
      if (!state.data.medications) state.data.medications = [];
      state.data.medications.push(action.payload);
    },
    removeMedicationLocal(state, action) {
      console.warn("⚠️ removeMedicationLocal is deprecated - use removeMedication thunk instead");
      if (state.data.medications) {
        state.data.medications = state.data.medications.filter((_, idx) => idx !== action.payload);
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
        state.saveStatus = "loading";
        state.saveError = null;
      })
      .addCase(saveMentalHealthData.fulfilled, (state, action) => {
        state.saveStatus = "succeeded";
        state.saveError = null;
      })
      .addCase(saveMentalHealthData.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError = action.payload;
      })
      // Add provider
      .addCase(addProvider.fulfilled, (state, action) => {
        if (!state.data.currentProvider) state.data.currentProvider = [];
        state.data.currentProvider.push(action.payload);
      })
      // Remove provider
      .addCase(removeProvider.fulfilled, (state, action) => {
        if (state.data.currentProvider) {
          state.data.currentProvider = state.data.currentProvider.filter(
            p => p.providerID !== action.payload
          );
        }
      })
      // Add hospitalization
      .addCase(addHospitalization.fulfilled, (state, action) => {
        if (!state.data.hospitalizations) state.data.hospitalizations = [];
        state.data.hospitalizations.push(action.payload);
      })
      // Remove hospitalization
      .addCase(removeHospitalization.fulfilled, (state, action) => {
        if (state.data.hospitalizations) {
          state.data.hospitalizations = state.data.hospitalizations.filter(
            h => h.hospitalizationID !== action.payload
          );
        }
      })
      // Add medication
      .addCase(addMedication.fulfilled, (state, action) => {
        if (!state.data.medications) state.data.medications = [];
        state.data.medications.push(action.payload);
      })
      // Remove medication
      .addCase(removeMedication.fulfilled, (state, action) => {
        if (state.data.medications) {
          state.data.medications = state.data.medications.filter(
            m => m.medicationID !== action.payload
          );
        }
      });
  },
});

export const {
  clearMentalHealthData,
  addProviderLocal,
  removeProviderLocal,
  addHospitalizationLocal,
  removeHospitalizationLocal,
  addMedicationLocal,
  removeMedicationLocal,
} = mentalHealthSlice.actions;

export default mentalHealthSlice.reducer;