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
  MenuItem,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  LinearProgress
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  LocalHospital as MedicalIcon,
  Event as EventIcon,
  Warning as AllergyIcon
} from "@mui/icons-material";
import Select from "react-select";
import {
  fetchMedicalInfo,
  fetchAppointments,
  saveMedicalInfo,
  saveAppointment,
  editAppointment,
  deleteAppointment,
  fetchClientAllergies,
} from "../../backend/store/slices/medFaceSheetSlice";
import logUserAction from "../../backend/config/logAction";
import { medCond, allergyList } from "../../data/arrayList";

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

const MedFaceSheet = ({ clientID }) => {
  const dispatch = useDispatch();
  
  // ✅ Safe selectors with fallback values
  const medFaceSheetState = useSelector((state) => state.medFaceSheet || {});
  const { 
    medicalInfo = {}, 
    appointments = [], 
    clientAllergies = [], 
    loading = false,
    error = null 
  } = medFaceSheetState;
  
  const user = useSelector((state) => state.auth?.user);

  // ✅ Environment detection for mock data
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;

  // Modal states
  const [medAppt, setMedAppt] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingApptId, setEditingApptId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggle = () => setMedAppt(!medAppt);

  // ✅ Fetch Data from Redux Store
  useEffect(() => {
    if (clientID && !shouldUseMockData) {
      dispatch(fetchMedicalInfo(clientID));
      dispatch(fetchAppointments(clientID));
      dispatch(fetchClientAllergies(clientID));
    }
  }, [clientID, dispatch, shouldUseMockData]);

  // ✅ Local State for Form Data
  const [formData, setFormData] = useState({
    clientMedConditions: [],
    clientAddMedHistory: "",
    clientMedPertinent: "",
    clientPreviousLab: "",
    clientAllergies: [],
  });

  // ✅ Sync Redux Data to Form State
  useEffect(() => {
    if (medicalInfo) {
      setFormData({
        clientMedConditions: medicalInfo.clientMedConditions || [],
        clientAddMedHistory: medicalInfo.clientAddMedHistory || "",
        clientMedPertinent: medicalInfo.clientMedPertinent || "",
        clientPreviousLab: medicalInfo.clientPreviousLab || "",
        clientAllergies: medicalInfo.clientAllergies || [],
      });
    }
  }, [medicalInfo]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveMedicalInfo = async () => {
    try {
      if (shouldUseMockData) {
        // Simulate save
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        return;
      }

      await dispatch(saveMedicalInfo({ clientID, medicalData: formData }));
      if (user) {
        await logUserAction(user, "SAVE_MEDICAL_INFO", {
          clientID,
          ...formData,
          savedAt: new Date().toISOString()
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving medical info:", error);
    }
  };

  // ✅ Appointment Form State
  const [medApptData, setMedApptData] = useState({
    medApptDate: "",
    medApptLoc: "",
    medApptType: "",
    medApptProv: "",
    medApptTranport: "",
  });

  const handleAppointmentChange = (e) => {
    setMedApptData({ ...medApptData, [e.target.name]: e.target.value });
  };

  const handleSaveAppointment = () => {
    if (shouldUseMockData) {
      // Simulate save
      setMedAppt(false);
      resetAppointmentForm();
      return;
    }

    if (editMode && editingApptId) {
      dispatch(editAppointment({
        clientID,
        appointmentID: editingApptId,
        appointmentData: medApptData
      }));
    } else {
      dispatch(saveAppointment({ clientID, appointmentData: medApptData }));
    }
    setMedAppt(false);
    resetAppointmentForm();
  };

  const resetAppointmentForm = () => {
    setMedApptData({
      medApptDate: "",
      medApptLoc: "",
      medApptType: "",
      medApptProv: "",
      medApptTranport: "",
    });
    setEditMode(false);
    setEditingApptId(null);
  };

  const handleEditClick = (appt) => {
    setMedApptData({ ...appt });
    setEditingApptId(appt.appointmentID);
    setEditMode(true);
    setMedAppt(true);
  };

  const handleDeleteClick = (appointmentID) => {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      if (!shouldUseMockData) {
        dispatch(deleteAppointment({ clientID, appointmentID }));
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Loading medical information...</Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 12 }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock medical face sheet data
        </Alert>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Medical information saved successfully!
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
      )}

      {/* Medical Information Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <MedicalIcon color="primary" />
            <Typography variant="h6">
              Medical Information
            </Typography>
          </Box>

          <Grid container spacing={1}>
            {/* Medical Conditions */}
            <Grid item >
              <Typography variant="body1" sx={{ mb: 1 }}>Medical Conditions</Typography>
              <Select
                isMulti
                options={medCond}
                value={formData.clientMedConditions}
                onChange={(value) => handleSelectChange("clientMedConditions", value)}
                placeholder="Select medical conditions..."
                styles={customSelectStyles}
              />
            </Grid>
          </Grid>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Additional Medical History */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ mb: 1 }}>Additional Medical History</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                // label="Additional Medical History"
                name="clientAddMedHistory"
                value={formData.clientAddMedHistory}
                onChange={handleInputChange}
              />
            </Grid>

            {/* Pertinent Information */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ mb: 1 }}>Pertinent Information</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                // label="Pertinent Information"
                name="clientMedPertinent"
                value={formData.clientMedPertinent}
                onChange={handleInputChange}
              />
            </Grid>

            {/* Previous Lab Work */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ mb: 1 }}>Review of Charts/Previous Lab Work</Typography>
              <FormControl fullWidth>
                <MuiSelect
                  name="clientPreviousLab"
                  value={formData.clientPreviousLab}
                  onChange={handleInputChange}
                  label="Review of Charts/Previous Lab Work"
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </MuiSelect>
              </FormControl>
            </Grid>

            {/* Allergies */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AllergyIcon color="warning" />
                <Typography variant="body1">Allergy/Intolerance History</Typography>
              </Box>
              <Select
                  isMulti
                  options={allergyList?.map((item) => ({ 
                    label: item.value, 
                    value: item.value 
                  })) || []}
                  value={formData.clientAllergies}
                  onChange={(value) => handleSelectChange("clientAllergies", value)}
                  placeholder="Select allergies..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '56px'
                    })
                  }}
                /> 
            </Grid>

            {/* Save Button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<SaveIcon />}
                onClick={handleSaveMedicalInfo}
                disabled={loading}
              >
                Save Medical Info
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Appointments Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EventIcon color="primary" />
              <Typography variant="h6">
                Client Appointments
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={toggle}
            >
              Add Appointment
            </Button>
          </Box>

          {/* Appointments Table */}
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Transport</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Alert severity="info">No appointments scheduled.</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((item) => (
                    <TableRow key={item.appointmentID} hover>
                      <TableCell>{item.medApptDate}</TableCell>
                      <TableCell>{item.medApptLoc}</TableCell>
                      <TableCell>{item.medApptType}</TableCell>
                      <TableCell>{item.medApptProv}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.medApptTranport || 'N/A'}
                          color={item.medApptTranport === 'Yes' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEditClick(item)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteClick(item.appointmentID)}
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
        </CardContent>
      </Card>

      {/* Add/Edit Appointment Dialog */}
      <Dialog open={medAppt} onClose={toggle} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EventIcon />
            {editMode ? 'Edit Appointment' : 'Add Appointment'}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <label>Date</label>
              <TextField
                fullWidth
                type="date"
                name="medApptDate"
                value={medApptData.medApptDate}
                onChange={handleAppointmentChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <label>Location</label>
              <TextField
                fullWidth
                name="medApptLoc"
                value={medApptData.medApptLoc}
                onChange={handleAppointmentChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <label>Type</label>
              <TextField
                fullWidth
                name="medApptType"
                value={medApptData.medApptType}
                onChange={handleAppointmentChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <label>Provider</label>
              <TextField
                fullWidth
                name="medApptProv"
                value={medApptData.medApptProv}
                onChange={handleAppointmentChange}
              />
            </Grid>
            <Grid item xs={12} sm={12}>
              <Typography variant="body1" sx={{ mb: 1 }}>Transportation?</Typography>
              <FormControl fullWidth>
                <MuiSelect
                  name="medApptTranport"
                  value={medApptData.medApptTranport}
                  onChange={handleAppointmentChange}
                >
                  <MenuItem value="">Select...</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </MuiSelect>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveAppointment} variant="contained" color="primary">
            {editMode ? 'Update' : 'Save'}
          </Button>
          <Button onClick={toggle} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

MedFaceSheet.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default MedFaceSheet;