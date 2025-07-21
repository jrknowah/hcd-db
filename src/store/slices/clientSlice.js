import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Adjust the API base URL as needed
const API_BASE_URL = '/api/clients';

// Async thunks
export const fetchClients = createAsyncThunk('client/fetchClients', async () => {
  const response = await axios.get(API_BASE_URL);
  return response.data;
});

export const addClient = createAsyncThunk('client/addClient', async (clientData) => {
  const response = await axios.post(API_BASE_URL, clientData);
  return response.data;
});

// Slice
const clientSlice = createSlice({
  name: 'client',
  initialState: {
    clients: [],
    selectedClient: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedClient: (state, action) => {
      // Set selected client only if it's different from the current one
      if (state.selectedClient?.clientID !== action.payload.clientID) {
        state.selectedClient = action.payload;
      }
    },
    clearSelectedClient: (state) => {
      state.selectedClient = null;
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
        state.error = action.error.message;
      })
      // Add client
      .addCase(addClient.pending, (state) => {
        state.loading = true;
      })
      .addCase(addClient.fulfilled, (state, action) => {
        state.loading = false;
        state.clients.push(action.payload);
      })
      .addCase(addClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setSelectedClient, clearSelectedClient } = clientSlice.actions;

export const selectClients = (state) => state.client.clients;
export const selectSelectedClient = (state) => state.client.selectedClient;
export const selectClientLoading = (state) => state.client.loading;
export const selectClientError = (state) => state.client.error;

export default clientSlice.reducer;
