import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const HCD_API = `${import.meta.env.VITE_API_URL}`; // Adjust to your actual auth endpoint

// Mock data for development
const mockBioSocialData = {
    bioSocialID: "BS-001",
    clientID: "CLIENT-123",
    assessmentID: "ACP-2025-0717-001",
    
    // Financial Information
    clientCalWorks: "450.00",
    clientEmployment: "0.00",
    clientFoodStamps: "200.00",
    clientWidowBen: "0.00",
    clientCS: "0.00",
    clientGenRelief: "300.00",
    clientSSI: "850.00",
    clientSSDI: "0.00",
    clientTANF: "0.00",
    clientWorkComp: "0.00",
    clientUnEmp: "0.00",
    clientVetBen: "0.00",
    clientStDis: "0.00",
    clientInherit: "0.00",
    clientOtherInc: "0.00",
    totalMonthlyIncome: 1800.00,
    
    // Payee Information
    payeeChoice: "Yes",
    payeeName: "Mary Johnson",
    payeePhone: "(555) 123-4567",
    payeeRelationship: "Sister",
    
    // Employment History
    clientBeenEmployed: "Yes",
    clientEmpIntr: "Yes",
    clientEmployed: "No",
    clientEmployer: "ABC Company",
    lastEmploymentDate: "2024-03-15",
    employmentBarriers: ["Transportation", "Housing Instability"],
    
    // Debt Information
    clientDebt: "Yes",
    clientDebtAmount: "2500.00",
    clientBankrupt: "No",
    bankruptcyDate: null,
    
    // Housing Information
    clientGovHousingApp: ["Section 8", "SRO"],
    clientGovHousingLive: ["Section 8"],
    clientPastRenter: "Yes",
    clientPastRenterLate: "No",
    clientEvicted: "No",
    clientLandlordProb: "No",
    clientUtilityBill: "Yes",
    clientCreditRating: "Poor",
    clientHousingSummary: "Seeking permanent housing with Section 8 assistance",
    housingStability: "Unstable",
    
    // Functional Assessment
    clientAmbulatory: ["Self", "Cane"],
    clientAmbulatorySummary: "Able to walk with assistance of cane due to arthritis",
    
    // Activities of Daily Living
    clientEating: "Self",
    clientBathing: "Self",
    clientBrushing: "Self",
    clientToileting: "Self",
    clientCooking: "Partial Assistance",
    clientCleaning: "Partial Assistance",
    clientLaundry: "Self",
    clientTakingMeds: "Self",
    clientFunctionalAssist: "Needs help with meal preparation and heavy cleaning due to mobility limitations",
    adlScore: 28, // Out of 32 (8 categories x 4 points each)
    
    // Communication & Language
    clientCommunication: ["Verbally", "Facial expressions or gestures"],
    primaryLanguage: "English",
    interpreterNeeded: false,
    communicationBarriers: [],
    
    // Assessment Summary
    clientBioSocialNotes: "Client demonstrates good independence in most ADLs with some limitations in meal preparation and cleaning. Financial stability concerns with reliance on multiple benefit sources. Housing instability is primary concern requiring immediate attention.",
    riskFactors: ["Housing Instability", "Financial Dependence", "Limited Employment History"],
    strengths: ["Independent in most ADLs", "Motivated for employment", "Strong family support"],
    recommendedServices: ["Housing assistance", "Vocational rehabilitation", "Financial counseling"],
    
    // Completion Status
    completionStatus: "Complete",
    completionPercentage: 100,
    timeSpent: 1.5, // hours
    
    // Audit fields
    createdBy: "social.worker@example.com",
    createdAt: "2025-07-11T09:00:00Z",
    updatedBy: "social.worker@example.com",
    updatedAt: "2025-07-11T11:30:00Z",
    completedBy: "social.worker@example.com",
    completedAt: "2025-07-11T11:30:00Z"
};

// ✅ Async Thunks for API calls
export const fetchBioSocialData = createAsyncThunk(
    'bioSocial/fetchBioSocialData',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/bio-social/${clientID}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bio-social data:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch bio-social data');
        }
    }
);

export const fetchBioSocialByAssessment = createAsyncThunk(
    'bioSocial/fetchBioSocialByAssessment',
    async (assessmentID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/bio-social/assessment/${assessmentID}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bio-social data by assessment:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch bio-social data');
        }
    }
);

export const saveBioSocialData = createAsyncThunk(
    'bioSocial/saveBioSocialData',
    async ({ clientID, bioSocialData }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${HCD_API}/api/bio-social/${clientID}`, bioSocialData);
            return response.data;
        } catch (error) {
            console.error('Error saving bio-social data:', error);
            return rejectWithValue(error.response?.data || 'Failed to save bio-social data');
        }
    }
);

export const updateBioSocialData = createAsyncThunk(
    'bioSocial/updateBioSocialData',
    async ({ bioSocialID, bioSocialData }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${HCD_API}/api/bio-social/record/${bioSocialID}`, bioSocialData);
            return response.data;
        } catch (error) {
            console.error('Error updating bio-social data:', error);
            return rejectWithValue(error.response?.data || 'Failed to update bio-social data');
        }
    }
);

export const completeBioSocialAssessment = createAsyncThunk(
    'bioSocial/completeBioSocialAssessment',
    async ({ clientID, completionData }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${HCD_API}/api/bio-social/${clientID}/complete`, completionData);
            return response.data;
        } catch (error) {
            console.error('Error completing bio-social assessment:', error);
            return rejectWithValue(error.response?.data || 'Failed to complete bio-social assessment');
        }
    }
);

export const generateBioSocialSummary = createAsyncThunk(
    'bioSocial/generateBioSocialSummary',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/bio-social/${clientID}/summary`);
            return response.data;
        } catch (error) {
            console.error('Error generating bio-social summary:', error);
            return rejectWithValue(error.response?.data || 'Failed to generate bio-social summary');
        }
    }
);

export const calculateADLScore = createAsyncThunk(
    'bioSocial/calculateADLScore',
    async (adlData, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${HCD_API}/api/bio-social/calculate-adl`, adlData);
            return response.data;
        } catch (error) {
            console.error('Error calculating ADL score:', error);
            return rejectWithValue(error.response?.data || 'Failed to calculate ADL score');
        }
    }
);

export const fetchFinancialSummary = createAsyncThunk(
    'bioSocial/fetchFinancialSummary',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${HCD_API}/api/bio-social/${clientID}/financial-summary`);
            return response.data;
        } catch (error) {
            console.error('Error fetching financial summary:', error);
            return rejectWithValue(error.response?.data || 'Failed to fetch financial summary');
        }
    }
); 

// ✅ Initial State
const initialState = {
    // Main bio-social data
    data: {},
    loading: false,
    error: null,

    // Assessment completion
    completionStatus: 'Not Started',
    completionPercentage: 0,
    isCompleted: false,

    // Financial summary
    financialSummary: {},
    financialLoading: false,
    financialError: null,

    // ADL assessment
    adlScore: 0,
    adlMaxScore: 32,
    adlPercentage: 0,
    adlLoading: false,
    adlError: null,

    // Summary and insights
    summary: {},
    summaryLoading: false,
    summaryError: null,

    // Save operations
    saving: false,
    saveError: null,
    saveSuccess: false,

    // Update operations
    updating: false,
    updateError: null,
    updateSuccess: false,

    // Form state
    formData: {
        // Financial fields
        clientCalWorks: "",
        clientEmployment: "",
        clientFoodStamps: "",
        clientWidowBen: "",
        clientCS: "",
        clientGenRelief: "",
        clientSSI: "",
        clientSSDI: "",
        clientTANF: "",
        clientWorkComp: "",
        clientUnEmp: "",
        clientVetBen: "",
        clientStDis: "",
        clientInherit: "",
        clientOtherInc: "",

        // Payee information
        payeeChoice: "",
        payeeName: "",
        payeePhone: "",

        // Employment
        clientBeenEmployed: "",
        clientEmpIntr: "",
        clientEmployed: "",
        clientEmployer: "",

        // Debt
        clientDebt: "",
        clientBankrupt: "",

        // Housing
        clientGovHousingApp: [],
        clientGovHousingLive: [],
        clientPastRenter: "",
        clientPastRenterLate: "",
        clientEvicted: "",
        clientLandlordProb: "",
        clientUtilityBill: "",
        clientCreditRating: "",
        clientHousingSummary: "",

        // Functional
        clientAmbulatory: [],
        clientAmbulatorySummary: "",

        // ADLs
        clientEating: "",
        clientBathing: "",
        clientBrushing: "",
        clientToileting: "",
        clientCooking: "",
        clientCleaning: "",
        clientLaundry: "",
        clientTakingMeds: "",
        clientFunctionalAssist: "",

        // Communication
        clientCommunication: [],
        clientBioSocialNotes: ""
    },

    // Development settings
    useMockData: process.env.NODE_ENV === 'development',

    // Cache management
    lastFetched: null,
    cacheValid: false,
    cacheExpiryMinutes: 30
};

// ✅ Bio-Social Slice
const bioSocialSlice = createSlice({
    name: 'bioSocial',
    initialState,
    reducers: {
        // Reset state
        resetBioSocialState: (state) => {
            return { ...initialState, useMockData: state.useMockData };
        },

        // Clear errors
        clearErrors: (state) => {
            state.error = null;
            state.financialError = null;
            state.adlError = null;
            state.summaryError = null;
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
                'clientCalWorks', 'clientEmployment', 'clientFoodStamps', 'clientGenRelief', 'clientSSI',
                'payeeChoice', 'clientBeenEmployed', 'clientEmpIntr', 'clientEmployed',
                'clientDebt', 'clientBankrupt', 'clientPastRenter', 'clientEvicted',
                'clientEating', 'clientBathing', 'clientToileting', 'clientCooking'
            ];

            const completedFields = requiredFields.filter(field => {
                const value = formData[field];
                return value !== "" && value !== null && value !== undefined;
            }).length;

            state.completionPercentage = Math.round((completedFields / requiredFields.length) * 100);
            state.completionStatus = state.completionPercentage === 100 ? 'Complete' : 
                                   state.completionPercentage > 0 ? 'In Progress' : 'Not Started';
        },

        // Calculate ADL score locally
        calculateLocalADLScore: (state) => {
            const adlFields = [
                'clientEating', 'clientBathing', 'clientBrushing', 'clientToileting',
                'clientCooking', 'clientCleaning', 'clientLaundry', 'clientTakingMeds'
            ];

            const scoreMap = {
                'Self': 4,
                'Partial Assistance': 2,
                'Complete Assistance': 1,
                '': 0
            };

            let totalScore = 0;
            adlFields.forEach(field => {
                const value = state.formData[field];
                totalScore += scoreMap[value] || 0;
            });

            state.adlScore = totalScore;
            state.adlPercentage = Math.round((totalScore / state.adlMaxScore) * 100);
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
        },

        // Load data into form
        loadDataIntoForm: (state, action) => {
            const data = action.payload;
            // Convert string arrays back to arrays for multi-selects
            const formData = {
                ...data,
                clientGovHousingApp: typeof data.clientGovHousingApp === 'string' ? 
                    data.clientGovHousingApp.split(', ').filter(Boolean) : (data.clientGovHousingApp || []),
                clientGovHousingLive: typeof data.clientGovHousingLive === 'string' ? 
                    data.clientGovHousingLive.split(', ').filter(Boolean) : (data.clientGovHousingLive || []),
                clientAmbulatory: typeof data.clientAmbulatory === 'string' ? 
                    data.clientAmbulatory.split(', ').filter(Boolean) : (data.clientAmbulatory || []),
                clientCommunication: typeof data.clientCommunication === 'string' ? 
                    data.clientCommunication.split(', ').filter(Boolean) : (data.clientCommunication || [])
            };
            
            state.formData = { ...state.formData, ...formData };
        }
    },

    extraReducers: (builder) => {
        // ✅ Fetch Bio-Social Data
        builder
            .addCase(fetchBioSocialData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBioSocialData.fulfilled, (state, action) => {
                state.loading = false;
                state.data = state.useMockData ? mockBioSocialData : action.payload;
                state.lastFetched = new Date().toISOString();
                state.cacheValid = true;
                
                // Load data into form
                if (state.data) {
                    bioSocialSlice.caseReducers.loadDataIntoForm(state, { payload: state.data });
                    bioSocialSlice.caseReducers.calculateCompletionPercentage(state);
                    bioSocialSlice.caseReducers.calculateLocalADLScore(state);
                }
            })
            .addCase(fetchBioSocialData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                // Use mock data on error in development
                if (state.useMockData) {
                    state.data = mockBioSocialData;
                    bioSocialSlice.caseReducers.loadDataIntoForm(state, { payload: mockBioSocialData });
                }
            })

        // ✅ Fetch Bio-Social by Assessment
        builder
            .addCase(fetchBioSocialByAssessment.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBioSocialByAssessment.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
                if (state.data) {
                    bioSocialSlice.caseReducers.loadDataIntoForm(state, { payload: state.data });
                    bioSocialSlice.caseReducers.calculateCompletionPercentage(state);
                    bioSocialSlice.caseReducers.calculateLocalADLScore(state);
                }
            })
            .addCase(fetchBioSocialByAssessment.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

        // ✅ Save Bio-Social Data
        builder
            .addCase(saveBioSocialData.pending, (state) => {
                state.saving = true;
                state.saveError = null;
                state.saveSuccess = false;
            })
            .addCase(saveBioSocialData.fulfilled, (state, action) => {
                state.saving = false;
                state.saveSuccess = true;
                state.data = { ...state.data, ...action.payload };
                state.cacheValid = false; // Invalidate cache
            })
            .addCase(saveBioSocialData.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload;
            })

        // ✅ Update Bio-Social Data
        builder
            .addCase(updateBioSocialData.pending, (state) => {
                state.updating = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateBioSocialData.fulfilled, (state, action) => {
                state.updating = false;
                state.updateSuccess = true;
                state.data = { ...state.data, ...action.payload };
            })
            .addCase(updateBioSocialData.rejected, (state, action) => {
                state.updating = false;
                state.updateError = action.payload;
            })

        // ✅ Complete Bio-Social Assessment
        builder
            .addCase(completeBioSocialAssessment.pending, (state) => {
                state.updating = true;
                state.updateError = null;
            })
            .addCase(completeBioSocialAssessment.fulfilled, (state, action) => {
                state.updating = false;
                state.updateSuccess = true;
                state.isCompleted = true;
                state.completionStatus = 'Complete';
                state.completionPercentage = 100;
                state.data = { ...state.data, ...action.payload };
            })
            .addCase(completeBioSocialAssessment.rejected, (state, action) => {
                state.updating = false;
                state.updateError = action.payload;
            })

        // ✅ Generate Bio-Social Summary
        builder
            .addCase(generateBioSocialSummary.pending, (state) => {
                state.summaryLoading = true;
                state.summaryError = null;
            })
            .addCase(generateBioSocialSummary.fulfilled, (state, action) => {
                state.summaryLoading = false;
                state.summary = action.payload;
            })
            .addCase(generateBioSocialSummary.rejected, (state, action) => {
                state.summaryLoading = false;
                state.summaryError = action.payload;
            })

        // ✅ Calculate ADL Score
        builder
            .addCase(calculateADLScore.pending, (state) => {
                state.adlLoading = true;
                state.adlError = null;
            })
            .addCase(calculateADLScore.fulfilled, (state, action) => {
                state.adlLoading = false;
                state.adlScore = action.payload.adlScore;
                state.adlPercentage = action.payload.adlPercentage;
            })
            .addCase(calculateADLScore.rejected, (state, action) => {
                state.adlLoading = false;
                state.adlError = action.payload;
            })

        // ✅ Fetch Financial Summary
        builder
            .addCase(fetchFinancialSummary.pending, (state) => {
                state.financialLoading = true;
                state.financialError = null;
            })
            .addCase(fetchFinancialSummary.fulfilled, (state, action) => {
                state.financialLoading = false;
                state.financialSummary = action.payload;
            })
            .addCase(fetchFinancialSummary.rejected, (state, action) => {
                state.financialLoading = false;
                state.financialError = action.payload;
            });
    }
});

// ✅ Export actions
export const {
    resetBioSocialState,
    clearErrors,
    setMockDataMode,
    updateFormData,
    updateFormField,
    updateArrayField,
    calculateCompletionPercentage,
    calculateLocalADLScore,
    setCacheValid,
    resetSaveSuccess,
    loadDataIntoForm
} = bioSocialSlice.actions;

// ✅ Selectors
export const selectBioSocialData = (state) => state.bioSocial?.data || {};
export const selectFormData = (state) => state.bioSocial?.formData || {};
export const selectFinancialSummary = (state) => state.bioSocial?.financialSummary || {};
export const selectSummary = (state) => state.bioSocial?.summary || {};

export const selectIsLoading = (state) => {
    const bs = state.bioSocial;
    return bs?.loading || bs?.financialLoading || bs?.adlLoading || bs?.summaryLoading || false;
};

export const selectIsSaving = (state) => state.bioSocial?.saving || state.bioSocial?.updating || false;

export const selectHasErrors = (state) => {
    const bs = state.bioSocial;
    return !!(bs?.error || bs?.financialError || bs?.adlError || bs?.summaryError || bs?.saveError || bs?.updateError);
};

export const selectCompletionStatus = (state) => ({
    status: state.bioSocial?.completionStatus || 'Not Started',
    percentage: state.bioSocial?.completionPercentage || 0,
    isCompleted: state.bioSocial?.isCompleted || false
});

export const selectADLMetrics = (state) => ({
    score: state.bioSocial?.adlScore || 0,
    maxScore: state.bioSocial?.adlMaxScore || 32,
    percentage: state.bioSocial?.adlPercentage || 0,
    interpretation: state.bioSocial?.adlPercentage >= 90 ? 'Highly Independent' :
                   state.bioSocial?.adlPercentage >= 75 ? 'Mostly Independent' :
                   state.bioSocial?.adlPercentage >= 50 ? 'Partially Independent' : 'Needs Significant Support'
});

export const selectTotalMonthlyIncome = (state) => {
    const formData = state.bioSocial?.formData || {};
    const incomeFields = [
        'clientCalWorks', 'clientEmployment', 'clientFoodStamps', 'clientWidowBen',
        'clientCS', 'clientGenRelief', 'clientSSI', 'clientSSDI', 'clientTANF',
        'clientWorkComp', 'clientUnEmp', 'clientVetBen', 'clientStDis', 
        'clientInherit', 'clientOtherInc'
    ];
    
    return incomeFields.reduce((total, field) => {
        const value = parseFloat(formData[field]) || 0;
        return total + value;
    }, 0);
};

// ✅ Export reducer
export default bioSocialSlice.reducer;