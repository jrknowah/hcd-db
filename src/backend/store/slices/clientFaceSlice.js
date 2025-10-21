// store/slices/clientFaceSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const HCD_API = `${import.meta.env.VITE_API_URL}`;

// Mock data
const MOCK_CLIENT_FACE_DATA = {
  clientContactNum: '(555) 123-4567',
  clientContactAltNum: '(555) 987-6543',
  clientEmail: 'john.doe@example.com',
  clientEmgContactName: 'Jane Doe',
  clientEmgContactNum: '(555) 111-2222',
  clientEmgContactRel: 'Spouse',
  clientEmgContactAddress: '123 Main St, Anytown, ST 12345',
  clientMedInsType: 'Medicare',
  clientMedCarrier: 'Blue Cross Blue Shield',
  clientMedInsNum: 'MED123456789',
  clientAllergyComments: 'See Medical Face Sheet for allergy details'
};

// ✅ Async thunks
export const fetchClientFaceData = createAsyncThunk(
  'clientFace/fetchData',
  async (clientID, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          formData: MOCK_CLIENT_FACE_DATA
        };
      }

      // ✅ Only fetch ClientFace data (allergies now in medical_face_sheet)
      const response = await axios.get(`${HCD_API}/api/getClientFace/${clientID}`);

      return {
        formData: response.data || {}
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch client face data');
    }
  }
);

export const saveClientFaceData = createAsyncThunk(
  'clientFace/saveData',
  async ({ clientID, formData }, { rejectWithValue }) => {
    try {
      const isDevelopment = import.meta.env.MODE === 'development';
      const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
      
      if (shouldUseMockData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          formData,
          message: 'Client face data saved successfully (Mock)'
        };
      }

      // ✅ Save only ClientFace data (allergies saved separately in Section 5)
      await axios.post(`${HCD_API}/api/saveClientFace`, {
        ...formData,
        clientID
      });

      return {
        formData,
        message: 'Client face data saved successfully'
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save client face data');
    }
  }
);

// ✅ Redux slice without allergy management
const clientFaceSlice = createSlice({
  name: 'clientFace',
  initialState: {
    formData: {},
    loading: false,
    saving: false,
    error: null,
    validationErrors: [],
    saveSuccess: false,
    currentClientID: null,
    dataLoaded: false
  },
  reducers: {
    updateFormField: (state, action) => {
      const { field, value } = action.payload;
      state.formData[field] = value;
      state.validationErrors = state.validationErrors.filter(
        error => !error.toLowerCase().includes(field.toLowerCase())
      );
    },
    
    updateFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    
    setValidationErrors: (state, action) => {
      state.validationErrors = action.payload;
    },
    
    clearErrors: (state) => {
      state.error = null;
      state.validationErrors = [];
    },
    
    clearSuccess: (state) => {
      state.saveSuccess = false;
    },
    
    setCurrentClient: (state, action) => {
      if (action.payload !== state.currentClientID) {
        state.currentClientID = action.payload;
        state.formData = {};
        state.dataLoaded = false;
        state.error = null;
        state.validationErrors = [];
      }
    },
    
    resetForm: (state) => {
      state.formData = {};
      state.validationErrors = [];
      state.error = null;
      state.dataLoaded = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientFaceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientFaceData.fulfilled, (state, action) => {
        state.loading = false;
        state.formData = action.payload.formData || {};
        state.dataLoaded = true;
      })
      .addCase(fetchClientFaceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch data';
        state.dataLoaded = false;
      })
      .addCase(saveClientFaceData.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(saveClientFaceData.fulfilled, (state, action) => {
        state.saving = false;
        state.saveSuccess = true;
        state.formData = action.payload.formData;
        state.validationErrors = [];
      })
      .addCase(saveClientFaceData.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Failed to save data';
        state.saveSuccess = false;
      });
  }
});

// ✅ Export actions
export const {
  updateFormField,
  updateFormData,
  setValidationErrors,
  clearErrors,
  clearSuccess, 
  setCurrentClient,
  resetForm
} = clientFaceSlice.actions;

// ✅ Export selectors
export const selectFormData = (state) => state.clientFace.formData;
export const selectLoading = (state) => state.clientFace.loading;
export const selectSaving = (state) => state.clientFace.saving;
export const selectError = (state) => state.clientFace.error;
export const selectValidationErrors = (state) => state.clientFace.validationErrors;
export const selectSaveSuccess = (state) => state.clientFace.saveSuccess;
export const selectDataLoaded = (state) => state.clientFace.dataLoaded;

export default clientFaceSlice.reducer;