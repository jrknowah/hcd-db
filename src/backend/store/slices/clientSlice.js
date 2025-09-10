import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// ✅ FIX: Simple, clean API URL construction
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ✅ FIX: Use axios directly, no separate instance needed
export const fetchClients = createAsyncThunk('clients/fetchClients', async (_, { rejectWithValue }) => {
  try {
    console.log('Fetching clients from:', `${API_BASE_URL}/clients`);
    const response = await axios.get(`${API_BASE_URL}/clients`);
    console.log('Clients fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Fetch clients error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch clients';
    return rejectWithValue(errorMessage);
  }
});

export const addClient = createAsyncThunk('clients/addClient', async (clientData, { rejectWithValue }) => {
  try {
    console.log('Adding client to:', `${API_BASE_URL}/clients`);
    console.log('Client data:', clientData);
    const response = await axios.post(`${API_BASE_URL}/clients`, clientData);
    console.log('Client added successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Add client error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to add client';
    return rejectWithValue(errorMessage);
  }
});

export const fetchClientById = createAsyncThunk('clients/fetchClientById', async (clientID, { rejectWithValue }) => {
  try {
    console.log('Fetching client by ID:', `${API_BASE_URL}/clients/${clientID}`);
    const response = await axios.get(`${API_BASE_URL}/clients/${clientID}`);
    console.log('Client fetched by ID successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Fetch client by ID error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch client';
    return rejectWithValue(errorMessage);
  }
});

// ✅ FIXED: updateClient to use axios and consistent URL pattern with better error handling
export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ clientID, updates }, { rejectWithValue }) => {
    try {
      console.log('🔄 Redux updateClient called with:', { clientID, updates });
      console.log('🔄 API URL:', `${API_BASE_URL}/clients/${clientID}`);
      
      const response = await axios.put(`${API_BASE_URL}/clients/${clientID}`, updates);
      
      console.log('✅ API Response:', response.data);
      console.log('✅ Response status:', response.status);
      
      return response.data;
    } catch (error) {
      console.error('❌ Update client API error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update client';
      
      return rejectWithValue(errorMessage);
    }
  }
);

// Client slice
const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    clients: [],
    selectedClient: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedClient: (state, action) => {
      state.selectedClient = action.payload;
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch clients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add client
      .addCase(addClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.loading = false;
        state.clients.push(action.payload);
        state.selectedClient = action.payload;
      })
      .addCase(addClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch client by ID
      .addCase(fetchClientById.pending, (state) => {
        state.loading = true;
        state.error = null; // ✅ Clear error on pending
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedClient = action.payload;
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // ✅ Update client cases
      .addCase(updateClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.loading = false;
        const updatedClient = action.payload;
        
        // Update the client in the clients array
        const index = state.clients.findIndex(client => client.clientID === updatedClient.clientID);
        if (index !== -1) {
          state.clients[index] = updatedClient;
        }
        
        // Update selectedClient if it's the same one being updated
        if (state.selectedClient && state.selectedClient.clientID === updatedClient.clientID) {
          state.selectedClient = updatedClient;
        }
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update client';
      });
  },
});

export const { setSelectedClient, clearSelectedClient, clearError } = clientSlice.actions;

// Selectors
export const selectAllClients = (state) => state.clients.clients;
export const selectSelectedClient = (state) => state.clients.selectedClient;
export const selectClientsLoading = (state) => state.clients.loading;
export const selectClientsError = (state) => state.clients.error;

export default clientSlice.reducer;