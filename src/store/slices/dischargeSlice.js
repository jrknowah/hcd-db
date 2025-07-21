import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const fetchClientDischarge = createAsyncThunk(
  "discharge/fetchClientDischarge",
  async (clientID) => {
    const response = await axios.get(`${API}/getClientDischarge/${clientID}`);
    return response.data;
  }
);

export const saveClientDischarge = createAsyncThunk(
  "discharge/saveClientDischarge",
  async ({ clientID, dischargeData }) => {
    const payload = { ...dischargeData, clientID };
    await axios.post(`${API}/saveClientDischarge`, payload);
    return payload;
  }
);

const dischargeSlice = createSlice({
  name: "discharge",
  initialState: {
    data: {},
    status: "idle",
    error: null,
  },
  reducers: {
    setDischargeForm: (state, action) => {
      state.data = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientDischarge.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchClientDischarge.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload || {};
      })
      .addCase(fetchClientDischarge.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(saveClientDischarge.fulfilled, (state, action) => {
        state.data = action.payload;
      });
  },
});

export const { setDischargeForm } = dischargeSlice.actions;
export default dischargeSlice.reducer;
