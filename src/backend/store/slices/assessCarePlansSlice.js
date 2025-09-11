import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const HCD_API = `${import.meta.env.VITE_API_URL}`; // Adjust to your actual auth endpoint

// Mock data for development
const mockAssessmentData = {
    assessmentID: "ACP-001",
    clientID: "CLIENT-123",
    assessmentNumber: "ACP-2025-0717-001",
    assessmentStatus: "In Progress",
    startDate: "2025-07-10",
    expectedCompletionDate: "2025-07-25",
    primaryAssessor: "Dr. Maria Rodriguez, PhD",
    completionPercentage: 65.0,
    riskLevel: "Medium",
    priorityLevel: "High",
    complexityScore: 6,
    daysInProgress: 7,
    targetDays: 14,
    documentationComplete: false,
    assessmentType: "Comprehensive",
    createdBy: "system@example.com",
    createdAt: "2025-07-10T09:00:00Z",
    updatedBy: "dr.rodriguez@example.com",
    updatedAt: "2025-07-17T14:30:00Z" 
};

const mockAssessmentStatus = {
    currentPhase: "Mental Health Assessment",
    phaseProgress: 40,
    overallProgress: 65,
    milestonesCompleted: 2,
    totalMilestones: 4,
    daysRemaining: 8,
    onTrack: true,
    blockers: [],
    nextMilestone: "Re-Assessment",
    nextMilestoneDate: "2025-07-20"
};

const mockAssessmentMetrics = {
    totalAssessments: 4,
    completedAssessments: 2,
    overdueAssessments: 0,
    documentsComplete: 8,
    documentsTotal: 12,
    assessmentScore: 7.8,
    lastUpdate: "2025-07-17T14:30:00Z",
    riskFactors: 2,
    strengthsIdentified: 5,
    averageCompletionTime: 12,
    clientSatisfactionScore: 4.2,
    assessorWorkload: "Medium"
};

const mockMilestones = [
    { 
        id: 1, 
        title: "Bio-Social Assessment", 
        completed: true, 
        completedDate: "2025-07-11",
        required: true,
        description: "Financial, employment, and housing assessment",
        estimatedHours: 2,
        actualHours: 1.5
    },
    { 
        id: 2, 
        title: "Mental Health Assessment", 
        completed: true, 
        completedDate: "2025-07-13",
        required: true,
        description: "Psychiatric evaluation and mental status exam",
        estimatedHours: 3,
        actualHours: 2.8
    },
    { 
        id: 3, 
        title: "Re-Assessment", 
        completed: false, 
        dueDate: "2025-07-20",
        required: true,
        description: "Follow-up assessment and progress evaluation",
        estimatedHours: 2,
        actualHours: null
    },
    { 
        id: 4, 
        title: "Section 3 Archive", 
        completed: false, 
        dueDate: "2025-07-24",
        required: false,
        description: "Document archival and final documentation",
        estimatedHours: 1,
        actualHours: null
    }
];

// ✅ Async Thunks for API calls
export const fetchAssessmentData = createAsyncThunk(
    'assessCarePlans/fetchAssessmentData',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/assessment-care-plans/${clientID}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching assessment data:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch assessment data');
        }
    }
);

export const fetchAssessmentStatus = createAsyncThunk(
    'assessCarePlans/fetchAssessmentStatus',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/assessment-care-plans/${clientID}/status`);
            return response.data;
        } catch (error) {
            console.error('Error fetching assessment status:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch assessment status');
        }
    }
);

export const fetchAssessmentMetrics = createAsyncThunk(
    'assessCarePlans/fetchAssessmentMetrics',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/assessment-care-plans/${clientID}/metrics`);
            return response.data;
        } catch (error) {
            console.error('Error fetching assessment metrics:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch assessment metrics');
        }
    }
);

export const fetchAssessmentMilestones = createAsyncThunk(
    'assessCarePlans/fetchAssessmentMilestones',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/assessment-care-plans/${clientID}/milestones`);
            return response.data;
        } catch (error) {
            console.error('Error fetching assessment milestones:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch assessment milestones');
        }
    }
);

export const saveAssessmentData = createAsyncThunk(
    'assessCarePlans/saveAssessmentData',
    async ({ clientID, assessmentData }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${HCD_API}/api/assessment-care-plans/${clientID}`, assessmentData);
            return response.data;
        } catch (error) {
            console.error('Error saving assessment data:', error);
            return rejectWithValue(error.response?.data || 'Failed to save assessment data');
        }
    }
);

export const updateAssessmentStatus = createAsyncThunk(
    'assessCarePlans/updateAssessmentStatus',
    async ({ assessmentID, statusData }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${HCD_API}/api/assessment-care-plans/assessment/${assessmentID}/status`, statusData);
            return response.data;
        } catch (error) {
            console.error('Error updating assessment status:', error);
            return rejectWithValue(error.response?.data || 'Failed to update assessment status');
        }
    }
);

export const completeMilestone = createAsyncThunk(
    'assessCarePlans/completeMilestone',
    async ({ clientID, milestoneID, completionData }, { rejectWithValue }) => {
        try {
            const response = await axios.put(
                `${HCD_API}/api/assessment-care-plans/${clientID}/milestones/${milestoneID}/complete`, 
                completionData
            );
            return response.data;
        } catch (error) {
            console.error('Error completing milestone:', error);
            return rejectWithValue(error.response?.data || 'Failed to complete milestone');
        }
    }
);

export const generateAssessmentReport = createAsyncThunk(
    'assessCarePlans/generateAssessmentReport',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/assessment-care-plans/${clientID}/report`);
            return response.data;
        } catch (error) {
            console.error('Error generating assessment report:', error);
            return rejectWithValue(error.response?.data || 'Failed to generate assessment report');
        }
    }
);

// ✅ Initial State
const initialState = {
    // Main assessment data
    assessmentData: {},
    assessmentLoading: false,
    assessmentError: null,

    // Assessment status and progress
    assessmentStatus: {},
    statusLoading: false,
    statusError: null,

    // Assessment metrics and analytics
    assessmentMetrics: {},
    metricsLoading: false,
    metricsError: null,

    // Assessment milestones
    milestones: [],
    milestonesLoading: false,
    milestonesError: null,

    // Assessment report
    assessmentReport: {},
    reportLoading: false,
    reportError: null,

    // Save operations
    saving: false,
    saveError: null,
    saveSuccess: false,

    // Update operations
    updating: false,
    updateError: null,
    updateSuccess: false,

    // Development settings
    useMockData: process.env.NODE_ENV === 'development',

    // Cache management
    lastFetched: null,
    cacheValid: false,
    cacheExpiryMinutes: 15
};

// ✅ Assessment Care Plans Slice
const assessCarePlansSlice = createSlice({
    name: 'assessCarePlans',
    initialState,
    reducers: {
        // Reset state
        resetAssessmentState: (state) => {
            return { ...initialState, useMockData: state.useMockData };
        },

        // Clear errors
        clearErrors: (state) => {
            state.assessmentError = null;
            state.statusError = null;
            state.metricsError = null;
            state.milestonesError = null;
            state.reportError = null;
            state.saveError = null;
            state.updateError = null;
        },

        // Set mock data mode
        setMockDataMode: (state, action) => {
            state.useMockData = action.payload;
        },

        // Update local milestone status
        updateLocalMilestone: (state, action) => {
            const { milestoneID, updates } = action.payload;
            const milestoneIndex = state.milestones.findIndex(m => m.id === milestoneID);
            if (milestoneIndex !== -1) {
                state.milestones[milestoneIndex] = { ...state.milestones[milestoneIndex], ...updates };
            }
        },

        // Update assessment progress
        updateAssessmentProgress: (state, action) => {
            const { completionPercentage, currentPhase } = action.payload;
            state.assessmentData.completionPercentage = completionPercentage;
            if (state.assessmentStatus) {
                state.assessmentStatus.currentPhase = currentPhase;
                state.assessmentStatus.overallProgress = completionPercentage;
            }
        },

        // Set cache validity
        setCacheValid: (state, action) => {
            state.cacheValid = action.payload;
            state.lastFetched = new Date().toISOString();
        },

        // Reset save success flag
        resetSaveSuccess: (state) => {
            state.saveSuccess = false;
            state.updateSuccess = false;
        }
    },

    extraReducers: (builder) => {
        // ✅ Fetch Assessment Data
        builder
            .addCase(fetchAssessmentData.pending, (state) => {
                state.assessmentLoading = true;
                state.assessmentError = null;
            })
            .addCase(fetchAssessmentData.fulfilled, (state, action) => {
                state.assessmentLoading = false;
                state.assessmentData = state.useMockData ? mockAssessmentData : action.payload;
                state.lastFetched = new Date().toISOString();
                state.cacheValid = true;
            })
            .addCase(fetchAssessmentData.rejected, (state, action) => {
                state.assessmentLoading = false;
                state.assessmentError = action.payload;
                // Use mock data on error in development
                if (state.useMockData) {
                    state.assessmentData = mockAssessmentData;
                }
            })

        // ✅ Fetch Assessment Status
        builder
            .addCase(fetchAssessmentStatus.pending, (state) => {
                state.statusLoading = true;
                state.statusError = null;
            })
            .addCase(fetchAssessmentStatus.fulfilled, (state, action) => {
                state.statusLoading = false;
                state.assessmentStatus = state.useMockData ? mockAssessmentStatus : action.payload;
            })
            .addCase(fetchAssessmentStatus.rejected, (state, action) => {
                state.statusLoading = false;
                state.statusError = action.payload;
                if (state.useMockData) {
                    state.assessmentStatus = mockAssessmentStatus;
                }
            })

        // ✅ Fetch Assessment Metrics
        builder
            .addCase(fetchAssessmentMetrics.pending, (state) => {
                state.metricsLoading = true;
                state.metricsError = null;
            })
            .addCase(fetchAssessmentMetrics.fulfilled, (state, action) => {
                state.metricsLoading = false;
                state.assessmentMetrics = state.useMockData ? mockAssessmentMetrics : action.payload;
            })
            .addCase(fetchAssessmentMetrics.rejected, (state, action) => {
                state.metricsLoading = false;
                state.metricsError = action.payload;
                if (state.useMockData) {
                    state.assessmentMetrics = mockAssessmentMetrics;
                }
            })

        // ✅ Fetch Assessment Milestones
        builder
            .addCase(fetchAssessmentMilestones.pending, (state) => {
                state.milestonesLoading = true;
                state.milestonesError = null;
            })
            .addCase(fetchAssessmentMilestones.fulfilled, (state, action) => {
                state.milestonesLoading = false;
                state.milestones = state.useMockData ? mockMilestones : action.payload;
            })
            .addCase(fetchAssessmentMilestones.rejected, (state, action) => {
                state.milestonesLoading = false;
                state.milestonesError = action.payload;
                if (state.useMockData) {
                    state.milestones = mockMilestones;
                }
            })

        // ✅ Save Assessment Data
        builder
            .addCase(saveAssessmentData.pending, (state) => {
                state.saving = true;
                state.saveError = null;
                state.saveSuccess = false;
            })
            .addCase(saveAssessmentData.fulfilled, (state, action) => {
                state.saving = false;
                state.saveSuccess = true;
                state.assessmentData = { ...state.assessmentData, ...action.payload };
                state.cacheValid = false; // Invalidate cache
            })
            .addCase(saveAssessmentData.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload;
            })

        // ✅ Update Assessment Status
        builder
            .addCase(updateAssessmentStatus.pending, (state) => {
                state.updating = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateAssessmentStatus.fulfilled, (state, action) => {
                state.updating = false;
                state.updateSuccess = true;
                state.assessmentStatus = { ...state.assessmentStatus, ...action.payload };
            })
            .addCase(updateAssessmentStatus.rejected, (state, action) => {
                state.updating = false;
                state.updateError = action.payload;
            })

        // ✅ Complete Milestone
        builder
            .addCase(completeMilestone.pending, (state) => {
                state.updating = true;
                state.updateError = null;
            })
            .addCase(completeMilestone.fulfilled, (state, action) => {
                state.updating = false;
                state.updateSuccess = true;
                
                // Update the specific milestone
                const milestoneIndex = state.milestones.findIndex(m => m.id === action.payload.milestoneID);
                if (milestoneIndex !== -1) {
                    state.milestones[milestoneIndex] = {
                        ...state.milestones[milestoneIndex],
                        completed: true,
                        completedDate: action.payload.completedDate,
                        actualHours: action.payload.actualHours
                    };
                }

                // Update overall progress
                const completedCount = state.milestones.filter(m => m.completed).length;
                const totalCount = state.milestones.length;
                const newProgress = Math.round((completedCount / totalCount) * 100);
                
                if (state.assessmentData) {
                    state.assessmentData.completionPercentage = newProgress;
                }
                if (state.assessmentStatus) {
                    state.assessmentStatus.overallProgress = newProgress;
                    state.assessmentStatus.milestonesCompleted = completedCount;
                }
            })
            .addCase(completeMilestone.rejected, (state, action) => {
                state.updating = false;
                state.updateError = action.payload;
            })

        // ✅ Generate Assessment Report
        builder
            .addCase(generateAssessmentReport.pending, (state) => {
                state.reportLoading = true;
                state.reportError = null;
            })
            .addCase(generateAssessmentReport.fulfilled, (state, action) => {
                state.reportLoading = false;
                state.assessmentReport = action.payload;
            })
            .addCase(generateAssessmentReport.rejected, (state, action) => {
                state.reportLoading = false;
                state.reportError = action.payload;
            });
    }
});

// ✅ Export actions
export const {
    resetAssessmentState,
    clearErrors,
    setMockDataMode,
    updateLocalMilestone,
    updateAssessmentProgress,
    setCacheValid,
    resetSaveSuccess
} = assessCarePlansSlice.actions;

// ✅ Selectors
export const selectAssessmentData = (state) => state.assessCarePlans?.assessmentData || {};
export const selectAssessmentStatus = (state) => state.assessCarePlans?.assessmentStatus || {};
export const selectAssessmentMetrics = (state) => state.assessCarePlans?.assessmentMetrics || {};
export const selectMilestones = (state) => state.assessCarePlans?.milestones || [];
export const selectAssessmentReport = (state) => state.assessCarePlans?.assessmentReport || {};

export const selectIsLoading = (state) => {
    const acp = state.assessCarePlans;
    return acp?.assessmentLoading || acp?.statusLoading || acp?.metricsLoading || acp?.milestonesLoading || false;
};

export const selectIsSaving = (state) => state.assessCarePlans?.saving || state.assessCarePlans?.updating || false;

export const selectHasErrors = (state) => {
    const acp = state.assessCarePlans;
    return !!(acp?.assessmentError || acp?.statusError || acp?.metricsError || acp?.milestonesError || acp?.saveError || acp?.updateError);
};

export const selectCompletionPercentage = (state) => {
    const milestones = selectMilestones(state);
    if (milestones.length === 0) return 0;
    
    const completed = milestones.filter(m => m.completed).length;
    return Math.round((completed / milestones.length) * 100);
};

export const selectOverdueMilestones = (state) => {
    const milestones = selectMilestones(state);
    const today = new Date();
    
    return milestones.filter(milestone => {
        if (milestone.completed || !milestone.dueDate) return false;
        return new Date(milestone.dueDate) < today;
    });
};

// ✅ Export reducer
export default assessCarePlansSlice.reducer;