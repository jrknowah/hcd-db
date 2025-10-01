import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ✅ API Base URL - Update this to match your backend
const API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : '';

// ✅ Async Thunks for API Calls

// Fetch face sheet data
export const fetchFaceSheet = createAsyncThunk(
    'section6/fetchFaceSheet',
    async (clientID, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        // Return mock data if enabled
        if (section6.useMockData) {
            return {
                caseNumber: "CS-2025-0717-001",
                caseStatus: "Active",
                admissionDate: "2025-07-10",
                expectedDischargeDate: "2025-07-25",
                actualDischargeDate: null,
                primaryCaseManager: "Sarah Johnson, LCSW",
                backupCaseManager: "Michael Chen, MSW",
                caseManagerAssignedDate: "2025-07-10",
                completionPercentage: 78.5,
                riskLevel: "Medium",
                priorityLevel: "High",
                caseComplexityScore: 7,
                lengthOfStay: 7,
                targetLOS: 10,
                satisfactionScore: 4.2,
                documentationComplete: false,
                missingDocuments: "Discharge summary, Final assessment",
                lastDocumentUpdate: "2025-07-16T14:30:00Z",
                createdBy: "admin@hospital.com",
                createdAt: "2025-07-10T08:00:00Z",
                updatedBy: "nurse@hospital.com",
                updatedAt: "2025-07-17T10:30:00Z"
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/facesheet`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // No face sheet found
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch face sheet failed:', error);
            return rejectWithValue(error.message || 'Failed to fetch face sheet data');
        }
    }
);

// Fetch case status
export const fetchCaseStatus = createAsyncThunk(
    'section6/fetchCaseStatus',
    async (clientID, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        if (section6.useMockData) {
            return {
                currentStatus: "Active",
                statusHistory: [
                    { status: "Pending", date: "2025-07-09", changedBy: "admin@hospital.com" },
                    { status: "Active", date: "2025-07-10", changedBy: "nurse@hospital.com" }
                ],
                nextReviewDate: "2025-07-20",
                lastStatusUpdate: "2025-07-10T08:00:00Z"
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/status`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch case status');
        }
    }
);

// Fetch case timeline
export const fetchCaseTimeline = createAsyncThunk(
    'section6/fetchCaseTimeline',
    async (clientID, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        if (section6.useMockData) {
            return [
                {
                    id: 1,
                    title: "Case Opened",
                    description: "Initial case assessment and documentation started",
                    date: "2025-07-10T08:00:00Z",
                    type: "milestone",
                    completed: true,
                    completedBy: "admin@hospital.com"
                },
                {
                    id: 2,
                    title: "Initial Assessment Completed",
                    description: "Comprehensive initial assessment documented",
                    date: "2025-07-10T14:30:00Z",
                    type: "milestone",
                    completed: true,
                    completedBy: "nurse@hospital.com"
                },
                {
                    id: 3,
                    title: "Care Plan Development",
                    description: "Individualized care plan created and approved",
                    date: "2025-07-11T10:00:00Z",
                    type: "milestone",
                    completed: true,
                    completedBy: "sarah.johnson@hospital.com"
                },
                {
                    id: 4,
                    title: "Service Coordination",
                    description: "External services coordinated and scheduled",
                    date: "2025-07-12T16:00:00Z",
                    type: "milestone",
                    completed: true,
                    completedBy: "sarah.johnson@hospital.com"
                },
                {
                    id: 5,
                    title: "Family Conference",
                    description: "Family meeting to discuss care plan and goals",
                    date: "2025-07-20T14:00:00Z",
                    type: "milestone",
                    completed: false,
                    required: true
                },
                {
                    id: 6,
                    title: "Discharge Planning",
                    description: "Comprehensive discharge planning and coordination",
                    date: "2025-07-22T10:00:00Z",
                    type: "milestone",
                    completed: false,
                    required: true
                }
            ];
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/timeline`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch case timeline');
        }
    }
);

// Fetch case metrics
export const fetchCaseMetrics = createAsyncThunk(
    'section6/fetchCaseMetrics',
    async (clientID, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        if (section6.useMockData) {
            return {
                totalMilestones: 6,
                completedMilestones: 4,
                pendingMilestones: 2,
                overdueTasks: 0,
                documentsComplete: 15,
                documentsTotal: 20,
                documentationPercentage: 75.0,
                satisfactionScore: 4.2,
                averageResponseTime: 2.5, // hours
                caseEfficiencyScore: 8.5,
                qualityScore: 9.2,
                lastMetricsUpdate: "2025-07-17T10:30:00Z"
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/metrics`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch case metrics');
        }
    }
);

// Save face sheet data
export const saveFaceSheet = createAsyncThunk(
    'section6/saveFaceSheet',
    async ({ clientID, faceSheetData }, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        // Return mock success if enabled
        if (section6.useMockData) {
            return {
                ...faceSheetData,
                faceSheetID: 'MOCK-FS-' + Date.now(),
                updatedAt: new Date().toISOString()
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/facesheet`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(faceSheetData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Save face sheet failed:', error);
            return rejectWithValue(error.message || 'Failed to save face sheet data');
        }
    }
);

// Update case status
export const updateCaseStatus = createAsyncThunk(
    'section6/updateCaseStatus',
    async ({ clientID, newStatus, reason }, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        if (section6.useMockData) {
            return {
                clientID,
                newStatus,
                reason,
                updatedAt: new Date().toISOString(),
                updatedBy: 'mock@hospital.com'
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newStatus, reason }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update case status');
        }
    }
);

// Update milestone completion
export const updateMilestone = createAsyncThunk(
    'section6/updateMilestone',
    async ({ clientID, milestoneID, completed, notes }, { rejectWithValue, getState }) => {
        const { section6 } = getState();
        
        if (section6.useMockData) {
            return {
                milestoneID,
                completed,
                notes,
                completedAt: completed ? new Date().toISOString() : null,
                completedBy: completed ? 'mock@hospital.com' : null
            };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/section6/${clientID}/milestone/${milestoneID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completed, notes }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to update milestone');
        }
    }
);

// ✅ Initial State
const initialState = {
    // Face Sheet data
    faceSheet: {},
    faceSheetLoading: false,
    faceSheetError: null,
    
    // Case status
    caseStatus: {},
    caseStatusLoading: false,
    caseStatusError: null,
    
    // Case timeline
    caseTimeline: [],
    timelineLoading: false,
    timelineError: null,
    
    // Case metrics
    caseMetrics: {},
    metricsLoading: false,
    metricsError: null,
    
    // Save states
    saving: false,
    saveError: null,
    saveSuccess: false,
    
    // UI state
    activeTab: 0,
    dashboardLoading: false,
    dashboardError: null,
    
    // Filters and settings
    timelineFilter: 'all', // 'all', 'completed', 'pending', 'overdue'
    metricsDateRange: 30, // days
    
    // Mock data flag - set to true for development without backend
    useMockData: process.env.NODE_ENV === 'development' ? true : false,
    
    // Activity tracking
    lastActivity: null,
    autoRefresh: false,
    refreshInterval: 300000 // 5 minutes
};

// ✅ Create Slice
const section6Slice = createSlice({
    name: 'section6',
    initialState,
    reducers: {
        // Clear all errors
        clearErrors: (state) => {
            state.faceSheetError = null;
            state.caseStatusError = null;
            state.timelineError = null;
            state.metricsError = null;
            state.saveError = null;
            state.dashboardError = null;
        },
        
        // Clear save success flag
        clearSaveSuccess: (state) => {
            state.saveSuccess = false;
        },
        
        // Set active tab
        setActiveTab: (state, action) => {
            state.activeTab = action.payload;
        },
        
        // Set timeline filter
        setTimelineFilter: (state, action) => {
            state.timelineFilter = action.payload;
        },
        
        // Set metrics date range
        setMetricsDateRange: (state, action) => {
            state.metricsDateRange = action.payload;
        },
        
        // Toggle mock data
        toggleMockData: (state) => {
            state.useMockData = !state.useMockData;
        },
        
        // Set mock data flag
        setMockData: (state, action) => {
            state.useMockData = action.payload;
        },
        
        // Toggle auto refresh
        toggleAutoRefresh: (state) => {
            state.autoRefresh = !state.autoRefresh;
        },
        
        // Update activity tracking
        updateActivity: (state) => {
            state.lastActivity = new Date().toISOString();
        },
        
        // Update face sheet locally (for optimistic updates)
        updateFaceSheetLocal: (state, action) => {
            state.faceSheet = { ...state.faceSheet, ...action.payload };
            state.lastActivity = new Date().toISOString();
        }
    },
    extraReducers: (builder) => {
        builder
            // ✅ Fetch Face Sheet
            .addCase(fetchFaceSheet.pending, (state) => {
                state.faceSheetLoading = true;
                state.faceSheetError = null;
            })
            .addCase(fetchFaceSheet.fulfilled, (state, action) => {
                state.faceSheetLoading = false;
                state.faceSheet = action.payload || {};
                state.faceSheetError = null;
            })
            .addCase(fetchFaceSheet.rejected, (state, action) => {
                state.faceSheetLoading = false;
                state.faceSheetError = action.payload || 'Failed to fetch face sheet data';
            })
            
            // ✅ Fetch Case Status
            .addCase(fetchCaseStatus.pending, (state) => {
                state.caseStatusLoading = true;
                state.caseStatusError = null;
            })
            .addCase(fetchCaseStatus.fulfilled, (state, action) => {
                state.caseStatusLoading = false;
                state.caseStatus = action.payload || {};
                state.caseStatusError = null;
            })
            .addCase(fetchCaseStatus.rejected, (state, action) => {
                state.caseStatusLoading = false;
                state.caseStatusError = action.payload || 'Failed to fetch case status';
            })
            
            // ✅ Fetch Case Timeline
            .addCase(fetchCaseTimeline.pending, (state) => {
                state.timelineLoading = true;
                state.timelineError = null;
            })
            .addCase(fetchCaseTimeline.fulfilled, (state, action) => {
                state.timelineLoading = false;
                state.caseTimeline = action.payload || [];
                state.timelineError = null;
            })
            .addCase(fetchCaseTimeline.rejected, (state, action) => {
                state.timelineLoading = false;
                state.timelineError = action.payload || 'Failed to fetch case timeline';
            })
            
            // ✅ Fetch Case Metrics
            .addCase(fetchCaseMetrics.pending, (state) => {
                state.metricsLoading = true;
                state.metricsError = null;
            })
            .addCase(fetchCaseMetrics.fulfilled, (state, action) => {
                state.metricsLoading = false;
                state.caseMetrics = action.payload || {};
                state.metricsError = null;
            })
            .addCase(fetchCaseMetrics.rejected, (state, action) => {
                state.metricsLoading = false;
                state.metricsError = action.payload || 'Failed to fetch case metrics';
            })
            
            // ✅ Save Face Sheet
            .addCase(saveFaceSheet.pending, (state) => {
                state.saving = true;
                state.saveError = null;
                state.saveSuccess = false;
            })
            .addCase(saveFaceSheet.fulfilled, (state, action) => {
                state.saving = false;
                state.faceSheet = action.payload;
                state.saveSuccess = true;
                state.saveError = null;
            })
            .addCase(saveFaceSheet.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload || 'Failed to save face sheet data';
                state.saveSuccess = false;
            })
            
            // ✅ Update Case Status
            .addCase(updateCaseStatus.pending, (state) => {
                state.saving = true;
                state.saveError = null;
            })
            .addCase(updateCaseStatus.fulfilled, (state, action) => {
                state.saving = false;
                state.caseStatus = { ...state.caseStatus, ...action.payload };
                state.saveError = null;
            })
            .addCase(updateCaseStatus.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload || 'Failed to update case status';
            })
            
            // ✅ Update Milestone
            .addCase(updateMilestone.pending, (state) => {
                state.saving = true;
                state.saveError = null;
            })
            .addCase(updateMilestone.fulfilled, (state, action) => {
                state.saving = false;
                // Update the specific milestone in the timeline
                const { milestoneID, completed, completedAt, completedBy } = action.payload;
                const milestoneIndex = state.caseTimeline.findIndex(item => item.id === milestoneID);
                if (milestoneIndex !== -1) {
                    state.caseTimeline[milestoneIndex] = {
                        ...state.caseTimeline[milestoneIndex],
                        completed,
                        completedAt,
                        completedBy
                    };
                }
                state.saveError = null;
            })
            .addCase(updateMilestone.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload || 'Failed to update milestone';
            });
    }
});

// ✅ Export Actions
export const {
    clearErrors,
    clearSaveSuccess,
    setActiveTab,
    setTimelineFilter,
    setMetricsDateRange,
    toggleMockData,
    setMockData,
    toggleAutoRefresh,
    updateActivity,
    updateFaceSheetLocal
} = section6Slice.actions;

// ✅ Selectors
export const selectFaceSheet = (state) => state.section6.faceSheet;
export const selectFaceSheetLoading = (state) => state.section6.faceSheetLoading;
export const selectFaceSheetError = (state) => state.section6.faceSheetError;
export const selectCaseStatus = (state) => state.section6.caseStatus;
export const selectCaseTimeline = (state) => state.section6.caseTimeline;
export const selectCaseMetrics = (state) => state.section6.caseMetrics;
export const selectActiveTab = (state) => state.section6.activeTab;
export const selectSaving = (state) => state.section6.saving;
export const selectSaveSuccess = (state) => state.section6.saveSuccess;
export const selectUseMockData = (state) => state.section6.useMockData;

// ✅ Export Reducer
export default section6Slice.reducer;