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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  InputAdornment,
  TableFooter
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Favorite as HeartIcon,
  Accessibility as AccessibilityIcon,
  DirectionsRun as RunIcon,
  Restaurant as RestaurantIcon,
  Bathtub as BathtubIcon,
  PersonOutline as PersonIcon,
  PersonOutlineOutlined as PersonBackIcon,
  Save as SaveIcon
} from "@mui/icons-material";
import { Autocomplete } from "@mui/material";
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNursingAdmission,
  saveNursingAdmission,
  setMockData
} from "../../store/slices/nursingAdmissionSlice";
import logUserAction from "../../config/logAction";
import {
  abdomen,
  ambulation, communication,
  edema, elimMethUsed, enteral, hearingVision,
  historyOf, mobDevices, nutrHyd, oral,
  painHistory,
  pList,
  rList,
  tList,
  transfers,
  weightBearing, locList, orientedToList, orientedToRoomList, clientPain,
  lungSounds, adlLevel,
  bowelBladder,
  physicalFuncStat
} from "../../data/arrayList";

// Import body diagram images - you'll need to add these
// import frontBodyImage from './assets/front-body.png';
// import rearBodyImage from './assets/rear-body.png';

const NursingAdmission = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  // Redux state
  const nursingAdmissionState = useSelector((state) => state.nursingAdmission) || {};
  const { 
    data: savedData = {}, 
    loading = false, 
    error = null, 
    saving = false,
    summary = {},
    summaryLoading = false 
  } = nursingAdmissionState;

  // Component state
  const [formData, setFormData] = useState({
    // Basic Assessment
    loc: [],
    orientedToList: [],
    orientedToRoomList: [],
    
    // Cardio-Pulmonary
    cpT: '',
    cpP: '',
    cpR: '',
    cpBP: '',
    tList: [],
    pList: [],
    rList: [],
    historyOf: [],
    edema: [],
    edemaLocation: '',
    
    // Pain Assessment
    clientPain: [],
    painHistory: [],
    lungSounds: [],
    
    // Bowel & Bladder
    bowelBladder: [],
    cathType: '',
    cathSize: '',
    cathDiag: '',
    elimMethUsed: [],
    lastBowelDate: '',
    lastVoidDate: '',
    abdomen: [],
    
    // Physical & Functional Status
    physicalFuncStat: [],
    clientPhysicalFuncNotes: '',
    weightBearing: [],
    transfers: [],
    ambulation: [],
    mobDevices: [],
    
    // Nutrition & Communication
    nutrHyd: [],
    enteral: [],
    oral: [],
    hearing: [],
    vision: [],
    communication: [],
    
    // ADL Levels
    bathing: [],
    eating: [],
    toileting: [],
    bedMobility: [],
    
    // Body Inspection - Front
    frontBodyInspection: {
      clientBodyFace: '',
      clientBodyChest: '',
      clientBodyRUQ: '',
      clientBodyLUQ: '',
      clientBodyRLO: '',
      clientBodyLLQ: '',
      clientBodyLUA: '',
      clientBodyLLA: '',
      clientBodyRUA: '',
      clientBodyRLA: '',
      clientBodyLT: '',
      clientBodyRT: '',
      clientBodyLK: '',
      clientBodyRK: '',
      clientBodyLS: '',
      clientBodyRS: '',
      clientBodyLA: '',
      clientBodyRA: '',
      clientBodyLF: '',
      clientBodyRF: ''
    },
    
    // Body Inspection - Rear
    rearBodyInspection: {
      clientBodyHead: '',
      clientBodyNeck: '',
      clientBodyUB: '',
      clientBodyLB: '',
      clientBodyRearLUA: '',
      clientBodyRearRUA: '',
      clientBodyLG: '',
      clientBodyRG: '',
      clientBodyLUT: '',
      clientBodyRUT: '',
      clientBodyLLC: '',
      clientBodyRLC: '',
      clientBodyRearLA: '',
      clientBodyRearRA: '',
      clientBodyRearLF: '',
      clientBodyRearRF: ''
    }
  });

  // Mock data for development
  const mockAdmissionData = {
    loc: ['Alert'],
    orientedToList: ['Person', 'Place', 'Time'],
    orientedToRoomList: ['Room Layout', 'Call Bell'],
    cpT: '98.6',
    cpP: '72',
    cpR: '16',
    cpBP: '120/80',
    tList: ['Oral'],
    pList: ['Regular'],
    rList: ['Regular'],
    historyOf: ['Hypertension'],
    edema: ['None'],
    clientPain: ['No Pain'],
    painHistory: ['None'],
    lungSounds: ['Clear'],
    bowelBladder: ['Independent'],
    physicalFuncStat: ['Ambulates independently'],
    clientPhysicalFuncNotes: 'Client ambulates well with steady gait.',
    weightBearing: ['Full weight bearing'],
    transfers: ['Independent'],
    ambulation: ['Independent'],
    nutrHyd: ['Independent'],
    enteral: ['None'],
    oral: ['Independent'],
    hearing: ['Normal'],
    vision: ['Normal'],
    communication: ['English'],
    bathing: ['Independent'],
    eating: ['Independent'],
    toileting: ['Independent'],
    bedMobility: ['Independent'],
    frontBodyInspection: {
      clientBodyFace: 'Normal appearance, no lesions noted',
      clientBodyChest: 'Clear, symmetrical expansion',
      clientBodyRUQ: 'Soft, non-tender'
    },
    rearBodyInspection: {
      clientBodyHead: 'No abnormalities noted',
      clientBodyNeck: 'Full range of motion',
      clientBodyUB: 'No deformities noted'
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (!clientID) return;
    
    // Check if Redux slice is configured
    if (!nursingAdmissionState && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ nursingAdmission slice not found in Redux store. Please add it to your store configuration.');
      return;
    }
    
    // Use mock data in development, real API in production
    if (process.env.NODE_ENV === 'development') {
      // Simulate API delay
      setTimeout(() => {
        if (dispatch && typeof dispatch === 'function') {
          dispatch(setMockData({ admissionData: mockAdmissionData }));
        }
        setFormData(mockAdmissionData);
      }, 500);
      return;
    }

    // Real API calls
    if (dispatch && typeof dispatch === 'function') {
      dispatch(fetchNursingAdmission(clientID));
    }
  }, [clientID, dispatch]);

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

  // Handle body inspection changes
  const handleBodyInspectionChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Handle multi-select changes
  const handleMultiSelectChange = (field, selectedOptions) => {
    const values = selectedOptions ? selectedOptions.map(option => 
      typeof option === 'string' ? option : option.value || option.label
    ) : [];
    setFormData(prev => ({ ...prev, [field]: values }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clientID) {
      alert("⚠️ Please select a client before saving.");
      return;
    }

    const admissionData = {
      ...formData,
      createdBy: user?.email || "unknown",
      createdAt: new Date().toISOString(),
    };

    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock save in development
        setTimeout(() => {
          alert("✅ Nursing Admission data saved successfully! (Mock mode)");
        }, 1000);
        await logUserAction(user, "SAVE_NURSING_ADMISSION", { clientID, ...admissionData });
      } else {
        if (dispatch && typeof dispatch === 'function') {
          await dispatch(saveNursingAdmission({ clientID, formData: admissionData })).unwrap();
        }
        await logUserAction(user, "SAVE_NURSING_ADMISSION", { clientID, ...admissionData });
        alert("✅ Nursing Admission data saved successfully!");
      }
    } catch (err) {
      console.error("❌ Error saving nursing admission:", err);
      alert(`⚠️ Failed to save nursing admission: ${err.message || err}`);
    }
  };

  // Convert array data to Autocomplete format
  const convertToOptions = (arrayData) => {
    if (!arrayData) return [];
    return arrayData.map(item => ({
      label: typeof item === 'string' ? item : item.label || item.value,
      value: typeof item === 'string' ? item : item.value || item.label
    }));
  };

  // Get selected values for Autocomplete
  const getSelectedValues = (fieldName, optionsArray) => {
    const fieldValues = formData[fieldName] || [];
    const options = convertToOptions(optionsArray);
    return options.filter(option => fieldValues.includes(option.value));
  };

  // Check if Redux slice is configured
  if (!nursingAdmissionState && process.env.NODE_ENV === 'development') {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>Redux Configuration Error</Typography>
            <Typography variant="body2" paragraph>
              The <code>nursingAdmission</code> slice is not found in your Redux store.
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>To fix this:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              1. Add the nursingAdmission slice to your store configuration:
              <pre style={{ background: '#f5f5f5', padding: '8px', marginTop: '8px', borderRadius: '4px' }}>
{`// src/store/store.js
import nursingAdmissionReducer from './apps/notes/nursingAdmissionSlice';

export const store = configureStore({
  reducer: {
    // ... your existing reducers
    nursingAdmission: nursingAdmissionReducer, // ADD THIS LINE
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
            🏥 Nursing Admission Intake
          </Typography>
          {process.env.NODE_ENV === 'development' && (
            <Chip label="Development Mode" color="info" size="small" />
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. LOC & Orientation Assessment */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <PsychologyIcon sx={{ mr: 2 }} />
              <Typography variant="h6">LOC & Orientation Assessment</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(locList)}
                    value={getSelectedValues('loc', locList)}
                    onChange={(event, newValue) => handleMultiSelectChange('loc', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Level of Consciousness (LOC)" fullWidth />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip 
                          key={index}
                          label={option.label} 
                          {...getTagProps({ index })} 
                          size="small" 
                        />
                      ))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(orientedToList)}
                    value={getSelectedValues('orientedToList', orientedToList)}
                    onChange={(event, newValue) => handleMultiSelectChange('orientedToList', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Oriented To" fullWidth />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip 
                          key={index}
                          label={option.label} 
                          {...getTagProps({ index })} 
                          size="small" 
                        />
                      ))
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(orientedToRoomList)}
                    value={getSelectedValues('orientedToRoomList', orientedToRoomList)}
                    onChange={(event, newValue) => handleMultiSelectChange('orientedToRoomList', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Oriented To Room/Routine" fullWidth />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip 
                          key={index}
                          label={option.label} 
                          {...getTagProps({ index })} 
                          size="small" 
                        />
                      ))
                    }
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 2. Cardio-Pulmonary Assessment */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <HeartIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Cardio-Pulmonary Assessment</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Vital Signs Row */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Vital Signs</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Temperature"
                    value={formData.cpT}
                    onChange={(e) => handleInputChange('cpT', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">T =</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Pulse"
                    value={formData.cpP}
                    onChange={(e) => handleInputChange('cpP', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">P =</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Respiration"
                    value={formData.cpR}
                    onChange={(e) => handleInputChange('cpR', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R =</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Blood Pressure"
                    value={formData.cpBP}
                    onChange={(e) => handleInputChange('cpBP', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">BP =</InputAdornment>,
                    }}
                  />
                </Grid>

                {/* Vital Signs Details */}
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(tList)}
                    value={getSelectedValues('tList', tList)}
                    onChange={(event, newValue) => handleMultiSelectChange('tList', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Temperature Details" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(pList)}
                    value={getSelectedValues('pList', pList)}
                    onChange={(event, newValue) => handleMultiSelectChange('pList', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Pulse Details" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(rList)}
                    value={getSelectedValues('rList', rList)}
                    onChange={(event, newValue) => handleMultiSelectChange('rList', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Respiration Details" fullWidth />
                    )}
                  />
                </Grid>

                {/* Medical History */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Medical History & Assessment</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(historyOf)}
                    value={getSelectedValues('historyOf', historyOf)}
                    onChange={(event, newValue) => handleMultiSelectChange('historyOf', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="History Of" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(edema)}
                    value={getSelectedValues('edema', edema)}
                    onChange={(event, newValue) => handleMultiSelectChange('edema', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Edema" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Edema Location (if present)"
                    value={formData.edemaLocation}
                    onChange={(e) => handleInputChange('edemaLocation', e.target.value)}
                  />
                </Grid>

                {/* Pain & Lung Assessment */}
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(clientPain)}
                    value={getSelectedValues('clientPain', clientPain)}
                    onChange={(event, newValue) => handleMultiSelectChange('clientPain', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Pain Level" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(painHistory)}
                    value={getSelectedValues('painHistory', painHistory)}
                    onChange={(event, newValue) => handleMultiSelectChange('painHistory', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Pain History/Frequency" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(lungSounds)}
                    value={getSelectedValues('lungSounds', lungSounds)}
                    onChange={(event, newValue) => handleMultiSelectChange('lungSounds', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Lung Sounds" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 3. Bowel & Bladder Management */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <AccessibilityIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Bowel & Bladder Management</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(bowelBladder)}
                    value={getSelectedValues('bowelBladder', bowelBladder)}
                    onChange={(event, newValue) => handleMultiSelectChange('bowelBladder', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Bowel & Bladder" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Catheter Type"
                    value={formData.cathType}
                    onChange={(e) => handleInputChange('cathType', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Catheter Size"
                    value={formData.cathSize}
                    onChange={(e) => handleInputChange('cathSize', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Diagnosis for Use"
                    value={formData.cathDiag}
                    onChange={(e) => handleInputChange('cathDiag', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(elimMethUsed)}
                    value={getSelectedValues('elimMethUsed', elimMethUsed)}
                    onChange={(event, newValue) => handleMultiSelectChange('elimMethUsed', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Elimination Methods" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Last Bowel Movement"
                    value={formData.lastBowelDate}
                    onChange={(e) => handleInputChange('lastBowelDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Last Voiding"
                    value={formData.lastVoidDate}
                    onChange={(e) => handleInputChange('lastVoidDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(abdomen)}
                    value={getSelectedValues('abdomen', abdomen)}
                    onChange={(event, newValue) => handleMultiSelectChange('abdomen', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Abdomen" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 4. Physical & Functional Status */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <RunIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Physical & Functional Status</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(physicalFuncStat)}
                    value={getSelectedValues('physicalFuncStat', physicalFuncStat)}
                    onChange={(event, newValue) => handleMultiSelectChange('physicalFuncStat', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Physical & Functional Status" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(weightBearing)}
                    value={getSelectedValues('weightBearing', weightBearing)}
                    onChange={(event, newValue) => handleMultiSelectChange('weightBearing', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Weight-Bearing" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(transfers)}
                    value={getSelectedValues('transfers', transfers)}
                    onChange={(event, newValue) => handleMultiSelectChange('transfers', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Transfers" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(ambulation)}
                    value={getSelectedValues('ambulation', ambulation)}
                    onChange={(event, newValue) => handleMultiSelectChange('ambulation', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Ambulation" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(mobDevices)}
                    value={getSelectedValues('mobDevices', mobDevices)}
                    onChange={(event, newValue) => handleMultiSelectChange('mobDevices', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Mobility Devices" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Additional Notes"
                    value={formData.clientPhysicalFuncNotes}
                    onChange={(e) => handleInputChange('clientPhysicalFuncNotes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 5. Nutrition & Communication */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <RestaurantIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Nutrition & Communication</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(nutrHyd)}
                    value={getSelectedValues('nutrHyd', nutrHyd)}
                    onChange={(event, newValue) => handleMultiSelectChange('nutrHyd', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Nutrition/Hydration" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(enteral)}
                    value={getSelectedValues('enteral', enteral)}
                    onChange={(event, newValue) => handleMultiSelectChange('enteral', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Enteral Nutrition" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(oral)}
                    value={getSelectedValues('oral', oral)}
                    onChange={(event, newValue) => handleMultiSelectChange('oral', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Oral" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(hearingVision)}
                    value={getSelectedValues('hearing', hearingVision)}
                    onChange={(event, newValue) => handleMultiSelectChange('hearing', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Hearing" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(hearingVision)}
                    value={getSelectedValues('vision', hearingVision)}
                    onChange={(event, newValue) => handleMultiSelectChange('vision', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Vision" fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={convertToOptions(communication)}
                    value={getSelectedValues('communication', communication)}
                    onChange={(event, newValue) => handleMultiSelectChange('communication', newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Communication" fullWidth />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 6. Activities of Daily Living (ADL) */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <BathtubIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Activities of Daily Living (ADL)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} elevation={1}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>ADL Activity</strong></TableCell>
                      <TableCell><strong>Independence Level</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Bathing</TableCell>
                      <TableCell>
                        <Autocomplete
                          multiple
                          options={convertToOptions(adlLevel)}
                          value={getSelectedValues('bathing', adlLevel)}
                          onChange={(event, newValue) => handleMultiSelectChange('bathing', newValue)}
                          renderInput={(params) => (
                            <TextField {...params} variant="outlined" size="small" />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Eating</TableCell>
                      <TableCell>
                        <Autocomplete
                          multiple
                          options={convertToOptions(adlLevel)}
                          value={getSelectedValues('eating', adlLevel)}
                          onChange={(event, newValue) => handleMultiSelectChange('eating', newValue)}
                          renderInput={(params) => (
                            <TextField {...params} variant="outlined" size="small" />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Toileting</TableCell>
                      <TableCell>
                        <Autocomplete
                          multiple
                          options={convertToOptions(adlLevel)}
                          value={getSelectedValues('toileting', adlLevel)}
                          onChange={(event, newValue) => handleMultiSelectChange('toileting', newValue)}
                          renderInput={(params) => (
                            <TextField {...params} variant="outlined" size="small" />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Bed Mobility</TableCell>
                      <TableCell>
                        <Autocomplete
                          multiple
                          options={convertToOptions(adlLevel)}
                          value={getSelectedValues('bedMobility', adlLevel)}
                          onChange={(event, newValue) => handleMultiSelectChange('bedMobility', newValue)}
                          renderInput={(params) => (
                            <TextField {...params} variant="outlined" size="small" />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* 7. Body Inspection - Front View */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <PersonIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Body Inspection - Front View</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box textAlign="center" mb={2}>
                    <Typography variant="h6" gutterBottom>Front Body Inspection</Typography>
                    {/* Add your front body image here */}
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: 400, 
                        border: '2px dashed #ccc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 2
                      }}
                    >
                      <Typography color="text.secondary">
                        Front Body Diagram<br />
                        (Add front-body.png image here)
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Inspection Notes</Typography>
                  <Grid container spacing={2}>
                    {[
                      { key: 'clientBodyFace', label: 'Face' },
                      { key: 'clientBodyChest', label: 'Chest' },
                      { key: 'clientBodyRUQ', label: 'Abdomen - Right Upper Quadrant (RUQ)' },
                      { key: 'clientBodyLUQ', label: 'Abdomen - Left Upper Quadrant (LUQ)' },
                      { key: 'clientBodyRLO', label: 'Abdomen - Right Lower Quadrant (RLQ)' },
                      { key: 'clientBodyLLQ', label: 'Abdomen - Left Lower Quadrant (LLQ)' },
                      { key: 'clientBodyLUA', label: 'Left Upper Arm' },
                      { key: 'clientBodyLLA', label: 'Left Lower Arm' },
                      { key: 'clientBodyRUA', label: 'Right Upper Arm' },
                      { key: 'clientBodyRLA', label: 'Right Lower Arm' },
                      { key: 'clientBodyLT', label: 'Left Thigh' },
                      { key: 'clientBodyRT', label: 'Right Thigh' },
                      { key: 'clientBodyLK', label: 'Left Knee' },
                      { key: 'clientBodyRK', label: 'Right Knee' },
                      { key: 'clientBodyLS', label: 'Left Shin' },
                      { key: 'clientBodyRS', label: 'Right Shin' },
                      { key: 'clientBodyLA', label: 'Left Ankle' },
                      { key: 'clientBodyRA', label: 'Right Ankle' },
                      { key: 'clientBodyLF', label: 'Left Foot' },
                      { key: 'clientBodyRF', label: 'Right Foot' }
                    ].map((item) => (
                      <Grid item xs={12} key={item.key}>
                        <TextField
                          fullWidth
                          size="small"
                          label={item.label}
                          multiline
                          rows={2}
                          value={formData.frontBodyInspection[item.key] || ''}
                          onChange={(e) => handleBodyInspectionChange('frontBodyInspection', item.key, e.target.value)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 8. Body Inspection - Rear View */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <PersonBackIcon sx={{ mr: 2 }} />
              <Typography variant="h6">Body Inspection - Rear View</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box textAlign="center" mb={2}>
                    <Typography variant="h6" gutterBottom>Rear Body Inspection</Typography>
                    {/* Add your rear body image here */}
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: 400, 
                        border: '2px dashed #ccc', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        mb: 2
                      }}
                    >
                      <Typography color="text.secondary">
                        Rear Body Diagram<br />
                        (Add rear-body.png image here)
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Inspection Notes</Typography>
                  <Grid container spacing={2}>
                    {[
                      { key: 'clientBodyHead', label: 'Head' },
                      { key: 'clientBodyNeck', label: 'Neck' },
                      { key: 'clientBodyUB', label: 'Upper Back' },
                      { key: 'clientBodyLB', label: 'Lower Back' },
                      { key: 'clientBodyRearLUA', label: 'Left Upper Arm' },
                      { key: 'clientBodyRearRUA', label: 'Right Upper Arm' },
                      { key: 'clientBodyLG', label: 'Left Glute' },
                      { key: 'clientBodyRG', label: 'Right Glute' },
                      { key: 'clientBodyLUT', label: 'Left Upper Thigh' },
                      { key: 'clientBodyRUT', label: 'Right Upper Thigh' },
                      { key: 'clientBodyLLC', label: 'Left Lower Calf' },
                      { key: 'clientBodyRLC', label: 'Right Lower Calf' },
                      { key: 'clientBodyRearLA', label: 'Left Ankle' },
                      { key: 'clientBodyRearRA', label: 'Right Ankle' },
                      { key: 'clientBodyRearLF', label: 'Left Foot' },
                      { key: 'clientBodyRearRF', label: 'Right Foot' }
                    ].map((item) => (
                      <Grid item xs={12} key={item.key}>
                        <TextField
                          fullWidth
                          size="small"
                          label={item.label}
                          multiline
                          rows={2}
                          value={formData.rearBodyInspection[item.key] || ''}
                          onChange={(e) => handleBodyInspectionChange('rearBodyInspection', item.key, e.target.value)}
                        />
                      </Grid>
                    ))}
                  </Grid>
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
              {saving ? 'Saving...' : 'Save Nursing Admission'}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

NursingAdmission.propTypes = {
  clientID: PropTypes.string.isRequired,
};

export default NursingAdmission;