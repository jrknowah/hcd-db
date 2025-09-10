import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  FormControlLabel,
  Switch
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Notes as NotesIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Timeline as TimelineIcon
} from "@mui/icons-material";

import PropTypes from 'prop-types';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProgressNotes,
  addProgressNote,
  editProgressNote,
  deleteProgressNote,
  fetchNotesSummary
} from "../../store/slices/progressNoteSlice";
import logUserAction from "../../config/logAction";
import { hhhSiteList } from "../../data/arrayList";

const ProgressNote = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Redux state
  const progressNoteState = useSelector((state) => state.progressNote);
  const { 
    data: notes = [], 
    loading, 
    error, 
    saving, 
    summary = {},
    summaryLoading 
  } = progressNoteState;

  // Component state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editNoteId, setEditNoteId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const initialFormState = {
    nurseNoteDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    nurseNoteSite: '',
    nurseNote: '',
    noteCategory: 'General',
    notePriority: 'Medium',
    requiresFollowUp: false,
    followUpDate: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Note categories and priorities
  const noteCategories = [
    'General', 'Assessment', 'Care Plan', 'Medication', 
    'Discharge Planning', 'Family Communication', 'Incident Report'
  ];
  
  const notePriorities = ['Low', 'Medium', 'High', 'Urgent'];

  // Mock data for development
  const mockNotes = [
    {
      _id: 'mock-1',
      nurseNoteDate: '2025-07-16',
      nurseNoteSite: 'Main Campus',
      nurseNote: 'Client arrived on time for scheduled appointment. Vital signs within normal limits. Discussed medication compliance and reported side effects.',
      noteCategory: 'Assessment',
      notePriority: 'Medium',
      requiresFollowUp: true,
      followUpDate: '2025-07-23',
      createdBy: 'nurse@hospital.com',
      createdAt: '2025-07-16T10:30:00Z'
    },
    {
      _id: 'mock-2',
      nurseNoteDate: '2025-07-15',
      nurseNoteSite: 'Outpatient Center',
      nurseNote: 'Follow-up visit for wound care. Healing progression noted. Client education provided on home care techniques.',
      noteCategory: 'Care Plan',
      notePriority: 'Low',
      requiresFollowUp: false,
      createdBy: 'nurse2@hospital.com',
      createdAt: '2025-07-15T14:15:00Z'
    }
  ];

  const mockSummary = {
    totalNotes: 2,
    notesBySite: { 'Main Campus': 1, 'Outpatient Center': 1 },
    notesByPriority: { Low: 1, Medium: 1, High: 0, Urgent: 0 },
    recentActivity: 2
  };

  useEffect(() => {
    if (clientID) {
      // Use mock data in development, real API in production
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        setTimeout(() => {
          dispatch({ type: 'progressNote/setMockData', payload: mockNotes });
          dispatch({ type: 'progressNote/setSummaryMockData', payload: mockSummary });
        }, 500);
      } else {
        dispatch(fetchProgressNotes(clientID));
        dispatch(fetchNotesSummary(clientID));
      }
    }
  }, [clientID, dispatch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openEditDialog = (note) => {
    setFormData({
      nurseNoteDate: note.nurseNoteDate,
      nurseNoteSite: note.nurseNoteSite,
      nurseNote: note.nurseNote,
      noteCategory: note.noteCategory || 'General',
      notePriority: note.notePriority || 'Medium',
      requiresFollowUp: note.requiresFollowUp || false,
      followUpDate: note.followUpDate || '',
    });
    setEditNoteId(note._id);
    setEditDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!clientID) {
      alert("⚠️ Please select a client before saving.");
      return;
    }

    if (!formData.nurseNote.trim() || !formData.nurseNoteSite) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    const noteData = {
      ...formData,
      followUpDate: formData.followUpDate || null,
      createdBy: user?.email || "unknown",
      createdAt: new Date().toISOString(),
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock save in development
        const newNote = { ...noteData, _id: `mock-${Date.now()}` };
        dispatch({ type: 'progressNote/addMockNote', payload: newNote });
        await logUserAction(user, "ADD_PROGRESS_NOTE", { clientID, ...noteData });
      } else {
        await dispatch(addProgressNote({ clientID, noteData })).unwrap();
        await logUserAction(user, "ADD_PROGRESS_NOTE", { clientID, ...noteData });
      }

      setFormData(initialFormState);
      setDialogOpen(false);
      alert("✅ Note saved successfully.");
    } catch (err) {
      console.error("❌ Error saving note:", err);
      alert(`⚠️ Failed to save note: ${err.message || err}`);
    }
  };

  const handleUpdateNote = async () => {
    if (!editNoteId) {
      alert("⚠️ No note selected for editing.");
      return;
    }

    if (!formData.nurseNote.trim() || !formData.nurseNoteSite) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    try {
      const updatedData = {
        ...formData,
        followUpDate: formData.followUpDate || null,
        updatedBy: user?.email || "unknown",
        updatedAt: new Date().toISOString(),
      };

      if (process.env.NODE_ENV === 'development') {
        // Mock update in development
        dispatch({ type: 'progressNote/updateMockNote', payload: { id: editNoteId, data: updatedData } });
        await logUserAction(user, "EDIT_PROGRESS_NOTE", { noteId: editNoteId, ...updatedData });
      } else {
        await dispatch(editProgressNote({ noteId: editNoteId, updatedData })).unwrap();
        await logUserAction(user, "EDIT_PROGRESS_NOTE", { noteId: editNoteId, ...updatedData });
      }

      setFormData(initialFormState);
      setEditDialogOpen(false);
      setEditNoteId(null);
      alert("✅ Note updated successfully.");
    } catch (err) {
      console.error("❌ Error updating note:", err);
      alert(`⚠️ Failed to update note: ${err.message || err}`);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock delete in development
        dispatch({ type: 'progressNote/deleteMockNote', payload: deleteNoteId });
        await logUserAction(user, "DELETE_PROGRESS_NOTE", { noteId: deleteNoteId });
      } else {
        await dispatch(deleteProgressNote(deleteNoteId)).unwrap();
        await logUserAction(user, "DELETE_PROGRESS_NOTE", { noteId: deleteNoteId });
      }

      setDeleteDialogOpen(false);
      setDeleteNoteId(null);
      alert("✅ Note deleted successfully.");
    } catch (err) {
      console.error("❌ Error deleting note:", err);
      alert(`⚠️ Failed to delete note: ${err.message || err}`);
    }
  };

  // Filter notes based on search and filters
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.nurseNote.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.nurseNoteSite.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSite = !filterSite || note.nurseNoteSite === filterSite;
    const matchesCategory = !filterCategory || note.noteCategory === filterCategory;
    const matchesPriority = !filterPriority || note.notePriority === filterPriority;
    
    return matchesSearch && matchesSite && matchesCategory && matchesPriority;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  return (
      <Card>
        <CardContent>
          {/* Header with Summary */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <TimelineIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Progress Notes Summary</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {summaryLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">{summary.totalNotes || 0}</Typography>
                      <Typography variant="body2">Total Notes</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary">{summary.recentActivity || 0}</Typography>
                      <Typography variant="body2">Recent Activity</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Notes by Priority</Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {Object.entries(summary.notesByPriority || {}).map(([priority, count]) => (
                          <Chip
                            key={priority}
                            label={`${priority}: ${count}`}
                            color={getPriorityColor(priority)}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Search and Filters */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FilterListIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Search & Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Search Notes"
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Site</InputLabel>
                    <Select
                      value={filterSite}
                      label="Site"
                      onChange={(e) => setFilterSite(e.target.value)}
                    >
                      <MenuItem value="">All Sites</MenuItem>
                      {hhhSiteList.map((site) => (
                        <MenuItem key={site.value} value={site.value}>{site.value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filterCategory}
                      label="Category"
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {noteCategories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={filterPriority}
                      label="Priority"
                      onChange={(e) => setFilterPriority(e.target.value)}
                    >
                      <MenuItem value="">All Priorities</MenuItem>
                      {notePriorities.map((priority) => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Add Note Section */}
          <Box display="flex" justifyContent="space-between" alignItems="center" my={2}>
            <Typography variant="h6">
              <NotesIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Progress Notes ({filteredNotes.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              disabled={saving}
            >
              Add Note
            </Button>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Notes Table */}
          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Site</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Follow-up</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="7" align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" sx={{ mt: 1 }}>Loading notes...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7" align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchTerm || filterSite || filterCategory || filterPriority 
                          ? "No notes match your search criteria." 
                          : "No notes available."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((note) => (
                    <TableRow key={note._id} hover>
                      <TableCell>{new Date(note.nurseNoteDate).toLocaleDateString()}</TableCell>
                      <TableCell>{note.nurseNoteSite}</TableCell>
                      <TableCell>
                        <Chip 
                          label={note.noteCategory || 'General'} 
                          size="small" 
                          variant="outlined" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={note.notePriority || 'Medium'}
                          size="small"
                          color={getPriorityColor(note.notePriority)}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" noWrap>
                          {note.nurseNote}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {note.requiresFollowUp && (
                          <Chip
                            label={note.followUpDate ? new Date(note.followUpDate).toLocaleDateString() : 'Required'}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Edit Note">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openEditDialog(note)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Note">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteNoteId(note._id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Create Note Dialog */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>New Progress Note</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Note Date"
                    value={formData.nurseNoteDate}
                    onChange={(e) => handleInputChange('nurseNoteDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Site</Typography>
                  <FormControl fullWidth required>
                    <Select
                      value={formData.nurseNoteSite}
                      label=""
                      onChange={(e) => handleInputChange('nurseNoteSite', e.target.value)}
                    >
                      {hhhSiteList.map((site) => (
                        <MenuItem key={site.value} value={site.value}>{site.value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Category</Typography>
                  <FormControl fullWidth>
                    <Select
                      value={formData.noteCategory}
                      label=""
                      onChange={(e) => handleInputChange('noteCategory', e.target.value)}
                    >
                      {noteCategories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Priority</Typography>
                  <FormControl fullWidth>
                    <Select
                      value={formData.notePriority}
                      label=""
                      onChange={(e) => handleInputChange('notePriority', e.target.value)}
                    >
                      {notePriorities.map((priority) => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Progress Note</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label=""
                    value={formData.nurseNote}
                    onChange={(e) => handleInputChange('nurseNote', e.target.value)}
                    required
                    placeholder="Enter detailed progress note..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requiresFollowUp}
                        onChange={(e) => handleInputChange('requiresFollowUp', e.target.checked)}
                      />
                    }
                    label="Requires Follow-up"
                  />
                </Grid>
                {formData.requiresFollowUp && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Follow-up Date"
                      value={formData.followUpDate}
                      onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveNote} 
                variant="contained" 
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : null}
              >
                {saving ? 'Saving...' : 'Save Note'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Edit Note Dialog */}
          <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Edit Progress Note</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Note Date"
                    value={formData.nurseNoteDate}
                    onChange={(e) => handleInputChange('nurseNoteDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Site</InputLabel>
                    <Select
                      value={formData.nurseNoteSite}
                      label="Site"
                      onChange={(e) => handleInputChange('nurseNoteSite', e.target.value)}
                    >
                      {hhhSiteList.map((site) => (
                        <MenuItem key={site.value} value={site.value}>{site.value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.noteCategory}
                      label="Category"
                      onChange={(e) => handleInputChange('noteCategory', e.target.value)}
                    >
                      {noteCategories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.notePriority}
                      label="Priority"
                      onChange={(e) => handleInputChange('notePriority', e.target.value)}
                    >
                      {notePriorities.map((priority) => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Progress Note"
                    value={formData.nurseNote}
                    onChange={(e) => handleInputChange('nurseNote', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requiresFollowUp}
                        onChange={(e) => handleInputChange('requiresFollowUp', e.target.checked)}
                      />
                    }
                    label="Requires Follow-up"
                  />
                </Grid>
                {formData.requiresFollowUp && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Follow-up Date"
                      value={formData.followUpDate}
                      onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleUpdateNote} 
                variant="contained" 
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : null}
              >
                {saving ? 'Updating...' : 'Update Note'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete this progress note? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteNote} color="error" variant="contained">
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    );
};

ProgressNote.propTypes = {
  clientID: PropTypes.string.isRequired
};

export default ProgressNote;