import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Fetch all IDT provider notes for a client
export const fetchIDTNoteProvider = createAsyncThunk(
  "idtProvider/fetchIDTNoteProvider",
  async (clientID, { rejectWithValue }) => {
    try {
      console.log(`📡 Fetching IDT provider notes for client: ${clientID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-provider/${clientID}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ IDT provider notes fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching IDT provider notes:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Fetch a specific IDT provider note
export const fetchSingleIDTNoteProvider = createAsyncThunk(
  "idtProvider/fetchSingleIDTNoteProvider",
  async (id, { rejectWithValue }) => {
    try {
      console.log(`📡 Fetching IDT provider note: ${id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-provider/note/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ IDT provider note fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching IDT provider note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Add new IDT provider note
export const addIDTNoteProvider = createAsyncThunk(
  "idtProvider/addIDTNoteProvider",
  async (noteData, { rejectWithValue }) => {
    try {
      console.log("📡 Adding IDT provider note:", noteData);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-provider/${noteData.clientID}`, {
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
      console.log("✅ IDT provider note added successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error adding IDT provider note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Edit existing IDT provider note
export const editIDTNoteProvider = createAsyncThunk(
  "idtProvider/editIDTNoteProvider",
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      console.log(`📡 Updating IDT provider note ${id}:`, updates);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-provider/note/${id}`, {
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
      console.log("✅ IDT provider note updated successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error updating IDT provider note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete IDT provider note
export const deleteIDTNoteProvider = createAsyncThunk(
  "idtProvider/deleteIDTNoteProvider",
  async (id, { rejectWithValue }) => {
    try {
      console.log(`📡 Deleting IDT provider note: ${id}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-provider/note/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ IDT provider note deleted successfully");
      return { id, ...data };
    } catch (error) {
      console.error("❌ Error deleting IDT provider note:", error);
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

const idtProviderSlice = createSlice({
  name: "idtProvider",
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
      .addCase(fetchIDTNoteProvider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIDTNoteProvider.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
        state.error = null;
      })
      .addCase(fetchIDTNoteProvider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch IDT provider notes";
      })
      
      // Fetch single note
      .addCase(fetchSingleIDTNoteProvider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSingleIDTNoteProvider.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNote = action.payload;
        state.error = null;
      })
      .addCase(fetchSingleIDTNoteProvider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch IDT provider note";
      })
      
      // Add note
      .addCase(addIDTNoteProvider.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(addIDTNoteProvider.fulfilled, (state, action) => {
        state.saving = false;
        state.notes.unshift(action.payload);
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(addIDTNoteProvider.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to add IDT provider note";
        state.saveSuccess = false;
      })
      
      // Edit note
      .addCase(editIDTNoteProvider.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(editIDTNoteProvider.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.notes.findIndex(
          (note) => note.id === action.payload.id
        );
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
        if (state.currentNote?.id === action.payload.id) {
          state.currentNote = action.payload;
        }
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(editIDTNoteProvider.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to update IDT provider note";
        state.saveSuccess = false;
      })
      
      // Delete note
      .addCase(deleteIDTNoteProvider.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteIDTNoteProvider.fulfilled, (state, action) => {
        state.saving = false;
        state.notes = state.notes.filter(
          (note) => note.id !== action.payload.id
        );
        if (state.currentNote?.id === action.payload.id) {
          state.currentNote = null;
        }
        state.error = null;
      })
      .addCase(deleteIDTNoteProvider.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to delete IDT provider note";
      });
  },
});

export const { clearErrors, clearSaveSuccess, setCurrentNote, clearCurrentNote } = idtProviderSlice.actions;
export default idtProviderSlice.reducer;