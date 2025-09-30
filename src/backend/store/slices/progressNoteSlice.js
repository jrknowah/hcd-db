// src/store/apps/notes/progressNoteSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = '';

// ✅ Helper function to check if we should use mock data
const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

// Mock data for development
const MOCK_PROGRESS_NOTES = [
  {
    _id: 'mock-note-1',
    clientID: 'mock-123',
    nurseNoteDate: '2025-07-16',
    nurseNoteSite: 'Main Campus',
    nurseNote: 'Client arrived on time for scheduled appointment. Vital signs within normal limits: BP 120/80, HR 72, Temp 98.6°F. Client reports feeling well today. Discussed medication compliance - client taking all medications as prescribed. No side effects reported. Appetite good, sleep pattern normal. Client expressed gratitude for care received.',
    noteCategory: 'Assessment',
    notePriority: 'Medium',
    requiresFollowUp: true,
    followUpDate: '2025-07-23',
    noteStatus: 'Active',
    createdBy: 'nurse@hospital.com',
    createdAt: '2025-07-16T10:30:00Z'
  },
  {
    _id: 'mock-note-2',
    clientID: 'mock-123',
    nurseNoteDate: '2025-07-15',
    nurseNoteSite: 'Outpatient Center',
    nurseNote: 'Follow-up visit for wound care management. Wound healing progressing well - no signs of infection. Dressing changed using sterile technique. Client education provided on proper home care techniques. Client demonstrates understanding of wound care instructions. Next appointment scheduled for wound check.',
    noteCategory: 'Care Plan',
    notePriority: 'Low',
    requiresFollowUp: false,
    followUpDate: null,
    noteStatus: 'Active',
    createdBy: 'nurse2@hospital.com',
    createdAt: '2025-07-15T14:15:00Z'
  },
  {
    _id: 'mock-note-3',
    clientID: 'mock-123',
    nurseNoteDate: '2025-07-14',
    nurseNoteSite: 'Main Campus',
    nurseNote: 'Medication review and adjustment. Client reported mild dizziness with current blood pressure medication. Consulted with physician - dosage reduced by 50%. Client educated on new dosing schedule. Blood pressure monitoring to be increased for next two weeks. Follow-up appointment arranged.',
    noteCategory: 'Medication',
    notePriority: 'High',
    requiresFollowUp: true,
    followUpDate: '2025-07-21',
    noteStatus: 'Active',
    createdBy: 'pharmacist@hospital.com',
    createdAt: '2025-07-14T11:20:00Z'
  }
];

const MOCK_SUMMARY = {
  totalNotes: 3,
  activeNotes: 3,
  followUpRequired: 2,
  recentActivity: 3,
  notesBySite: { 
    'Main Campus': 2, 
    'Outpatient Center': 1 
  },
  notesByPriority: { 
    Low: 1, 
    Medium: 1, 
    High: 1, 
    Urgent: 0 
  },
  notesByCategory: {
    Assessment: 1,
    'Care Plan': 1,
    Medication: 1
  }
};

// ===== ASYNC THUNKS (MUST BE DEFINED BEFORE SLICE) =====

// 🔄 Async thunk to fetch progress notes
export const fetchProgressNotes = createAsyncThunk(
  "progressNote/fetchProgressNotes",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock progress notes for", clientID);
      return MOCK_PROGRESS_NOTES;
    }

    try {
      const response = await fetch(`/api/progress-notes/${clientID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Error fetching progress notes:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// 💾 Async thunk to add progress note
export const addProgressNote = createAsyncThunk(
  "progressNote/addProgressNote",
  async ({ clientID, noteData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Simulating progress note save for", clientID);
      return {
        _id: `mock-note-${Date.now()}`,
        clientID,
        ...noteData,
        noteStatus: 'Active',
        createdAt: new Date().toISOString()
      };
    }

    try {
      const response = await fetch(`/api/progress-notes/${clientID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Error adding progress note:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// ✏️ Async thunk to edit progress note
export const editProgressNote = createAsyncThunk(
  "progressNote/editProgressNote",
  async ({ noteId, updatedData }, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients
    if (shouldUseMockData(updatedData.clientID)) {
      console.log("🔧 Mock mode: Simulating progress note update for", noteId);
      return { 
        noteId, 
        updatedData: {
          ...updatedData,
          updatedAt: new Date().toISOString()
        }
      };
    }

    try {
      const response = await fetch(`/api/progress-notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { noteId, updatedData: data };
    } catch (error) {
      console.error("❌ Error editing progress note:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// 🗑️ Async thunk to delete progress note
export const deleteProgressNote = createAsyncThunk(
  "progressNote/deleteProgressNote",
  async (noteId, thunkAPI) => {
    // ✅ PROTECTION: Return mock success for mock clients  
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Simulating progress note delete for", noteId);
      return noteId;
    }

    try {
      const response = await fetch(`/api/progress-notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return noteId;
    } catch (error) {
      console.error("❌ Error deleting progress note:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// 📊 Async thunk to fetch notes summary
export const fetchNotesSummary = createAsyncThunk(
  "progressNote/fetchNotesSummary",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock summary for", clientID);
      return MOCK_SUMMARY;
    }

    try {
      const response = await fetch(`/api/progress-notes/${clientID}/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Error fetching notes summary:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// 🔄 Async thunk to fetch recent notes
export const fetchRecentNotes = createAsyncThunk(
  "progressNote/fetchRecentNotes",
  async (clientID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData(clientID)) {
      console.log("🔧 Mock mode: Returning mock recent notes for", clientID);
      return MOCK_PROGRESS_NOTES.slice(0, 2); // Return first 2 notes as "recent"
    }

    try {
      const response = await fetch(`/api/progress-notes/${clientID}/recent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Error fetching recent notes:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// 🏥 Async thunk to fetch notes by site
export const fetchNotesBySite = createAsyncThunk(
  "progressNote/fetchNotesBySite",
  async (siteID, thunkAPI) => {
    // ✅ PROTECTION: Return mock data for mock clients
    if (shouldUseMockData('mock-123')) {
      console.log("🔧 Mock mode: Returning mock notes by site for", siteID);
      return MOCK_PROGRESS_NOTES.filter(note => note.nurseNoteSite === siteID);
    }

    try {
      const response = await fetch(`/api/progress-notes/site/${encodeURIComponent(siteID)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ Error fetching notes by site:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// ===== INITIAL STATE =====

const initialState = {
  // Main notes data
  data: [],
  loading: false,
  error: null,
  
  // Summary/statistics
  summary: {},
  summaryLoading: false,
  summaryError: null,
  
  // Recent notes
  recentNotes: [],
  recentLoading: false,
  recentError: null,
  
  // Save states
  saving: false,
  saveError: null,
  saveSuccess: false,
  
  // Delete states
  deleting: false,
  deleteError: null,
  deleteSuccess: false,
  
  // Filters & search
  filters: {
    site: '',
    dateRange: '',
    category: '',
    priority: '',
    searchTerm: ''
  },
  
  // Mock data flag for development
  useMockData: import.meta.env.MODE === 'development'
};

// ===== SLICE DEFINITION =====

const progressNoteSlice = createSlice({
  name: 'progressNote',
  initialState,
  reducers: {
    // Clear errors
    clearErrors(state) {
      state.error = null;
      state.saveError = null;
      state.deleteError = null;
      state.summaryError = null;
      state.recentError = null;
    },
    
    // Clear success flags
    clearSuccess(state) {
      state.saveSuccess = false;
      state.deleteSuccess = false;
    },
    
    // Update filters
    updateFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Reset filters
    resetFilters(state) {
      state.filters = {
        site: '',
        dateRange: '',
        category: '',
        priority: '',
        searchTerm: ''
      };
    },
    
    // Mock data management
    setMockData(state, action) {
      const { notes, summary, recentNotes } = action.payload;
      if (notes) {
        state.data = notes;
      }
      if (summary) {
        state.summary = summary;
      }
      if (recentNotes) {
        state.recentNotes = recentNotes;
      }
      // Clear loading states
      state.loading = false;
      state.summaryLoading = false;
      state.recentLoading = false;
      state.saving = false;
      state.deleting = false;
      // Clear error states
      state.error = null;
      state.summaryError = null;
      state.recentError = null;
      state.saveError = null;
      state.deleteError = null;
    },
    
    setSummaryMockData(state, action) {
      state.summary = action.payload;
      state.summaryLoading = false;
      state.summaryError = null;
    },
    
    // Local state updates for optimistic updates
    addMockNote(state, action) {
      state.data.unshift(action.payload);
      state.saving = false;
      state.saveSuccess = true;
      state.saveError = null;
    },
    
    updateMockNote(state, action) {
      const { id, data } = action.payload;
      const index = state.data.findIndex(note => note._id === id);
      if (index !== -1) {
        state.data[index] = { ...state.data[index], ...data };
      }
      state.saving = false;
      state.saveSuccess = true;
      state.saveError = null;
    },
    
    deleteMockNote(state, action) {
      const noteId = action.payload;
      state.data = state.data.filter(note => note._id !== noteId);
      state.deleting = false;
      state.deleteSuccess = true;
      state.deleteError = null;
    },
    
    // Toggle mock data mode
    toggleMockData(state) {
      state.useMockData = !state.useMockData;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Progress Notes
      .addCase(fetchProgressNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProgressNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchProgressNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add Progress Note
      .addCase(addProgressNote.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(addProgressNote.fulfilled, (state, action) => {
        state.saving = false;
        state.data.unshift(action.payload);
        state.saveSuccess = true;
        state.saveError = null;
      })
      .addCase(addProgressNote.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
        state.saveSuccess = false;
      })
      
      // Edit Progress Note
      .addCase(editProgressNote.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(editProgressNote.fulfilled, (state, action) => {
        state.saving = false;
        const { noteId, updatedData } = action.payload;
        const index = state.data.findIndex(note => note._id === noteId);
        if (index !== -1) {
          state.data[index] = { ...state.data[index], ...updatedData };
        }
        state.saveSuccess = true;
        state.saveError = null;
      })
      .addCase(editProgressNote.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
        state.saveSuccess = false;
      })
      
      // Delete Progress Note
      .addCase(deleteProgressNote.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(deleteProgressNote.fulfilled, (state, action) => {
        state.deleting = false;
        const noteId = action.payload;
        state.data = state.data.filter(note => note._id !== noteId);
        state.deleteSuccess = true;
        state.deleteError = null;
      })
      .addCase(deleteProgressNote.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
        state.deleteSuccess = false;
      })
      
      // Fetch Notes Summary
      .addCase(fetchNotesSummary.pending, (state) => {
        state.summaryLoading = true;
        state.summaryError = null;
      })
      .addCase(fetchNotesSummary.fulfilled, (state, action) => {
        state.summaryLoading = false;
        state.summary = action.payload;
        state.summaryError = null;
      })
      .addCase(fetchNotesSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.summaryError = action.payload;
      })
      
      // Fetch Recent Notes
      .addCase(fetchRecentNotes.pending, (state) => {
        state.recentLoading = true;
        state.recentError = null;
      })
      .addCase(fetchRecentNotes.fulfilled, (state, action) => {
        state.recentLoading = false;
        state.recentNotes = action.payload;
        state.recentError = null;
      })
      .addCase(fetchRecentNotes.rejected, (state, action) => {
        state.recentLoading = false;
        state.recentError = action.payload;
      })
      
      // Fetch Notes By Site
      .addCase(fetchNotesBySite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotesBySite.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchNotesBySite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// ===== EXPORTS =====

export const {
  clearErrors,
  clearSuccess,
  updateFilters,
  resetFilters,
  setMockData,
  setSummaryMockData,
  addMockNote,
  updateMockNote,
  deleteMockNote,
  toggleMockData
} = progressNoteSlice.actions;

// Selectors
export const selectProgressNotes = (state) => state.progressNote?.data || [];
export const selectProgressNotesLoading = (state) => state.progressNote?.loading || false;
export const selectProgressNotesError = (state) => state.progressNote?.error || null;
export const selectProgressNotesSummary = (state) => state.progressNote?.summary || {};
export const selectRecentNotes = (state) => state.progressNote?.recentNotes || [];
export const selectFilters = (state) => state.progressNote?.filters || {};
export const selectSaveStatus = (state) => ({
  saving: state.progressNote?.saving || false,
  saveError: state.progressNote?.saveError || null,
  saveSuccess: state.progressNote?.saveSuccess || false
});

// ✅ DEFAULT EXPORT
export default progressNoteSlice.reducer;