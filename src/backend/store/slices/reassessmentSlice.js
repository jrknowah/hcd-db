// ====================================================================
// 1. REDUX SLICE - store/slices/reassessmentSlice.js
// ====================================================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Base API URL - adjust according to your setup
const HCD_API = '';

// Mock data for development
const mockReassessmentData = {
    reassessmentID: "RA-001",
    clientID: "CLIENT-123",
    assessmentID: "ACP-2025-0717-001",
    
    // Assessment Timeline
    dateFullAssess: "2025-01-15",
    dateLastReAssess: "2025-07-15",
    reassessmentSources: "Client interview, family input, medical records review",
    culturalCons: "Spanish-speaking client, prefers female providers",
    physicalChall: "Mobility limitations due to arthritis",
    accessIssues: "Transportation challenges, relies on public transit",
    
    // Reason for Referral
    reasonForRef: "Returning to Treatment – updates include the following: (describe below)",
    currentSymp: "Client reports increased anxiety and depression following recent housing instability. Symptoms include sleep disturbances, difficulty concentrating, and social withdrawal. Duration: 3 months. Frequency: daily episodes of anxiety lasting 2-3 hours.",
    suicHomiThou: "Updates include the following: (describe below)",
    columbiaSR: "Client denies current suicidal ideation but reports passive thoughts of death when feeling overwhelmed. No specific plan or intent. Last active ideation was 6 months ago during previous housing crisis.",
    columbiaSRComp: "Yes",
    
    // Self Harm & Medical History
    selfHarm: "No Updates",
    selfHarmSummary: "",
    psyHosp: "Updates include the following: (describe below)",
    psyHospSummary: "Brief hospitalization (3 days) in March 2025 due to severe anxiety episode. Discharged with medication adjustment and outpatient follow-up.",
    outPatSummart: "Currently receiving weekly therapy with Dr. Smith and monthly psychiatric medication management with Dr. Johnson. Good compliance with appointments.",
    traumaExp: "No Updates",
    traumaExpSummary: "",
    
    // Medications & Substance Use
    medReAssess: "Updates include the following: (describe below)",
    medReAssessSummary: "Current medications: Sertraline 100mg daily (increased from 50mg), Lorazepam 0.5mg as needed for anxiety. Reports good tolerance with minimal side effects.",
    subAbuseReAssess: "No Updates",
    subAbuseReAssessDate: null,
    subAbuseReAssessSummary: "",
    
    // Medical History
    medHistReAssess: "Updates include the following: (describe below)",
    medHistReAssessDate: "2025-06-01",
    medHistReAssessSummary: "Recent physical exam shows well-controlled diabetes and hypertension. New diagnosis of osteoarthritis affecting mobility.",
    
    // Education & Employment
    eduHistoryReAssess: "No Updates",
    eduHistoryReAssessSummary: "",
    empHistReAssess: "Updates include the following: (describe below)",
    empHistReAssessSummary: "Lost part-time retail job in May 2025 due to attendance issues related to anxiety. Currently seeking employment with flexible schedule.",
    
    // Legal & Living Situation
    legalReAssess: "No Updates",
    legalReAssessSummary: "",
    livingArrReAssess: "Updates include the following: (describe below)",
    livingArrReAssessSummary: "Recently moved to transitional housing after eviction from previous apartment. Currently in supportive housing program with case management services.",
    homelessReAssess: "No",
    homelessReAssessDate: null,
    
    // Dependent Care & Family
    depCareReAssess: "No Updates",
    depCareReAssessSummary: "",
    famReAssess: "Updates include the following: (describe below)",
    famReAssessSummary: "Increased family support from sister who moved closer. Regular contact with adult children who provide emotional support.",
    
    // Mental Status Exam (arrays of selected options)
    cmOb1: [{ label: "Well-groomed", value: "well_groomed" }], // Grooming & Hygiene
    cmOb2: [{ label: "Appropriate", value: "appropriate" }], // Eye Contact
    cmOb3: [{ label: "Normal", value: "normal" }], // Motor Activity
    cmOb4: [{ label: "Clear", value: "clear" }], // Speech
    cmOb5: [{ label: "Cooperative", value: "cooperative" }], // Interaction Style
    cmOb6: [{ label: "Anxious", value: "anxious" }], // Mood
    cmOb7: [{ label: "Congruent", value: "congruent" }], // Affect
    cmOb8: [{ label: "Goal-directed", value: "goal_directed" }], // Associations
    cmOb9: [{ label: "Impaired", value: "impaired" }], // Concentration
    cmOb10: [], // Behavioral Disturbances
    cmOb11: [], // Passive
    cmObNone: [],
    cmObvSum: "Client appears well-groomed and cooperative during interview. Speech is clear and goal-directed. Mood is anxious with congruent affect. Some impairment in concentration noted, likely related to current stressors. No behavioral disturbances observed.",
    
    // Clinical Summary
    clientStrengthReAssessSummary: "Client demonstrates good insight into mental health needs and strong motivation for treatment. Has supportive family relationships and history of medication compliance. Shows resilience in coping with housing challenges.",
    clientFormReAssessSummary: "Client presents with recurrent major depressive disorder with anxiety features, currently in partial remission but experiencing symptom exacerbation due to psychosocial stressors. Housing instability has significantly impacted functioning in work and social domains. Impairments include difficulty maintaining employment, sleep disturbances, and social withdrawal. Risk factors include history of trauma and ongoing housing instability. Strengths include strong family support, medication compliance, and engagement in treatment. Recommend continued individual therapy, medication management, and intensive case management for housing stabilization.",
    
    // Diagnosis
    diagDescript: "Major Depressive Disorder, recurrent, moderate; Generalized Anxiety Disorder",
    diagDescriptCodeChoice: "Primary",
    diagDescriptCode: "F33.1, F41.1",
    
    // Completion Status
    completionStatus: "Complete",
    completionPercentage: 95,
    
    // Audit fields
    createdBy: "therapist@example.com",
    createdAt: "2025-07-15T09:00:00Z",
    updatedBy: "therapist@example.com", 
    updatedAt: "2025-07-15T14:30:00Z"
};

// ✅ Async Thunks for API calls
export const fetchReassessmentData = createAsyncThunk(
    'reassessment/fetchReassessmentData',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/reassessment/${clientID}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching reassessment data:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch reassessment data');
        }
    }
);

export const fetchReassessmentByAssessment = createAsyncThunk(
    'reassessment/fetchReassessmentByAssessment', 
    async (assessmentID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/reassessment/assessment/${assessmentID}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching reassessment by assessment:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch reassessment data');
        }
    }
);

export const saveReassessmentData = createAsyncThunk(
    'reassessment/saveReassessmentData',
    async ({ clientID, reassessmentData }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`/api/reassessment/${clientID}`, reassessmentData);
            return response.data;
        } catch (error) {
            console.error('Error saving reassessment data:', error);
            return rejectWithValue(error.response?.data || 'Failed to save reassessment data');
        }
    }
);

export const updateReassessmentData = createAsyncThunk(
    'reassessment/updateReassessmentData',
    async ({ reassessmentID, reassessmentData }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`/api/reassessment/record/${reassessmentID}`, reassessmentData);
            return response.data;
        } catch (error) {
            console.error('Error updating reassessment data:', error);
            return rejectWithValue(error.response?.data || 'Failed to update reassessment data');
        }
    }
);

export const completeReassessment = createAsyncThunk(
    'reassessment/completeReassessment',
    async ({ clientID, completionData }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`/api/reassessment/${clientID}/complete`, completionData);
            return response.data;
        } catch (error) {
            console.error('Error completing reassessment:', error);
            return rejectWithValue(error.response?.data || 'Failed to complete reassessment');
        }
    }
);

export const generateReassessmentSummary = createAsyncThunk(
    'reassessment/generateReassessmentSummary',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/reassessment/${clientID}/summary`);
            return response.data;
        } catch (error) {
            console.error('Error generating reassessment summary:', error);
            return rejectWithValue(error.response?.data || 'Failed to generate summary');
        }
    }
);

export const fetchAllReassessments = createAsyncThunk(
    'reassessment/fetchAllReassessments',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/reassessment/all`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all reassessments:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch reassessments');
        }
    }
);

export const searchReassessments = createAsyncThunk(
    'reassessment/searchReassessments',
    async (searchParams, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams(searchParams);
            const response = await axios.get(`/api/reassessment/search?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error searching reassessments:', error);
            return rejectWithValue(error.response?.data || 'Failed to search reassessments');
        }
    }
);

// ✅ Initial State
const initialState = {
    // Main reassessment data
    data: {},
    loading: false,
    error: null,

    // Assessment completion
    completionStatus: 'Not Started',
    completionPercentage: 0,
    isCompleted: false,

    // Summary and insights
    summary: {},
    summaryLoading: false,
    summaryError: null,

    // All reassessments (for reports/admin)
    allReassessments: [],
    allLoading: false,
    allError: null,

    // Search results
    searchResults: [],
    searchLoading: false,
    searchError: null,

    // Save operations
    saving: false,
    saveError: null,
    saveSuccess: false,

    // Update operations
    updating: false,
    updateError: null,
    updateSuccess: false,

    // Form state for real-time updates
    formData: {
        // Assessment Timeline
        dateFullAssess: "",
        dateLastReAssess: "",
        reassessmentSources: "",
        culturalCons: "",
        physicalChall: "",
        accessIssues: "",
        
        // Reason for Referral
        reasonForRef: "",
        currentSymp: "",
        suicHomiThou: "",
        columbiaSR: "",
        columbiaSRComp: "",
        
        // Self Harm & Medical History
        selfHarm: "",
        selfHarmSummary: "",
        psyHosp: "",
        psyHospSummary: "",
        outPatSummart: "",
        traumaExp: "",
        traumaExpSummary: "",
        
        // Medications & Substance Use
        medReAssess: "",
        medReAssessSummary: "",
        subAbuseReAssess: "",
        subAbuseReAssessDate: "",
        subAbuseReAssessSummary: "",
        
        // Medical History
        medHistReAssess: "",
        medHistReAssessDate: "",
        medHistReAssessSummary: "",
        
        // Education & Employment
        eduHistoryReAssess: "",
        eduHistoryReAssessSummary: "",
        empHistReAssess: "",
        empHistReAssessSummary: "",
        
        // Legal & Living Situation
        legalReAssess: "",
        legalReAssessSummary: "",
        livingArrReAssess: "",
        livingArrReAssessSummary: "",
        homelessReAssess: "",
        homelessReAssessDate: "",
        
        // Dependent Care & Family
        depCareReAssess: "",
        depCareReAssessSummary: "",
        famReAssess: "",
        famReAssessSummary: "",
        
        // Mental Status Exam
        cmOb1: [],
        cmOb2: [],
        cmOb3: [],
        cmOb4: [],
        cmOb5: [],
        cmOb6: [],
        cmOb7: [],
        cmOb8: [],
        cmOb9: [],
        cmOb10: [],
        cmOb11: [],
        cmObNone: [],
        cmObvSum: "",
        
        // Clinical Summary
        clientStrengthReAssessSummary: "",
        clientFormReAssessSummary: "",
        diagDescript: "",
        diagDescriptCodeChoice: "",
        diagDescriptCode: ""
    },

    // Development settings
    useMockData: import.meta.env.DEV || false,

    // Cache management
    lastFetched: null,
    cacheValid: false,
    cacheExpiryMinutes: 30
};

// ✅ Reassessment Slice
const reassessmentSlice = createSlice({
    name: 'reassessment',
    initialState,
    reducers: {
        // Reset state
        resetReassessmentState: (state) => {
            return { ...initialState, useMockData: state.useMockData };
        },

        // Clear errors
        clearErrors: (state) => {
            state.error = null;
            state.summaryError = null;
            state.allError = null;
            state.searchError = null;
            state.saveError = null;
            state.updateError = null;
        },

        // Set mock data mode
        setMockDataMode: (state, action) => {
            state.useMockData = action.payload;
        },

        // Update form data
        updateFormData: (state, action) => {
            state.formData = { ...state.formData, ...action.payload };
        },

        // Update specific form field
        updateFormField: (state, action) => {
            const { field, value } = action.payload;
            state.formData[field] = value;
        },

        // Update array field (for multi-selects)
        updateArrayField: (state, action) => {
            const { field, values } = action.payload;
            state.formData[field] = Array.isArray(values) ? values : [];
        },

        // Calculate completion percentage
        calculateCompletionPercentage: (state) => {
            const formData = state.formData;
            const requiredFields = [
                'dateFullAssess', 'dateLastReAssess', 'currentSymp', 'columbiaSRComp',
                'clientStrengthReAssessSummary', 'clientFormReAssessSummary'
            ];

            const completedFields = requiredFields.filter(field => {
                const value = formData[field];
                return value !== "" && value !== null && value !== undefined;
            }).length;

            state.completionPercentage = Math.round((completedFields / requiredFields.length) * 100);
            state.completionStatus = state.completionPercentage === 100 ? 'Complete' : 
                                   state.completionPercentage > 0 ? 'In Progress' : 'Not Started';
        },

        // Set cache validity
        setCacheValid: (state, action) => {
            state.cacheValid = action.payload;
            state.lastFetched = new Date().toISOString();
        },

        // Reset success flags
        resetSaveSuccess: (state) => {
            state.saveSuccess = false;
            state.updateSuccess = false;
        },

        // Load data into form
        loadDataIntoForm: (state, action) => {
            const data = action.payload;
            state.formData = { ...state.formData, ...data };
        }
    },

    extraReducers: (builder) => {
        // ✅ Fetch Reassessment Data
        builder
            .addCase(fetchReassessmentData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReassessmentData.fulfilled, (state, action) => {
                state.loading = false;
                state.data = state.useMockData ? mockReassessmentData : action.payload;
                state.lastFetched = new Date().toISOString();
                state.cacheValid = true;
                
                // Load data into form
                if (state.data) {
                    reassessmentSlice.caseReducers.loadDataIntoForm(state, { payload: state.data });
                    reassessmentSlice.caseReducers.calculateCompletionPercentage(state);
                }
            })
            .addCase(fetchReassessmentData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                // Use mock data on error in development
                if (state.useMockData) {
                    state.data = mockReassessmentData;
                    reassessmentSlice.caseReducers.loadDataIntoForm(state, { payload: mockReassessmentData });
                }
            })

        // ✅ Save Reassessment Data
        builder
            .addCase(saveReassessmentData.pending, (state) => {
                state.saving = true;
                state.saveError = null;
                state.saveSuccess = false;
            })
            .addCase(saveReassessmentData.fulfilled, (state, action) => {
                state.saving = false;
                state.saveSuccess = true;
                state.data = { ...state.data, ...action.payload };
                state.cacheValid = false; // Invalidate cache
            })
            .addCase(saveReassessmentData.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload;
            })

        // ✅ Update Reassessment Data
        builder
            .addCase(updateReassessmentData.pending, (state) => {
                state.updating = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateReassessmentData.fulfilled, (state, action) => {
                state.updating = false;
                state.updateSuccess = true;
                state.data = { ...state.data, ...action.payload };
            })
            .addCase(updateReassessmentData.rejected, (state, action) => {
                state.updating = false;
                state.updateError = action.payload;
            })

        // ✅ Complete Reassessment
        builder
            .addCase(completeReassessment.pending, (state) => {
                state.updating = true;
                state.updateError = null;
            })
            .addCase(completeReassessment.fulfilled, (state, action) => {
                state.updating = false;
                state.updateSuccess = true;
                state.isCompleted = true;
                state.completionStatus = 'Complete';
                state.completionPercentage = 100;
                state.data = { ...state.data, ...action.payload };
            })
            .addCase(completeReassessment.rejected, (state, action) => {
                state.updating = false;
                state.updateError = action.payload;
            })

        // ✅ Generate Summary
        builder
            .addCase(generateReassessmentSummary.pending, (state) => {
                state.summaryLoading = true;
                state.summaryError = null;
            })
            .addCase(generateReassessmentSummary.fulfilled, (state, action) => {
                state.summaryLoading = false;
                state.summary = action.payload;
            })
            .addCase(generateReassessmentSummary.rejected, (state, action) => {
                state.summaryLoading = false;
                state.summaryError = action.payload;
            })

        // ✅ Fetch All Reassessments
        builder
            .addCase(fetchAllReassessments.pending, (state) => {
                state.allLoading = true;
                state.allError = null;
            })
            .addCase(fetchAllReassessments.fulfilled, (state, action) => {
                state.allLoading = false;
                state.allReassessments = action.payload;
            })
            .addCase(fetchAllReassessments.rejected, (state, action) => {
                state.allLoading = false;
                state.allError = action.payload;
            })

        // ✅ Search Reassessments
        builder
            .addCase(searchReassessments.pending, (state) => {
                state.searchLoading = true;
                state.searchError = null;
            })
            .addCase(searchReassessments.fulfilled, (state, action) => {
                state.searchLoading = false;
                state.searchResults = action.payload;
            })
            .addCase(searchReassessments.rejected, (state, action) => {
                state.searchLoading = false;
                state.searchError = action.payload;
            });
    }
});

// ✅ Export actions
export const {
    resetReassessmentState,
    clearErrors,
    setMockDataMode,
    updateFormData,
    updateFormField,
    updateArrayField,
    calculateCompletionPercentage,
    setCacheValid,
    resetSaveSuccess,
    loadDataIntoForm
} = reassessmentSlice.actions;

// ✅ Selectors
export const selectReassessmentData = (state) => state.reassessment?.data || {};
export const selectFormData = (state) => state.reassessment?.formData || {};
export const selectSummary = (state) => state.reassessment?.summary || {};
export const selectAllReassessments = (state) => state.reassessment?.allReassessments || [];
export const selectSearchResults = (state) => state.reassessment?.searchResults || [];

export const selectIsLoading = (state) => {
    const r = state.reassessment;
    return r?.loading || r?.summaryLoading || r?.allLoading || r?.searchLoading || false;
};

export const selectIsSaving = (state) => state.reassessment?.saving || state.reassessment?.updating || false;

export const selectHasErrors = (state) => {
    const r = state.reassessment;
    return !!(r?.error || r?.summaryError || r?.allError || r?.searchError || r?.saveError || r?.updateError);
};

export const selectCompletionStatus = (state) => ({
    status: state.reassessment?.completionStatus || 'Not Started',
    percentage: state.reassessment?.completionPercentage || 0,
    isCompleted: state.reassessment?.isCompleted || false
});

// ✅ Export reducer
export default reassessmentSlice.reducer;