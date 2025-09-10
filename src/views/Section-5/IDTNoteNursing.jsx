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
  LinearProgress
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Event as EventIcon,
  Psychology as GoalIcon,
  MedicalServices as ComplianceIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon
} from "@mui/icons-material";
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchIDTNoteNursing,
  saveIDTNoteNursing,
  setMockData
} from "../../store/slices/idtNursingSlice";
import logUserAction from "../../config/logAction";

const IDTNoteNursing = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const selectedClient = useSelector((state) => state.clients?.selectedClient);

  // Use clientID prop or fallback to selectedClient
  const currentClientID = clientID || selectedClient?.clientID;

  // Redux state
  const idtNursingState = useSelector((state) => state.idtNursing) || {};
  const { 
    data: savedData = {}, 
    loading = false, 
    error = null, 
    saving = false,
    summary = {},
    summaryLoading = false 
  } = idtNursingState;

  // Component state
  const [formData, setFormData] = useState({
    // Original fields
    idtNursingAppointYN: "",
    idtNursingAppoint: "",
    idtNursingProb: "",
    idtNursingGoal: "",
    idtNursingCompliant: "",
    idtNursingInfo: "",
    
    // Enhanced fields
    goalStatus: "Active",
    goalPriority: "Medium",
    goalTargetDate: "",
    complianceScore: 5
  });

  // Mock data for development
  const mockIDTData = {
    idtNursingAppointYN: "Client has been attending most appointments regularly. Missed 2 appointments last month due to transportation issues. Shows good motivation to attend when transportation is available.",
    idtNursingAppoint: "Focus on cardiology follow-up appointment next week and continuing physical therapy sessions twice weekly. Client is particularly motivated to attend PT sessions.",
    idtNursingProb: "Primary barriers include: 1) Transportation challenges for medical appointments, 2) Occasional anxiety about medical procedures, 3) Medication side effects causing morning fatigue.",
    idtNursingGoal: "Client's goal is to improve medication compliance to 95% or higher, attend all scheduled PT sessions, and develop effective coping strategies for medical anxiety. Goal has been modified from initial assessment to include anxiety management.",
    idtNursingCompliant: "Current medication compliance is approximately 85%. Client occasionally skips evening medication dose due to forgetfulness. Therapy attendance is good at 90% - only missed sessions due to transportation.",
    idtNursingInfo: "Client reports feeling more confident about self-care activities. Family support system is strong with daughter providing transportation assistance. Client expresses willingness to use medication reminder app.",
    goalStatus: "Active",
    goalPriority: "High",
    goalTargetDate: "2025-09-01",
    complianceScore: 7
  };

  const mockSummary = {
    totalNotes: 3,
    currentGoals: 2,
    averageCompliance: 7.5,
    goalsAchieved: 1,
    lastAssessment: "2025-07-16"
  };

  // Load data on component mount
  useEffect(() => {
    if (!currentClientID) return;
    
    // Check if Redux slice is configured
    if (!idtNursingState && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ idtNursing slice not found in Redux store. Please add it to your store configuration.');
      return;
    }
    
    // Use mock data in development, real API in production
    if (process.env.NODE_ENV === 'development') {
      // Simulate API delay
      setTimeout(() => {
        if (dispatch && typeof dispatch === 'function') {
          dispatch(setMockData({ idtData: mockIDTData, summary: mockSummary }));
        }
        setFormData(mockIDTData);
      }, 500);
      return;
    }

    // Real API calls
    if (dispatch && typeof dispatch === 'function') {
      dispatch(fetchIDTNoteNursing(currentClientID));
    }
  }, [currentClientID, dispatch]);

  // Update form when saved data changes
  useEffect(() => {
    if (Object.keys(savedData).length > 0) {
      setFormData(savedData);
    }
  }, [savedData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentClientID) {
      alert("⚠️ Please select a client before saving.");
      return;
    }

    // Validate required fields
    if (!formData.idtNursingGoal.trim()) {
      alert("⚠️ Please enter the member's goal before saving.");
      return;
    }

    const idtData = {
      ...formData,
      clientID: currentClientID,
      createdBy: user?.email || "unknown",
      createdAt: new Date().toISOString(),
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock save in development
        setTimeout(() => {
          alert("✅ IDT Nursing Note saved successfully! (Mock mode)");
        }, 1000);
        await logUserAction(user, "SAVE_IDT_NURSING_NOTE", { clientID: currentClientID, ...idtData });
      } else {
        if (dispatch && typeof dispatch === 'function') {
          await dispatch(saveIDTNoteNursing({ clientID: currentClientID, ...idtData })).unwrap();
        }
        await logUserAction(user, "SAVE_IDT_NURSING_NOTE", { clientID: currentClientID, ...idtData });
        alert("✅ IDT Nursing Note saved successfully!");
      }
    } catch (err) {
      console.error("❌ Error saving IDT nursing note:", err);
      alert(`⚠️ Failed to save IDT nursing note: ${err.message || err}`);
    }
  };

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

  // Check if Redux slice is configured
  if (!idtNursingState && process.env.NODE_ENV === 'development') {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>Redux Configuration Error</Typography>
            <Typography variant="body2" paragraph>
              The <code>idtNursing</code> slice is not found in your Redux store.
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>To fix this:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              1. Add the idtNursing slice to your store configuration:
              <pre style={{ background: '#f5f5f5', padding: '8px', marginTop: '8px', borderRadius: '4px' }}>
{`// src/store/store.js
import idtNursingReducer from './apps/notes/idtNursingSlice';

export const store = configureStore({
  reducer: {
    // ... your existing reducers
    idtNursing: idtNursingReducer, // ADD THIS LINE
  },
});`}
              </pre>
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            📝 IDT Note - Nursing
          </Typography>
          <Box display="flex" gap={1}>
            {process.env.NODE_ENV === 'development' && (
              <Chip label="Development Mode" color="info" size="small" />
            )}
            {formData.goalStatus && (
              <Chip 
                label={`Goal: ${formData.goalStatus}`} 
                color={formData.goalStatus === 'Achieved' ? 'success' : 'primary'} 
                size="small" 
              />
            )}
          </Box>
        </Box>

        {/* Summary Dashboard */}
        {!summaryLoading && Object.keys(summary).length > 0 && (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                IDT Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">{summary.totalNotes || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Notes</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="secondary">{summary.currentGoals || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Active Goals</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Rating 
                      value={summary.averageCompliance ? summary.averageCompliance / 2 : 0} 
                      readOnly 
                      size="small" 
                    />
                    <Typography variant="body2" color="text.secondary">Avg Compliance</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">{summary.goalsAchieved || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Goals Achieved</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
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
                    label=""
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
                    label=""
                    value={formData.idtNursingAppoint}
                    onChange={(e) => handleInputChange('idtNursingAppoint', e.target.value)}
                    placeholder="List priority appointments, member preferences, and focus areas..."
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 2. Assessment & Goals */}
          <Accordion>
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
                    label=""
                    value={formData.idtNursingProb}
                    onChange={(e) => handleInputChange('idtNursingProb', e.target.value)}
                    placeholder="Document barriers, challenges, and obstacles to independence..."
                  />
                </Grid>
              </Grid>
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Typography>What is the Member's goal? Has it changed since initial eval/previous appointments? *</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="What is the Member's goal? Has it changed since initial eval/previous appointments? *"
                    value={formData.idtNursingGoal}
                    onChange={(e) => handleInputChange('idtNursingGoal', e.target.value)}
                    placeholder="Document member's goals, changes, and progress since last assessment..."
                    required
                    error={!formData.idtNursingGoal.trim()}
                   
                  />
                </Grid>
              </Grid>
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {/* Enhanced Goal Management */}
                <Grid item xs={12} md={4}>
                  <Typography>Goal Status</Typography>
                  <FormControl fullWidth>
                    <Select
                      value={formData.goalStatus}
                      label=""
                      onChange={(e) => handleInputChange('goalStatus', e.target.value)}
                    > 
                      <MenuItem value=""></MenuItem>
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
                      label=""
                      onChange={(e) => handleInputChange('goalPriority', e.target.value)}
                    >
                      <MenuItem value=""></MenuItem>
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
                    label=""
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
          <Accordion>
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
                    label=""
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
              </Grid>
              <Grid  spacing={3} sx={{ mt: 2 }}>
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

          {/* Submit Button */}
          <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              {process.env.NODE_ENV === 'development' && (
                <Typography variant="body2" color="text.secondary">
                  🔧 Development Mode: Data will be saved locally (mock mode)
                </Typography>
              )}
            </Box>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={saving || loading}
              sx={{ minWidth: 200 }}
            >
              {saving ? 'Saving...' : 'Save IDT Note'}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

IDTNoteNursing.propTypes = {
  clientID: PropTypes.string,
};

export default IDTNoteNursing;