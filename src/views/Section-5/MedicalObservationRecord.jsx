// MedicalObservationRecord.jsx - Medical Observation Record Component
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
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
  Box,
  Alert,
  IconButton,
  Chip,
  Tabs,
  Tab,
  MenuItem,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  LinearProgress,
  Divider
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Medication as MedicationIcon,
  Favorite as HeartIcon,
  Visibility as ObservationIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon
} from "@mui/icons-material";
import {
  fetchMedicationRecords,
  saveMedicationRecord,
  updateMedicationRecord,
  deleteMedicationRecord,
  fetchVitalSigns,
  saveVitalSigns,
  updateVitalSigns,
  deleteVitalSigns,
  fetchDailyObservations,
  saveDailyObservation,
  updateDailyObservation,
  deleteDailyObservation,
  fetchMedicalObservationSummary,
} from "../../backend/store/slices/medObservationSlice";
import logUserAction from "../../backend/config/logAction";

const MedicalObservationRecord = ({ clientID }) => {
  const dispatch = useDispatch();
  
  // Redux State
  const medObservationState = useSelector((state) => state.medObservation || {});
  const {
    medicationRecords = [],
    vitalSigns = [],
    dailyObservations = [],
    summary = {},
    loading = false,
    medicationLoading = false,
    vitalSignsLoading = false,
    observationsLoading = false,
    error = null
  } = medObservationState;
  
  const user = useSelector((state) => state.auth?.user);

  // Environment detection
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;

  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [medDialog, setMedDialog] = useState(false);
  const [vitalDialog, setVitalDialog] = useState(false);
  const [obsDialog, setObsDialog] = useState(false);
  
  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Success states
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Date filter state
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  // ============================================================================
  // FETCH DATA ON MOUNT
  // ============================================================================

  useEffect(() => {
    if (clientID && !shouldUseMockData) {
      dispatch(fetchMedicationRecords({ clientID }));
      dispatch(fetchVitalSigns({ clientID, limit: 30 }));
      dispatch(fetchDailyObservations({ clientID }));
      dispatch(fetchMedicalObservationSummary(clientID));
    }
  }, [clientID, dispatch, shouldUseMockData]);

  // ============================================================================
  // MEDICATION ADMINISTRATION RECORD (MAR)
  // ============================================================================

  const [medData, setMedData] = useState({
    medicationName: '',
    dosage: '',
    route: 'PO',
    frequency: 'Daily',
    scheduledTime: '',
    administeredDate: new Date().toISOString().split('T')[0],
    administeredTime: new Date().toISOString(),
    administeredBy: user?.name || '',
    status: 'Given',
    holdReason: '',
    notes: ''
  });

  const handleMedChange = (e) => {
    setMedData({ ...medData, [e.target.name]: e.target.value });
  };

  const handleSaveMedication = async () => {
    try {
      const medPayload = {
        ...medData,
        administeredBy: user?.name || medData.administeredBy,
        createdBy: user?.email || 'system'
      };

      if (editMode && editingId) {
        await dispatch(updateMedicationRecord({ 
          marID: editingId, 
          medicationData: medPayload 
        }));
      } else {
        await dispatch(saveMedicationRecord({ 
          clientID, 
          medicationData: medPayload 
        }));
      }

      if (user) {
        await logUserAction(user, editMode ? "UPDATE_MEDICATION" : "ADD_MEDICATION", {
          clientID,
          medicationName: medData.medicationName,
          timestamp: new Date().toISOString()
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setMedDialog(false);
      resetMedForm();
      
      // Refresh data
      dispatch(fetchMedicationRecords({ clientID }));
    } catch (error) {
      console.error("Error saving medication:", error);
    }
  };

  const resetMedForm = () => {
    setMedData({
      medicationName: '',
      dosage: '',
      route: 'PO',
      frequency: 'Daily',
      scheduledTime: '',
      administeredDate: new Date().toISOString().split('T')[0],
      administeredTime: new Date().toISOString(),
      administeredBy: user?.name || '',
      status: 'Given',
      holdReason: '',
      notes: ''
    });
    setEditMode(false);
    setEditingId(null);
  };

  const handleEditMedication = (record) => {
    setMedData({
      medicationName: record.medicationName || '',
      dosage: record.dosage || '',
      route: record.route || 'PO',
      frequency: record.frequency || 'Daily',
      scheduledTime: record.scheduledTime || '',
      administeredDate: record.administeredDate || '',
      administeredTime: record.administeredTime || '',
      administeredBy: record.administeredBy || user?.name || '',
      status: record.status || 'Given',
      holdReason: record.holdReason || '',
      notes: record.notes || ''
    });
    setEditingId(record.marID);
    setEditMode(true);
    setMedDialog(true);
  };

  const handleDeleteMedication = async (marID) => {
    if (window.confirm("Are you sure you want to delete this medication record?")) {
      try {
        await dispatch(deleteMedicationRecord({ clientID, marID }));
        if (user) {
          await logUserAction(user, "DELETE_MEDICATION", { clientID, marID });
        }
        dispatch(fetchMedicationRecords({ clientID }));
      } catch (error) {
        console.error("Error deleting medication:", error);
      }
    }
  };

  // ============================================================================
  // VITAL SIGNS
  // ============================================================================

  const [vitalData, setVitalData] = useState({
    recordDate: new Date().toISOString().split('T')[0],
    recordTime: new Date().toTimeString().slice(0, 5),
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    pulse: '',
    respirations: '',
    oxygenSaturation: '',
    weight: '',
    bloodGlucose: '',
    painLevel: '',
    notes: '',
    recordedBy: user?.name || ''
  });

  const handleVitalChange = (e) => {
    setVitalData({ ...vitalData, [e.target.name]: e.target.value });
  };

  const handleSaveVitals = async () => {
    try {
      const vitalPayload = {
        ...vitalData,
        recordedBy: user?.name || vitalData.recordedBy
      };

      if (editMode && editingId) {
        await dispatch(updateVitalSigns({ 
          vitalSignID: editingId, 
          vitalData: vitalPayload 
        }));
      } else {
        await dispatch(saveVitalSigns({ 
          clientID, 
          vitalData: vitalPayload 
        }));
      }

      if (user) {
        await logUserAction(user, editMode ? "UPDATE_VITALS" : "ADD_VITALS", {
          clientID,
          timestamp: new Date().toISOString()
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setVitalDialog(false);
      resetVitalForm();
      
      // Refresh data
      dispatch(fetchVitalSigns({ clientID, limit: 30 }));
    } catch (error) {
      console.error("Error saving vitals:", error);
    }
  };

  const resetVitalForm = () => {
    setVitalData({
      recordDate: new Date().toISOString().split('T')[0],
      recordTime: new Date().toTimeString().slice(0, 5),
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      temperature: '',
      pulse: '',
      respirations: '',
      oxygenSaturation: '',
      weight: '',
      bloodGlucose: '',
      painLevel: '',
      notes: '',
      recordedBy: user?.name || ''
    });
    setEditMode(false);
    setEditingId(null);
  };

  const handleEditVitals = (record) => {
    setVitalData({
      recordDate: record.recordDate || '',
      recordTime: record.recordTime || '',
      bloodPressureSystolic: record.bloodPressureSystolic || '',
      bloodPressureDiastolic: record.bloodPressureDiastolic || '',
      temperature: record.temperature || '',
      pulse: record.pulse || '',
      respirations: record.respirations || '',
      oxygenSaturation: record.oxygenSaturation || '',
      weight: record.weight || '',
      bloodGlucose: record.bloodGlucose || '',
      painLevel: record.painLevel || '',
      notes: record.notes || '',
      recordedBy: record.recordedBy || user?.name || ''
    });
    setEditingId(record.vitalSignID);
    setEditMode(true);
    setVitalDialog(true);
  };

  const handleDeleteVitals = async (vitalSignID) => {
    if (window.confirm("Are you sure you want to delete this vital signs record?")) {
      try {
        await dispatch(deleteVitalSigns({ clientID, vitalSignID }));
        if (user) {
          await logUserAction(user, "DELETE_VITALS", { clientID, vitalSignID });
        }
        dispatch(fetchVitalSigns({ clientID, limit: 30 }));
      } catch (error) {
        console.error("Error deleting vitals:", error);
      }
    }
  };

  // ============================================================================
  // DAILY OBSERVATIONS
  // ============================================================================

  const [obsData, setObsData] = useState({
    observationDate: new Date().toISOString().split('T')[0],
    generalCondition: '',
    moodBehavior: '',
    sleepQuality: '',
    appetiteIntake: '',
    bowelMovement: '',
    urinaryOutput: '',
    skinIntegrity: '',
    fallRisk: 'Low',
    activityLevel: '',
    painAssessment: '',
    observationNotes: '',
    recordedBy: user?.name || ''
  });

  const handleObsChange = (e) => {
    setObsData({ ...obsData, [e.target.name]: e.target.value });
  };

  const handleSaveObservation = async () => {
    try {
      const obsPayload = {
        ...obsData,
        recordedBy: user?.name || obsData.recordedBy,
        createdBy: user?.email || 'system'
      };

      if (editMode && editingId) {
        await dispatch(updateDailyObservation({ 
          observationID: editingId, 
          observationData: obsPayload 
        }));
      } else {
        await dispatch(saveDailyObservation({ 
          clientID, 
          observationData: obsPayload 
        }));
      }

      if (user) {
        await logUserAction(user, editMode ? "UPDATE_OBSERVATION" : "ADD_OBSERVATION", {
          clientID,
          timestamp: new Date().toISOString()
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setObsDialog(false);
      resetObsForm();
      
      // Refresh data
      dispatch(fetchDailyObservations({ clientID }));
    } catch (error) {
      console.error("Error saving observation:", error);
    }
  };

  const resetObsForm = () => {
    setObsData({
      observationDate: new Date().toISOString().split('T')[0],
      generalCondition: '',
      moodBehavior: '',
      sleepQuality: '',
      appetiteIntake: '',
      bowelMovement: '',
      urinaryOutput: '',
      skinIntegrity: '',
      fallRisk: 'Low',
      activityLevel: '',
      painAssessment: '',
      observationNotes: '',
      recordedBy: user?.name || ''
    });
    setEditMode(false);
    setEditingId(null);
  };

  const handleEditObservation = (record) => {
    setObsData({
      observationDate: record.observationDate || '',
      generalCondition: record.generalCondition || '',
      moodBehavior: record.moodBehavior || '',
      sleepQuality: record.sleepQuality || '',
      appetiteIntake: record.appetiteIntake || '',
      bowelMovement: record.bowelMovement || '',
      urinaryOutput: record.urinaryOutput || '',
      skinIntegrity: record.skinIntegrity || '',
      fallRisk: record.fallRisk || 'Low',
      activityLevel: record.activityLevel || '',
      painAssessment: record.painAssessment || '',
      observationNotes: record.observationNotes || '',
      recordedBy: record.recordedBy || user?.name || ''
    });
    setEditingId(record.observationID);
    setEditMode(true);
    setObsDialog(true);
  };

  const handleDeleteObservation = async (observationID) => {
    if (window.confirm("Are you sure you want to delete this observation?")) {
      try {
        await dispatch(deleteDailyObservation({ clientID, observationID }));
        if (user) {
          await logUserAction(user, "DELETE_OBSERVATION", { clientID, observationID });
        }
        dispatch(fetchDailyObservations({ clientID }));
      } catch (error) {
        console.error("Error deleting observation:", error);
      }
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getStatusColor = (status) => {
    switch (status) {
      case 'Given':
        return 'success';
      case 'Held':
        return 'warning';
      case 'Refused':
        return 'error';
      case 'PRN':
        return 'info';
      default:
        return 'default';
    }
  };

  const getErrorMessage = (err) => {
    if (!err) return null;
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.error) return err.error;
    try {
      return JSON.stringify(err);
    } catch {
      return 'An unknown error occurred';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Loading medical observation records...</Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Development Indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock medical observation data
        </Alert>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Record saved successfully!
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {getErrorMessage(error)}
        </Alert>
      )}

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MedicationIcon color="primary" />
                <Box>
                  <Typography variant="h6">{summary.activeMedications || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active Medications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HeartIcon color="error" />
                <Box>
                  <Typography variant="h6">{summary.vitalSignsLast7Days || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vitals (Last 7 Days)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ObservationIcon color="info" />
                <Box>
                  <Typography variant="h6">{summary.observationsLast7Days || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Observations (Last 7 Days)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon color="success" />
                <Box>
                  <Typography variant="h6">{summary.medicationsLast30Days || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Meds Given (30 Days)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Card with Tabs */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<MedicationIcon />} label="Medication Administration" iconPosition="start" />
            <Tab icon={<HeartIcon />} label="Vital Signs" iconPosition="start" />
            <Tab icon={<ObservationIcon />} label="Daily Observations" iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* TAB 1: Medication Administration Record */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MedicationIcon color="primary" />
                    Medication Administration Record (MAR)
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetMedForm();
                      setMedDialog(true);
                    }}
                  >
                    Add Medication
                  </Button>
                </Box>

                {medicationLoading ? (
                  <LinearProgress />
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>Medication</TableCell>
                          <TableCell>Dosage</TableCell>
                          <TableCell>Route</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Given By</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {medicationRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              <Alert severity="info">No medication records found.</Alert>
                            </TableCell>
                          </TableRow>
                        ) : (
                          medicationRecords.map((record) => (
                            <TableRow key={record.marID} hover>
                              <TableCell>{record.administeredDate}</TableCell>
                              <TableCell>
                                <Chip 
                                  icon={<TimeIcon />}
                                  label={record.scheduledTime || 'N/A'} 
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {record.medicationName}
                                </Typography>
                              </TableCell>
                              <TableCell>{record.dosage}</TableCell>
                              <TableCell>{record.route}</TableCell>
                              <TableCell>
                                <Chip
                                  label={record.status}
                                  color={getStatusColor(record.status)}
                                  size="small"
                                  icon={record.status === 'Given' ? <CheckIcon /> : <CancelIcon />}
                                />
                              </TableCell>
                              <TableCell>{record.administeredBy}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditMedication(record)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteMedication(record.marID)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* TAB 2: Vital Signs */}
            {activeTab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HeartIcon color="error" />
                    Vital Signs
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetVitalForm();
                      setVitalDialog(true);
                    }}
                  >
                    Record Vitals
                  </Button>
                </Box>

                {vitalSignsLoading ? (
                  <LinearProgress />
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>BP</TableCell>
                          <TableCell>Temp (°F)</TableCell>
                          <TableCell>Pulse</TableCell>
                          <TableCell>Resp</TableCell>
                          <TableCell>O2 Sat (%)</TableCell>
                          <TableCell>Pain (0-10)</TableCell>
                          <TableCell>Recorded By</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {vitalSigns.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} align="center">
                              <Alert severity="info">No vital signs recorded.</Alert>
                            </TableCell>
                          </TableRow>
                        ) : (
                          vitalSigns.map((vital) => (
                            <TableRow key={vital.vitalSignID} hover>
                              <TableCell>{vital.recordDate}</TableCell>
                              <TableCell>{vital.recordTime}</TableCell>
                              <TableCell>
                                {vital.bloodPressureSystolic && vital.bloodPressureDiastolic
                                  ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}`
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>{vital.temperature || 'N/A'}</TableCell>
                              <TableCell>{vital.pulse || 'N/A'}</TableCell>
                              <TableCell>{vital.respirations || 'N/A'}</TableCell>
                              <TableCell>{vital.oxygenSaturation || 'N/A'}</TableCell>
                              <TableCell>
                                {vital.painLevel !== null && vital.painLevel !== undefined ? (
                                  <Chip
                                    label={vital.painLevel}
                                    color={vital.painLevel <= 3 ? 'success' : vital.painLevel <= 6 ? 'warning' : 'error'}
                                    size="small"
                                  />
                                ) : 'N/A'}
                              </TableCell>
                              <TableCell>{vital.recordedBy}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditVitals(vital)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteVitals(vital.vitalSignID)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* TAB 3: Daily Observations */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ObservationIcon color="info" />
                    Daily Observations
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetObsForm();
                      setObsDialog(true);
                    }}
                  >
                    Add Observation
                  </Button>
                </Box>

                {observationsLoading ? (
                  <LinearProgress />
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>General Condition</TableCell>
                          <TableCell>Mood/Behavior</TableCell>
                          <TableCell>Sleep Quality</TableCell>
                          <TableCell>Fall Risk</TableCell>
                          <TableCell>Recorded By</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dailyObservations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Alert severity="info">No daily observations recorded.</Alert>
                            </TableCell>
                          </TableRow>
                        ) : (
                          dailyObservations.map((obs) => (
                            <TableRow key={obs.observationID} hover>
                              <TableCell>{obs.observationDate}</TableCell>
                              <TableCell>{obs.generalCondition}</TableCell>
                              <TableCell>{obs.moodBehavior}</TableCell>
                              <TableCell>{obs.sleepQuality}</TableCell>
                              <TableCell>
                                <Chip
                                  label={obs.fallRisk}
                                  color={
                                    obs.fallRisk === 'Low' ? 'success' :
                                    obs.fallRisk === 'Medium' ? 'warning' : 'error'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{obs.recordedBy}</TableCell>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditObservation(obs)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteObservation(obs.observationID)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* DIALOG: Add/Edit Medication */}
      <Dialog open={medDialog} onClose={() => setMedDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <MedicationIcon />
            {editMode ? 'Edit Medication Record' : 'Add Medication Record'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Medication Name"
                name="medicationName"
                value={medData.medicationName}
                onChange={handleMedChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Dosage"
                name="dosage"
                value={medData.dosage}
                onChange={handleMedChange}
                placeholder="e.g., 20 mg"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Route</InputLabel>
                <MuiSelect
                  name="route"
                  value={medData.route}
                  onChange={handleMedChange}
                  label="Route"
                >
                  <MenuItem value="PO">PO (By Mouth)</MenuItem>
                  <MenuItem value="IM">IM (Intramuscular)</MenuItem>
                  <MenuItem value="IV">IV (Intravenous)</MenuItem>
                  <MenuItem value="SubQ">SubQ (Subcutaneous)</MenuItem>
                  <MenuItem value="Topical">Topical</MenuItem>
                  <MenuItem value="Inhaled">Inhaled</MenuItem>
                </MuiSelect>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Frequency"
                name="frequency"
                value={medData.frequency}
                onChange={handleMedChange}
                placeholder="e.g., Daily, BID"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="time"
                label="Scheduled Time"
                name="scheduledTime"
                value={medData.scheduledTime}
                onChange={handleMedChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Administered Date"
                name="administeredDate"
                value={medData.administeredDate}
                onChange={handleMedChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <MuiSelect
                  name="status"
                  value={medData.status}
                  onChange={handleMedChange}
                  label="Status"
                >
                  <MenuItem value="Given">Given</MenuItem>
                  <MenuItem value="Held">Held</MenuItem>
                  <MenuItem value="Refused">Refused</MenuItem>
                  <MenuItem value="PRN">PRN</MenuItem>
                </MuiSelect>
              </FormControl>
            </Grid>
            {medData.status === 'Held' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Hold"
                  name="holdReason"
                  value={medData.holdReason}
                  onChange={handleMedChange}
                  multiline
                  rows={2}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={medData.notes}
                onChange={handleMedChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Administered By"
                name="administeredBy"
                value={medData.administeredBy}
                onChange={handleMedChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveMedication} variant="contained" color="primary">
            {editMode ? 'Update' : 'Save'}
          </Button>
          <Button onClick={() => setMedDialog(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: Add/Edit Vital Signs */}
      <Dialog open={vitalDialog} onClose={() => setVitalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HeartIcon />
            {editMode ? 'Edit Vital Signs' : 'Record Vital Signs'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Record Date"
                name="recordDate"
                value={vitalData.recordDate}
                onChange={handleVitalChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="Record Time"
                name="recordTime"
                value={vitalData.recordTime}
                onChange={handleVitalChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Blood Pressure (Systolic)"
                name="bloodPressureSystolic"
                value={vitalData.bloodPressureSystolic}
                onChange={handleVitalChange}
                placeholder="e.g., 120"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Blood Pressure (Diastolic)"
                name="bloodPressureDiastolic"
                value={vitalData.bloodPressureDiastolic}
                onChange={handleVitalChange}
                placeholder="e.g., 80"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Temperature (°F)"
                name="temperature"
                value={vitalData.temperature}
                onChange={handleVitalChange}
                placeholder="e.g., 98.6"
                inputProps={{ step: "0.1" }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Pulse (BPM)"
                name="pulse"
                value={vitalData.pulse}
                onChange={handleVitalChange}
                placeholder="e.g., 72"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Respirations"
                name="respirations"
                value={vitalData.respirations}
                onChange={handleVitalChange}
                placeholder="e.g., 16"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="O2 Saturation (%)"
                name="oxygenSaturation"
                value={vitalData.oxygenSaturation}
                onChange={handleVitalChange}
                placeholder="e.g., 98"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Weight (lbs)"
                name="weight"
                value={vitalData.weight}
                onChange={handleVitalChange}
                placeholder="e.g., 165.5"
                inputProps={{ step: "0.1" }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Blood Glucose"
                name="bloodGlucose"
                value={vitalData.bloodGlucose}
                onChange={handleVitalChange}
                placeholder="e.g., 110"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Pain Level (0-10)</InputLabel>
                <MuiSelect
                  name="painLevel"
                  value={vitalData.painLevel}
                  onChange={handleVitalChange}
                  label="Pain Level (0-10)"
                >
                  {[...Array(11)].map((_, i) => (
                    <MenuItem key={i} value={i}>{i} - {i === 0 ? 'No Pain' : i <= 3 ? 'Mild' : i <= 6 ? 'Moderate' : 'Severe'}</MenuItem>
                  ))}
                </MuiSelect>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={vitalData.notes}
                onChange={handleVitalChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recorded By"
                name="recordedBy"
                value={vitalData.recordedBy}
                onChange={handleVitalChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveVitals} variant="contained" color="primary">
            {editMode ? 'Update' : 'Save'}
          </Button>
          <Button onClick={() => setVitalDialog(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: Add/Edit Daily Observation */}
      <Dialog open={obsDialog} onClose={() => setObsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ObservationIcon />
            {editMode ? 'Edit Daily Observation' : 'Add Daily Observation'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Observation Date"
                name="observationDate"
                value={obsData.observationDate}
                onChange={handleObsChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="General Condition"
                name="generalCondition"
                value={obsData.generalCondition}
                onChange={handleObsChange}
                placeholder="e.g., Good, Fair, Poor"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mood/Behavior"
                name="moodBehavior"
                value={obsData.moodBehavior}
                onChange={handleObsChange}
                placeholder="e.g., Calm, Anxious, Cooperative"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sleep Quality"
                name="sleepQuality"
                value={obsData.sleepQuality}
                onChange={handleObsChange}
                placeholder="e.g., Good - 7 hours"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Appetite/Intake"
                name="appetiteIntake"
                value={obsData.appetiteIntake}
                onChange={handleObsChange}
                placeholder="e.g., Good - ate 75% of meals"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bowel Movement"
                name="bowelMovement"
                value={obsData.bowelMovement}
                onChange={handleObsChange}
                placeholder="e.g., Regular, Constipated"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Urinary Output"
                name="urinaryOutput"
                value={obsData.urinaryOutput}
                onChange={handleObsChange}
                placeholder="e.g., Normal, Decreased"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Skin Integrity"
                name="skinIntegrity"
                value={obsData.skinIntegrity}
                onChange={handleObsChange}
                placeholder="e.g., Intact, Redness noted"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Fall Risk</InputLabel>
                <MuiSelect
                  name="fallRisk"
                  value={obsData.fallRisk}
                  onChange={handleObsChange}
                  label="Fall Risk"
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                </MuiSelect>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Activity Level"
                name="activityLevel"
                value={obsData.activityLevel}
                onChange={handleObsChange}
                placeholder="e.g., Moderate, Active"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Pain Assessment"
                name="painAssessment"
                value={obsData.painAssessment}
                onChange={handleObsChange}
                placeholder="e.g., Mild - 2/10"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observation Notes"
                name="observationNotes"
                value={obsData.observationNotes}
                onChange={handleObsChange}
                multiline
                rows={4}
                placeholder="Detailed observations..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recorded By"
                name="recordedBy"
                value={obsData.recordedBy}
                onChange={handleObsChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveObservation} variant="contained" color="primary">
            {editMode ? 'Update' : 'Save'}
          </Button>
          <Button onClick={() => setObsDialog(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

MedicalObservationRecord.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default MedicalObservationRecord;