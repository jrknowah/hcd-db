import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Fetch all IDT nursing notes for a client
export const fetchIDTNoteNursing = createAsyncThunk(
  "idtNursing/fetchIDTNoteNursing",
  async (clientID, { rejectWithValue }) => {
    try {
      console.log(`📡 Fetching IDT nursing notes for client: ${clientID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-nursing/${clientID}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ IDT nursing notes fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching IDT nursing notes:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Fetch a specific IDT nursing note
export const fetchSingleIDTNoteNursing = createAsyncThunk(
  "idtNursing/fetchSingleIDTNoteNursing",
  async (idtNursingID, { rejectWithValue }) => {
    try {
      console.log(`📡 Fetching IDT nursing note: ${idtNursingID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-nursing/note/${idtNursingID}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ IDT nursing note fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error fetching IDT nursing note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Add new IDT nursing note
export const addIDTNoteNursing = createAsyncThunk(
  "idtNursing/addIDTNoteNursing",
  async (noteData, { rejectWithValue }) => {
    try {
      console.log("📡 Adding IDT nursing note:", noteData);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-nursing/${noteData.clientID}`, {
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
      console.log("✅ IDT nursing note added successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error adding IDT nursing note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Edit existing IDT nursing note
export const editIDTNoteNursing = createAsyncThunk(
  "idtNursing/editIDTNoteNursing",
  async ({ idtNursingID, updates }, { rejectWithValue }) => {
    try {
      console.log(`📡 Updating IDT nursing note ${idtNursingID}:`, updates);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-nursing/note/${idtNursingID}`, {
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
      console.log("✅ IDT nursing note updated successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error updating IDT nursing note:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete IDT nursing note
export const deleteIDTNoteNursing = createAsyncThunk(
  "idtNursing/deleteIDTNoteNursing",
  async (idtNursingID, { rejectWithValue }) => {
    try {
      console.log(`📡 Deleting IDT nursing note: ${idtNursingID}`);
      
      const response = await fetch(`${API_BASE_URL}/api/idt-nursing/note/${idtNursingID}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ IDT nursing note deleted successfully");
      return { idtNursingID, ...data };
    } catch (error) {
      console.error("❌ Error deleting IDT nursing note:", error);
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

const idtNursingSlice = createSlice({
  name: "idtNursing",
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
      .addCase(fetchIDTNoteNursing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIDTNoteNursing.fulfilled, (state, action) => {
        state.loading = false;
        state.notes = action.payload;
        state.error = null;
      })
      .addCase(fetchIDTNoteNursing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch IDT nursing notes";
      })
      
      // Fetch single note
      .addCase(fetchSingleIDTNoteNursing.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSingleIDTNoteNursing.fulfilled, (state, action) => {
        state.loading = false;
        state.currentNote = action.payload;
        state.error = null;
      })
      .addCase(fetchSingleIDTNoteNursing.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch IDT nursing note";
      })
      
      // Add note
      .addCase(addIDTNoteNursing.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(addIDTNoteNursing.fulfilled, (state, action) => {
        state.saving = false;
        state.notes.unshift(action.payload);
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(addIDTNoteNursing.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to add IDT nursing note";
        state.saveSuccess = false;
      })
      
      // Edit note
      .addCase(editIDTNoteNursing.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.saveSuccess = false;
      })
      .addCase(editIDTNoteNursing.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.notes.findIndex(
          (note) => note.idtNursingID === action.payload.idtNursingID
        );
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
        if (state.currentNote?.idtNursingID === action.payload.idtNursingID) {
          state.currentNote = action.payload;
        }
        state.saveSuccess = true;
        state.error = null;
      })
      .addCase(editIDTNoteNursing.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to update IDT nursing note";
        state.saveSuccess = false;
      })
      
      // Delete note
      .addCase(deleteIDTNoteNursing.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(deleteIDTNoteNursing.fulfilled, (state, action) => {
        state.saving = false;
        state.notes = state.notes.filter(
          (note) => note.idtNursingID !== action.payload.idtNursingID
        );
        if (state.currentNote?.idtNursingID === action.payload.idtNursingID) {
          state.currentNote = null;
        }
        state.error = null;
      })
      .addCase(deleteIDTNoteNursing.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Failed to delete IDT nursing note";
      });
  },
});

export const { clearErrors, clearSaveSuccess, setCurrentNote, clearCurrentNote } = idtNursingSlice.actions;
export default idtNursingSlice.reducer;