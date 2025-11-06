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
  LocalHospital as HospitalIcon,
  Assignment as AssignmentIcon,
  Group as ConsultationIcon,
  ExitToApp as DischargeIcon,
  CheckCircle as ClearanceIcon,
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
  fetchIDTNoteProvider,
  addIDTNoteProvider,
  editIDTNoteProvider,
  deleteIDTNoteProvider,
  clearErrors,
  clearSaveSuccess
} from "../../backend/store/slices/idtProviderSlice";
import { ynd } from "../../data/arrayList";
import logUserAction from "../../backend/config/logAction";

const initialFormState = {
  idtHospital: "",
  idtAdmitDate: "",
  idtProviderName: "",
  idtProviderRole: "",
  idtDiag: "",
  idtProblems: "",
  idtPriority: "",
  idtFunctionalStatus: "",
  idtConsults: "",
  idtNoConsults: "",
  idtPlans: "",
  idtDischarge: "",
  idtPatientClear: "",
  idtPatientClearDate: "",
  idtPatientClearBy: "",
  idtDischargeReadiness: "Needs Planning",
  idtComplexityScore: 5,
  idtRiskLevel: "Medium",
  idtLengthOfStay: "",
  idtTargetLOS: "",
  idtGoals: "",
  idtInterventions: "",
  idtOutcomes: ""
};

const IDTNoteProvider = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { notes, loading, error, saving, saveSuccess } = useSelector((state) => state.idtProvider);

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
      dispatch(fetchIDTNoteProvider(clientID));
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

    // Validate required fields
    if (!formData.idtHospital.trim()) {
      alert("⚠️ Hospital is required.");
      return;
    }
    if (!formData.idtProviderName.trim()) {
      alert("⚠️ Provider name is required.");
      return;
    }
    if (!formData.idtProviderRole.trim()) {
      alert("⚠️ Provider role is required.");
      return;
    }

    try {
      await dispatch(addIDTNoteProvider({
        ...formData,
        clientID,
        userName: user?.email || "unknown"
      })).unwrap();
      
      setDialogOpen(false);
      setFormData(initialFormState);
      dispatch(fetchIDTNoteProvider(clientID));
      await logUserAction(user, "ADD_IDT_PROVIDER_NOTE", { clientID });
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  // Update existing note
  const handleUpdateNote = async () => {
    if (!selectedNote?.id) return;

    // Validate required fields
    if (!formData.idtHospital.trim()) {
      alert("⚠️ Hospital is required.");
      return;
    }
    if (!formData.idtProviderName.trim()) {
      alert("⚠️ Provider name is required.");
      return;
    }
    if (!formData.idtProviderRole.trim()) {
      alert("⚠️ Provider role is required.");
      return;
    }

    try {
      await dispatch(editIDTNoteProvider({
        id: selectedNote.id,
        updates: { ...formData, userName: user?.email || "unknown" }
      })).unwrap();
      
      setEditDialogOpen(false);
      setFormData(initialFormState);
      setSelectedNote(null);
      dispatch(fetchIDTNoteProvider(clientID));
      await logUserAction(user, "EDIT_IDT_PROVIDER_NOTE", { clientID, id: selectedNote.id });
    } catch (err) {
      console.error("Failed to update note:", err);
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!selectedNote?.id) return;

    try {
      await dispatch(deleteIDTNoteProvider(selectedNote.id)).unwrap();
      setDeleteDialogOpen(false);
      setSelectedNote(null);
      dispatch(fetchIDTNoteProvider(clientID));
      await logUserAction(user, "DELETE_IDT_PROVIDER_NOTE", { clientID, id: selectedNote.id });
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Filter notes by search term
  const filteredNotes = notes?.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    return (
      note.idtHospital?.toLowerCase().includes(searchLower) ||
      note.idtProviderName?.toLowerCase().includes(searchLower) ||
      note.idtDiag?.toLowerCase().includes(searchLower) ||
      note.idtRiskLevel?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Get complexity color
  const getComplexityColor = (score) => {
    if (score >= 9) return 'error';
    if (score >= 7) return 'warning';
    if (score >= 5) return 'info';
    return 'success';
  };

  // Get risk level color
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  // Get discharge readiness color
  const getDischargeColor = (status) => {
    switch (status) {
      case 'Ready': return 'success';
      case 'Needs Planning': return 'warning';
      case 'Not Ready': return 'error';
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
    averageComplexity: notes?.length > 0 
      ? (notes.reduce((sum, n) => sum + (n.idtComplexityScore || 0), 0) / notes.length).toFixed(1)
      : 0,
    averageLOS: notes?.length > 0 
      ? (notes.reduce((sum, n) => sum + (n.idtLengthOfStay || 0), 0) / notes.length).toFixed(1)
      : 0,
    readyForDischarge: notes?.filter(n => n.idtDischargeReadiness === 'Ready').length || 0,
    lastAssessment: notes?.length > 0 ? formatDate(notes[0].createdAt) : "None"
  };

  // Form Dialog Content
  const renderForm = () => (
    <Box sx={{ mt: 2 }}>
      {/* 1. Hospital & Admission Information */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <HospitalIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Hospital & Admission Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hospital *"
                value={formData.idtHospital}
                onChange={(e) => handleInputChange('idtHospital', e.target.value)}
                required
                error={!formData.idtHospital.trim()}
                helperText={!formData.idtHospital.trim() ? "Hospital is required" : ""}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Admit Date"
                type="date"
                value={formData.idtAdmitDate}
                onChange={(e) => handleInputChange('idtAdmitDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provider Name *"
                value={formData.idtProviderName}
                onChange={(e) => handleInputChange('idtProviderName', e.target.value)}
                required
                error={!formData.idtProviderName.trim()}
                helperText={!formData.idtProviderName.trim() ? "Provider name is required" : ""}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provider Role *"
                value={formData.idtProviderRole}
                onChange={(e) => handleInputChange('idtProviderRole', e.target.value)}
                required
                error={!formData.idtProviderRole.trim()}
                helperText={!formData.idtProviderRole.trim() ? "Provider role is required" : ""}
                placeholder="e.g., Attending Physician, Psychiatrist, Nurse Practitioner"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 2. Clinical Assessment */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <AssignmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Clinical Assessment & Diagnosis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography gutterBottom>Diagnosis and H&P Pertinent Information</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtDiag}
                onChange={(e) => handleInputChange('idtDiag', e.target.value)}
                placeholder="Document primary and secondary diagnoses, pertinent medical history..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Problems Member is Having</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtProblems}
                onChange={(e) => handleInputChange('idtProblems', e.target.value)}
                placeholder="List current challenges, symptoms, barriers to recovery..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Priority Problems</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtPriority}
                onChange={(e) => handleInputChange('idtPriority', e.target.value)}
                placeholder="Identify highest priority issues requiring immediate attention..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Functional Status</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.idtFunctionalStatus}
                onChange={(e) => handleInputChange('idtFunctionalStatus', e.target.value)}
                placeholder="Describe current functional abilities, ADL independence, mobility..."
              />
            </Grid>
            {/* Risk & Complexity Assessment */}
            <Grid item xs={12} md={4}>
              <Typography gutterBottom>Complexity Score (1-10)</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Rating
                  value={formData.idtComplexityScore}
                  onChange={(event, newValue) => {
                    handleInputChange('idtComplexityScore', newValue || 1);
                  }}
                  max={10}
                  size="large"
                />
                <Chip 
                  label={formData.idtComplexityScore} 
                  color={getComplexityColor(formData.idtComplexityScore)} 
                  size="small" 
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={formData.idtComplexityScore * 10} 
                color={getComplexityColor(formData.idtComplexityScore)}
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={formData.idtRiskLevel}
                  onChange={(e) => handleInputChange('idtRiskLevel', e.target.value)}
                  label="Risk Level"
                >
                  <MenuItem value="Low">Low Risk</MenuItem>
                  <MenuItem value="Medium">Medium Risk</MenuItem>
                  <MenuItem value="High">High Risk</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={1} mt={2}>
                <Chip 
                  label={formData.idtRiskLevel} 
                  color={getRiskColor(formData.idtRiskLevel)} 
                  size="medium" 
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 3. Consultation Management */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <ConsultationIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Consultation Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Consultations Being Placed</Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                value={formData.idtConsults}
                onChange={(e) => handleInputChange('idtConsults', e.target.value)}
                placeholder="List consultations requested, scheduled, or completed (cardiology, PT, social work, etc.)..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>If No Consults, Alternative Options</Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                value={formData.idtNoConsults}
                onChange={(e) => handleInputChange('idtNoConsults', e.target.value)}
                placeholder="Document alternative care approaches if consultations are not indicated..."
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 4. Treatment Planning */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <AssignmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Treatment Planning</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography gutterBottom>Goals</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.idtGoals}
                onChange={(e) => handleInputChange('idtGoals', e.target.value)}
                placeholder="Document treatment goals and expected outcomes..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Interventions</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.idtInterventions}
                onChange={(e) => handleInputChange('idtInterventions', e.target.value)}
                placeholder="Describe interventions, treatments, and therapeutic approaches..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Outcomes</Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={formData.idtOutcomes}
                onChange={(e) => handleInputChange('idtOutcomes', e.target.value)}
                placeholder="Document progress, response to treatment, and outcomes achieved..."
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 5. Discharge Planning */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <DischargeIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Discharge Planning</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Discharge Plans</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtPlans}
                onChange={(e) => handleInputChange('idtPlans', e.target.value)}
                placeholder="Outline discharge plans, placement considerations, support services..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Barriers to Discharge</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.idtDischarge}
                onChange={(e) => handleInputChange('idtDischarge', e.target.value)}
                placeholder="Document barriers preventing discharge (medical, social, housing, etc.)..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Discharge Readiness</InputLabel>
                <Select
                  value={formData.idtDischargeReadiness}
                  onChange={(e) => handleInputChange('idtDischargeReadiness', e.target.value)}
                  label="Discharge Readiness"
                >
                  <MenuItem value="Ready">Ready for Discharge</MenuItem>
                  <MenuItem value="Needs Planning">Needs Planning</MenuItem>
                  <MenuItem value="Not Ready">Not Ready</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1} mt={2}>
                <Chip 
                  label={formData.idtDischargeReadiness} 
                  color={getDischargeColor(formData.idtDischargeReadiness)} 
                  size="medium" 
                />
              </Box>
            </Grid>
            {/* Length of Stay */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Current Length of Stay (days)"
                type="number"
                value={formData.idtLengthOfStay}
                onChange={(e) => handleInputChange('idtLengthOfStay', e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target LOS (days)"
                type="number"
                value={formData.idtTargetLOS}
                onChange={(e) => handleInputChange('idtTargetLOS', e.target.value)}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 6. Medical Clearance */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <ClearanceIcon sx={{ mr: 2 }} />
          <Typography variant="h6">Medical Clearance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Patient Medically Cleared?</InputLabel>
                <Select
                  value={formData.idtPatientClear}
                  onChange={(e) => handleInputChange('idtPatientClear', e.target.value)}
                  label="Patient Medically Cleared?"
                >
                  <MenuItem value="">Select</MenuItem>
                  {ynd.map((option) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Clearance Date"
                type="date"
                value={formData.idtPatientClearDate}
                onChange={(e) => handleInputChange('idtPatientClearDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Cleared By"
                value={formData.idtPatientClearBy}
                onChange={(e) => handleInputChange('idtPatientClearBy', e.target.value)}
                placeholder="Provider name who cleared patient"
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
            🏥 IDT Note - Provider
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
            Provider note saved successfully!
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
                Provider IDT Summary
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
                    <Typography variant="h4" color="warning.main">{summary.averageComplexity}</Typography>
                    <Typography variant="body2" color="text.secondary">Avg Complexity</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">{summary.averageLOS}</Typography>
                    <Typography variant="body2" color="text.secondary">Avg LOS (days)</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">{summary.readyForDischarge}</Typography>
                    <Typography variant="body2" color="text.secondary">Ready for D/C</Typography>
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
              placeholder="Search notes by hospital, provider, diagnosis, or risk level..."
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
                ? "No IDT provider notes yet. Click 'Add New Note' to create one."
                : "No notes match your search criteria."}
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Hospital</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Complexity</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>Discharge Status</TableCell>
                  <TableCell>LOS</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.id} hover>
                    <TableCell>{formatDate(note.createdAt)}</TableCell>
                    <TableCell>{note.idtHospital || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {note.idtProviderName || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {note.idtProviderRole || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={note.idtComplexityScore || 'N/A'} 
                        color={getComplexityColor(note.idtComplexityScore)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={note.idtRiskLevel || 'N/A'} 
                        color={getRiskColor(note.idtRiskLevel)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={note.idtDischargeReadiness || 'N/A'} 
                        color={getDischargeColor(note.idtDischargeReadiness)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {note.idtLengthOfStay ? `${note.idtLengthOfStay}d` : 'N/A'}
                      {note.idtTargetLOS && ` / ${note.idtTargetLOS}d`}
                    </TableCell>
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
            {editDialogOpen ? 'Edit IDT Provider Note' : 'Add New IDT Provider Note'}
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
              Are you sure you want to delete this IDT provider note? This action cannot be undone.
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

IDTNoteProvider.propTypes = {
  clientID: PropTypes.string,
};

export default IDTNoteProvider;