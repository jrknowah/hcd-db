import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
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
  Paper,
  Tooltip,
  CircularProgress
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Notes as NotesIcon,
  DateRange as DateIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useMsal } from '@azure/msal-react';
import Select from 'react-select';
import { addEncounterNote, editEncounterNote, fetchEncounterNotes, unlockEncounterNote, deleteEncounterNote } from '../../backend/store/slices/encounterNoteSlice';
import { canUnlockLockedRecords } from '../../backend/config/groupConfig';
import logUserAction from "../../backend/config/logAction";
import { formatLocalDateTime } from "../../utils/localDateTime";
import { formatDateOnly } from "../../utils/dateOnly";
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
    createdAt: '2024-03-05T11:15:00Z',
    submissionStatus: 'draft'
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

// Submitted notes are locked; drafts ("Save Progress") stay editable
const isNoteLocked = (note) => note.locked ?? note.submissionStatus !== 'draft';


// Too many columns to fit the page: the table scrolls left/right inside its
// card, and the Actions column stays pinned on the right. Export (PDF) mode
// keeps the full-width layout.
const SCROLL_TABLE_MIN_WIDTH = 1400;
const stickyActionsSx = {
  position: 'sticky',
  right: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  boxShadow: (theme) => `-2px 0 4px -2px ${theme.palette.divider}`,
};

const EncounterNote = ({ clientID, exportMode }) => {
  const dispatch = useDispatch();
  const { accounts } = useMsal();
  // Display-only; the backend enforces who may unlock or delete
  const canUnlock = canUnlockLockedRecords(accounts?.[0]);
  const canDelete = canUnlock;
  
  // ✅ Safe selectors
  const reduxUser = useSelector((state) => state?.auth?.user);
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const encounterNoteState = useSelector((state) => state?.encounterNote || {});
  const { data: reduxEncounterNotes = [], status = 'idle', error: rawError = null } = encounterNoteState;

  // ✅ Slice exposes `status`, not `loading` — derive it.
  const loading = status === 'loading';

  // ✅ Coerce error to a string so React never renders an object as a child (error #31).
  const error =
    rawError == null
      ? null
      : typeof rawError === 'string'
        ? rawError
        : rawError.message || rawError.error || JSON.stringify(rawError);

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
  const [saving, setSaving] = useState(false);
  // The note open in the edit dialog; a locked note opens read-only
  const [editingNote, setEditingNote] = useState(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  // The note being deleted (IT Admin / Level 1); a submitted note needs a reason
  const [deletingNote, setDeletingNote] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

  // ✅ CLIENT-SWITCH GUARD: the add/edit note dialogs live in local state.
  //    Reset all of it when the client changes so a half-written note (or an
  //    edit dialog pointed at the prior client's note) can't carry over to
  //    the newly-selected client.
  useEffect(() => {
    setModalOpen(false);
    setEditModalOpen(false);
    setEditNoteId(null);
    setEditingNote(null);
    setUnlockOpen(false);
    setUnlockReason('');
    setUnlockError(null);
    setDeletingNote(null);
    setDeleteReason('');
    setDeleteError(null);
    setSaveSuccess(false);
    setSaveError(null);
    setFormData(initialFormState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClientID]);

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
      careNoteDate: note.careNoteDate
        ? new Date(note.careNoteDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      careNoteType: cmNoteType.find(type => type.value === note.careNoteType) || null,
      careNoteSite: hhhSiteList2.find(site => site.value === note.careNoteSite) || null,
      careNote: note.careNote,
    });
    setEditNoteId(note._id);
    setEditingNote(note);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditNoteId(null);
    setEditingNote(null);
    resetForm();
  };

  const editingLocked = editingNote ? isNoteLocked(editingNote) : false;

  // A draft needs a date and type; submitting also needs the note itself
  const validateForm = (submit) => {
    if (!formData.careNoteDate || !formData.careNoteType) {
      return "Please choose a note date and type.";
    }
    if (submit && !formData.careNote.trim()) {
      return "Please write the note before submitting.";
    }
    return null;
  };

  const openUnlockDialog = (note) => {
    setEditingNote(note);
    setUnlockReason('');
    setUnlockError(null);
    setUnlockOpen(true);
  };

  const closeUnlockDialog = () => {
    setUnlockOpen(false);
    setUnlockError(null);
    if (!editModalOpen) setEditingNote(null);
  };

  const handleConfirmUnlock = async () => {
    if (!editingNote) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const unlocked = await dispatch(unlockEncounterNote({
        noteId: editingNote._id,
        reason: unlockReason.trim(),
      })).unwrap();
      setUnlockOpen(false);
      setUnlockReason('');
      // Re-open the note as an editable draft
      openEditModal(unlocked);
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || err?.error || 'Unknown error';
      setUnlockError(`Failed to unlock note: ${msg}`);
    } finally {
      setUnlocking(false);
    }
  };

  const closeAddModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const openDeleteDialog = (note) => {
    setDeletingNote(note);
    setDeleteReason('');
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    setDeletingNote(null);
    setDeleteError(null);
  };

  const deletingLocked = deletingNote ? isNoteLocked(deletingNote) : false;

  const handleConfirmDelete = async () => {
    if (!deletingNote) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await dispatch(deleteEncounterNote({
        noteId: deletingNote._id,
        clientID: effectiveClientID,
        reason: deletingLocked ? deleteReason.trim() : undefined,
      })).unwrap();
      if (currentUser) {
        await logUserAction(currentUser, "DELETE_ENCOUNTER_NOTE", {
          noteId: deletingNote._id,
          clientID: effectiveClientID,
        });
      }
      if (editNoteId === deletingNote._id) closeEditModal();
      closeDeleteDialog();
    } catch (err) {
      const msg = typeof err === 'string' ? err : err?.message || err?.error || 'Unknown error';
      setDeleteError(`Failed to delete note: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  const deleteButton = (note) => canDelete && (
    <Tooltip title="Delete note">
      <IconButton
        color="error"
        size="small"
        aria-label="Delete note"
        onClick={() => openDeleteDialog(note)}
        disabled={loading}
      >
        <DeleteIcon />
      </IconButton>
    </Tooltip>
  );

  const handleUpdateCareNote = async (submit = false) => {
    if (!editNoteId) {
      setSaveError("No note selected for editing.");
      return;
    }

    const validationError = validateForm(submit);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setSaveSuccess(submit ? 'Note submitted and locked.' : 'Progress saved. The note is still a draft.');
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
        clientID: effectiveClientID,
        updatedBy: currentUser?.email || "unknown",
        updatedAt: new Date().toISOString(),
        submit,
      };

      await dispatch(editEncounterNote({
        noteId: editNoteId,
        clientID: effectiveClientID,
        updatedData: updateData
      })).unwrap();

      if (currentUser) {
        await logUserAction(currentUser, submit ? "SUBMIT_ENCOUNTER_NOTE" : "EDIT_ENCOUNTER_NOTE", {
          noteId: editNoteId,
          ...updateData,
        });
      }

      setSaveSuccess(submit ? 'Note submitted and locked.' : 'Progress saved. The note is still a draft.');
      setTimeout(() => {
        setSaveSuccess(false);
        closeEditModal();
      }, 2000);

    } catch (err) {
      console.error("❌ Error updating note:", err);
      const msg =
        typeof err === 'string'
          ? err
          : err?.message || err?.error || 'Unknown error';
      setSaveError(`Failed to update note: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCareNote = async (submit = false) => {
    if (!effectiveClientID) {
      setSaveError("Please select a client before saving.");
      return;
    }

    const validationError = validateForm(submit);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setSaveSuccess(submit ? 'Note submitted and locked.' : 'Progress saved. The note is still a draft.');
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
        submit,
      };

      await dispatch(addEncounterNote({ 
        clientID: effectiveClientID, 
        noteData 
      })).unwrap();

      if (currentUser) {
        await logUserAction(currentUser, submit ? "SUBMIT_ENCOUNTER_NOTE" : "ADD_ENCOUNTER_NOTE", {
          clientID: effectiveClientID,
          ...noteData
        });
      }

      setSaveSuccess(submit ? 'Note submitted and locked.' : 'Progress saved. The note is still a draft.');
      setTimeout(() => {
        setSaveSuccess(false);
        closeAddModal();
      }, 2000);

    } catch (err) {
      console.error("❌ Error saving note:", err);
      const msg =
        typeof err === 'string'
          ? err
          : err?.message || err?.error || 'Unknown error';
      setSaveError(`Failed to save note: ${msg}`);
    } finally {
      setSaving(false);
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
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {encounterNotes.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Notes
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {encounterNotes.filter(note => note.careNoteType === 'Individual').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Individual Sessions
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
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
            ✅ {saveSuccess}
          </Alert>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        {/* Notes Table */}
        <TableContainer
          sx={exportMode ? undefined : { overflowX: 'auto', maxWidth: '100%' }}
          data-testid="section4-table-scroll"
        >
        <Table
          sx={exportMode ? undefined : {
            minWidth: SCROLL_TABLE_MIN_WIDTH,
            '& .MuiTableHead-root .MuiTableCell-root': { whiteSpace: 'nowrap' },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted By</TableCell>
              <TableCell>Last Updated By</TableCell>
              <TableCell>Added By</TableCell>
              {!exportMode && <TableCell sx={stickyActionsSx}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 8 : 9} align="center">
                  <Alert severity="info">Loading encounter notes...</Alert>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 8 : 9} align="center">
                  <Alert severity="error">Error: {error}</Alert>
                </TableCell>
              </TableRow>
            ) : encounterNotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 8 : 9} align="center">
                  <Alert severity="info">No encounter notes available.</Alert>
                </TableCell>
              </TableRow>
            ) : (
              encounterNotes.map((note) => (
                <TableRow key={note._id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DateIcon fontSize="small" color="action" />
                      {formatDateOnly(note.careNoteDate)}
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
                  <TableCell>
                    {isNoteLocked(note) ? (
                      <Chip icon={<LockIcon />} label="Submitted" size="small" />
                    ) : (
                      <Chip label="Draft" color="warning" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {isNoteLocked(note) ? (
                      <>
                        <Typography variant="body2">{note.submittedBy || 'Unknown'}</Typography>
                        {note.submittedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {formatLocalDateTime(note.submittedAt)}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Not submitted</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Never edited since creation: the creator is the last to update it */}
                    <Typography variant="body2">{note.updatedBy || note.createdBy || 'N/A'}</Typography>
                    {(note.updatedAt || note.createdAt) && (
                      <Typography variant="caption" color="text.secondary">
                        {formatLocalDateTime(note.updatedAt || note.createdAt)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{note.createdBy || 'N/A'}</Typography>
                    {note.createdAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatLocalDateTime(note.createdAt)}
                      </Typography>
                    )}
                  </TableCell>
                  {!exportMode && (
                    <TableCell sx={stickyActionsSx}>
                      {isNoteLocked(note) ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View note">
                            <IconButton
                              color="primary"
                              size="small"
                              aria-label="View note"
                              onClick={() => openEditModal(note)}
                              disabled={loading}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {canUnlock && (
                            <Tooltip title="Unlock note">
                              <IconButton
                                color="warning"
                                size="small"
                                aria-label="Unlock note"
                                onClick={() => openUnlockDialog(note)}
                                disabled={loading}
                              >
                                <LockOpenIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {deleteButton(note)}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit draft">
                            <IconButton
                              color="primary"
                              size="small"
                              aria-label="Edit draft"
                              onClick={() => openEditModal(note)}
                              disabled={loading}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {deleteButton(note)}
                        </Box>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </TableContainer>

        {/* Add Note Modal */}
         <Dialog 
          open={modalOpen} 
          onClose={closeAddModal} 
          maxWidth="xl"  // ✅ Bumped to xl for wider input boxes
          fullWidth
          // ✅ CRITICAL: Allow dropdown to overflow dialog boundaries
          sx={{
            '& .MuiDialog-paper': {
              overflow: 'visible',
              minHeight: '70vh'   // ✅ Make the dialog itself taller
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
              <Grid size={12}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={14}  // ✅ Bumped to 14 rows for a taller editor
                  label="Note Content"
                  name="careNote"
                  value={formData.careNote}
                  onChange={handleInputChange}
                  placeholder="Enter detailed encounter note..."
                  required
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '1.05rem',  // ✅ Slightly larger text
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mx: 3 }}>{saveError}</Alert>
          )}
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, pl: 2 }}>
              Submitted notes are locked. Only IT Admin or Level 1 users can unlock them.
            </Typography>
            <Button onClick={closeAddModal} color="secondary" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => handleSaveCareNote(false)} variant="outlined" startIcon={<SaveIcon />} disabled={saving}>
              Save Progress
            </Button>
            <Button onClick={() => handleSaveCareNote(true)} variant="contained" color="primary" startIcon={<SendIcon />} disabled={saving}>
              Submit Note
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Note Modal */}
        <Dialog 
          open={editModalOpen} 
          onClose={closeEditModal} 
          maxWidth="xl"  // ✅ Bumped to xl for wider input boxes
          fullWidth
          // ✅ CRITICAL: Allow dropdown to overflow dialog boundaries
          sx={{
            '& .MuiDialog-paper': {
              overflow: 'visible',
              minHeight: '70vh'   // ✅ Make the dialog itself taller
            },
            '& .MuiDialogContent-root': {
              overflow: 'visible'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {editingLocked ? <LockIcon /> : <EditIcon />}
              {editingLocked ? 'Encounter Note (Submitted)' : 'Edit Draft Encounter Note'}
            </Box>
          </DialogTitle>
          {editingLocked ? (
            <Alert
              severity="info"
              icon={<LockIcon />}
              sx={{ mx: 3 }}
              action={canUnlock ? (
                <Button color="inherit" size="small" startIcon={<LockOpenIcon />} onClick={() => openUnlockDialog(editingNote)}>
                  Unlock
                </Button>
              ) : null}
            >
              <strong>Submitted and locked.</strong>
              {editingNote?.submittedAt && ` Submitted ${formatLocalDateTime(editingNote.submittedAt)}${editingNote.submittedBy ? ` by ${editingNote.submittedBy}` : ''}.`}
              {' '}
              {canUnlock
                ? 'Unlocking keeps a copy of the submitted version.'
                : 'Changes require an IT Admin or Level 1 user to unlock it.'}
            </Alert>
          ) : editingNote?.unlockedAt ? (
            <Alert severity="warning" icon={<LockOpenIcon />} sx={{ mx: 3 }}>
              Unlocked by {editingNote.unlockedBy} on {formatLocalDateTime(editingNote.unlockedAt)}
              {editingNote.unlockReason && `: ${editingNote.unlockReason}`}. Submit it again when done.
            </Alert>
          ) : null}
          <DialogContent sx={{ overflow: 'visible' }}>
            {/* ✅ Date field - Full width */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Note Date"
                  name="careNoteDate"
                  value={formData.careNoteDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                  disabled={editingLocked}
                />
              </Grid>
            </Grid>
            
            {/* ✅ Note Type and Site - Side by side */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>Note Type *</Typography>
                <Select
                  options={cmNoteType}
                  value={formData.careNoteType}
                  onChange={(option) => handleSelectChange('careNoteType', option)}
                  placeholder="Select note type..."
                  styles={customSelectStyles}
                  menuPosition="fixed"  // ✅ CRITICAL: Prevents clipping
                  menuPlacement="auto"  // ✅ Auto-adjusts menu position
                  isDisabled={editingLocked}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
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
                  isDisabled={editingLocked}
                />
              </Grid>
            </Grid>
            
            {/* ✅ Note Content - MUCH WIDER with more rows */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={14}  // ✅ Bumped to 14 rows for a taller editor
                  label="Note Content"
                  name="careNote"
                  value={formData.careNote}
                  onChange={handleInputChange}
                  placeholder="Enter detailed encounter note..."
                  required
                  InputProps={{ readOnly: editingLocked }}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '1.05rem',  // ✅ Slightly larger text
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          {saveError && (
            <Alert severity="error" sx={{ mx: 3 }}>{saveError}</Alert>
          )}
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            {editingLocked ? (
              <Button onClick={closeEditModal} color="secondary">
                Close
              </Button>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, pl: 2 }}>
                  Submitted notes are locked. Only IT Admin or Level 1 users can unlock them.
                </Typography>
                <Button onClick={closeEditModal} color="secondary" disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateCareNote(false)} variant="outlined" startIcon={<SaveIcon />} disabled={saving}>
                  Save Progress
                </Button>
                <Button onClick={() => handleUpdateCareNote(true)} variant="contained" color="primary" startIcon={<SendIcon />} disabled={saving}>
                  Submit Note
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Delete Note Dialog (IT Admin / Level 1) */}
        <Dialog open={!!deletingNote} onClose={deleting ? undefined : closeDeleteDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{deletingLocked ? 'Delete submitted note' : 'Delete draft note'}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: deletingLocked ? 2 : 0 }}>
              {deletingLocked
                ? <>This note was submitted{deletingNote?.submittedBy ? ` by ${deletingNote.submittedBy}` : ''}. It will be removed from the client's record; a copy is kept for audit.</>
                : 'This draft will be removed from the client\'s record; a copy is kept for audit.'}
            </Typography>
            {deletingLocked && (
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={3}
                label="Reason for deleting"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                inputProps={{ maxLength: 500 }}
                helperText="Required. Recorded with the deletion (at least 5 characters)."
              />
            )}
            {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} disabled={deleting} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              disabled={deleting || (deletingLocked && deleteReason.trim().length < 5)}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {deleting ? 'Deleting...' : 'Delete note'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Unlock Note Dialog */}
        <Dialog open={unlockOpen} onClose={unlocking ? undefined : closeUnlockDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Unlock submitted note</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              A copy of the submitted note will be kept. The note goes back to draft so it can be
              edited, and must be submitted again.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              label="Reason for unlocking"
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText="Required. Recorded with the unlock (at least 5 characters)."
            />
            {unlockError && <Alert severity="error" sx={{ mt: 2 }}>{unlockError}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeUnlockDialog} disabled={unlocking} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleConfirmUnlock}
              disabled={unlocking || unlockReason.trim().length < 5}
              startIcon={unlocking ? <CircularProgress size={16} /> : <LockOpenIcon />}
            >
              {unlocking ? 'Unlocking...' : 'Unlock note'}
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