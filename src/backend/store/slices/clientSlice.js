import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import mockData from '../../../utils/mockData';



// ✅ FIX: Simple, clean API URL construction
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || false;

console.log('🔧 Client Slice Configuration:');
console.log('  API URL:', API_BASE_URL);
console.log('  USE_MOCK_DATA:', USE_MOCK_DATA);
console.log('  Environment Variable:', import.meta.env.VITE_USE_MOCK_DATA);

// ✅ FIX: Use axios directly, no separate instance needed
export const fetchClients = createAsyncThunk('clients/fetchClients', async (_, { rejectWithValue }) => {
  try {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      console.log('📊 Using mock data for clients');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      return mockData.clients;
    }
    
    // Otherwise use real API
    console.log('🌐 Fetching real clients from:', `${API_BASE_URL}/api/clients`);
    const response = await axios.get(`${API_BASE_URL}/api/clients`);
    console.log('✅ Real clients fetched:', response.data.length, 'clients');
    return response.data;
  } catch (error) {
    console.error('❌ Fetch clients error:', error);
    
    // DON'T fallback to mock data on error - show the real error
    // Remove this fallback to see actual API issues
    /*
    if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      console.log('📊 API unavailable, falling back to mock data');
      return mockData.clients;
    }
    */
    
    return rejectWithValue(error.message || 'Failed to fetch clients');
  }
});

export const addClient = createAsyncThunk('clients/addClient', async (clientData, { rejectWithValue }) => {
  try {
    if (USE_MOCK_DATA) {
      console.log('📊 Mock: Adding client');
      await new Promise(resolve => setTimeout(resolve, 500));
      const newClient = {
        ...clientData,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      mockData.clients.push(newClient);
      return newClient;
    }
    
    console.log('🌐 Adding real client to database');
    const response = await axios.post(`${API_BASE_URL}/api/clients`, clientData);
    console.log('✅ Client added successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Add client error:', error);
    return rejectWithValue(error.message || 'Failed to add client');
  }
});

export const fetchClientById = createAsyncThunk('clients/fetchClientById', async (clientID, { rejectWithValue }) => {
  try {
    if (USE_MOCK_DATA) {
      console.log('📊 Mock: Fetching client by ID:', clientID);
      const mockClient = mockData.clients.find(c => c.clientID === clientID);
      if (mockClient) {
        return mockClient;
      }
      throw new Error('Client not found in mock data');
    }
    
    // Fix: Correct API endpoint
    console.log('🌐 Fetching real client by ID:', `${API_BASE_URL}/api/clients/${clientID}`);
    const response = await axios.get(`${API_BASE_URL}/api/clients/${clientID}`);
    console.log('✅ Client fetched by ID successfully:', response.data);
    
    // Cache it immediately
    if (response.data?.clientID) {
      sessionStorage.setItem(`client_${response.data.clientID}`, JSON.stringify(response.data));
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Fetch client by ID error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch client';
    return rejectWithValue(errorMessage);
  }
});

// ✅ FIXED: updateClient to use axios and consistent URL pattern with better error handling
export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ clientID, updates }, { rejectWithValue }) => {
    try {
      if (USE_MOCK_DATA) {
        console.log('📊 Mock: Updating client');
        await new Promise(resolve => setTimeout(resolve, 500));
        const index = mockData.clients.findIndex(c => c.clientID === clientID);
        if (index !== -1) {
          mockData.clients[index] = { ...mockData.clients[index], ...updates };
          return mockData.clients[index];
        }
        throw new Error('Client not found');
      }
      
      console.log('🌐 Updating real client in database');
      const response = await axios.put(`${API_BASE_URL}/api/clients/${clientID}`, updates);
      console.log('✅ Client updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Update client error:', error);
      return rejectWithValue(error.message || 'Failed to update client');
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
      // Cache the selected client for persistence
      if (action.payload?.clientID) {
        sessionStorage.setItem(`client_${action.payload.clientID}`, JSON.stringify(action.payload));
      }
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
    },
    setClientsList: (state, action) => {
      state.clientsList = action.payload;
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
        state.error = null;
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedClient = action.payload;
        // Also update in clients array if exists
        const index = state.clients.findIndex(c => c.clientID === action.payload.clientID);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update client
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

export const { setSelectedClient, clearSelectedClient, clearError, setClientsList } = clientSlice.actions;

// Selectors
export const selectAllClients = (state) => state.clients.clients;
export const selectSelectedClient = (state) => state.clients.selectedClient;
export const selectClientsLoading = (state) => state.clients.loading;
export const selectClientsError = (state) => state.clients.error;

export default clientSlice.reducer;