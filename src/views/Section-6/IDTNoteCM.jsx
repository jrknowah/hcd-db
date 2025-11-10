import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from "@mui/icons-material";
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchIDTCaseManagerNotes,
  addIDTCaseManagerNote,
  editIDTCaseManagerNote,
  deleteIDTCaseManagerNote,
  clearErrors,
  clearSaveSuccess
} from "../../backend/store/slices/idtNoteCMSlice";
import logUserAction from "../../backend/config/logAction";

const EDUCATION_LEVELS = [
  'No Formal Education',
  'Elementary School',
  'Middle School',
  'High School Diploma',
  'GED',
  'Some College',
  'Trade/Vocational School',
  'Associate Degree',
  'Bachelor Degree',
  'Master Degree',
  'Doctoral Degree'
];

const GOVERNMENT_ID_TYPES = [
  'State ID',
  'Driver\'s License',
  'Passport',
  'Social Security Card',
  'Birth Certificate',
  'Medical Insurance Card'
];

const initialFormState = {
  idtMemberSituation: "",
  idtMemberSupport: "",
  idtIncomeSource: "",
  clientGovIssued: [],
  idtResources: "",
  idtHfhCM: "",
  idtRecommend: "",
  clientHighEnd: "",
  idtGoals: "",
  clientPayeeBarriers: "",
  clientPayeeAssistance: "",
  updatedBy: ""
};

const IDTNoteCM = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { notes, loading, error, saving, saveSuccess } = useSelector((state) => state.idtCaseManager);

  // Component state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Load notes on mount
  useEffect(() => {
    if (clientID && clientID !== 'mock-123') {
      dispatch(fetchIDTCaseManagerNotes(clientID));
    }
  }, [dispatch, clientID]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      setTimeout(() => {
        dispatch(clearSaveSuccess());
      }, 3000);
    }
  }, [saveSuccess, dispatch]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      setTimeout(() => {
        dispatch(clearErrors());
      }, 5000);
    }
  }, [error, dispatch]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle government ID changes
  const handleGovIdChange = (idType) => {
    setFormData(prev => {
      const currentIds = prev.clientGovIssued || [];
      const isSelected = currentIds.includes(idType);
      return {
        ...prev,
        clientGovIssued: isSelected
          ? currentIds.filter((id) => id !== idType)
          : [...currentIds, idType],
      };
    });
  };

  // Open add dialog
  const handleOpenDialog = () => {
    setFormData({ ...initialFormState, clientID });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEditNote = (note) => {
    setSelectedNote(note);
    setFormData({
      ...note,
      clientGovIssued: Array.isArray(note.clientGovIssued) ? note.clientGovIssued : []
    });
    setEditDialogOpen(true);
  };

  // Open view dialog
  const handleViewNote = (note) => {
    setSelectedNote(note);
    setViewDialogOpen(true);
  };

  // Open delete confirmation
  const handleDeleteClick = (note) => {
    setSelectedNote(note);
    setDeleteDialogOpen(true);
  };

  // Save new note
  const handleSaveNote = async () => {
    if (!clientID || clientID === 'mock-123') {
      alert("⚠️ Please select a valid client before saving.");
      return;
    }

    if (!formData.idtGoals?.trim()) {
      alert("⚠️ Please enter the member's goals before saving.");
      return;
    }

    try {
      await dispatch(addIDTCaseManagerNote({
        ...formData,
        clientID,
        createdBy: user?.email || "unknown"
      })).unwrap();
      
      setDialogOpen(false);
      setFormData(initialFormState);
      dispatch(fetchIDTCaseManagerNotes(clientID));
      await logUserAction(user, "ADD_IDT_CM_NOTE", { clientID });
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  // Update existing note
  const handleUpdateNote = async () => {
    if (!selectedNote?.idtCMID) return;

    if (!formData.idtGoals?.trim()) {
      alert("⚠️ Please enter the member's goals before saving.");
      return;
    }

    try {
      await dispatch(editIDTCaseManagerNote({
        idtCMID: selectedNote.idtCMID,
        updates: formData
      })).unwrap();
      
      setEditDialogOpen(false);
      setFormData(initialFormState);
      setSelectedNote(null);
      dispatch(fetchIDTCaseManagerNotes(clientID));
      await logUserAction(user, "EDIT_IDT_CM_NOTE", { clientID, idtCMID: selectedNote.idtCMID });
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!selectedNote?.idtCMID) return;

    try {
      await dispatch(deleteIDTCaseManagerNote(selectedNote.idtCMID)).unwrap();
      setDeleteDialogOpen(false);
      setSelectedNote(null);
      dispatch(fetchIDTCaseManagerNotes(clientID));
      await logUserAction(user, "DELETE_IDT_CM_NOTE", { clientID, idtCMID: selectedNote.idtCMID });
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Filter notes by search term
  const filteredNotes = notes?.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    return (
      note.idtGoals?.toLowerCase().includes(searchLower) ||
      note.idtMemberSituation?.toLowerCase().includes(searchLower) ||
      note.clientHighEnd?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Form Dialog Content
  const renderForm = () => (
    <Box sx={{ mt: 2 }}>
      {/* 1. Member Assessment & Support System */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <PsychologyIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Member Assessment & Support System</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Member Situation"
                value={formData.idtMemberSituation}
                onChange={(e) => handleInputChange('idtMemberSituation', e.target.value)}
                placeholder="Describe the member's situation regarding mental health needs, living conditions, family, finances, transportation..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Support System"
                value={formData.idtMemberSupport}
                onChange={(e) => handleInputChange('idtMemberSupport', e.target.value)}
                placeholder="Describe the member's support system: family, significant others, friends, and dynamics..."
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 2. Financial & Documentation Status */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <MoneyIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Financial & Documentation Status</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Income Source"
                value={formData.idtIncomeSource}
                onChange={(e) => handleInputChange('idtIncomeSource', e.target.value)}
                placeholder="e.g., SSI, Employment, Family Support"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Available Resources"
                value={formData.idtResources}
                onChange={(e) => handleInputChange('idtResources', e.target.value)}
                placeholder="List available resources and services..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Government Issued IDs (Select all that apply)
              </Typography>
              <Grid container spacing={1}>
                {GOVERNMENT_ID_TYPES.map((idType) => (
                  <Grid item xs={12} sm={6} md={4} key={idType}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.clientGovIssued?.includes(idType)}
                          onChange={() => handleGovIdChange(idType)}
                        />
                      }
                      label={idType}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 3. Case Management & Recommendations */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <AssignmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Case Management & Recommendations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="HFH Case Manager"
                value={formData.idtHfhCM}
                onChange={(e) => handleInputChange('idtHfhCM', e.target.value)}
                placeholder="Case manager name"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Recommendations"
                value={formData.idtRecommend}
                onChange={(e) => handleInputChange('idtRecommend', e.target.value)}
                placeholder="Case management recommendations..."
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 4. Education & Employment Readiness */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SchoolIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Education & Employment Readiness</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Highest Educational Level</InputLabel>
                <Select
                  value={formData.clientHighEnd}
                  onChange={(e) => handleInputChange('clientHighEnd', e.target.value)}
                  label="Highest Educational Level"
                >
                  <MenuItem value="">Select...</MenuItem>
                  {EDUCATION_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Work Goals *"
                value={formData.idtGoals}
                onChange={(e) => handleInputChange('idtGoals', e.target.value)}
                placeholder="Member's employment and work goals..."
                required
                error={!formData.idtGoals?.trim()}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Employment Barriers"
                value={formData.clientPayeeBarriers}
                onChange={(e) => handleInputChange('clientPayeeBarriers', e.target.value)}
                placeholder="Barriers to employment..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Assistance Plan"
                value={formData.clientPayeeAssistance}
                onChange={(e) => handleInputChange('clientPayeeAssistance', e.target.value)}
                placeholder="How we can assist with employment goals..."
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            📋 IDT Note - Case Manager
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={!clientID || clientID === 'mock-123'}
          >
            Add New Note
          </Button>
        </Box>

        {/* Success/Error Alerts */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Note saved successfully!
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Search */}
        {notes?.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search notes by goals, situation, or education level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              }}
            />
          </Box>
        )}

        {/* Notes Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredNotes.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography color="text.secondary">
              {notes?.length === 0 
                ? "No IDT case manager notes yet. Click 'Add New Note' to create one."
                : "No notes match your search criteria."}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Education Level</TableCell>
                  <TableCell>Income Source</TableCell>
                  <TableCell>Work Goals</TableCell>
                  <TableCell>Case Manager</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.idtCMID} hover>
                    <TableCell>{formatDate(note.createdAt)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={note.clientHighEnd || 'N/A'} 
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{note.idtIncomeSource || 'N/A'}</TableCell>
                    <TableCell>
                      {note.idtGoals?.substring(0, 60)}
                      {note.idtGoals?.length > 60 ? '...' : ''}
                    </TableCell>
                    <TableCell>{note.idtHfhCM || 'N/A'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewNote(note)}
                          color="info"
                        >
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Note">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditNote(note)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Note">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(note)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Add/Edit Dialog */}
        <Dialog 
          open={dialogOpen || editDialogOpen} 
          onClose={() => {
            setDialogOpen(false);
            setEditDialogOpen(false);
            setFormData(initialFormState);
          }}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            {editDialogOpen ? 'Edit IDT Case Manager Note' : 'Add New IDT Case Manager Note'}
          </DialogTitle>
          <DialogContent>
            {renderForm()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setDialogOpen(false);
              setEditDialogOpen(false);
              setFormData(initialFormState);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editDialogOpen ? handleUpdateNote : handleSaveNote}
              variant="contained" 
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : (editDialogOpen ? 'Update Note' : 'Save Note')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Dialog */}
        <Dialog 
          open={viewDialogOpen} 
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>IDT Case Manager Note Details</DialogTitle>
          <DialogContent>
            {selectedNote && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created: {formatDate(selectedNote.createdAt)}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Updated: {formatDate(selectedNote.updatedAt)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Member Situation</Typography>
                  <Typography>{selectedNote.idtMemberSituation || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Support System</Typography>
                  <Typography>{selectedNote.idtMemberSupport || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold">Income Source</Typography>
                  <Typography>{selectedNote.idtIncomeSource || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold">Education Level</Typography>
                  <Typography>{selectedNote.clientHighEnd || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Government IDs</Typography>
                  {selectedNote.clientGovIssued && selectedNote.clientGovIssued.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {selectedNote.clientGovIssued.map((id, index) => (
                        <Chip key={index} label={id} color="primary" size="small" />
                      ))}
                    </Box>
                  ) : (
                    <Typography>None recorded</Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Work Goals</Typography>
                  <Typography>{selectedNote.idtGoals || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Employment Barriers</Typography>
                  <Typography>{selectedNote.clientPayeeBarriers || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Assistance Plan</Typography>
                  <Typography>{selectedNote.clientPayeeAssistance || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold">Resources</Typography>
                  <Typography>{selectedNote.idtResources || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight="bold">Recommendations</Typography>
                  <Typography>{selectedNote.idtRecommend || 'N/A'}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold">Case Manager</Typography>
                  <Typography>{selectedNote.idtHfhCM || 'N/A'}</Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this IDT Case Manager note? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteNote} 
              color="error" 
              variant="contained"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

IDTNoteCM.propTypes = {
  clientID: PropTypes.string,
};

export default IDTNoteCM;