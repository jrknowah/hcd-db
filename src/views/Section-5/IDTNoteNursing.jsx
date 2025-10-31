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
  Rating,
  LinearProgress,
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
  Tooltip
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  Psychology as GoalIcon,
  MedicalServices as ComplianceIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from "@mui/icons-material";
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchIDTNoteNursing,
  addIDTNoteNursing,
  editIDTNoteNursing,
  deleteIDTNoteNursing,
  clearErrors,
  clearSaveSuccess
} from "../../backend/store/slices/idtNursingSlice";
import logUserAction from "../../backend/config/logAction";

const initialFormState = {
  idtNursingAppointYN: "",
  idtNursingAppoint: "",
  idtNursingProb: "",
  idtNursingGoal: "",
  idtNursingCompliant: "",
  idtNursingInfo: "",
  goalStatus: "Active",
  goalPriority: "Medium",
  goalTargetDate: "",
  complianceScore: 5
};

const IDTNoteNursing = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { notes, loading, error, saving, saveSuccess } = useSelector((state) => state.idtNursing);

  // Component state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Load notes on mount
  useEffect(() => {
    if (clientID && clientID !== 'mock-123') {
      dispatch(fetchIDTNoteNursing(clientID));
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

  // Open add dialog
  const handleOpenDialog = () => {
    setFormData({ ...initialFormState, clientID });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEditNote = (note) => {
    setSelectedNote(note);
    setFormData(note);
    setEditDialogOpen(true);
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

    if (!formData.idtNursingGoal.trim()) {
      alert("⚠️ Please enter the member's goal before saving.");
      return;
    }

    try {
      await dispatch(addIDTNoteNursing({
        ...formData,
        clientID,
        createdBy: user?.email || "unknown"
      })).unwrap();
      
      setDialogOpen(false);
      setFormData(initialFormState);
      dispatch(fetchIDTNoteNursing(clientID));
      await logUserAction(user, "ADD_IDT_NURSING_NOTE", { clientID });
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  // Update existing note
  const handleUpdateNote = async () => {
    if (!selectedNote?.idtNursingID) return;

    if (!formData.idtNursingGoal.trim()) {
      alert("⚠️ Please enter the member's goal before saving.");
      return;
    }

    try {
      await dispatch(editIDTNoteNursing({
        idtNursingID: selectedNote.idtNursingID,
        updates: formData
      })).unwrap();
      
      setEditDialogOpen(false);
      setFormData(initialFormState);
      setSelectedNote(null);
      dispatch(fetchIDTNoteNursing(clientID));
      await logUserAction(user, "EDIT_IDT_NURSING_NOTE", { clientID, idtNursingID: selectedNote.idtNursingID });
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!selectedNote?.idtNursingID) return;

    try {
      await dispatch(deleteIDTNoteNursing(selectedNote.idtNursingID)).unwrap();
      setDeleteDialogOpen(false);
      setSelectedNote(null);
      dispatch(fetchIDTNoteNursing(clientID));
      await logUserAction(user, "DELETE_IDT_NURSING_NOTE", { clientID, idtNursingID: selectedNote.idtNursingID });
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Filter notes by search term
  const filteredNotes = notes?.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    return (
      note.idtNursingGoal?.toLowerCase().includes(searchLower) ||
      note.idtNursingProb?.toLowerCase().includes(searchLower) ||
      note.goalStatus?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Get compliance color
  const getComplianceColor = (score) => {
    if (score >= 9) return 'success';
    if (score >= 7) return 'info';
    if (score >= 5) return 'warning';
    return 'error';
  };

  // Get goal priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate summary statistics
  const summary = {
    totalNotes: notes?.length || 0,
    currentGoals: notes?.filter(n => n.goalStatus === 'Active').length || 0,
    averageCompliance: notes?.length > 0 
      ? (notes.reduce((sum, n) => sum + (n.complianceScore || 0), 0) / notes.length).toFixed(1)
      : 0,
    goalsAchieved: notes?.filter(n => n.goalStatus === 'Achieved').length || 0,
    lastAssessment: notes?.length > 0 ? formatDate(notes[0].createdAt) : "None"
  };

  // Form Dialog Content (same form as original)
  const renderForm = () => (
    <Box sx={{ mt: 2 }}>
      {/* 1. Appointment Management */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <EventIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Appointment Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography>Has the Member been able to attend appointments?</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtNursingAppointYN}
                onChange={(e) => handleInputChange('idtNursingAppointYN', e.target.value)}
                placeholder="Describe appointment attendance patterns, barriers, and overall engagement..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography>Specific appointment(s) Member would like to focus on attending?</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtNursingAppoint}
                onChange={(e) => handleInputChange('idtNursingAppoint', e.target.value)}
                placeholder="List priority appointments, member preferences, and focus areas..."
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 2. Assessment & Goals */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <GoalIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Assessment & Goals</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography>Specific problems the member is experiencing that are barriers to independent functioning?</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtNursingProb}
                onChange={(e) => handleInputChange('idtNursingProb', e.target.value)}
                placeholder="Document barriers, challenges, and obstacles to independence..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography>What is the Member's goal? Has it changed since initial eval/previous appointments? *</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtNursingGoal}
                onChange={(e) => handleInputChange('idtNursingGoal', e.target.value)}
                placeholder="Document member's goals, changes, and progress since last assessment..."
                required
                error={!formData.idtNursingGoal.trim()}
              />
            </Grid>
            {/* Enhanced Goal Management */}
            <Grid item xs={12} md={4}>
              <Typography>Goal Status</Typography>
              <FormControl fullWidth>
                <Select
                  value={formData.goalStatus}
                  onChange={(e) => handleInputChange('goalStatus', e.target.value)}
                >
                  <MenuItem value="">Select Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Achieved">Achieved</MenuItem>
                  <MenuItem value="Modified">Modified</MenuItem>
                  <MenuItem value="Discontinued">Discontinued</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography>Goal Priority</Typography>
              <FormControl fullWidth>
                <Select
                  value={formData.goalPriority}
                  onChange={(e) => handleInputChange('goalPriority', e.target.value)}
                >
                  <MenuItem value="">Select Priority</MenuItem>
                  <MenuItem value="High">High Priority</MenuItem>
                  <MenuItem value="Medium">Medium Priority</MenuItem>
                  <MenuItem value="Low">Low Priority</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography>Goal Target Date</Typography>
              <TextField
                fullWidth
                type="date"
                value={formData.goalTargetDate}
                onChange={(e) => handleInputChange('goalTargetDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {/* Goal Status Indicator */}
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip 
                  label={formData.goalStatus} 
                  color={formData.goalStatus === 'Achieved' ? 'success' : 'primary'} 
                  size="small" 
                />
                <Chip 
                  label={`${formData.goalPriority} Priority`} 
                  color={getPriorityColor(formData.goalPriority)} 
                  size="small" 
                />
                {formData.goalTargetDate && (
                  <Typography variant="body2" color="text.secondary">
                    Target: {new Date(formData.goalTargetDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 3. Compliance & Additional Information */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <ComplianceIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Compliance & Additional Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography>Is Member compliant with meds/therapy?</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtNursingCompliant}
                onChange={(e) => handleInputChange('idtNursingCompliant', e.target.value)}
                placeholder="Document medication compliance, therapy adherence, and any barriers..."
              />
            </Grid>
            {/* Compliance Score */}
            <Grid item xs={12} md={6}>
              <Typography component="legend" gutterBottom>
                Compliance Score (1-10)
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Rating
                  value={formData.complianceScore}
                  onChange={(event, newValue) => {
                    handleInputChange('complianceScore', newValue || 1);
                  }}
                  max={10}
                  size="large"
                />
                <Chip 
                  label={formData.complianceScore} 
                  color={getComplianceColor(formData.complianceScore)} 
                  size="small" 
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={formData.complianceScore * 10} 
                color={getComplianceColor(formData.complianceScore)}
                sx={{ mt: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formData.complianceScore >= 9 && "Excellent compliance"}
                {formData.complianceScore >= 7 && formData.complianceScore < 9 && "Good compliance"}
                {formData.complianceScore >= 5 && formData.complianceScore < 7 && "Fair compliance"}
                {formData.complianceScore < 5 && "Needs improvement"}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Additional Information"
                value={formData.idtNursingInfo}
                onChange={(e) => handleInputChange('idtNursingInfo', e.target.value)}
                placeholder="Any additional observations, family involvement, or relevant information..."
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
            📝 IDT Note - Nursing
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

        {/* Summary Dashboard */}
        {notes?.length > 0 && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                IDT Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">{summary.totalNotes}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Notes</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary">{summary.currentGoals}</Typography>
                    <Typography variant="body2" color="text.secondary">Active Goals</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Rating 
                      value={summary.averageCompliance / 2} 
                      readOnly 
                      size="small" 
                    />
                    <Typography variant="body2" color="text.secondary">Avg Compliance</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">{summary.goalsAchieved}</Typography>
                    <Typography variant="body2" color="text.secondary">Goals Achieved</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        {notes?.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search notes by goal, problem, or status..."
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
                ? "No IDT nursing notes yet. Click 'Add New Note' to create one."
                : "No notes match your search criteria."}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Goal Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Compliance</TableCell>
                  <TableCell>Goal Summary</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.idtNursingID} hover>
                    <TableCell>{formatDate(note.createdAt)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={note.goalStatus || 'N/A'} 
                        color={note.goalStatus === 'Achieved' ? 'success' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={note.goalPriority || 'N/A'} 
                        color={getPriorityColor(note.goalPriority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={note.complianceScore || 'N/A'} 
                          color={getComplianceColor(note.complianceScore)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {note.idtNursingGoal?.substring(0, 80)}
                      {note.idtNursingGoal?.length > 80 ? '...' : ''}
                    </TableCell>
                    <TableCell>{note.createdBy || 'N/A'}</TableCell>
                    <TableCell align="center">
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
            {editDialogOpen ? 'Edit IDT Nursing Note' : 'Add New IDT Nursing Note'}
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this IDT nursing note? This action cannot be undone.
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

IDTNoteNursing.propTypes = {
  clientID: PropTypes.string,
};

export default IDTNoteNursing;