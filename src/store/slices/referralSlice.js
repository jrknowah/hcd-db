import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const fetchReferralData = createAsyncThunk(
  "referral/fetchReferralData",
  async (clientID) => {
    const { data } = await axios.get(`${API}/clientReferrals/${clientID}`);
    return data;
  }
);

export const saveReferralData = createAsyncThunk(
  "referral/saveReferralData",
  async ({ clientID, referrals }) => {
    await axios.post(`${API}/saveClientReferrals`, { clientID, ...referrals });
    return referrals;
  }
);

const referralSlice = createSlice({
  name: "referral",
  initialState: {
    referrals: {
      lahsaReferral: "",
      odrReferral: "",
      dhsReferral: "",
    },
    status: "idle",
  },
  reducers: {
    updateReferralField(state, action) {
      const { field, value } = action.payload;
      state.referrals[field] = value;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReferralData.fulfilled, (state, action) => {
        state.referrals = action.payload || {};
        state.status = "succeeded";
      })
      .addCase(saveReferralData.fulfilled, (state, action) => {
        state.referrals = action.payload;
        state.status = "saved";
      });
  },
});

export const { updateReferralField } = referralSlice.actions;
export default referralSlice.reducer;
