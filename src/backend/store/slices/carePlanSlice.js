// src/store/apps/notes/carePlanSlice.js
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

// Mock care plans data for development
const MOCK_CARE_PLANS = [
  {
    _id: 'plan-1',
    clientID: 'mock-123',
    careGoal: 'Obtain stable permanent housing',
    careSteps: '1. Complete housing application and gather required documentation\n2. Attend scheduled housing interviews and follow-ups\n3. Maintain contact with housing coordinators\n4. Prepare for move-in process',
    careClientAct: 'Attend all scheduled appointments, provide necessary documentation including ID and income verification, maintain contact with case manager, keep appointments with housing providers',
    careCmAct: 'Assist with application process and documentation, provide transportation vouchers for appointments, coordinate with housing providers and advocates, provide crisis intervention if needed',
    careOutcome: 'Client successfully housed in permanent supportive housing within 90 days, maintaining stable housing for minimum 6 months',
    status: 'In Progress',
    priority: 'High',
    targetDate: '2024-06-01',
    createdBy: 'test@example.com',
    createdAt: '2024-03-01T10:00:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2024-03-10T14:30:00Z'
  },
  {
    _id: 'plan-2',
    clientID: 'mock-123',
    careGoal: 'Improve mental health stability and symptom management',
    careSteps: '1. Establish regular psychiatric care for medication management\n2. Engage in weekly individual therapy sessions\n3. Develop and practice daily coping strategies\n4. Create crisis prevention plan',
    careClientAct: 'Take medications as prescribed daily, attend weekly therapy sessions, practice coping techniques including breathing exercises and grounding, use crisis plan when experiencing symptoms',
    careCmAct: 'Coordinate mental health services and referrals, provide transportation assistance to appointments, monitor medication compliance and side effects, provide crisis intervention as needed, advocate for appropriate services',
    careOutcome: 'Significant reduction in symptoms of depression and anxiety, improved daily functioning and self-care, decreased crisis episodes, stable medication regimen',
    status: 'Active',
    priority: 'High',
    targetDate: '2024-05-15',
    createdBy: 'test@example.com',
    createdAt: '2024-03-05T11:15:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2024-03-12T09:45:00Z'
  },
  {
    _id: 'plan-3',
    clientID: 'mock-123',
    careGoal: 'Establish sustainable income through benefits and/or employment',
    careSteps: '1. Apply for appropriate benefits (SSI/SSDI/General Relief)\n2. Explore vocational training and employment opportunities\n3. Develop job search and interview skills\n4. Connect with employment support services',
    careClientAct: 'Complete benefit applications thoroughly and on time, attend job training programs and employment workshops, actively search for employment opportunities, maintain professional appearance and behavior',
    careCmAct: 'Assist with benefit applications and appeals process, refer to vocational rehabilitation services, provide job search support and interview preparation, connect with employment specialists and job coaches',
    careOutcome: 'Client receiving sufficient benefits and/or employed with adequate income for independent living, financial stability for housing and basic needs',
    status: 'Planning',
    priority: 'Medium',
    targetDate: '2024-08-01',
    createdBy: 'test@example.com',
    createdAt: '2024-03-08T13:20:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2024-03-08T13:20:00Z'
  },
  {
    _id: 'plan-4',
    clientID: 'mock-123',
    careGoal: 'Improve physical health and access to healthcare',
    careSteps: '1. Establish primary care physician relationship\n2. Complete comprehensive health assessment\n3. Address chronic health conditions\n4. Develop health maintenance routine',
    careClientAct: 'Attend all medical appointments, follow treatment recommendations, take medications as prescribed, maintain healthy lifestyle habits including regular exercise and proper nutrition',
    careCmAct: 'Coordinate healthcare services and appointments, provide medical transportation, assist with insurance enrollment and navigation, advocate for appropriate care, monitor health status',
    careOutcome: 'Established relationship with primary care provider, improved management of chronic conditions, better overall health status, reduced emergency room visits',
    status: 'Active',
    priority: 'Medium',
    targetDate: '2024-07-01',
    createdBy: 'test@example.com',
    createdAt: '2024-03-12T15:45:00Z',
    updatedBy: 'test@example.com',
    updatedAt: '2024-03-12T15:45:00Z'
  }
];

// 🔄 Async thunk to fetch care plans
export const fetchCarePlans = createAsyncThunk(
  "carePlans/fetchCarePlans",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock care plans for", clientID);
      return MOCK_CARE_PLANS;
    }

    try {
      const response = await axios.get(`/api/care-plans/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching care plans:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to add care plan
export const addCarePlan = createAsyncThunk(
  "carePlans/addCarePlan",
  async ({ clientID, carePlanData, user }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating care plan save for", clientID);
      return {
        _id: `plan-${Date.now()}`,
        clientID,
        ...carePlanData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`/api/care-plans/${clientID}`, {
        ...carePlanData,
        createdBy: user?.email || "unknown",
        createdAt: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error adding care plan:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Add failed");
    }
  }
);

// ✏️ Async thunk to edit care plan
export const editCarePlan = createAsyncThunk(
  "carePlans/editCarePlan",
  async ({ id, updatedData, user }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    const clientID = updatedData.clientID || 'mock-123';
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating care plan update for", id);
      return {
        _id: id,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(`/api/care-plans/${id}`, {
        ...updatedData,
        updatedBy: user?.email || "unknown",
        updatedAt: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error editing care plan:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Edit failed");
    }
  }
);

// 🗑️ Async thunk to delete care plan
export const deleteCarePlan = createAsyncThunk(
  "carePlans/deleteCarePlan",
  async ({ id, user }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Simulating care plan delete for", id);
      return id;
    }

    try {
      await axios.delete(`/api/care-plans/${id}`, {
        data: { deletedBy: user?.email || "unknown" }
      });
      return id;
    } catch (error) {
      console.error("❌ Error deleting care plan:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

// 📊 Async thunk to update care plan status
export const updateCarePlanStatus = createAsyncThunk(
  "carePlans/updateCarePlanStatus",
  async ({ id, status, user }, thunkAPI) => {
    if (shouldUseMockData('mock-123')) {
      return { _id: id, status, updatedAt: new Date().toISOString() };
    }

    try {
      const response = await axios.patch(`/api/care-plans/${id}/status`, {
        status,
        updatedBy: user?.email || "unknown",
        updatedAt: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      console.error("❌ Error updating care plan status:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Status update failed");
    }
  }
);

const initialState = {
  data: [],
  status: "idle", // idle | loading | succeeded | failed
  error: null,
  lastUpdated: null,
}; 

const carePlanSlice = createSlice({
  name: "carePlans",
  initialState,
  reducers: {
    clearCarePlans(state) {
      state.data = [];
      state.status = "idle";
      state.error = null;
      state.lastUpdated = null;
    },
    setCarePlans(state, action) {
      state.data = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    addCarePlanLocal(state, action) {
      state.data.unshift({
        ...action.payload,
        _id: `plan-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      state.lastUpdated = new Date().toISOString();
    },
    updateCarePlanLocal(state, action) {
      const index = state.data.findIndex(plan => plan._id === action.payload._id);
      if (index !== -1) {
        state.data[index] = {
          ...state.data[index],
          ...action.payload,
          updatedAt: new Date().toISOString()
        };
      }
      state.lastUpdated = new Date().toISOString();
    },
    removeCarePlanLocal(state, action) {
      state.data = state.data.filter(plan => plan._id !== action.payload);
      state.lastUpdated = new Date().toISOString();
    },
    updateCarePlanStatusLocal(state, action) {
      const { id, status } = action.payload;
      const index = state.data.findIndex(plan => plan._id === id);
      if (index !== -1) {
        state.data[index].status = status;
        state.data[index].updatedAt = new Date().toISOString();
      }
      state.lastUpdated = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch care plans
      .addCase(fetchCarePlans.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCarePlans.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchCarePlans.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Add care plan
      .addCase(addCarePlan.pending, (state) => {
        state.status = "loading";
      })
      .addCase(addCarePlan.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data.unshift(action.payload); // Add to beginning of array
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(addCarePlan.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Edit care plan
      .addCase(editCarePlan.pending, (state) => {
        state.status = "loading";
      })
      .addCase(editCarePlan.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.data.findIndex(plan => plan._id === action.payload._id);
        if (index !== -1) {
          state.data[index] = action.payload;
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(editCarePlan.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Delete care plan
      .addCase(deleteCarePlan.fulfilled, (state, action) => {
        state.data = state.data.filter(plan => plan._id !== action.payload);
        state.lastUpdated = new Date().toISOString();
      })
      // Update care plan status
      .addCase(updateCarePlanStatus.fulfilled, (state, action) => {
        const index = state.data.findIndex(plan => plan._id === action.payload._id);
        if (index !== -1) {
          state.data[index] = { ...state.data[index], ...action.payload };
        }
        state.lastUpdated = new Date().toISOString();
      });
  },
});

export const {
  clearCarePlans,
  setCarePlans,
  addCarePlanLocal,
  updateCarePlanLocal,
  removeCarePlanLocal,
  updateCarePlanStatusLocal,
} = carePlanSlice.actions;

// ✅ DEFAULT EXPORT
export default carePlanSlice.reducer;