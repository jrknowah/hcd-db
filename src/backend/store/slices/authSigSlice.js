import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

// ✅ API Base URL - Update this to match your backend
const API_BASE_URL = '';

// ✅ Async Thunks for API Calls

// Fetch all authorization forms status for a client
export const fetchAuthorizationForms = createAsyncThunk(
    'authSig/fetchAuthorizationForms',
    async (clientID, { rejectWithValue, getState }) => {
        const { authSig } = getState();
        
        // Return mock data if enabled
        if (authSig.useMockData) {
            return {
                clientID,
                forms: {
                    orientation: {
                        completed: true,
                        completedAt: "2025-07-15T10:30:00Z",
                        completedBy: "john.doe@hospital.com",
                        checkboxes: {
                            "Client Rights and Responsibilities": true,
                            "Privacy Practices Notice": true,
                            "Consent for Treatment and Services": true,
                            "clientAuthHI": true,
                            "clientAuthRel": true 
                        },
                        signature: "John Doe",
                        completionPercentage: 100
                    },
                    clientRights: {
                        completed: false,
                        completedAt: null,
                        completedBy: null,
                        signature: null,
                        completionPercentage: 0
                    },
                    consentTreatment: {
                        completed: true,
                        completedAt: "2025-07-15T11:15:00Z",
                        completedBy: "john.doe@hospital.com",
                        signature: "John Doe",
                        completionPercentage: 100
                    }
                },
                lastUpdated: "2025-07-15T11:15:00Z",
                overallCompletion: 67,
                totalForms: 15,
                completedForms: 10
            };
        }

        try {
            const response = await fetch(`/api/authorization/${clientID}/forms`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // No forms found
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch authorization forms failed:', error);
            return rejectWithValue(error.message || 'Failed to fetch authorization forms');
        }
    }
);

// Fetch specific form data (like ClientOrientation)
export const fetchFormData = createAsyncThunk(
    'authSig/fetchFormData',
    async ({ clientID, formType }, { rejectWithValue, getState }) => {
        const { authSig } = getState();
        
        if (authSig.useMockData) {
            const mockData = {
                orientation: {
                    formID: 'ORIENT-2025-001',
                    clientID,
                    formType: 'orientation',
                    checkboxes: {
                        "Client Rights and Responsibilities": true,
                        "Privacy Practices Notice": true,
                        "Consent for Treatment and Services": false,
                        "clientAuthHI": true,
                        "clientAuthRel": false
                    },
                    signature: "John Doe",
                    completedAt: "2025-07-15T10:30:00Z",
                    completedBy: "john.doe@hospital.com",
                    completionPercentage: 60,
                    status: 'in_progress'
                },
                clientRights: {
                    formID: null,
                    clientID,
                    formType: 'clientRights',
                    acknowledged: false,
                    signature: null,
                    completedAt: null,
                    completionPercentage: 0,
                    status: 'not_started'
                }
            };
            
            return mockData[formType] || null;
        }

        try {
            const response = await fetch(`/api/authorization/${clientID}/form/${formType}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Form not found
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || `Failed to fetch ${formType} data`);
        }
    }
);

// Save form data - SINGLE DEFINITION (removed duplicate)
export const saveFormData = createAsyncThunk(
    'authSig/saveFormData',
    async ({ clientID, formType, formData }, { rejectWithValue, getState }) => {
        const { authSig } = getState();
        
        console.log(`Attempting to save form: ${formType} for client: ${clientID}`);
        console.log('Mock data enabled:', authSig.useMockData);
        
        if (authSig.useMockData) {
            console.log('Using mock data for save');
            return {
                formID: 'MOCK-' + formType.toUpperCase() + '-' + Date.now(),
                clientID,
                formType,
                ...formData,
                savedAt: new Date().toISOString(),
                status: formData.signature ? 'completed' : 'in_progress'
            };
        }

        try {
            // Transform data based on form type before sending
            let transformedData = { ...formData };
            
            // Special handling for consentPhoto form
            if (formType === 'consentPhoto') {
                // Convert object arrays to string arrays for backend
                if (Array.isArray(formData.clientReleaseItems)) {
                    transformedData.clientReleaseItems = formData.clientReleaseItems.map(item => 
                        typeof item === 'object' ? item.value : item
                    );
                }
                if (Array.isArray(formData.clientReleasePurposes)) {
                    transformedData.clientReleasePurposes = formData.clientReleasePurposes.map(item => 
                        typeof item === 'object' ? item.value : item
                    );
                }
                if (Array.isArray(formData.clientReleasePHTItems)) {
                    transformedData.clientReleasePHTItems = formData.clientReleasePHTItems.map(item => 
                        typeof item === 'object' ? item.value : item
                    );
                }
            }
            
            // Add clientID to the data
            transformedData.clientID = clientID;
            
            console.log(`Sending POST request to: /api/authorization/${clientID}/form/${formType}`);
            
            const response = await fetch(`/api/authorization/${clientID}/form/${formType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transformedData),
            });

            console.log(`Response status: ${response.status}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`Failed to save ${formType}:`, errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Save successful for ${formType}:`, data);
            
            return {
                ...data,
                formType // Ensure formType is included in response
            };
        } catch (error) {
            console.error(`Save form data failed for ${formType}:`, error);
            return rejectWithValue({
                message: error.message || 'Failed to save form data',
                formType
            });
        }
    }
);

// Bulk save multiple forms
export const saveBulkForms = createAsyncThunk(
    'authSig/saveBulkForms',
    async ({ clientID, formsData }, { rejectWithValue, getState }) => {
        const { authSig } = getState();
        
        if (authSig.useMockData) {
            return {
                clientID,
                savedForms: formsData.map(form => ({
                    ...form,
                    formID: 'BULK-' + form.formType.toUpperCase() + '-' + Date.now(),
                    savedAt: new Date().toISOString()
                })),
                totalSaved: formsData.length
            };
        }

        try {
            const response = await fetch(`/api/authorization/${clientID}/forms/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ forms: formsData }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to save bulk forms');
        }
    }
);

// Submit forms for final approval
export const submitFormsForApproval = createAsyncThunk(
    'authSig/submitFormsForApproval',
    async ({ clientID, submissionNotes }, { rejectWithValue, getState }) => {
        const { authSig } = getState();
        
        if (authSig.useMockData) {
            return {
                clientID,
                submissionID: 'SUB-' + Date.now(),
                submittedAt: new Date().toISOString(),
                status: 'submitted_for_review',
                submissionNotes
            };
        }

        try {
            const response = await fetch(`/api/authorization/${clientID}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ submissionNotes }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Failed to submit forms');
        }
    }
);

// Auto-save form data
export const autoSaveFormData = createAsyncThunk(
    'authSig/autoSaveFormData',
    async ({ clientID, formType, formData }, { rejectWithValue, getState }) => {
        const { authSig } = getState();
        
        if (authSig.useMockData) {
            return {
                clientID,
                formType,
                autoSavedAt: new Date().toISOString()
            };
        }

        try {
            const response = await fetch(`/api/authorization/${clientID}/form/${formType}/autosave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            return rejectWithValue(error.message || 'Auto-save failed');
        }
    }
);

// ✅ Initial State
const initialState = {
    // Form data by type
    forms: {
        orientation: {},
        clientRights: {},
        consentTreatment: {},
        preScreen: {},
        privacyPractice: {},
        lahmis: {},
        phiRelease: {},
        residencePolicy: {},
        authDisclosure: {},
        termination: {},
        advDirective: {},
        grievances: {},
        healthDisclosure: {},
        consentPhoto: {},
        housingAgreement: {}
    },
    
    // Loading states
    formsLoading: false,
    formLoading: {},
    saving: false,
    autoSaving: false,
    submitting: false,
    
    // Error states
    formsError: null,
    formErrors: {},
    saveError: null,
    submitError: null,
    
    // Success states
    saveSuccess: false,
    submitSuccess: false,
    autoSaveSuccess: false,
    
    // Overall progress
    overallCompletion: 0,
    totalForms: 15,
    completedForms: 0,
    
    // Current form state
    activeForm: null,
    unsavedChanges: false,
    lastAutoSave: null,
    
    // UI state
    filterBy: 'all', // 'all', 'completed', 'pending', 'required'
    sortBy: 'priority', // 'priority', 'name', 'completion'
    viewMode: 'grid', // 'grid', 'list'
    
    // Settings
    autoSaveEnabled: true,
    autoSaveInterval: 30000, // 30 seconds
    useMockData: false, // Changed to false to use real API
    
    // Submission tracking
    submissionStatus: 'draft', // 'draft', 'submitted', 'approved', 'rejected'
    submissionHistory: [],
    lastSubmission: null
};

// ✅ Create Slice
const authSigSlice = createSlice({
    name: 'authSig',
    initialState,
    reducers: {
        // Clear all errors
        clearErrors: (state) => {
            state.formsError = null;
            state.formErrors = {};
            state.saveError = null;
            state.submitError = null;
        },
        
        // Clear success flags
        clearSuccessFlags: (state) => {
            state.saveSuccess = false;
            state.submitSuccess = false;
            state.autoSaveSuccess = false;
        },
        
        // Set active form
        setActiveForm: (state, action) => {
            state.activeForm = action.payload;
        },
        
        // Set unsaved changes flag
        setUnsavedChanges: (state, action) => {
            state.unsavedChanges = action.payload;
        },
        
        // Update form data locally (for optimistic updates)
        updateFormLocal: (state, action) => {
            const { formType, formData } = action.payload;
            state.forms[formType] = { ...state.forms[formType], ...formData };
            state.unsavedChanges = true;
        },
        
        // Set filter and sort options
        setFilterBy: (state, action) => {
            state.filterBy = action.payload;
        },
        
        setViewMode: (state, action) => {
            state.viewMode = action.payload;
        },
        
        setSortBy: (state, action) => {
            state.sortBy = action.payload;
        },
        
        // Toggle settings
        toggleAutoSave: (state) => {
            state.autoSaveEnabled = !state.autoSaveEnabled;
        },
        
        toggleMockData: (state) => {
            state.useMockData = !state.useMockData;
            console.log('Mock data toggled to:', !state.useMockData);
        },
        
        // Reset form data
        resetFormData: (state, action) => {
            const formType = action.payload;
            state.forms[formType] = {};
            state.formErrors[formType] = null;
        },
        
        // Reset all forms
        resetAllForms: (state) => {
            state.forms = Object.keys(state.forms).reduce((acc, key) => {
                acc[key] = {};
                return acc;
            }, {});
            state.formErrors = {};
            state.overallCompletion = 0;
            state.completedForms = 0;
            state.unsavedChanges = false;
        }
    },
    extraReducers: (builder) => {
        builder
            // ✅ Fetch Authorization Forms
            .addCase(fetchAuthorizationForms.pending, (state) => {
                state.formsLoading = true;
                state.formsError = null;
            })
            .addCase(fetchAuthorizationForms.fulfilled, (state, action) => {
                state.formsLoading = false;
                if (action.payload) {
                    state.forms = { ...state.forms, ...action.payload.forms };
                    state.overallCompletion = action.payload.overallCompletion || 0;
                    state.totalForms = action.payload.totalForms || 15;
                    state.completedForms = action.payload.completedForms || 0;
                }
                state.formsError = null;
            })
            .addCase(fetchAuthorizationForms.rejected, (state, action) => {
                state.formsLoading = false;
                state.formsError = action.payload || 'Failed to fetch authorization forms';
            })
            
            // ✅ Fetch Form Data
            .addCase(fetchFormData.pending, (state, action) => {
                const formType = action.meta.arg.formType;
                state.formLoading[formType] = true;
                state.formErrors[formType] = null;
            })
            .addCase(fetchFormData.fulfilled, (state, action) => {
                const formType = action.meta.arg.formType;
                state.formLoading[formType] = false;
                if (action.payload) {
                    state.forms[formType] = action.payload;
                }
                state.formErrors[formType] = null;
            })
            .addCase(fetchFormData.rejected, (state, action) => {
                const formType = action.meta.arg.formType;
                state.formLoading[formType] = false;
                state.formErrors[formType] = action.payload || `Failed to fetch ${formType} data`;
            })
            
            // ✅ Save Form Data - FIXED
            .addCase(saveFormData.pending, (state) => {
                state.saving = true;
                state.saveError = null;
                state.saveSuccess = false;
            })
            .addCase(saveFormData.fulfilled, (state, action) => {
                state.saving = false;
                
                // Get formType from payload or meta
                const formType = action.payload?.formType || action.meta?.arg?.formType;
                
                if (formType) {
                    // Update the form data
                    state.forms[formType] = {
                        ...state.forms[formType],
                        ...action.payload,
                        lastSaved: new Date().toISOString()
                    };
                    
                    // Update completion tracking
                    if (action.payload.status === 'completed' && state.forms[formType].status !== 'completed') {
                        state.completedForms = (state.completedForms || 0) + 1;
                        state.overallCompletion = Math.round((state.completedForms / state.totalForms) * 100);
                    }
                }
                
                state.saveSuccess = true;
                state.saveError = null;
                state.unsavedChanges = false;
                
                console.log(`Form ${formType} saved successfully in Redux`);
            })
            .addCase(saveFormData.rejected, (state, action) => {
                state.saving = false;
                
                // Get formType from payload or meta
                const formType = action.payload?.formType || action.meta?.arg?.formType;
                const errorMessage = action.payload?.message || action.payload || 'Failed to save form data';
                
                state.saveError = errorMessage;
                
                if (formType) {
                    state.formErrors[formType] = errorMessage;
                }
                
                state.saveSuccess = false;
                
                console.error(`Save failed for form ${formType}:`, errorMessage);
            })
            
            // ✅ Auto-save Form Data
            .addCase(autoSaveFormData.pending, (state) => {
                state.autoSaving = true;
            })
            .addCase(autoSaveFormData.fulfilled, (state, action) => {
                state.autoSaving = false;
                state.autoSaveSuccess = true;
                state.lastAutoSave = action.payload.autoSavedAt;
            })
            .addCase(autoSaveFormData.rejected, (state) => {
                state.autoSaving = false;
                state.autoSaveSuccess = false;
            })
            
            // ✅ Submit Forms for Approval
            .addCase(submitFormsForApproval.pending, (state) => {
                state.submitting = true;
                state.submitError = null;
                state.submitSuccess = false;
            })
            .addCase(submitFormsForApproval.fulfilled, (state, action) => {
                state.submitting = false;
                state.submitSuccess = true;
                state.submissionStatus = 'submitted';
                state.lastSubmission = action.payload;
                state.submitError = null;
            })
            .addCase(submitFormsForApproval.rejected, (state, action) => {
                state.submitting = false;
                state.submitError = action.payload || 'Failed to submit forms';
                state.submitSuccess = false;
            })
            
            // ✅ Bulk Save Forms
            .addCase(saveBulkForms.pending, (state) => {
                state.saving = true;
                state.saveError = null;
            })
            .addCase(saveBulkForms.fulfilled, (state, action) => {
                state.saving = false;
                // Update all saved forms
                if (action.payload?.savedForms) {
                    action.payload.savedForms.forEach(form => {
                        if (form.formType) {
                            state.forms[form.formType] = form;
                        }
                    });
                }
                state.saveSuccess = true;
                state.saveError = null;
            })
            .addCase(saveBulkForms.rejected, (state, action) => {
                state.saving = false;
                state.saveError = action.payload || 'Failed to save forms';
                state.saveSuccess = false;
            });
    }
});

// ✅ Export Actions
export const {
    clearErrors,
    clearSuccessFlags,
    setActiveForm,
    setUnsavedChanges,
    updateFormLocal,
    setFilterBy,
    setViewMode,
    setSortBy,
    toggleAutoSave,
    toggleMockData,
    resetFormData,
    resetAllForms
} = authSigSlice.actions;

// ✅ Selectors
export const selectAllForms = (state) => state.authSig.forms;
export const selectFormByType = (formType) => (state) => state.authSig.forms[formType];
export const selectFormsLoading = (state) => state.authSig.formsLoading;
export const selectFormLoading = (formType) => (state) => state.authSig.formLoading[formType];
export const selectSaving = (state) => state.authSig.saving;
export const selectAutoSaving = (state) => state.authSig.autoSaving;
export const selectSaveSuccess = (state) => state.authSig.saveSuccess;
export const selectSaveError = (state) => state.authSig.saveError;
export const selectOverallCompletion = (state) => state.authSig.overallCompletion;
export const selectActiveForm = (state) => state.authSig.activeForm;
export const selectUnsavedChanges = (state) => state.authSig.unsavedChanges;
export const selectSubmissionStatus = (state) => state.authSig.submissionStatus;
export const selectUseMockData = (state) => state.authSig.useMockData;

// ✅ Export Reducer
export default authSigSlice.reducer;