// MedFaceSheet.jsx - Enhanced dropdown visibility
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

// ✅ ENHANCED: Custom styles for react-select with better dropdown visibility
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
    maxHeight: '300px',
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '4px 0',
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? '#1976d2' 
      : state.isFocused 
      ? 'rgba(25, 118, 210, 0.08)' 
      : 'white',
    color: state.isSelected ? 'white' : 'rgba(0, 0, 0, 0.87)',
    padding: '8px 12px',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'rgba(25, 118, 210, 0.16)',
    },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#1976d2',
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#1976d2',
    ':hover': {
      backgroundColor: '#1976d2',
      color: 'white',
    },
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

  // ✅ Helper function to safely convert error to string
  const getErrorMessage = (err) => {
    if (!err) return null;
    
    // If error is a string, return it
    if (typeof err === 'string') return err;
    
    // If error is an object with message property
    if (err.message) return err.message;
    
    // If error is an object with error property
    if (err.error) return err.error;
    
    // Try to stringify the error
    try {
      return JSON.stringify(err);
    } catch {
      return 'An unknown error occurred';
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
    <Box sx={{ p: 0 }}>
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

      {/* ✅ Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {getErrorMessage(error)}
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

          <Grid container spacing={3}>
            {/* Medical Conditions */}
            <Grid item xs={12}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Medical Conditions
              </Typography>
              <Select
                isMulti
                options={medCond}
                value={formData.clientMedConditions}
                onChange={(value) => handleSelectChange("clientMedConditions", value)}
                placeholder="Select medical conditions..."
                styles={customSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                maxMenuHeight={300}
              />
            </Grid>

            {/* Additional Medical History */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Additional Medical History
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="clientAddMedHistory"
                value={formData.clientAddMedHistory}
                onChange={handleInputChange}
                placeholder="Enter additional medical history..."
              />
            </Grid>

            {/* Pertinent Information */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Pertinent Information
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="clientMedPertinent"
                value={formData.clientMedPertinent}
                onChange={handleInputChange}
                placeholder="Enter pertinent information..."
              />
            </Grid>

            {/* Previous Lab Work */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Review of Charts/Previous Lab Work
              </Typography>
              <FormControl fullWidth>
                <MuiSelect
                  name="clientPreviousLab"
                  value={formData.clientPreviousLab}
                  onChange={handleInputChange}
                  displayEmpty
                >
                  <MenuItem value="">Select...</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </MuiSelect>
              </FormControl>
            </Grid>

            {/* ✅ ENHANCED: Allergies Section with improved dropdown */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AllergyIcon color="warning" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Allergy/Intolerance History
                </Typography>
                <Chip 
                  label={`${allergyList.length} options available`} 
                  size="small" 
                  color="info" 
                  variant="outlined"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Select all applicable allergies. This list includes drug, food, and environmental allergies.
              </Typography>
              <Select
                isMulti
                options={allergyList?.map((item) => ({ 
                  label: item.value, 
                  value: item.value 
                })) || []}
                value={formData.clientAllergies}
                onChange={(value) => handleSelectChange("clientAllergies", value)}
                placeholder="Click here to select allergies..."
                styles={customSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                maxMenuHeight={300}
                closeMenuOnScroll={false}
                isClearable
                isSearchable
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
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Date</Typography>
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
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Location</Typography>
              <TextField
                fullWidth
                name="medApptLoc"
                value={medApptData.medApptLoc}
                onChange={handleAppointmentChange}
                placeholder="Enter location..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Type</Typography>
              <TextField
                fullWidth
                name="medApptType"
                value={medApptData.medApptType}
                onChange={handleAppointmentChange}
                placeholder="Enter appointment type..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Provider</Typography>
              <TextField
                fullWidth
                name="medApptProv"
                value={medApptData.medApptProv}
                onChange={handleAppointmentChange}
                placeholder="Enter provider name..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Transportation?</Typography>
              <FormControl fullWidth>
                <MuiSelect
                  name="medApptTranport"
                  value={medApptData.medApptTranport}
                  onChange={handleAppointmentChange}
                  displayEmpty
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