// src/store/apps/notes/medFaceSheetSlice.js
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
const MOCK_MEDICAL_INFO = {
  clientID: 'mock-123',
  clientMedConditions: [
    { value: 'diabetes', label: 'Diabetes Type 2' },
    { value: 'hypertension', label: 'Hypertension' }
  ],
  clientAddMedHistory: 'Patient has a history of diabetes diagnosed 5 years ago. Currently on metformin. Blood pressure has been elevated in recent visits.',
  clientMedPertinent: 'Patient reports occasional dizziness and fatigue. Family history of cardiovascular disease.',
  clientPreviousLab: 'Yes',
  clientAllergies: [
    { value: 'penicillin', label: 'Penicillin - Severe allergic reaction' },
    { value: 'shellfish', label: 'Shellfish - Anaphylaxis' }
  ]
};

const MOCK_APPOINTMENTS = [
  {
    appointmentID: 1,
    clientID: 'mock-123',
    medApptDate: '2024-03-20',
    medApptLoc: 'Main Medical Center',
    medApptType: 'Follow-up',
    medApptProv: 'Dr. Smith',
    medApptTranport: 'Yes',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    appointmentID: 2,
    clientID: 'mock-123',
    medApptDate: '2024-03-25',
    medApptLoc: 'Cardiology Clinic',
    medApptType: 'Specialist Consultation',
    medApptProv: 'Dr. Johnson',
    medApptTranport: 'No',
    createdAt: '2024-03-02T14:00:00Z'
  }
];

const MOCK_CLIENT_ALLERGIES = [
  { value: 'penicillin', label: 'Penicillin' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'nuts', label: 'Tree Nuts' },
  { value: 'dairy', label: 'Dairy Products' },
  { value: 'latex', label: 'Latex' },
  { value: 'sulfa', label: 'Sulfa Drugs' }
];

// ===== ASYNC THUNKS (MUST BE DEFINED BEFORE SLICE) =====

// 🔄 Async thunk to fetch medical information
export const fetchMedicalInfo = createAsyncThunk(
  "medFaceSheet/fetchMedicalInfo",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock medical info for", clientID);
      return MOCK_MEDICAL_INFO;
    }

    try {
      const response = await axios.get(`${API_URL}/api/medical/info/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching medical info:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save medical information
export const saveMedicalInfo = createAsyncThunk(
  "medFaceSheet/saveMedicalInfo",
  async ({ clientID, medicalData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating medical info save for", clientID);
      return {
        ...medicalData,
        clientID,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/medical/info/${clientID}`, medicalData);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving medical info:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// 🔄 Async thunk to fetch appointments
export const fetchAppointments = createAsyncThunk(
  "medFaceSheet/fetchAppointments",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock appointments for", clientID);
      return MOCK_APPOINTMENTS;
    }

    try {
      const response = await axios.get(`${API_URL}/api/medical/appointments/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching appointments:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save appointment
export const saveAppointment = createAsyncThunk(
  "medFaceSheet/saveAppointment",
  async ({ clientID, appointmentData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating appointment save for", clientID);
      return {
        appointmentID: Date.now(),
        clientID,
        ...appointmentData,
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/medical/appointments/${clientID}`, appointmentData);
      return response.data;
    } catch (error) {
      console.error("❌ Error saving appointment:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// ✏️ Async thunk to edit appointment
export const editAppointment = createAsyncThunk(
  "medFaceSheet/editAppointment",
  async ({ clientID, appointmentID, appointmentData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating appointment update for", appointmentID);
      return {
        appointmentID,
        clientID,
        ...appointmentData,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(`${API_URL}/api/medical/appointments/${appointmentID}`, appointmentData);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating appointment:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Update failed");
    }
  }
);

// 🗑️ Async thunk to delete appointment
export const deleteAppointment = createAsyncThunk(
  "medFaceSheet/deleteAppointment",
  async ({ clientID, appointmentID }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating appointment delete for", appointmentID);
      return appointmentID;
    }

    try {
      await axios.delete(`${API_URL}/api/medical/appointments/${appointmentID}`);
      return appointmentID;
    } catch (error) {
      console.error("❌ Error deleting appointment:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Delete failed");
    }
  }
);

// 🔄 Async thunk to fetch client allergies options
export const fetchClientAllergies = createAsyncThunk(
  "medFaceSheet/fetchClientAllergies",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock client allergies for", clientID);
      return MOCK_CLIENT_ALLERGIES;
    }

    try {
      const response = await axios.get(`${API_URL}/api/medical/allergies/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching client allergies:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Fetch failed");
    }
  }
);

// 💾 Async thunk to save client allergies
export const saveClientAllergies = createAsyncThunk(
  "medFaceSheet/saveClientAllergies",
  async ({ clientID, allergies }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating client allergies save for", clientID);
      return {
        clientID,
        allergies,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/medical/allergies/${clientID}`, { allergies });
      return response.data;
    } catch (error) {
      console.error("❌ Error saving client allergies:", error);
      return thunkAPI.rejectWithValue(error.response?.data || "Save failed");
    }
  }
);

// ===== INITIAL STATE =====

const initialState = {
  // Medical information
  medicalInfo: {},
  medicalLoading: false,
  medicalError: null,
  
  // Appointments
  appointments: [],
  appointmentsLoading: false,
  appointmentsError: null,
  
  // Client allergies options
  clientAllergies: [],
  allergiesLoading: false,
  allergiesError: null,
  
  // Client face form data
  clientFaceForm: {},
  clientFaceLoading: false,
  clientFaceError: null,
  
  // General loading state
  loading: false,
  error: null,
};

// ===== SLICE DEFINITION =====

const medFaceSheetSlice = createSlice({
  name: "medFaceSheet",
  initialState,
  reducers: {
    clearMedicalError(state) {
      state.medicalError = null;
      state.error = null;
    },
    clearAppointmentsError(state) {
      state.appointmentsError = null;
      state.error = null;
    },
    clearAllergiesError(state) {
      state.allergiesError = null;
      state.error = null;
    },
    clearClientFaceError(state) {
      state.clientFaceError = null;
      state.error = null;
    },
    resetMedicalState(state) {
      return initialState;
    },
    // Client face form management
    setClientFaceFormState(state, action) {
      state.clientFaceForm = { ...state.clientFaceForm, ...action.payload };
    },
    resetClientFaceForm(state) {
      state.clientFaceForm = {};
    },
    // Mock data management
    setMockData(state, action) {
      const { clientFaceForm, allergies, medicalInfo, appointments } = action.payload;
      if (clientFaceForm) {
        state.clientFaceForm = clientFaceForm;
      }
      if (allergies) {
        state.clientAllergies = allergies;
      }
      if (medicalInfo) {
        state.medicalInfo = medicalInfo;
      }
      if (appointments) {
        state.appointments = appointments;
      }
      // Clear loading states
      state.clientFaceLoading = false;
      state.allergiesLoading = false;
      state.medicalLoading = false;
      state.appointmentsLoading = false;
      state.loading = false;
      // Clear error states
      state.clientFaceError = null;
      state.allergiesError = null;
      state.medicalError = null;
      state.appointmentsError = null;
      state.error = null;
    },
    // Local state updates for optimistic updates
    addAppointmentLocal(state, action) {
      state.appointments.unshift({
        ...action.payload,
        appointmentID: `temp-${Date.now()}`,
        createdAt: new Date().toISOString()
      });
    },
    updateAppointmentLocal(state, action) {
      const index = state.appointments.findIndex(
        appointment => appointment.appointmentID === action.payload.appointmentID
      );
      if (index !== -1) {
        state.appointments[index] = {
          ...state.appointments[index],
          ...action.payload,
          updatedAt: new Date().toISOString()
        };
      }
    },
    removeAppointmentLocal(state, action) {
      state.appointments = state.appointments.filter(
        appointment => appointment.appointmentID !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch medical info
      .addCase(fetchMedicalInfo.pending, (state) => {
        state.medicalLoading = true;
        state.loading = true;
        state.medicalError = null;
      })
      .addCase(fetchMedicalInfo.fulfilled, (state, action) => {
        state.medicalLoading = false;
        state.loading = false;
        state.medicalInfo = action.payload;
        state.medicalError = null;
      })
      .addCase(fetchMedicalInfo.rejected, (state, action) => {
        state.medicalLoading = false;
        state.loading = false;
        state.medicalError = action.payload;
        state.error = action.payload;
      })
      
      // Save medical info
      .addCase(saveMedicalInfo.pending, (state) => {
        state.medicalLoading = true;
        state.loading = true;
      })
      .addCase(saveMedicalInfo.fulfilled, (state, action) => {
        state.medicalLoading = false;
        state.loading = false;
        state.medicalInfo = action.payload;
        state.medicalError = null;
      })
      .addCase(saveMedicalInfo.rejected, (state, action) => {
        state.medicalLoading = false;
        state.loading = false;
        state.medicalError = action.payload;
        state.error = action.payload;
      })
      
      // Fetch appointments
      .addCase(fetchAppointments.pending, (state) => {
        state.appointmentsLoading = true;
        state.loading = true;
        state.appointmentsError = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.appointmentsLoading = false;
        state.loading = false;
        state.appointments = action.payload;
        state.appointmentsError = null;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.appointmentsLoading = false;
        state.loading = false;
        state.appointmentsError = action.payload;
        state.error = action.payload;
      })
      
      // Save appointment
      .addCase(saveAppointment.pending, (state) => {
        state.appointmentsLoading = true;
        state.loading = true;
      })
      .addCase(saveAppointment.fulfilled, (state, action) => {
        state.appointmentsLoading = false;
        state.loading = false;
        state.appointments.unshift(action.payload);
        state.appointmentsError = null;
      })
      .addCase(saveAppointment.rejected, (state, action) => {
        state.appointmentsLoading = false;
        state.loading = false;
        state.appointmentsError = action.payload;
        state.error = action.payload;
      })
      
      // Edit appointment
      .addCase(editAppointment.pending, (state) => {
        state.appointmentsLoading = true;
        state.loading = true;
      })
      .addCase(editAppointment.fulfilled, (state, action) => {
        state.appointmentsLoading = false;
        state.loading = false;
        const index = state.appointments.findIndex(
          appointment => appointment.appointmentID === action.payload.appointmentID
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.appointmentsError = null;
      })
      .addCase(editAppointment.rejected, (state, action) => {
        state.appointmentsLoading = false;
        state.loading = false;
        state.appointmentsError = action.payload;
        state.error = action.payload;
      })
      
      // Delete appointment
      .addCase(deleteAppointment.fulfilled, (state, action) => {
        state.appointments = state.appointments.filter(
          appointment => appointment.appointmentID !== action.payload
        );
      })
      
      // Fetch client allergies
      .addCase(fetchClientAllergies.pending, (state) => {
        state.allergiesLoading = true;
        state.allergiesError = null;
      })
      .addCase(fetchClientAllergies.fulfilled, (state, action) => {
        state.allergiesLoading = false;
        state.clientAllergies = action.payload;
        state.allergiesError = null;
      })
      .addCase(fetchClientAllergies.rejected, (state, action) => {
        state.allergiesLoading = false;
        state.allergiesError = action.payload;
      })
      
      // Save client allergies
      .addCase(saveClientAllergies.pending, (state) => {
        state.allergiesLoading = true;
        state.loading = true;
        state.allergiesError = null;
      })
      .addCase(saveClientAllergies.fulfilled, (state, action) => {
        state.allergiesLoading = false;
        state.loading = false;
        // Update the allergies list with the saved data
        if (action.payload.allergies) {
          state.clientAllergies = action.payload.allergies;
        }
        state.allergiesError = null;
      })
      .addCase(saveClientAllergies.rejected, (state, action) => {
        state.allergiesLoading = false;
        state.loading = false;
        state.allergiesError = action.payload;
        state.error = action.payload;
      });
  },
});

// ===== EXPORTS =====

export const {
  clearMedicalError,
  clearAppointmentsError,
  clearAllergiesError,
  clearClientFaceError,
  resetMedicalState,
  setClientFaceFormState,
  resetClientFaceForm,
  setMockData,
  addAppointmentLocal,
  updateAppointmentLocal,
  removeAppointmentLocal,
} = medFaceSheetSlice.actions;

// Selectors
export const selectMedicalInfo = (state) => state.medFaceSheet?.medicalInfo || {};
export const selectAppointments = (state) => state.medFaceSheet?.appointments || [];
export const selectClientAllergies = (state) => state.medFaceSheet?.clientAllergies || [];
export const selectClientFaceForm = (state) => state.medFaceSheet?.clientFaceForm || {};
export const selectMedicalLoading = (state) => state.medFaceSheet?.loading || false;
export const selectMedicalError = (state) => state.medFaceSheet?.error || null;
export const selectAllergiesLoading = (state) => state.medFaceSheet?.allergiesLoading || false;
export const selectClientFaceLoading = (state) => state.medFaceSheet?.clientFaceLoading || false;

// ✅ DEFAULT EXPORT
export default medFaceSheetSlice.reducer;