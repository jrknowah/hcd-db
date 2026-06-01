// src/store/slices/arrestActions.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// Mock arrest data for development
const MOCK_ARREST_DATA = [
  {
    arrestID: 1,
    clientID: 'mock-123',
    arrestDate: '2019-05-20',
    charge: 'Public intoxication',
    misdemeanorOrFelony: 'M',
    location: 'Los Angeles, CA',
    timeServed: '1 day',
    result: 'Fine paid',
    createdAt: '2024-03-01T10:00:00Z' 
  },
  {
    arrestID: 2,
    clientID: 'mock-123',
    arrestDate: '2018-03-15',
    charge: 'Trespassing',
    misdemeanorOrFelony: 'M',
    location: 'Los Angeles, CA',
    timeServed: '2 days',
    result: 'Charges dropped',
    createdAt: '2024-02-15T14:30:00Z'
  }
];

// 🔄 Async thunk to fetch arrest data
export const fetchArrestData = createAsyncThunk(
  "arrests/fetchArrestData",
  async (clientID, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock arrest data for", clientID);
      return MOCK_ARREST_DATA;
    }

    try {
      // ✅ FIX: Use correct backend route
      const response = await axios.get(`${API_URL}/api/mental-health/${clientID}/arrests`);
      return response.data || [];
    } catch (error) {
      console.error("❌ Error fetching arrest data:", error);
      // Return empty array instead of rejecting on 404
      if (error.response?.status === 404) {
        console.log("📝 No arrest records found for client, returning empty array");
        return [];
      }
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save/add arrest record
export const saveArrestData = createAsyncThunk(
  "arrests/saveArrestData",
  async (arrestData, thunkAPI) => {
    const { clientID, ...data } = arrestData;
    
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating arrest data save for", clientID);
      return { 
        ...data, 
        arrestID: Date.now(), 
        clientID: clientID,
        createdAt: new Date().toISOString()
      };
    }

    try {
      // ✅ FIX: Use correct backend route
      const response = await axios.post(`${API_URL}/api/mental-health/${clientID}/arrests`, data);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving arrest data:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to delete arrest record
export const deleteArrestRecord = createAsyncThunk(
  "arrests/deleteArrestRecord",
  async ({ clientID, arrestID }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Deleting arrest record for", clientID);
      return arrestID;
    }

    try {
      // ✅ FIX: Use correct backend route
      await axios.delete(`${API_URL}/api/mental-health/${clientID}/arrests/${arrestID}`);
      return arrestID;
    } catch (error) {
      console.error("❌ Error deleting arrest record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete arrest record failed");
    }
  }
);


// ✏️ Async thunk to update an arrest record
export const updateArrestData = createAsyncThunk(
  "arrests/updateArrestData",
  async ({ clientID, arrestID, ...data }, thunkAPI) => {
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating arrest update for", arrestID);
      return { ...data, arrestID, clientID };
    }

    try {
      const response = await axios.put(`${API_URL}/api/mental-health/${clientID}/arrests/${arrestID}`, data);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating arrest record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

const initialState = {
  arrests: [],
  currentClientID: null,
  status: "idle",
  error: null,
};

const arrestSlice = createSlice({
  name: "arrests",
  initialState,
  reducers: {
    // ✅ NEW: Wipe the arrests list when the selected client changes.
    setCurrentClient(state, action) {
      const newClientID = action.payload;
      if (newClientID !== state.currentClientID) {
        state.currentClientID = newClientID;
        state.arrests         = [];
        state.status          = "idle";
        state.error           = null;
      }
    },
    clearArrestData(state) {
      state.arrests = [];
      state.status = "idle";
      state.error = null;
    },
    setArrestData(state, action) {
      state.arrests = action.payload || [];
    },
    addArrestLocal(state, action) {
      state.arrests.push({
        ...action.payload,
        arrestID: action.payload.arrestID || Date.now(),
        createdAt: action.payload.createdAt || new Date().toISOString()
      });
    },
    updateArrestLocal(state, action) {
      const index = state.arrests.findIndex(arrest => arrest.arrestID === action.payload.arrestID);
      if (index !== -1) {
        state.arrests[index] = action.payload;
      }
    },
    removeArrestLocal(state, action) {
      state.arrests = state.arrests.filter(arrest => arrest.arrestID !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch arrest data
      .addCase(fetchArrestData.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchArrestData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.arrests = action.payload || [];
        state.error = null;
      })
      .addCase(fetchArrestData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.arrests = [];
      })
      // Save arrest data
      .addCase(saveArrestData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(saveArrestData.fulfilled, (state, action) => {
        state.status = "succeeded";
        const existingIndex = state.arrests.findIndex(arrest => arrest.arrestID === action.payload.arrestID);
        if (existingIndex === -1) {
          state.arrests.push(action.payload);
        } else {
          state.arrests[existingIndex] = action.payload;
        }
        state.error = null;
      })
      .addCase(saveArrestData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Delete arrest record
      .addCase(deleteArrestRecord.fulfilled, (state, action) => {
        state.arrests = state.arrests.filter(arrest => arrest.arrestID !== action.payload);
      })
      // Update arrest record
      .addCase(updateArrestData.fulfilled, (state, action) => {
        const index = state.arrests.findIndex(a => a.arrestID === action.payload.arrestID);
        if (index !== -1) {
          state.arrests[index] = action.payload;
        }
        state.error = null;
      });
  },
});

export const {
  setCurrentClient,
  clearArrestData,
  setArrestData,
  addArrestLocal,
  updateArrestLocal,
  removeArrestLocal,
} = arrestSlice.actions;

export default arrestSlice.reducer;