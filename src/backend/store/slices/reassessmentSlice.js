// ====================================================================
// PRODUCTION REASSESSMENT SLICE - No Mock Data
// ====================================================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Base API URL
const HCD_API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}`;

// ✅ Async Thunks for API calls
export const fetchReassessmentData = createAsyncThunk(
    'reassessment/fetchReassessmentData',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/reassessment/${clientID}`);
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
            const response = await axios.get(`${HCD_API}/api/reassessment/assessment/${assessmentID}`);
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
            const response = await axios.post(`${HCD_API}/api/reassessment/${clientID}`, reassessmentData);
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
            const response = await axios.put(`${HCD_API}/api/reassessment/record/${reassessmentID}`, reassessmentData);
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
            const response = await axios.put(`${HCD_API}/api/reassessment/${clientID}/complete`, completionData);
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
            const response = await axios.get(`${HCD_API}/api/reassessment/${clientID}/summary`);
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
            const response = await axios.get(`${HCD_API}/api/reassessment/all`);
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
            const response = await axios.get(`${HCD_API}/api/reassessment/search?${params}`);
            return response.data;
        } catch (error) {
            console.error('Error searching reassessments:', error);
            return rejectWithValue(error.response?.data || 'Failed to search reassessments');
        }
    }
);

// ✅ Initial State - Production Ready
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
        diagDescriptCodeChoice: "",  // Empty = NULL in database (now allowed by constraint)
        diagDescriptCode: ""
    },

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
            return initialState;
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

        // Update form data
        updateFormData: (state, action) => {
            state.formData = { ...state.formData, ...action.payload };
        },

        // Update specific form field
        updateFormField: (state, action) => {
            const { field, value } = action.payload;
            state.formData[field] = value;
            reassessmentSlice.caseReducers.calculateCompletionPercentage(state);
        },

        // Update array field (for multi-selects)
        updateArrayField: (state, action) => {
            const { field, values } = action.payload;
            state.formData[field] = Array.isArray(values) ? values : [];
            reassessmentSlice.caseReducers.calculateCompletionPercentage(state);
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

            // cmOb* fields must be arrays of { value, label } objects.
            // From the DB they may arrive as JSON strings or plain string arrays.
            const cmObFields = [
                'cmOb1','cmOb2','cmOb3','cmOb4','cmOb5','cmOb6',
                'cmOb7','cmOb8','cmOb9','cmOb10','cmOb11','cmObNone'
            ];

            const normalized = { ...data };
            cmObFields.forEach(field => {
                let val = data[field];
                if (!val) { normalized[field] = []; return; }

                // Deserialize JSON string from DB
                if (typeof val === 'string') {
                    try { val = JSON.parse(val); } catch { val = []; }
                }

                // Ensure every element is a { value, label } object with plain string values
                const toStr = (v) => {
                    if (typeof v === 'string') return v;
                    if (v && typeof v === 'object') return v.value ?? v.label ?? '';
                    return String(v ?? '');
                };
                if (Array.isArray(val)) {
                    normalized[field] = val.map(item => {
                        if (typeof item === 'string') return { value: item, label: item };
                        const v = toStr(item?.value ?? item);
                        const l = toStr(item?.label ?? item?.value ?? item);
                        return { value: v, label: l };
                    });
                } else {
                    normalized[field] = [];
                }
            });

            // Flatten scalar select fields that may have arrived as {value,label} objects
            const scalarFields = [
                'reasonForRef','suicHomiThou','columbiaSRComp','columbiaSR',
                'selfHarm','psyHosp','traumaExp','medReAssess','subAbuseReAssess',
                'medHistReAssess','eduHistoryReAssess','empHistReAssess','legalReAssess',
                'livingArrReAssess','homelessReAssess','depCareReAssess','famReAssess',
                'diagDescriptCodeChoice',
            ];
            scalarFields.forEach(field => {
                const val = normalized[field];
                if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
                    normalized[field] = val.value ?? '';
                }
            });

            state.formData = { ...state.formData, ...normalized };
            reassessmentSlice.caseReducers.calculateCompletionPercentage(state);
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
                state.data = action.payload;
                state.lastFetched = new Date().toISOString();
                state.cacheValid = true;
                
                // Load data into form if available
                if (state.data && Object.keys(state.data).length > 0) {
                    reassessmentSlice.caseReducers.loadDataIntoForm(state, { payload: state.data });
                    reassessmentSlice.caseReducers.calculateCompletionPercentage(state);
                }
            })
            .addCase(fetchReassessmentData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                console.error('Failed to fetch reassessment data:', action.payload);
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

let _cs = { status: 'Not Started', percentage: 0, isCompleted: false };
export const selectCompletionStatus = (state) => {
    const s = state.reassessment?.completionStatus || 'Not Started';
    const p = state.reassessment?.completionPercentage || 0;
    const c = state.reassessment?.isCompleted || false;
    if (_cs.status === s && _cs.percentage === p && _cs.isCompleted === c) return _cs;
    _cs = { status: s, percentage: p, isCompleted: c };
    return _cs;
};

// ✅ Export reducer
export default reassessmentSlice.reducer;