// src/store/slices/arrestActions.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

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
    id: 1,
    clientID: 'mock-123',
    date: '2019-05-20',
    charge: 'Public intoxication',
    misdemeanorOrFelony: 'M',
    location: 'Los Angeles, CA',
    timeServed: '1 day',
    result: 'Fine paid',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: 2,
    clientID: 'mock-123',
    date: '2018-03-15',
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
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock arrest data for", clientID);
      return MOCK_ARREST_DATA;
    }

    try {
      const response = await axios.get(`${API_URL}/api/arrests/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching arrest data:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save arrest data (single record)
export const saveArrestData = createAsyncThunk(
  "arrests/saveArrestData",
  async (arrestData, thunkAPI) => {
    const { clientId, ...data } = arrestData;
    
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientId)) {
      console.log("🔧 Mock mode: Simulating arrest data save for", clientId);
      return { 
        ...data, 
        id: Date.now(), 
        clientID: clientId,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/arrests/${clientId}`, {
        ...data,
        createdAt: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error saving arrest data:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to add new arrest record
export const addArrestRecord = createAsyncThunk(
  "arrests/addArrestRecord",
  async ({ clientId, arrestRecord }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      console.log("🔧 Mock mode: Adding arrest record for", clientId);
      return { 
        ...arrestRecord, 
        id: Date.now(), 
        clientID: clientId,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/arrests/${clientId}/records`, arrestRecord);
      return response.data;
    } catch (error) {
      console.error("❌ Error adding arrest record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Add arrest record failed");
    }
  }
);

// 🔄 Async thunk to update arrest record
export const updateArrestRecord = createAsyncThunk(
  "arrests/updateArrestRecord",
  async ({ clientId, arrestId, updateData }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      console.log("🔧 Mock mode: Updating arrest record for", clientId);
      return { id: arrestId, ...updateData };
    }

    try {
      const response = await axios.put(`${API_URL}/api/arrests/${clientId}/records/${arrestId}`, updateData);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating arrest record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update arrest record failed");
    }
  }
);

// 🔄 Async thunk to delete arrest record
export const deleteArrestRecord = createAsyncThunk(
  "arrests/deleteArrestRecord",
  async ({ clientId, arrestId }, thunkAPI) => {
    if (shouldUseMockData(clientId)) {
      console.log("🔧 Mock mode: Deleting arrest record for", clientId);
      return arrestId;
    }

    try {
      await axios.delete(`${API_URL}/api/arrests/${clientId}/records/${arrestId}`);
      return arrestId;
    } catch (error) {
      console.error("❌ Error deleting arrest record:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete arrest record failed");
    }
  }
);

const initialState = {
  arrests: [],
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

const arrestSlice = createSlice({
  name: "arrests",
  initialState,
  reducers: {
    clearArrestData(state) {
      state.arrests = [];
      state.status = "idle";
      state.error = null;
    },
    setArrestData(state, action) {
      state.arrests = action.payload;
    },
    addArrestLocal(state, action) {
      state.arrests.push({
        ...action.payload,
        id: Date.now(),
        createdAt: new Date().toISOString()
      });
    },
    updateArrestLocal(state, action) {
      const index = state.arrests.findIndex(arrest => arrest.id === action.payload.id);
      if (index !== -1) {
        state.arrests[index] = action.payload;
      }
    },
    removeArrestLocal(state, action) {
      state.arrests = state.arrests.filter(arrest => arrest.id !== action.payload);
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
        state.arrests = action.payload;
        state.error = null;
      })
      .addCase(fetchArrestData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Save arrest data
      .addCase(saveArrestData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(saveArrestData.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Add to arrests array if not already present
        const existingIndex = state.arrests.findIndex(arrest => arrest.id === action.payload.id);
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
      // Add arrest record
      .addCase(addArrestRecord.fulfilled, (state, action) => {
        state.arrests.push(action.payload);
      })
      // Update arrest record
      .addCase(updateArrestRecord.fulfilled, (state, action) => {
        const index = state.arrests.findIndex(arrest => arrest.id === action.payload.id);
        if (index !== -1) {
          state.arrests[index] = action.payload;
        }
      })
      // Delete arrest record
      .addCase(deleteArrestRecord.fulfilled, (state, action) => {
        state.arrests = state.arrests.filter(arrest => arrest.id !== action.payload);
      });
  },
});

export const {
  clearArrestData,
  setArrestData,
  addArrestLocal,
  updateArrestLocal,
  removeArrestLocal,
} = arrestSlice.actions;

// ✅ DEFAULT EXPORT - This is what was missing!
export default arrestSlice.reducer;