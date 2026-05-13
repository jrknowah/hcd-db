// src/store/apps/notes/encounterNoteActions.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// ✅ Normalize any axios/server error payload into a plain string.
// Backend returns { error, message } — passing that object straight into
// state.error and then rendering it caused React error #31.
const toErrorMessage = (err, fallback = 'Request failed') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  // axios error shape
  if (err.response?.data) {
    const d = err.response.data;
    if (typeof d === 'string') return d;
    return d.message || d.error || fallback;
  }
  // plain object from server like { error, message }
  if (typeof err === 'object') {
    return err.message || err.error || fallback;
  }
  return String(err);
};

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// Mock encounter notes data for development
const MOCK_ENCOUNTER_NOTES = [
  {
    _id: 'note-1',
    clientID: 'mock-123',
    careNoteDate: '2024-03-10',
    careNoteType: 'Individual',
    careNoteSite: '41st',
    careNote: 'Client attended weekly session. Reports improved mood and medication compliance. Discussed coping strategies for stress management. Client appears more stable than previous session.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-10T10:00:00Z',
    updatedAt: '2024-03-10T10:00:00Z'
  },
  {
    _id: 'note-2',
    clientID: 'mock-123',
    careNoteDate: '2024-03-08',
    careNoteType: 'Crisis',
    careNoteSite: '97th',
    careNote: 'Emergency intervention required. Client experiencing anxiety episode triggered by housing uncertainty. Provided immediate support and safety planning. Crisis hotline numbers provided.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-08T14:30:00Z',
    updatedAt: '2024-03-08T14:30:00Z'
  },
  {
    _id: 'note-3',
    clientID: 'mock-123',
    careNoteDate: '2024-03-05',
    careNoteType: 'Group',
    careNoteSite: 'Pacific',
    careNote: 'Participated in group therapy session focused on peer support. Good engagement with other participants. Shared experiences about housing challenges and received positive feedback from group.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-05T11:15:00Z',
    updatedAt: '2024-03-05T11:15:00Z'
  },
  {
    _id: 'note-4',
    clientID: 'mock-123',
    careNoteDate: '2024-03-01',
    careNoteType: 'Intake',
    careNoteSite: 'Heritage House',
    careNote: 'Initial intake assessment completed. Client oriented to program services and expectations. Discussed immediate needs including housing, mental health support, and benefits assistance.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-01T09:00:00Z',
    updatedAt: '2024-03-01T09:00:00Z'
  },
  {
    _id: 'note-5',
    clientID: 'mock-123',
    careNoteDate: '2024-02-28',
    careNoteType: 'Summary',
    careNoteSite: 'Northridge',
    careNote: 'Monthly summary of client progress. Significant improvement in attendance and engagement. Medication compliance remains consistent. Working toward independent living goals.',
    createdBy: 'test@example.com',
    createdAt: '2024-02-28T16:00:00Z',
    updatedAt: '2024-02-28T16:00:00Z'
  }
];

// 🔄 Async thunk to fetch encounter notes
export const fetchEncounterNotes = createAsyncThunk(
  "encounterNote/fetchEncounterNotes",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock encounter notes for", clientID);
      return MOCK_ENCOUNTER_NOTES;
    }

    try {
      const response = await axios.get(`${API_URL}/api/encounter-notes/${clientID}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching encounter notes:", error);
      return thunkAPI.rejectWithValue(toErrorMessage(error, 'Fetch failed'));
    }
  }
);

// 💾 Async thunk to add encounter note
export const addEncounterNote = createAsyncThunk(
  "encounterNote/addEncounterNote",
  async ({ clientID, noteData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating encounter note save for", clientID);
      return {
        _id: `note-${Date.now()}`,
        clientID,
        ...noteData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(`${API_URL}/api/encounter-notes/${clientID}`, noteData);
      return response.data;
    } catch (error) {
      console.error("❌ Error adding encounter note:", error);
      return thunkAPI.rejectWithValue(toErrorMessage(error, 'Add failed'));
    }
  }
);

// ✏️ Async thunk to edit encounter note
export const editEncounterNote = createAsyncThunk(
  "encounterNote/editEncounterNote",
  async ({ noteId, updatedData, clientID }, thunkAPI) => {  // ← add clientID here
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating encounter note update for", noteId);
      return {
        _id: noteId,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await axios.put(`${API_URL}/api/encounter-notes/${noteId}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("❌ Error editing encounter note:", error);
      return thunkAPI.rejectWithValue(toErrorMessage(error, 'Edit failed'));
    }
  }
);

// 🗑️ Async thunk to delete encounter note
export const deleteEncounterNote = createAsyncThunk(
  "encounterNote/deleteEncounterNote",
  async ({ noteId, clientID }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating encounter note delete for", noteId);
      return noteId;
    }

    try {
      await axios.delete(`${API_URL}/api/encounter-notes/${noteId}`);
      return noteId;
    } catch (error) {
      console.error("❌ Error deleting encounter note:", error);
      return thunkAPI.rejectWithValue(toErrorMessage(error, 'Delete failed'));
    }
  }
);

const initialState = {
  data: [],
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

const encounterNoteSlice = createSlice({
  name: "encounterNote",
  initialState,
  reducers: {
    clearEncounterNotes(state) {
      state.data = [];
      state.status = "idle";
      state.error = null;
    },
    setEncounterNotes(state, action) {
      state.data = action.payload;
    },
    addEncounterNoteLocal(state, action) {
      state.data.unshift({
        ...action.payload,
        _id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    },
    updateEncounterNoteLocal(state, action) {
      const index = state.data.findIndex(note => note._id === action.payload._id);
      if (index !== -1) {
        state.data[index] = {
          ...state.data[index],
          ...action.payload,
          updatedAt: new Date().toISOString()
        };
      }
    },
    removeEncounterNoteLocal(state, action) {
      state.data = state.data.filter(note => note._id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch encounter notes
      .addCase(fetchEncounterNotes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEncounterNotes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchEncounterNotes.rejected, (state, action) => {
        state.status = "failed";
        state.error = toErrorMessage(action.payload, 'Fetch failed');
      })
      // Add encounter note
      .addCase(addEncounterNote.pending, (state) => {
        state.status = "loading";
      })
      .addCase(addEncounterNote.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data.unshift(action.payload); // Add to beginning of array
        state.error = null;
      })
      .addCase(addEncounterNote.rejected, (state, action) => {
        state.status = "failed";
        state.error = toErrorMessage(action.payload, 'Add failed');
      })
      // Edit encounter note
      .addCase(editEncounterNote.pending, (state) => {
        state.status = "loading";
      })
      .addCase(editEncounterNote.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.data.findIndex(note => note._id === action.payload._id);
        if (index !== -1) {
          state.data[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(editEncounterNote.rejected, (state, action) => {
        state.status = "failed";
        state.error = toErrorMessage(action.payload, 'Edit failed');
      })
      // Delete encounter note
      .addCase(deleteEncounterNote.fulfilled, (state, action) => {
        state.data = state.data.filter(note => note._id !== action.payload);
      });
  },
});

export const {
  clearEncounterNotes,
  setEncounterNotes,
  addEncounterNoteLocal,
  updateEncounterNoteLocal,
  removeEncounterNoteLocal,
} = encounterNoteSlice.actions;

// ✅ DEFAULT EXPORT
export default encounterNoteSlice.reducer;