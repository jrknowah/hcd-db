// src/store/apps/notes/idtNursingSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// Mock data for development
const MOCK_IDT_NURSING = {
  clientID: 'mock-123',
  idtNursingAppointYN: "Client has been attending most appointments regularly. Missed 2 appointments last month due to transportation issues. Shows good motivation to attend when transportation is available.",
  idtNursingAppoint: "Focus on cardiology follow-up appointment next week and continuing physical therapy sessions twice weekly. Client is particularly motivated to attend PT sessions.",
  idtNursingProb: "Primary barriers include: 1) Transportation challenges for medical appointments, 2) Occasional anxiety about medical procedures, 3) Medication side effects causing morning fatigue.",
  idtNursingGoal: "Client's goal is to improve medication compliance to 95% or higher, attend all scheduled PT sessions, and develop effective coping strategies for medical anxiety. Goal has been modified from initial assessment to include anxiety management.",
  idtNursingCompliant: "Current medication compliance is approximately 85%. Client occasionally skips evening medication dose due to forgetfulness. Therapy attendance is good at 90% - only missed sessions due to transportation.",
  idtNursingInfo: "Client reports feeling more confident about self-care activities. Family support system is strong with daughter providing transportation assistance. Client expresses willingness to use medication reminder app.",
  goalStatus: "Active",
  goalPriority: "High",
  goalTargetDate: "2025-09-01",
  complianceScore: 7
};

const MOCK_SUMMARY = {
  totalNotes: 3,
  currentGoals: 2,
  averageCompliance: 7.5,
  goalsAchieved: 1,
  lastAssessment: "2025-07-16",
  appointmentAttendance: 85,
  complianceTrend: "Improving"
};

const MOCK_GOALS = [
  {
    goalID: 1,
    goalDescription: "Improve medication compliance to 95%",
    goalStatus: "Active",
    goalPriority: "High",
    goalTargetDate: "2025-09-01",
    progress: 75,
    createdAt: "2025-06-15"
  },
  {
    goalID: 2,
    goalDescription: "Attend all scheduled PT sessions",
    goalStatus: "Active",
    goalPriority: "Medium",
    goalTargetDate: "2025-08-15",
    progress: 90,
    createdAt: "2025-06-20"
  }
];

const MOCK_COMPLIANCE = [
  { date: "2025-07-16", score: 8, type: "Medication" },
  { date: "2025-07-15", score: 7, type: "Therapy" },
  { date: "2025-07-14", score: 6, type: "Medication" },
  { date: "2025-07-13", score: 9, type: "Therapy" },
  { date: "2025-07-12", score: 7, type: "Medication" }
];

// ===== ASYNC THUNKS (MUST BE DEFINED BEFORE SLICE) =====

// 🔄 Async thunk to fetch IDT nursing note
export const fetchIDTNoteNursing = createAsyncThunk(
  "idtNursing/fetchIDTNoteNursing",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock IDT nursing data for", clientID);
      return MOCK_IDT_NURSING;
    }

    try {
      const response = await axios.get(`${API_URL}/api/idt-nursing/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching IDT nursing note:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save IDT nursing note
export const saveIDTNoteNursing = createAsyncThunk(
  "idtNursing/saveIDTNoteNursing",
  async (idtData, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(idtData.clientID)) {
      console.log("🔧 Mock mode: Simulating IDT nursing save for", idtData.clientID);
      return {
        ...idtData,
        idtNursingID: Date.now(),
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/idt-nursing/${idtData.clientID}`, idtData);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving IDT nursing note:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to fetch IDT summary
export const fetchIDTSummary = createAsyncThunk(
  "idtNursing/fetchIDTSummary",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock IDT summary for", clientID);
      return MOCK_SUMMARY;
    }

    try {
      const response = await axios.get(`${API_URL}/api/idt-nursing/${clientID}/summary`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching IDT summary:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 🎯 Async thunk to fetch goals
export const fetchGoals = createAsyncThunk(
  "idtNursing/fetchGoals",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock goals for", clientID);
      return MOCK_GOALS;
    }

    try {
      const response = await axios.get(`${API_URL}/api/idt-nursing/${clientID}/goals`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching goals:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 📊 Async thunk to fetch compliance history
export const fetchComplianceHistory = createAsyncThunk(
  "idtNursing/fetchComplianceHistory",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock compliance history for", clientID);
      return MOCK_COMPLIANCE;
    }

    try {
      const response = await axios.get(`${API_URL}/api/idt-nursing/${clientID}/compliance`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching compliance history:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// ✏️ Async thunk to update IDT nursing note
export const updateIDTNoteNursing = createAsyncThunk(
  "idtNursing/updateIDTNoteNursing",
  async ({ idtNursingID, updatedData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Simulating IDT nursing update for", idtNursingID);
      return {
        idtNursingID,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(`${API_URL}/api/idt-nursing/${idtNursingID}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating IDT nursing note:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

// 🗑️ Async thunk to delete IDT nursing note
export const deleteIDTNoteNursing = createAsyncThunk(
  "idtNursing/deleteIDTNoteNursing",
  async (idtNursingID, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Simulating IDT nursing delete for", idtNursingID);
      return idtNursingID;
    }

    try {
      await axios.delete(`${API_URL}/api/idt-nursing/${idtNursingID}`);
      return idtNursingID;
    } catch (error) {
      console.error("❌ Error deleting IDT nursing note:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

// ===== INITIAL STATE =====

const initialState = {
  // Main IDT data
  data: {},
  loading: false,
  error: null,
  
  // Summary/statistics
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Goal tracking
  goals: [],
  goalsLoading: false,
  goalsError: null,
  
  // Compliance history
  compliance: [],
  complianceLoading: false,
  complianceError: null,
  
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

const idtNursingSlice = createSlice({
  name: "idtNursing",
  initialState,
  reducers: {
    clearIDTError(state) {
      state.error = null;
      state.saveError = null;
      state.updateError = null;
      state.deleteError = null;
      state.summaryError = null;
      state.goalsError = null;
      state.complianceError = null;
    },
    
    clearIDTSuccess(state) {
      state.saveSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
    },
    
    resetIDTState(state) {
      return initialState;
    },
    
    // Mock data management
    setMockData(state, action) {
      const { idtData, summary, goals, compliance } = action.payload;
      if (idtData) {
        state.data = idtData;
      }
      if (summary) {
        state.summary = summary;
      }
      if (goals) {
        state.goals = goals;
      }
      if (compliance) {
        state.compliance = compliance;
      }
      // Clear loading states
      state.loading = false;
      state.summaryLoading = false;
      state.goalsLoading = false;
      state.complianceLoading = false;
      state.saving = false;
      state.updating = false;
      state.deleting = false;
      // Clear error states
      state.error = null;
      state.summaryError = null;
      state.goalsError = null;
      state.complianceError = null;
      state.saveError = null;
      state.updateError = null;
      state.deleteError = null;
    },
    
    // Local state updates for optimistic updates
    updateIDTLocal(state, action) {
      state.data = { ...state.data, ...action.payload };
      state.saving = false;
      state.saveSuccess = true;
      state.saveError = null;
    },
    
    updateGoalLocal(state, action) {
      const { goalID, goalData } = action.payload;
      const goalIndex = state.goals.findIndex(goal => goal.goalID === goalID);
      if (goalIndex !== -1) {
        state.goals[goalIndex] = { ...state.goals[goalIndex], ...goalData };
      }
    },
    
    addComplianceLocal(state, action) {
      state.compliance.unshift({
        ...action.payload,
        date: new Date().toISOString().split('T')[0]
      });
    },
    
    // Goal management
    addGoal(state, action) {
      state.goals.unshift({
        ...action.payload,
        goalID: Date.now(),
        createdAt: new Date().toISOString()
      });
    },
    
    updateGoalStatus(state, action) {
      const { goalID, status } = action.payload;
      const goalIndex = state.goals.findIndex(goal => goal.goalID === goalID);
      if (goalIndex !== -1) {
        state.goals[goalIndex].goalStatus = status;
        state.goals[goalIndex].updatedAt = new Date().toISOString();
      }
    },
    
    // Toggle mock data mode
    toggleMockData(state) {
      state.useMockData = !state.useMockData;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch IDT nursing note
      .addCase(fetchIDTNoteNursing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIDTNoteNursing.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchIDTNoteNursing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Save IDT nursing note
      .addCase(saveIDTNoteNursing.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(saveIDTNoteNursing.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.saveSuccess = true;
        state.saveError = null;
      })
      .addCase(saveIDTNoteNursing.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
        state.saveSuccess = false;
      })
      
      // Update IDT nursing note
      .addCase(updateIDTNoteNursing.pending, (state) => {
        state.updating = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(updateIDTNoteNursing.fulfilled, (state, action) => {
        state.updating = false;
        state.data = { ...state.data, ...action.payload };
        state.updateSuccess = true;
        state.updateError = null;
      })
      .addCase(updateIDTNoteNursing.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
        state.updateSuccess = false;
      })
      
      // Delete IDT nursing note
      .addCase(deleteIDTNoteNursing.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(deleteIDTNoteNursing.fulfilled, (state, action) => {
        state.deleting = false;
        state.data = {};
        state.deleteSuccess = true;
        state.deleteError = null;
      })
      .addCase(deleteIDTNoteNursing.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
        state.deleteSuccess = false;
      })
      
      // Fetch IDT summary
      .addCase(fetchIDTSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchIDTSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchIDTSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      })
      
      // Fetch goals
      .addCase(fetchGoals.pending, (state) => {
        state.goalsLoading = true;
        state.goalsError = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.goalsLoading = false;
        state.goals = action.payload;
        state.goalsError = null;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.goalsLoading = false;
        state.goalsError = action.payload;
      })
      
      // Fetch compliance history
      .addCase(fetchComplianceHistory.pending, (state) => {
        state.complianceLoading = true;
        state.complianceError = null;
      })
      .addCase(fetchComplianceHistory.fulfilled, (state, action) => {
        state.complianceLoading = false;
        state.compliance = action.payload;
        state.complianceError = null;
      })
      .addCase(fetchComplianceHistory.rejected, (state, action) => {
        state.complianceLoading = false;
        state.complianceError = action.payload;
      });
  },
});

// ===== EXPORTS =====

export const {
  clearIDTError,
  clearIDTSuccess,
  resetIDTState,
  setMockData,
  updateIDTLocal,
  updateGoalLocal,
  addComplianceLocal,
  addGoal,
  updateGoalStatus,
  toggleMockData
} = idtNursingSlice.actions;

// Selectors
export const selectIDTNursingData = (state) => state.idtNursing?.data || {};
export const selectIDTLoading = (state) => state.idtNursing?.loading || false;
export const selectIDTError = (state) => state.idtNursing?.error || null;
export const selectIDTSummary = (state) => state.idtNursing?.summary || {};
export const selectGoals = (state) => state.idtNursing?.goals || [];
export const selectComplianceHistory = (state) => state.idtNursing?.compliance || [];
export const selectSaveStatus = (state) => ({
  saving: state.idtNursing?.saving || false,
  saveError: state.idtNursing?.saveError || null,
  saveSuccess: state.idtNursing?.saveSuccess || false
});

// ✅ DEFAULT EXPORT
export default idtNursingSlice.reducer;