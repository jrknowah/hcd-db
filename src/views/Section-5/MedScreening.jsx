import React, { useState, useEffect, useRef } from "react";
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
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select as MuiSelect,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import {
  Add as AddIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Healing as MedicalIcon,
  LocalHospital as HospitalIcon,
  Medication as MedicationIcon,
  Security as TBIcon,
  Female as WomenIcon,
  Favorite as SexualHealthIcon,
  Warning as RiskIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import Select from 'react-select';
import { fetchMedScreening, saveMedScreening } from "../../backend/store/slices/medScreeningSlice";
import {
  medCond2, medCond3,
  medCond4, medCond5, medicationData
} from "../../data/arrayList";

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

const MedScreening = ({ clientID }) => {
  const dispatch = useDispatch();
  
  // ✅ Safe selectors with fallback values
  const medScreeningState = useSelector((state) => state.medScreening || {});
  const { 
    data: savedMedData = [], 
    loading = false,
    error = null 
  } = medScreeningState;

  // ✅ Environment detection for mock data
  const isDevelopment = import.meta.env.VITE_USE_MOCK_DATA === 'true';
  
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;

  // ✅ State for Modal Toggle
  const [clientMeds, setClientMeds] = useState(false);
  const [clientSurgery, setClientSurgery] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleMeds = () => setClientMeds(!clientMeds);
  const toggleSurgery = () => setClientSurgery(!clientSurgery);

  // ✅ Fetch Data from Redux Store
  useEffect(() => {
    if (clientID && !shouldUseMockData) {
      console.log('📥 Fetching medical screening data for client:', clientID);
      dispatch(fetchMedScreening(clientID));
    }
  }, [clientID, dispatch, shouldUseMockData]);

  // ✅ State for Form Data
  const [formData, setFormData] = useState({
    clientMedConditions: [],
    clientHepAB: [],
    clientAlcoholRisk: "",
    clientAlcoholRiskMed: "",
    clientLastTBTest: "",
    clientLastTBTestResults: "",
    clientLastTBTestResultsTreatment: "",
    clientLastTBTestResultsTreatmentOutcome: "",
    tbCough: "",
    tbCoughBlood: "",
    medSweat: "",
    clientFever: "",
    clientWeightLoss: "",
    clientMedName: "",
    clientMedDose: "",
    clientMedSideEffects: "",
    clientMedTaking: "",
    clientSurgeryType: "",
    clientSurgeryDate: "",
    clientBC: "",
    clientBCName: "",
    clientBCDate: "",
    clientBCLoc: "",
    clientBCPreg: "",
    clientBCPregDate: "",
    clientBCPap: "",
    clientBCMam: "",
    clientSexLastYear: "",
    clientSexLastMonth: "",
    clientLastSexDate: "",
    clientSexRelations: "",
    clientRiskFactors: [],
    clientSTDDate: "",
    clientSTDStatus: [],
    clientMedications: [],
    clientSurgeries: [],
  });
  const isSaving = useRef(false);
  const [justSaved, setJustSaved] = useState(false);

  // ✅ FIXED: Load saved data into form with proper parsing
  useEffect(() => {
    if (isSaving.current) {
      console.log('⏭️ Blocked - currently saving');
      return;
    }
    
    if (justSaved) {
      console.log('⏭️ Skipping form reset - just saved data');
      setJustSaved(false);
      return;
    }

    if (!savedMedData || savedMedData.length === 0) {
      console.log('⏭️ No saved data to load');
      return;
    }

    const data = savedMedData[0];
    console.log('📥 Loading saved data into form:', data);
    
    // ✅ FIXED: Helper function to safely parse JSON
    const safeJsonParse = (value, fallback = []) => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return fallback;
      }
      
      if (Array.isArray(value)) {
        return value;
      }
      
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch (e) {
        console.warn('⚠️ Failed to parse JSON field:', value, e);
        return fallback;
      }
    };
    
    // ✅ FIXED: Parse all JSON array fields
    const parsedMedConditions = safeJsonParse(data.clientMedConditions, []);
    const parsedHepAB = safeJsonParse(data.clientHepAB, []);
    const parsedRiskFactors = safeJsonParse(data.clientRiskFactors, []);
    const parsedSTDStatus = safeJsonParse(data.clientSTDStatus, []);
    const parsedMedications = safeJsonParse(data.clientMedications, []);
    const parsedSurgeries = safeJsonParse(data.clientSurgeries, []);
    
    console.log('✅ Parsed data:', {
      medConditions: parsedMedConditions,
      hepAB: parsedHepAB,
      riskFactors: parsedRiskFactors,
      stdStatus: parsedSTDStatus,
      medications: parsedMedications,
      surgeries: parsedSurgeries
    });
    
    setFormData({
      ...data,
      id: data.id || "",
      
      // ✅ FIXED: Use parsed arrays
      clientMedConditions: parsedMedConditions,
      clientHepAB: parsedHepAB,
      clientRiskFactors: parsedRiskFactors,
      clientSTDStatus: parsedSTDStatus,
      clientMedications: parsedMedications,
      clientSurgeries: parsedSurgeries,
      
      // String fields with fallbacks
      clientAlcoholRisk: data.clientAlcoholRisk || "",
      clientAlcoholRiskMed: data.clientAlcoholRiskMed || "",
      clientLastTBTest: data.clientLastTBTest || "",
      clientLastTBTestResults: data.clientLastTBTestResults || "",
      clientLastTBTestResultsTreatment: data.clientLastTBTestResultsTreatment || "",
      clientLastTBTestResultsTreatmentOutcome: data.clientLastTBTestResultsTreatmentOutcome || "",
      tbCough: data.tbCough || "",
      tbCoughBlood: data.tbCoughBlood || "",
      medSweat: data.medSweat || "",
      clientFever: data.clientFever || "",
      clientWeightLoss: data.clientWeightLoss || "",
      clientBC: data.clientBC || "",
      clientBCName: data.clientBCName || "",
      clientBCDate: data.clientBCDate || "",
      clientBCLoc: data.clientBCLoc || "",
      clientBCPreg: data.clientBCPreg || "",
      clientBCPregDate: data.clientBCPregDate || "",
      clientBCPap: data.clientBCPap || "",
      clientBCMam: data.clientBCMam || "",
      clientSexLastYear: data.clientSexLastYear || "",
      clientSexLastMonth: data.clientSexLastMonth || "",
      clientLastSexDate: data.clientLastSexDate || "",
      clientSexRelations: data.clientSexRelations || "",
      clientSTDDate: data.clientSTDDate || "",
    });
  }, [savedMedData, justSaved]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Loading medical screening data...</Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  // ✅ Handle Regular Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Handle Multi-Select Inputs - converts array of objects to array of values
  const handleMultiSelectChange = (name, selectedOptions) => {
    console.log(`📝 Multi-select change for ${name}:`, selectedOptions);
    const values = selectedOptions ? selectedOptions.map(option => option.value) : [];
    console.log(`📝 Setting ${name} to:`, values);
    setFormData({
      ...formData,
      [name]: values
    });
  };

  // ✅ FIXED: Handle Form Submission with proper data structure
  const handleSubmit = (e) => {
    e.preventDefault();
    
    isSaving.current = true;
    setJustSaved(true);
    
    console.log('💾 Saving medical screening data...');
    console.log('📤 Form data being saved:', formData);
    
    if (!clientID) {
      console.error('❌ No clientID provided');
      isSaving.current = false;
      return;
    }
    
    if (shouldUseMockData) {
      console.log('🔧 Mock mode - data saved locally');
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        isSaving.current = false;
      }, 3000);
      return;
    }

    console.log('📤 Dispatching save to backend...');
    
    dispatch(saveMedScreening({ ...formData, clientID }))
      .unwrap()
      .then((result) => {
        console.log('✅ Save completed successfully:', result);
        setSaveSuccess(true);
        
        // ✅ Re-fetch data to ensure we have the latest from database
        setTimeout(() => {
          dispatch(fetchMedScreening(clientID));
          setSaveSuccess(false);
          isSaving.current = false;
        }, 1500);
      })
      .catch((error) => {
        console.error('❌ Save failed:', error);
        isSaving.current = false;
        setJustSaved(false);
      });
  };

  const handleSaveMeds = () => {
    console.log('💊 Adding medication');
    const newMed = {
      clientMedName: formData.clientMedName,
      clientMedDose: formData.clientMedDose,
      clientMedSideEffects: formData.clientMedSideEffects,
      clientMedTaking: formData.clientMedTaking,
    };
    const updatedMeds = [...(formData.clientMedications || []), newMed];
    console.log('💊 Updated medications:', updatedMeds);
    setFormData({ 
      ...formData, 
      clientMedications: updatedMeds,
      clientMedName: "",
      clientMedDose: "",
      clientMedSideEffects: "",
      clientMedTaking: ""
    });
    toggleMeds();
  };

  const handleSaveSurgeries = () => {
    console.log('🏥 Adding surgery/hospitalization');
    const newSurgery = {
      clientSurgeryType: formData.clientSurgeryType,
      clientSurgeryDate: formData.clientSurgeryDate,
    };
    const updatedSurgeries = [...(formData.clientSurgeries || []), newSurgery];
    console.log('🏥 Updated surgeries:', updatedSurgeries);
    setFormData({ 
      ...formData, 
      clientSurgeries: updatedSurgeries,
      clientSurgeryType: "",
      clientSurgeryDate: ""
    });
    toggleSurgery();
  };

  const handleDeleteMed = (index) => {
    console.log('🗑️ Deleting medication at index:', index);
    const updatedMeds = formData.clientMedications.filter((_, i) => i !== index);
    setFormData({ ...formData, clientMedications: updatedMeds });
  };

  const handleDeleteSurgery = (index) => {
    console.log('🗑️ Deleting surgery at index:', index);
    const updatedSurgeries = formData.clientSurgeries.filter((_, i) => i !== index);
    setFormData({ ...formData, clientSurgeries: updatedSurgeries });
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock medical screening data
        </Alert>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Medical screening data saved successfully!
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Medical Assistance Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MedicalIcon color="primary" />
              <Typography variant="h6">Medical Assistance & Diagnosis</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Do you need any of the following devices/assistance?
                </Typography>
                <Select
                  isMulti
                  options={medCond2}
                  value={medCond2.filter(option => formData.clientMedConditions?.includes(option.value))}
                  onChange={(selected) => handleMultiSelectChange("clientMedConditions", selected)}
                  placeholder="Select assistance needed..."
                  styles={customSelectStyles}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Have you ever been diagnosed with the following?
                </Typography>
                <Select
                  isMulti
                  options={medCond3}
                  value={medCond3.filter(option => formData.clientHepAB?.includes(option.value))}
                  onChange={(selected) => handleMultiSelectChange("clientHepAB", selected)}
                  placeholder="Select diagnoses..."
                  styles={customSelectStyles}
                />
              </Grid>
            </Grid>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography>Are you at risk for alcohol withdrawal or seizures?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientAlcoholRisk"
                    value={formData.clientAlcoholRisk || ""}
                    onChange={handleChange}
                    label="Are you at risk for alcohol withdrawal or seizures?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Were you getting medications in the hospital with alcohol withdrawal?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientAlcoholRiskMed"
                    value={formData.clientAlcoholRiskMed}
                    onChange={handleChange}
                    label="Were you getting medications in the hospital with alcohol withdrawal?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* TB Clearance Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TBIcon color="primary" />
              <Typography variant="h6">Tuberculosis Clearance</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography>Your last TB skin test (PPD) or chest x-ray</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientLastTBTest"
                  value={formData.clientLastTBTest}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Results</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientLastTBTestResults"
                    value={formData.clientLastTBTestResults}
                    onChange={handleChange}
                    label="Results"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Positive">Positive</MenuItem>
                    <MenuItem value="Negative">Negative</MenuItem>
                    <MenuItem value="Unknown">Unknown</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>If positive, did you receive treatment?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientLastTBTestResultsTreatment"
                    value={formData.clientLastTBTestResultsTreatment}
                    onChange={handleChange}
                    label="If positive, did you receive treatment?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Outcome of treatment</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientLastTBTestResultsTreatmentOutcome"
                  value={formData.clientLastTBTestResultsTreatmentOutcome}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Do you have a cough lasting longer than 3 weeks?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="tbCough"
                    value={formData.tbCough}
                    onChange={handleChange}
                    label="Do you have a cough lasting longer than 3 weeks?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Are you coughing up blood?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="tbCoughBlood"
                    value={formData.tbCoughBlood}
                    onChange={handleChange}
                    label="Are you coughing up blood?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Have you had new severe night sweats in the last month?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="medSweat"
                    value={formData.medSweat}
                    onChange={handleChange}
                    label="Have you had new severe night sweats in the last month?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Have you had weight loss without reason in the last couple months?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientWeightLoss"
                    value={formData.clientWeightLoss}
                    onChange={handleChange}
                    label="Have you had weight loss without reason in the last couple months?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Have you had high fevers without reason in the last few weeks?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientFever"
                    value={formData.clientFever}
                    onChange={handleChange}
                    label="Have you had high fevers without reason in the last few weeks?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Medication Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MedicationIcon color="primary" />
              <Typography variant="h6">Medication ({formData.clientMedications?.length || 0} medications)</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Current Medications</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={toggleMeds}
              >
                Add Medication
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell>Dosage</TableCell>
                    <TableCell>Side Effects</TableCell>
                    <TableCell>Currently Taking?</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!formData.clientMedications || formData.clientMedications?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Alert severity="info">No medications added yet.</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.clientMedications?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.clientMedName}</TableCell>
                        <TableCell>{item.clientMedDose}</TableCell>
                        <TableCell>{item.clientMedSideEffects}</TableCell>
                        <TableCell>{item.clientMedTaking}</TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteMed(index)}
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
          </AccordionDetails>
        </Accordion>

        {/* Surgical History Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HospitalIcon color="primary" />
              <Typography variant="h6">Surgical / Hospitalization History ({formData.clientSurgeries?.length || 0} records)</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Hospitalizations</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={toggleSurgery}
              >
                Add Hospitalization
              </Button>
            </Box>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type of Surgery/Hospitalization</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!formData.clientSurgeries || formData.clientSurgeries?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Alert severity="info">No surgeries/hospitalizations added yet.</Alert>
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.clientSurgeries?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.clientSurgeryType}</TableCell>
                        <TableCell>{item.clientSurgeryDate}</TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteSurgery(index)}
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
          </AccordionDetails>
        </Accordion>

        {/* Women's Health Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WomenIcon color="primary" />
              <Typography variant="h6">Women's Health History</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography>Are you currently on birth control?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientBC"
                    value={formData.clientBC}
                    onChange={handleChange}
                    label="Are you currently on birth control?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Name of Birth Control</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientBCName"
                  value={formData.clientBCName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Date of Last Dose</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientBCDate"
                  value={formData.clientBCDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Location where you receive birth control</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientBCLoc"
                  value={formData.clientBCLoc}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Total # of Pregnancies</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientBCPreg"
                  value={formData.clientBCPreg}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Date of last pregnancy</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientBCPregDate"
                  value={formData.clientBCPregDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Date of Last Pap smear</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientBCPap"
                  value={formData.clientBCPap}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Date of Last Mammogram</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientBCMam"
                  value={formData.clientBCMam}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Sexual History Section */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SexualHealthIcon color="primary" />
              <Typography variant="h6">Sexual History</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography>How many sexual partners in the past year?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientSexLastYear"
                    value={formData.clientSexLastYear}
                    onChange={handleChange}
                    label="How many sexual partners in the past year?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="None">None</MenuItem>
                    <MenuItem value="One">One</MenuItem>
                    <MenuItem value="2-5">2-5</MenuItem>
                    <MenuItem value="6-10">6-10</MenuItem>
                    <MenuItem value="11 or more">11 or more</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>How many sexual partners in the past month?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientSexLastMonth"
                    value={formData.clientSexLastMonth}
                    onChange={handleChange}
                    label="How many sexual partners in the past month?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="None">None</MenuItem>
                    <MenuItem value="One">One</MenuItem>
                    <MenuItem value="2-5">2-5</MenuItem>
                    <MenuItem value="6-10">6-10</MenuItem>
                    <MenuItem value="11 or more">11 or more</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>When was the last time you had sex?</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientLastSexDate"
                  value={formData.clientLastSexDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Have you had sexual relations with:</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientSexRelations"
                    value={formData.clientSexRelations}
                    onChange={handleChange}
                    label="Have you had sexual relations with:"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Men">Men</MenuItem>
                    <MenuItem value="Women">Women</MenuItem>
                    <MenuItem value="Both">Both</MenuItem>
                    <MenuItem value="N/A-None">N/A-None</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Risk factors (Check all that applies)
                </Typography>
                {/* ✅ FIXED: Properly filter array values to objects */}
                <Select
                  isMulti
                  options={medCond5}
                  value={medCond5.filter(option => formData.clientRiskFactors?.includes(option.value))}
                  onChange={(selected) => handleMultiSelectChange("clientRiskFactors", selected)}
                  placeholder="Select risk factors..."
                  styles={customSelectStyles}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Date last tested for a STD/STI?</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientSTDDate"
                  value={formData.clientSTDDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Ever had a STD/STI? (Check all that apply)
                </Typography>
                {/* ✅ FIXED: Properly filter array values to objects */}
                <Select
                  isMulti
                  options={medCond4}
                  value={medCond4.filter(option => formData.clientSTDStatus?.includes(option.value))}
                  onChange={(selected) => handleMultiSelectChange("clientSTDStatus", selected)}
                  placeholder="Select STD/STI history..."
                  styles={customSelectStyles}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Save Button */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            sx={{ minWidth: 200, py: 1.5 }}
            disabled={loading}
          >
            Save Medical Screening
          </Button>
        </Box>

        {/* Add Medication Dialog */}
        <Dialog open={clientMeds} onClose={toggleMeds} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MedicationIcon />
              Add Medication
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography>Prescription</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientMedName"
                  value={formData.clientMedName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>Dosage/Frequency</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientMedDose"
                  value={formData.clientMedDose}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>Side Effects</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientMedSideEffects"
                  value={formData.clientMedSideEffects}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>Currently Taking?</Typography>
                <FormControl fullWidth>
                  <InputLabel></InputLabel>
                  <MuiSelect
                    name="clientMedTaking"
                    value={formData.clientMedTaking}
                    onChange={handleChange}
                    label="Currently Taking?"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </MuiSelect>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSaveMeds} variant="contained" color="primary">
              Save
            </Button>
            <Button onClick={toggleMeds} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Surgery Dialog */}
        <Dialog open={clientSurgery} onClose={toggleSurgery} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HospitalIcon />
              Add Hospitalization
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography>Type of Surgery/Hospitalization</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientSurgeryType"
                  value={formData.clientSurgeryType}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography>Date of Surgery/Hospitalization</Typography>
                <TextField
                  fullWidth
                  type="date"
                  label=""
                  name="clientSurgeryDate"
                  value={formData.clientSurgeryDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSaveSurgeries} variant="contained" color="primary">
              Save
            </Button>
            <Button onClick={toggleSurgery} color="secondary">
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </form>
    </Box>
  );
};

MedScreening.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default MedScreening;