import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock data for development
const mockIDTData = {
  idtCMID: 1,
  clientID: 'CLIENT-123',
  idtMemberSituation: "Client demonstrates stable mental health with some anxiety regarding housing. Living with supportive family temporarily. Limited transportation but has bus pass. Receives SSI benefits which covers basic needs.",
  idtMemberSupport: "Strong family support system with mother and sister actively involved. Has a supportive boyfriend who visits regularly. Limited friend network but quality relationships with case workers from previous programs.",
  idtIncomeSource: "SSI Disability Benefits - $943/month",
  clientGovIssued: ["state_id", "ssn_card", "medical_card"],
  idtResources: "Can provide housing voucher assistance, transportation vouchers, mental health counseling referrals, job training programs, and benefits advocacy support.",
  idtHfhCM: "Sarah Johnson, LCSW",
  idtRecommend: "Continue mental health services, assist with permanent housing placement, provide vocational assessment for possible part-time employment opportunities.",
  clientHighEnd: "High School Diploma",
  idtGoals: "Part-time employment goal feasible within 6-8 months after housing stability achieved. Client interested in customer service or clerical work.",
  clientPayeeBarriers: "Anxiety and depression symptoms may interfere with work performance. No significant physical barriers identified.",
  clientPayeeAssistance: "Will provide job coaching, interview preparation, workplace accommodation assistance, and ongoing mental health support to maintain employment stability.",
  assessmentScore: 75.5,
  riskLevel: "Medium",
  readinessLevel: "Moderate",
  supportStrength: "Strong",
  goalsCompleted: 2,
  goalsInProgress: 3,
  goalsPending: 1,
  lastAssessmentDate: "2025-07-15",
  nextFollowUpDate: "2025-08-15",
  documentationComplete: true,
  createdBy: "test@example.com",
  createdAt: "2025-07-10T10:00:00Z",
  updatedBy: "test@example.com",
  updatedAt: "2025-07-15T14:30:00Z"
};

const mockSummary = {
  riskLevel: "Medium",
  readinessLevel: "Moderate", 
  supportStrength: "Strong",
  assessmentScore: 75.5,
  goalsCompleted: 2,
  goalsInProgress: 3,
  goalsPending: 1,
  completionPercentage: 85,
  lastUpdated: "2025-07-15"
};

// Async thunks
export const fetchIDTCaseManager = createAsyncThunk(
  'idtCaseManager/fetchIDTCaseManager',
  async (clientID, { rejectWithValue }) => {
    try {
      // Check for mock data flag in localStorage or use mock in development
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        return { ...mockIDTData, clientID };
      }

      const response = await fetch(`/api/idt-case-manager/${clientID}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No existing data
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveIDTCaseManager = createAsyncThunk(
  'idtCaseManager/saveIDTCaseManager',
  async (idtData, { rejectWithValue }) => {
    try {
      // Check for mock data flag
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { 
          ...mockIDTData, 
          ...idtData, 
          updatedAt: new Date().toISOString(),
          idtCMID: mockIDTData.idtCMID || Date.now()
        };
      }

      const response = await fetch(`/api/idt-case-manager/${idtData.clientID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(idtData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateIDTCaseManager = createAsyncThunk(
  'idtCaseManager/updateIDTCaseManager',
  async ({ idtCMID, updateData }, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { ...mockIDTData, ...updateData, updatedAt: new Date().toISOString() };
      }

      const response = await fetch(`/api/idt-case-manager/${idtCMID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchIDTSummary = createAsyncThunk(
  'idtCaseManager/fetchIDTSummary',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockSummary;
      }

      const response = await fetch(`/api/idt-case-manager/${clientID}/summary`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchIDTGoals = createAsyncThunk(
  'idtCaseManager/fetchIDTGoals',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return {
          goals: [
            { id: 1, goal: "Secure permanent housing", status: "Completed", completedDate: "2025-07-01" },
            { id: 2, goal: "Establish mental health treatment", status: "Completed", completedDate: "2025-07-05" },
            { id: 3, goal: "Obtain government benefits", status: "In Progress", targetDate: "2025-08-01" },
            { id: 4, goal: "Job readiness training", status: "In Progress", targetDate: "2025-08-15" },
            { id: 5, goal: "Employment placement", status: "In Progress", targetDate: "2025-09-01" },
            { id: 6, goal: "Financial literacy training", status: "Pending", targetDate: "2025-09-15" }
          ]
        };
      }

      const response = await fetch(`/api/idt-case-manager/${clientID}/goals`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchIDTBarriers = createAsyncThunk(
  'idtCaseManager/fetchIDTBarriers',
  async (clientID, { rejectWithValue }) => {
    try {
      const useMockData = localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development';
      
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 400));
        return {
          barriers: [
            { category: "Mental Health", severity: "Moderate", description: "Anxiety and depression symptoms" },
            { category: "Transportation", severity: "Low", description: "Limited access to reliable transportation" },
            { category: "Financial", severity: "High", description: "Limited income and resources" },
            { category: "Education", severity: "Low", description: "No post-secondary education" }
          ],
          overallRisk: "Medium"
        };
      }

      const response = await fetch(`/api/idt-case-manager/${clientID}/barriers`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Main IDT data
  data: {},
  loading: false,
  error: null,
  
  // Summary data
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Goals data
  goals: [],
  goalsLoading: false,
  goalsError: null,
  
  // Barriers data
  barriers: {},
  barriersLoading: false,
  barriersError: null,
  
  // Progress tracking
  progress: {},
  progressLoading: false,
  progressError: null,
  
  // Save states
  saving: false,
  saveError: null,
  saveSuccess: false,
  
  // UI states
  activeAccordion: 0,
  expandedAccordions: [0], // First accordion expanded by default
  
  // Mock data flag
  useMockData: localStorage.getItem('useMockData') === 'true' || process.env.NODE_ENV === 'development'
};

const idtCaseManagerSlice = createSlice({
  name: 'idtCaseManager',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.saveError = null;
      state.summaryError = null;
      state.goalsError = null;
      state.barriersError = null;
    },
    clearSaveSuccess: (state) => {
      state.saveSuccess = false;
    },
    setActiveAccordion: (state, action) => {
      state.activeAccordion = action.payload;
    },
    toggleAccordion: (state, action) => {
      const accordion = action.payload;
      if (state.expandedAccordions.includes(accordion)) {
        state.expandedAccordions = state.expandedAccordions.filter(a => a !== accordion);
      } else {
        state.expandedAccordions.push(accordion);
      }
    },
    setMockDataFlag: (state, action) => {
      state.useMockData = action.payload;
      localStorage.setItem('useMockData', action.payload.toString());
    },
    resetState: (state) => {
      return { ...initialState, useMockData: state.useMockData };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch IDT Case Manager
      .addCase(fetchIDTCaseManager.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIDTCaseManager.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload || {};
        state.error = null;
      })
      .addCase(fetchIDTCaseManager.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Save IDT Case Manager
      .addCase(saveIDTCaseManager.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(saveIDTCaseManager.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.saveSuccess = true;
        state.saveError = null;
      })
      .addCase(saveIDTCaseManager.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
        state.saveSuccess = false;
      })
      
      // Update IDT Case Manager
      .addCase(updateIDTCaseManager.pending, (state) => {
        state.saving = true;
        state.saveError = null;
      })
      .addCase(updateIDTCaseManager.fulfilled, (state, action) => {
        state.saving = false;
        state.data = action.payload;
        state.saveError = null;
      })
      .addCase(updateIDTCaseManager.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      })
      
      // Fetch IDT Summary
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
      
      // Fetch IDT Goals
      .addCase(fetchIDTGoals.pending, (state) => {
        state.goalsLoading = true;
        state.goalsError = null;
      })
      .addCase(fetchIDTGoals.fulfilled, (state, action) => {
        state.goalsLoading = false;
        state.goals = action.payload.goals || [];
        state.goalsError = null;
      })
      .addCase(fetchIDTGoals.rejected, (state, action) => {
        state.goalsLoading = false;
        state.goalsError = action.payload;
      })
      
      // Fetch IDT Barriers
      .addCase(fetchIDTBarriers.pending, (state) => {
        state.barriersLoading = true;
        state.barriersError = null;
      })
      .addCase(fetchIDTBarriers.fulfilled, (state, action) => {
        state.barriersLoading = false;
        state.barriers = action.payload;
        state.barriersError = null;
      })
      .addCase(fetchIDTBarriers.rejected, (state, action) => {
        state.barriersLoading = false;
        state.barriersError = action.payload;
      });
  },
});

export const {
  clearError,
  clearSaveSuccess,
  setActiveAccordion,
  toggleAccordion,
  setMockDataFlag,
  resetState
} = idtCaseManagerSlice.actions;

export default idtCaseManagerSlice.reducer;