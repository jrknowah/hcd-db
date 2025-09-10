import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// ✅ API Base URL - CONSISTENT naming
const API_URL = import.meta.env.VITE_API_URL;

// ✅ Async Thunks for API Calls

// Fetch IDT Provider Note data
export const fetchIDTNoteProvider = createAsyncThunk(
    'idtProvider/fetchIDTNoteProvider',
    async (clientID, { rejectWithValue }) => {
        
        // ✅ Debug logging
        console.log('📡 fetchIDTNoteProvider called with clientID:', clientID);
        console.log('🔧 API_URL:', API_URL);
        
        // ✅ Check for undefined clientID
        if (!clientID || clientID === 'undefined') {
            console.error('❌ clientID is undefined or invalid:', clientID);
            return rejectWithValue('Client ID is required');
        }
        
        // ✅ Use consistent mock data checking
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Returning mock IDT provider data for", clientID);
            return {
                idtHospital: "City General Hospital",
                idtAdmitDate: "2025-07-10",
                idtProviderName: "Dr. Sarah Johnson",
                idtProviderRole: "Attending Physician",
                idtDiag: "Acute myocardial infarction with complications, diabetes mellitus type 2",
                idtProblems: "Chest pain, shortness of breath, mobility limitations, blood sugar control",
                idtPriority: "Cardiac stabilization, pain management, diabetes control",
                idtFunctionalStatus: "Limited mobility, requires assistance with ADLs",
                idtConsults: "Cardiology - scheduled, Physical Therapy - pending, Endocrinology - requested",
                idtNoConsults: "Consider nutrition counseling, social work evaluation",
                idtPlans: "Step-down to telemetry, cardiac rehabilitation referral, diabetes education",
                idtDischarge: "Family support arrangements needed, home safety evaluation required",
                idtPatientClear: "Pending",
                idtPatientClearDate: "",
                idtPatientClearBy: "",
                idtDischargeReadiness: "Needs Planning",
                idtComplexityScore: 7,
                idtRiskLevel: "High",
                idtLengthOfStay: "5",
                idtTargetLOS: "7",
                idtGoals: "Hemodynamic stability, pain control, diabetes management",
                idtInterventions: "Cardiac monitoring, medication optimization, patient education",
                idtOutcomes: "Stable vitals, improved mobility, controlled blood glucose",
                createdBy: "mock@hospital.com",
                createdAt: new Date().toISOString()
            };
        }

        try {
            // ✅ FIXED: Use consistent API_URL variable
            const response = await fetch(`${API_URL}/idt-provider/${clientID}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // No existing data found
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch IDT Provider Note failed:', error);
            return rejectWithValue(error.message || 'Failed to fetch IDT Provider Note data');
        }
    }
);

// Save IDT Provider Note data
export const saveIDTNoteProvider = createAsyncThunk(
    'idtProvider/saveIDTNoteProvider',
    async (idtData, { rejectWithValue }) => {
        
        // ✅ Use consistent mock data checking
        if (shouldUseMockData(idtData.clientID)) {
            console.log("🔧 Mock mode: Simulating IDT provider save for", idtData.clientID);
            return {
                ...idtData,
                idtID: 'MOCK-IDT-' + Date.now(),
                updatedAt: new Date().toISOString()
            };
        }

        try {
            const { clientID, ...saveData } = idtData;
            
            // ✅ FIXED: Use consistent API_URL variable
            const response = await fetch(`${API_URL}/idt-provider/${clientID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(saveData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Save IDT Provider Note failed:', error);
            return rejectWithValue(error.message || 'Failed to save IDT Provider Note data');
        }
    }
);

// Fetch IDT summary data
export const fetchIDTSummary = createAsyncThunk(
    'idtProvider/fetchIDTSummary',
    async (clientID, { rejectWithValue }) => {
        
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Returning mock IDT summary for", clientID);
            return {
                totalNotes: 3,
                averageComplexity: 6.5,
                averageLOS: 8.2,
                dischargePlanningStatus: "In Progress",
                lastUpdate: new Date().toISOString()
            };
        }

        try {
            // ✅ FIXED: Use consistent API_URL variable
            const response = await fetch(`${API_URL}/idt-provider/${clientID}/summary`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch IDT summary data');
        }
    }
);

// Fetch consultation data
export const fetchConsultationData = createAsyncThunk(
    'idtProvider/fetchConsultationData',
    async (clientID, { rejectWithValue }) => {
        
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Returning mock consultation data for", clientID);
            return {
                activeConsultations: [
                    { specialty: "Cardiology", status: "Scheduled", date: "2025-07-17" },
                    { specialty: "Physical Therapy", status: "Pending", date: "2025-07-18" },
                    { specialty: "Endocrinology", status: "Requested", date: null }
                ],
                completedConsultations: [
                    { specialty: "Social Work", status: "Completed", date: "2025-07-15" }
                ]
            };
        }

        try {
            // ✅ FIXED: Use consistent API_URL variable
            const response = await fetch(`${API_URL}/idt-provider/${clientID}/consultations`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch consultation data');
        }
    }
);

// Fetch discharge planning data
export const fetchDischargePlanning = createAsyncThunk(
    'idtProvider/fetchDischargePlanning',
    async (clientID, { rejectWithValue }) => {
        
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Returning mock discharge planning for", clientID);
            return {
                dischargeReadiness: "Needs Planning",
                targetDate: "2025-07-20",
                barriers: ["Family support arrangements", "Home safety evaluation"],
                plan: "Step-down to telemetry, cardiac rehab referral",
                clearedBy: null,
                clearedDate: null
            };
        }

        try {
            // ✅ FIXED: Use consistent API_URL variable
            const response = await fetch(`${API_URL}/idt-provider/${clientID}/discharge-planning`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch discharge planning data');
        }
    }
);

// Fetch IDT note history
export const fetchIDTHistory = createAsyncThunk(
    'idtProvider/fetchIDTHistory',
    async (clientID, { rejectWithValue }) => {
        
        if (shouldUseMockData(clientID)) {
            console.log("🔧 Mock mode: Returning mock IDT history for", clientID);
            return [
                {
                    idtID: "IDT-001",
                    date: "2025-07-16",
                    provider: "Dr. Sarah Johnson",
                    complexity: 7,
                    summary: "Initial assessment with cardiac complications"
                },
                {
                    idtID: "IDT-002",
                    date: "2025-07-15",
                    provider: "Dr. Michael Chen",
                    complexity: 6,
                    summary: "Consultation review and care planning"
                }
            ];
        }

        try {
            // ✅ FIXED: Use consistent API_URL variable
            const response = await fetch(`${API_URL}/idt-provider/${clientID}/history`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to fetch IDT history data');
        }
    }
);

// ✅ Initial State
const initialState = {
    // Main IDT data
    data: {},
    loading: false,
    error: null,
    
    // Summary/statistics
    summary: {},
    summaryLoading: false,
    summaryError: null,
    
    // Consultation data
    consultations: {},
    consultationsLoading: false,
    consultationsError: null,
    
    // Discharge planning
    dischargePlanning: {},
    dischargePlanningLoading: false,
    dischargePlanningError: null,
    
    // History
    history: [],
    historyLoading: false,
    historyError: null,
    
    // Save states
    saving: false,
    saveError: null,
    saveSuccess: false,
    
    // Validation
    validationErrors: {},
    
    // ✅ FIXED: Single useMockData declaration
    useMockData: import.meta.env.MODE === 'development',
    
    // User activity tracking
    lastActivity: null,
    isDirty: false
};

// ✅ Create Slice
const idtProviderSlice = createSlice({
    name: 'idtProvider',
    initialState,
    reducers: {
        // Clear all errors
        clearErrors: (state) => {
            state.error = null;
            state.saveError = null;
            state.summaryError = null;
            state.consultationsError = null;
            state.dischargePlanningError = null;
            state.historyError = null;
            state.validationErrors = {};
        },
        
        // Clear save success flag
        clearSaveSuccess: (state) => {
            state.saveSuccess = false;
        },
        
        // Set validation errors
        setValidationErrors: (state, action) => {
            state.validationErrors = action.payload;
        },
        
        // Toggle mock data
        toggleMockData: (state) => {
            state.useMockData = !state.useMockData;
        },
        
        // Set mock data flag
        setMockData: (state, action) => {
            state.useMockData = action.payload;
        },
        
        // Update activity tracking
        updateActivity: (state) => {
            state.lastActivity = new Date().toISOString();
            state.isDirty = true;
        },
        
        // Reset dirty flag
        resetDirty: (state) => {
            state.isDirty = false;
        },
        
        // Update form data locally (for optimistic updates)
        updateFormData: (state, action) => {
            state.data = { ...state.data, ...action.payload };
            state.isDirty = true;
            state.lastActivity = new Date().toISOString();
        }
    },
    extraReducers: (builder) => {
        builder
            // ✅ Fetch IDT Provider Note
            .addCase(fetchIDTNoteProvider.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchIDTNoteProvider.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload || {};
                state.error = null;
            })
            .addCase(fetchIDTNoteProvider.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch IDT Provider Note data';
            })
            
            // ✅ Save IDT Provider Note
            .addCase(saveIDTNoteProvider.pending, (state) => {
                state.saving = true;
                state.saveError = null;
                state.saveSuccess = false;
            })
            .addCase(saveIDTNoteProvider.fulfilled, (state, action) => {
                state.saving = false;
                state.data = action.payload;
                state.saveSuccess = true;
                state.saveError = null;
                state.isDirty = false;
            })
            .addCase(saveIDTNoteProvider.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload || 'Failed to save IDT Provider Note data';
                state.saveSuccess = false;
            })
            
            // ✅ Fetch IDT Summary
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
                state.summaryError = action.payload || 'Failed to fetch IDT summary data';
            })
            
            // ✅ Fetch Consultation Data
            .addCase(fetchConsultationData.pending, (state) => {
                state.consultationsLoading = true;
                state.consultationsError = null;
            })
            .addCase(fetchConsultationData.fulfilled, (state, action) => {
                state.consultationsLoading = false;
                state.consultations = action.payload;
                state.consultationsError = null;
            })
            .addCase(fetchConsultationData.rejected, (state, action) => {
                state.consultationsLoading = false;
                state.consultationsError = action.payload || 'Failed to fetch consultation data';
            })
            
            // ✅ Fetch Discharge Planning
            .addCase(fetchDischargePlanning.pending, (state) => {
                state.dischargePlanningLoading = true;
                state.dischargePlanningError = null;
            })
            .addCase(fetchDischargePlanning.fulfilled, (state, action) => {
                state.dischargePlanningLoading = false;
                state.dischargePlanning = action.payload;
                state.dischargePlanningError = null;
            })
            .addCase(fetchDischargePlanning.rejected, (state, action) => {
                state.dischargePlanningLoading = false;
                state.dischargePlanningError = action.payload || 'Failed to fetch discharge planning data';
            })
            
            // ✅ Fetch IDT History
            .addCase(fetchIDTHistory.pending, (state) => {
                state.historyLoading = true;
                state.historyError = null;
            })
            .addCase(fetchIDTHistory.fulfilled, (state, action) => {
                state.historyLoading = false;
                state.history = action.payload;
                state.historyError = null;
            })
            .addCase(fetchIDTHistory.rejected, (state, action) => {
                state.historyLoading = false;
                state.historyError = action.payload || 'Failed to fetch IDT history data';
            });
    }
});

// ✅ Export Actions
export const {
    clearErrors,
    clearSaveSuccess,
    setValidationErrors,
    toggleMockData,
    setMockData,
    updateActivity,
    resetDirty,
    updateFormData
} = idtProviderSlice.actions;

// ✅ Selectors
export const selectIDTProviderData = (state) => state.idtProvider.data;
export const selectIDTProviderLoading = (state) => state.idtProvider.loading;
export const selectIDTProviderError = (state) => state.idtProvider.error;
export const selectIDTProviderSaving = (state) => state.idtProvider.saving;
export const selectIDTProviderSaveSuccess = (state) => state.idtProvider.saveSuccess;
export const selectIDTSummary = (state) => state.idtProvider.summary;
export const selectConsultations = (state) => state.idtProvider.consultations;
export const selectDischargePlanning = (state) => state.idtProvider.dischargePlanning;
export const selectIDTHistory = (state) => state.idtProvider.history;
export const selectValidationErrors = (state) => state.idtProvider.validationErrors;
export const selectIsDirty = (state) => state.idtProvider.isDirty;
export const selectUseMockData = (state) => state.idtProvider.useMockData;

// ✅ Export Reducer
export default idtProviderSlice.reducer;