import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Fetch all IDT Case Manager notes for a client
export const fetchIDTCaseManagerNotes = createAsyncThunk(
  'idtCaseManager/fetchNotes',
  async (clientID, { rejectWithValue }) => {
    try {
      console.log(`📡 Fetching IDT Case Manager notes for client: ${clientID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-case-manager/${clientID}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ IDT Case Manager notes fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching IDT Case Manager notes:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Fetch a specific IDT Case Manager note
export const fetchSingleIDTCaseManagerNote = createAsyncThunk(
  'idtCaseManager/fetchSingleNote',
  async (idtCMID, { rejectWithValue }) => {
    try {
      console.log(`📡 Fetching IDT Case Manager note: ${idtCMID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-case-manager/note/${idtCMID}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ IDT Case Manager note fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching IDT Case Manager note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Add new IDT Case Manager note
export const addIDTCaseManagerNote = createAsyncThunk(
  'idtCaseManager/addNote',
  async (noteData, { rejectWithValue }) => {
    try {
      console.log("📡 Adding IDT Case Manager note:", noteData);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-case-manager/${noteData.clientID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ IDT Case Manager note added successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error adding IDT Case Manager note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Edit existing IDT Case Manager note
export const editIDTCaseManagerNote = createAsyncThunk(
  'idtCaseManager/editNote',
  async ({ idtCMID, updates }, { rejectWithValue }) => {
    try {
      console.log(`📡 Updating IDT Case Manager note ${idtCMID}:`, updates);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-case-manager/${idtCMID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ IDT Case Manager note updated successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error updating IDT Case Manager note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete IDT Case Manager note
export const deleteIDTCaseManagerNote = createAsyncThunk(
  'idtCaseManager/deleteNote',
  async (idtCMID, { rejectWithValue }) => {
    try {
      console.log(`📡 Deleting IDT Case Manager note: ${idtCMID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-case-manager/${idtCMID}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ IDT Case Manager note deleted successfully");
      return { idtCMID, ...data };
    } catch (error) {
      console.error("❌ Error deleting IDT Case Manager note:", error);
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  notes: [],
  currentNote: null,
  loading: false,
  error: null,
  saving: false,
  saveSuccess: false,
};

const idtCaseManagerSlice = createSlice({
  name: "idtCaseManager",
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = null;
    },
    clearSaveSuccess: (state) => {
      state.saveSuccess = false;
    },
    setCurrentNote: (state, action) => {
      state.currentNote = action.payload;
    },
    clearCurrentNote: (state) => {
      state.currentNote = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all notes
      .addCase(fetchIDTCaseManagerNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIDTCaseManagerNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
        state.error = null;
      })
      .addCase(fetchIDTCaseManagerNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch IDT Case Manager notes";
      })
      
      // Fetch single note
      .addCase(fetchSingleIDTCaseManagerNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSingleIDTCaseManagerNote.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNote = action.payload;
        state.error = null;
      })
      .addCase(fetchSingleIDTCaseManagerNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch IDT Case Manager note";
      })
      
      // Add note
      .addCase(addIDTCaseManagerNote.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(addIDTCaseManagerNote.fulfilled, (state, action) => {
        state.saving = false;
        state.notes.unshift(action.payload);
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(addIDTCaseManagerNote.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to add IDT Case Manager note";
        state.saveSuccess = false;
      })
      
      // Edit note
      .addCase(editIDTCaseManagerNote.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(editIDTCaseManagerNote.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.notes.findIndex(
          (note) => note.idtCMID === action.payload.idtCMID
        );
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
        if (state.currentNote?.idtCMID === action.payload.idtCMID) {
          state.currentNote = action.payload;
        }
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(editIDTCaseManagerNote.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to update IDT Case Manager note";
        state.saveSuccess = false;
      })
      
      // Delete note
      .addCase(deleteIDTCaseManagerNote.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteIDTCaseManagerNote.fulfilled, (state, action) => {
        state.saving = false;
        state.notes = state.notes.filter(
          (note) => note.idtCMID !== action.payload.idtCMID
        );
        if (state.currentNote?.idtCMID === action.payload.idtCMID) {
          state.currentNote = null;
        }
        state.error = null;
      })
      .addCase(deleteIDTCaseManagerNote.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to delete IDT Case Manager note";
      });
  },
});

export const { clearErrors, clearSaveSuccess, setCurrentNote, clearCurrentNote } = idtCaseManagerSlice.actions;
export default idtCaseManagerSlice.reducer;