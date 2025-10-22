import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
  Paper
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Notes as NotesIcon,
  DateRange as DateIcon
,  Save as SaveIcon
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Select from 'react-select';
import { addEncounterNote, editEncounterNote, fetchEncounterNotes } from '../../backend/store/slices/encounterNoteSlice';
import logUserAction from "../../backend/config/logAction";
import { hhhSiteList2, cmNoteType } from "../../data/arrayList";

// ✅ Static mock data outside component
const MOCK_CLIENT = {
  clientID: 'mock-123',
  clientFirstName: 'John',
  clientLastName: 'Doe',
};

const MOCK_USER = {
  email: 'test@example.com',
  name: 'Test User',
};

const MOCK_ENCOUNTER_NOTES = [
  {
    _id: 'note-1',
    careNoteDate: '2024-03-10',
    careNoteType: 'Individual',
    careNoteSite: '41st',
    careNote: 'Client attended weekly session. Reports improved mood and medication compliance. Discussed coping strategies for stress management.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-10T10:00:00Z'
  },
  {
    _id: 'note-2',
    careNoteDate: '2024-03-08',
    careNoteType: 'Crisis',
    careNoteSite: '97th',
    careNote: 'Emergency intervention required. Client experiencing anxiety episode. Provided immediate support and safety planning.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-08T14:30:00Z'
  },
  {
    _id: 'note-3',
    careNoteDate: '2024-03-05',
    careNoteType: 'Group',
    careNoteSite: 'Pacific',
    careNote: 'Participated in group therapy session. Good engagement with peers. Shared experiences about housing challenges.',
    createdBy: 'test@example.com',
    createdAt: '2024-03-05T11:15:00Z'
  }
];

// Custom styles for react-select to match Material-UI theme
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '56px',
    borderColor: state.isFocused ? '#1976d2' : 'rgba(0, 0, 0, 0.23)',
    boxShadow: state.isFocused ? '0 0 0 1px #1976d2' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#1976d2' : 'rgba(0, 0, 0, 0.87)',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(0, 0, 0, 0.6)',
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
};

const EncounterNote = ({ clientID, exportMode }) => {
  const dispatch = useDispatch();
  
  // ✅ Safe selectors
  const reduxUser = useSelector((state) => state?.auth?.user);
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const encounterNoteState = useSelector((state) => state?.encounterNote || {});
  const { data: reduxEncounterNotes = [], loading = false, error = null } = encounterNoteState;

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const encounterNotes = shouldUseMockData ? MOCK_ENCOUNTER_NOTES : reduxEncounterNotes;

  // Get clientID from props or current client
  const effectiveClientID = clientID || currentClient?.clientID;

  // ✅ Component state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNoteId, setEditNoteId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const initialFormState = {
    careNoteDate: new Date().toISOString().split('T')[0],
    careNoteType: null,
    careNoteSite: null,
    careNote: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // ✅ Load encounter notes when client changes
  useEffect(() => {
    if (!effectiveClientID) return;

    if (shouldUseMockData) {
      // Mock data is already set, no need to fetch
      return;
    }

    if (dispatch && effectiveClientID) {
      dispatch(fetchEncounterNotes(effectiveClientID));
    }
  }, [effectiveClientID, dispatch, shouldUseMockData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({
      ...prev,
      [name]: selectedOption
    }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const openEditModal = (note) => {
    setFormData({
      careNoteDate: note.careNoteDate,
      careNoteType: cmNoteType.find(type => type.value === note.careNoteType) || null,
      careNoteSite: hhhSiteList2.find(site => site.value === note.careNoteSite) || null,
      careNote: note.careNote,
    });
    setEditNoteId(note._id);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditNoteId(null);
    resetForm();
  };

  const closeAddModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleUpdateCareNote = async () => {
    if (!editNoteId) {
      setSaveError("No note selected for editing.");
      return;
    }

    if (!formData.careNoteDate || !formData.careNoteType || !formData.careNote.trim()) {
      setSaveError("Please fill in all required fields.");
      return;
    }

    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setSaveSuccess(true);
          setTimeout(() => {
            setSaveSuccess(false);
            closeEditModal();
          }, 2000);
        }, 1000);
        return;
      }

      const updateData = {
        careNoteDate: formData.careNoteDate,
        careNoteType: formData.careNoteType?.value || formData.careNoteType,
        careNoteSite: formData.careNoteSite?.value || formData.careNoteSite,
        careNote: formData.careNote,
        updatedBy: currentUser?.email || "unknown",
        updatedAt: new Date().toISOString(),
      };

      await dispatch(editEncounterNote({
        noteId: editNoteId,
        updatedData: updateData
      })).unwrap();

      if (currentUser) {
        await logUserAction(currentUser, "EDIT_ENCOUNTER_NOTE", {
          noteId: editNoteId,
          ...updateData,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        closeEditModal();
      }, 2000);

    } catch (err) {
      console.error("❌ Error updating note:", err);
      setSaveError(`Failed to update note: ${err.message || err}`);
    }
  };

  const handleSaveCareNote = async () => {
    if (!effectiveClientID) {
      setSaveError("Please select a client before saving.");
      return;
    }

    if (!formData.careNoteDate || !formData.careNoteType || !formData.careNote.trim()) {
      setSaveError("Please fill in all required fields.");
      return;
    }

    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setSaveSuccess(true);
          setTimeout(() => {
            setSaveSuccess(false);
            closeAddModal();
          }, 2000);
        }, 1000);
        return;
      }

      const noteData = {
        careNoteDate: formData.careNoteDate,
        careNoteType: formData.careNoteType?.value || formData.careNoteType,
        careNoteSite: formData.careNoteSite?.value || formData.careNoteSite,
        careNote: formData.careNote,
        createdBy: currentUser?.email || "unknown",
        createdAt: new Date().toISOString(),
      };

      await dispatch(addEncounterNote({ 
        clientID: effectiveClientID, 
        noteData 
      })).unwrap();

      if (currentUser) {
        await logUserAction(currentUser, "ADD_ENCOUNTER_NOTE", {
          clientID: effectiveClientID,
          ...noteData
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        closeAddModal();
      }, 2000);

    } catch (err) {
      console.error("❌ Error saving note:", err);
      setSaveError(`Failed to save note: ${err.message || err}`);
    }
  };

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'Crisis': return 'error';
      case 'Individual': return 'primary';
      case 'Group': return 'success';
      case 'Summary': return 'info';
      default: return 'default';
    }
  };

  // ✅ No client selected
  if (!effectiveClientID) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {isDevelopment 
            ? `Development Mode: No client selected. Mock data ${shouldUseMockData ? 'enabled' : 'disabled'}.`
            : "Please select a client to view encounter notes."
          }
        </Alert>
      </Box>
    );
  }

  return (
    <Card sx={{ width: '100%' }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ m: 2 }}>
          🔧 Development Mode: Using mock encounter notes for {currentClient?.clientFirstName} {currentClient?.clientLastName}
        </Alert>
      )}

      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotesIcon color="primary" />
            <Typography variant="h5" component="h2">
              Encounter Notes
            </Typography>
          </Box>
          {!exportMode && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setModalOpen(true)}
              disabled={loading}
            >
              Add Note
            </Button>
          )}
        </Box>

        {/* Stats */}
        {encounterNotes.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {encounterNotes.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Notes
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {encounterNotes.filter(note => note.careNoteType === 'Individual').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Individual Sessions
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {encounterNotes.filter(note => 
                      new Date(note.careNoteDate) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    ).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 30 Days
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Success/Error Messages */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Note saved successfully!
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        {/* Notes Table */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>Note</TableCell>
              {!exportMode && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 4 : 5} align="center">
                  <Alert severity="info">Loading encounter notes...</Alert>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 4 : 5} align="center">
                  <Alert severity="error">Error: {error}</Alert>
                </TableCell>
              </TableRow>
            ) : encounterNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 4 : 5} align="center">
                  <Alert severity="info">No encounter notes available.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              encounterNotes.map((note) => (
                <TableRow key={note._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DateIcon fontSize="small" color="action" />
                      {note.careNoteDate}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={note.careNoteType} 
                      color={getNoteTypeColor(note.careNoteType)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={note.careNoteSite || 'N/A'} 
                      variant="outlined" 
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 300, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {note.careNote}
                    </Typography>
                  </TableCell>
                  {!exportMode && (
                    <TableCell>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => openEditModal(note)}
                        disabled={loading}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Add Note Modal */}
         <Dialog 
          open={modalOpen} 
          onClose={closeAddModal} 
          maxWidth="md"  // ✅ Changed from "lg" to "md" for better proportions
          fullWidth
          // ✅ CRITICAL: Allow dropdown to overflow dialog boundaries
          sx={{
            '& .MuiDialog-paper': {
              overflow: 'visible'
            },
            '& .MuiDialogContent-root': {
              overflow: 'visible'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AddIcon />
              New Encounter Note
            </Box>
          </DialogTitle>
          <DialogContent sx={{ overflow: 'visible' }}>
            {/* ✅ Date field - Full width */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Note Date"
                  name="careNoteDate"
                  value={formData.careNoteDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
            
            {/* ✅ Note Type and Site - Side by side */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Note Type *</Typography>
                <Select
                  options={cmNoteType}
                  value={formData.careNoteType}
                  onChange={(option) => handleSelectChange('careNoteType', option)}
                  placeholder="Select note type..."
                  styles={customSelectStyles}
                  menuPosition="fixed"  // ✅ CRITICAL: Prevents clipping
                  menuPlacement="auto"  // ✅ Auto-adjusts menu position
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Site</Typography>
                <Select
                  options={hhhSiteList2}
                  value={formData.careNoteSite}
                  onChange={(option) => handleSelectChange('careNoteSite', option)}
                  placeholder="Select site..."
                  styles={customSelectStyles}
                  menuPosition="fixed"  // ✅ CRITICAL: Prevents clipping
                  menuPlacement="auto"  // ✅ Auto-adjusts menu position
                  isClearable
                />
              </Grid>
            </Grid>
            
            {/* ✅ Note Content - MUCH WIDER with more rows */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={10}  // ✅ Increased from 4 to 10 rows
                  label="Note Content"
                  name="careNote"
                  value={formData.careNote}
                  onChange={handleInputChange}
                  placeholder="Enter detailed encounter note..."
                  required
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '1rem',  // ✅ Slightly larger text
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSaveCareNote} variant="contained" color="primary" startIcon={<SaveIcon />}>
              Save Note
            </Button>
            <Button onClick={closeAddModal} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Note Modal */}
        <Dialog 
          open={editModalOpen} 
          onClose={closeEditModal} 
          maxWidth="md"  // ✅ Changed from "lg" to "md" for better proportions
          fullWidth
          // ✅ CRITICAL: Allow dropdown to overflow dialog boundaries
          sx={{
            '& .MuiDialog-paper': {
              overflow: 'visible'
            },
            '& .MuiDialogContent-root': {
              overflow: 'visible'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EditIcon />
              Edit Encounter Note
            </Box>
          </DialogTitle>
          <DialogContent sx={{ overflow: 'visible' }}>
            {/* ✅ Date field - Full width */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Note Date"
                  name="careNoteDate"
                  value={formData.careNoteDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
            
            {/* ✅ Note Type and Site - Side by side */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Note Type *</Typography>
                <Select
                  options={cmNoteType}
                  value={formData.careNoteType}
                  onChange={(option) => handleSelectChange('careNoteType', option)}
                  placeholder="Select note type..."
                  styles={customSelectStyles}
                  menuPosition="fixed"  // ✅ CRITICAL: Prevents clipping
                  menuPlacement="auto"  // ✅ Auto-adjusts menu position
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Site</Typography>
                <Select
                  options={hhhSiteList2}
                  value={formData.careNoteSite}
                  onChange={(option) => handleSelectChange('careNoteSite', option)}
                  placeholder="Select site..."
                  styles={customSelectStyles}
                  menuPosition="fixed"  // ✅ CRITICAL: Prevents clipping
                  menuPlacement="auto"  // ✅ Auto-adjusts menu position
                  isClearable
                />
              </Grid>
            </Grid>
            
            {/* ✅ Note Content - MUCH WIDER with more rows */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={10}  // ✅ Increased from 4 to 10 rows
                  label="Note Content"
                  name="careNote"
                  value={formData.careNote}
                  onChange={handleInputChange}
                  placeholder="Enter detailed encounter note..."
                  required
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '1rem',  // ✅ Slightly larger text
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleUpdateCareNote} variant="contained" color="primary" startIcon={<SaveIcon />}>
              Update Note
            </Button>
            <Button onClick={closeEditModal} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

EncounterNote.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exportMode: PropTypes.bool,
};

EncounterNote.defaultProps = {
  clientID: null,
  exportMode: false,
};

export default EncounterNote;