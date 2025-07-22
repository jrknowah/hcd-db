import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Grid, 
  TextField, Typography, Alert, IconButton, Table, TableBody, TableCell, 
  TableHead, TableRow, Divider
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import Select from 'react-select';
import { 
  fetchMentalHealthData, 
  saveMentalHealthData,
  addProviderLocal,
  removeProviderLocal,
  addHospitalizationLocal,
  removeHospitalizationLocal,
  addMedicationLocal,
  removeMedicationLocal
} from '../../store/slices/MentalHealthSlice';
import { fetchArrestData, saveArrestData } from '../../store/slices//arrestActions';
import logUserAction from "../../config/logAction";
import {
  cmOb1, cmOb2, cmOb3, cmOb4, cmOb5, cmOb6, cmOb7, cmOb8, cmOb9, cmOb10, cmOb11, cmObNone,
  legalList, energyLevelList, gadList, mhList, sleepPatternList, substanceAbuseOften, 
  substanceAbuseUse, substanceList, traumaList, needsCol1, riskList
} from "../../data/arrayList";

// ✅ Static mock data outside component
const MOCK_CLIENT = {
  clientID: 'mock-123',
  clientFirstName: 'John',
  clientLastName: 'Doe',
};

const MOCK_USER = {
  email: 'test@example.com',
  name: 'Test User',
};

const MOCK_MENTAL_HEALTH_DATA = {
  mentalHealthHistory: { value: 'Yes', label: 'Yes' },
  mentalHealthDiagnosis: [
    { value: 'Depression', label: 'Depression' },
    { value: 'Anxiety', label: 'Anxiety' }
  ],
  mentalHealthTreatment: { value: 'Yes', label: 'Yes' },
  mentalHealthCurrentTreatment: { value: 'Yes', label: 'Yes' },
  currentProvider: [
    {
      agency: 'Community Mental Health Center',
      worker: 'Dr. Sarah Johnson',
      phone: '(555) 123-4567',
      lastAppointment: '2024-03-10',
      nextAppointment: '2024-03-17'
    }
  ],
  hospitalizations: [
    {
      location: 'UCLA Medical Center',
      reasons: 'Severe depression, suicidal ideation',
      date: '2020-06-15'
    }
  ],
  medications: [
    {
      name: 'Sertraline',
      dose: '50mg daily',
      sideEffects: 'Mild nausea, effective for depression'
    }
  ],
  mhSad: { value: 'Several Days', label: 'Several Days' },
  mhAnxious: { value: 'Over Half the Days', label: 'Over Half the Days' },
  mhSleepPattern: { value: 'Sleep too little', label: 'Sleep too little' },
  mhEnergyLevel: { value: 'Low', label: 'Low' },
  mhConcentrate: { value: 'Yes', label: 'Yes' },
  mhThoughts: { value: 'No', label: 'No' },
  mhAbuse: [
    { value: 'History of physical/sexual/emotional abuse', label: 'History of physical/sexual/emotional abuse' }
  ],
  clientRisk: [
    { value: 'Denies thoughts', label: 'Denies thoughts' }
  ],
  cmOb1: [{ value: 'Well Groomed', label: 'Well Groomed' }],
  cmOb2: [{ value: 'Normal for culture', label: 'Normal for culture' }],
  cmOb3: [{ value: 'Calm', label: 'Calm' }],
  mhNeedsSum: 'Client requires ongoing mental health support and medication management.',
  cmObvSum: 'Client appears stable but requires continued monitoring.',
  mhLegalSum: 'No current legal issues related to mental health.',
};

const MOCK_ARRESTS = [
  {
    id: 1,
    date: '2019-05-20',
    charge: 'Public intoxication',
    misdemeanorOrFelony: 'M',
    location: 'Los Angeles, CA',
    timeServed: '1 day',
    result: 'Fine paid'
  }
];

// Helper functions to format options for react-select
const formatYesNoOptions = () => [
  { value: '', label: 'Select...' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' }
];

const formatArrayToOptions = (array) => {
  return array.map(item => ({ value: item, label: item }));
};

const formatMFOptions = () => [
  { value: '', label: 'Select...' },
  { value: 'M', label: 'M' },
  { value: 'F', label: 'F' }
];

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

const MentalHealth = ({ exportMode }) => {
  const dispatch = useDispatch();
  
  // ✅ Safe selectors
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const reduxUser = useSelector((state) => state?.auth?.user);
  const reduxMentalHealthData = useSelector((state) => state?.mentalHealth?.data || {});
  const reduxArrests = useSelector((state) => state?.arrests?.arrests || []);

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;
  const mentalHealthData = shouldUseMockData ? MOCK_MENTAL_HEALTH_DATA : reduxMentalHealthData;
  const arrests = shouldUseMockData ? MOCK_ARRESTS : reduxArrests;

  // ✅ Component state
  const [formData, setFormData] = useState({
    mentalHealthHistory: null,
    mentalHealthDiagnosis: [],
    mentalHealthTreatment: null,
    mentalHealthCurrentTreatment: null,
    mhSad: null,
    mhAnxious: null,
    mhSleepPattern: null,
    mhEnergyLevel: null,
    mhConcentrate: null,
    mhThoughts: null,
    mhMindRead: null,
    mhVoices: null,
    mhVoicesSay: '',
    mhFollowing: null,
    mhSomeone: '',
    mhFamHistory: null,
    mhSummary: '',
    mhAbuse: [],
    clientRisk: [],
    mhSelfHarm: null,
    mhSelfHarmOccurrence: '',
    mhSuicide: null,
    mhSuicideLast: '',
    mhRiskSummary: '',
    mhSubAbuseHelp: null,
    mhSubAbSum: '',
    clientLegalIssues: [],
    clientLegalProbation: '',
    clientLegalParole: '',
    clientLegalArrests: '',
    clientLegalOther: '',
    arrestMeth: null,
    arrestDrugAlcohol: null,
    arrestViolent: null,
    arrestArson: null,
    arrestSexCrime: null,
    regSexOffender: null,
    arrestCrime: null,
    mhLegalSum: '',
    clientPatFamNeeds: [],
    mhNeedsSum: '',
    cmOb1: [], cmOb2: [], cmOb3: [], cmOb4: [], cmOb5: [], cmOb6: [],
    cmOb7: [], cmOb8: [], cmOb9: [], cmOb10: [], cmOb11: [], cmObNone: [],
    cmObvSum: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState({
    addProvider: false,
    addHospitalization: false,
    addMedication: false,
    addIncident: false,
    addProgram: false,
    addArrest: false,
  });

  // Form states for modals
  const [modalFormData, setModalFormData] = useState({
    mhpCurrentAgency: '', mhpCurrentWorker: '', mhpCurrentPhone: '',
    mhpCurrentLastApptDate: '', mhpCurrentNextApptDate: '',
    mhhLocation: '', mhhReasons: '', mhhDate: '',
    mhmName: '', mhmDose: '', mhmSide: '',
  });

  // New arrest state
  const [newArrest, setNewArrest] = useState({
    mhaDate: '', mhaCharge: '', mhaMF: null, mhaLoc: '', mhaTime: '', mhaResult: ''
  });

  // Substance abuse tracking
  const [substanceData, setSubstanceData] = useState({});

  // ✅ Load data when client changes
  useEffect(() => {
    if (!currentClient?.clientID) return;
    if (dataLoaded && currentClient.clientID === formData.clientID) return;

    setLoading(true);
    setError(null);
    setDataLoaded(false);

    if (shouldUseMockData) {
      setTimeout(() => {
        setFormData(prev => ({ ...prev, ...MOCK_MENTAL_HEALTH_DATA, clientID: currentClient.clientID }));
        setLoading(false);
        setDataLoaded(true);
      }, 500);
      return;
    }

    if (dispatch) {
      Promise.all([
        dispatch(fetchMentalHealthData(currentClient.clientID)),
        dispatch(fetchArrestData(currentClient.clientID))
      ]).then(() => {
        setDataLoaded(true);
        setLoading(false);
      }).catch((err) => {
        console.error("❌ Error fetching mental health data:", err);
        setError("Failed to load mental health data");
        setLoading(false);
      });
    }
  }, [currentClient?.clientID, shouldUseMockData, dispatch]);

  // ✅ Update form data when Redux data changes
  useEffect(() => {
    if (mentalHealthData && !shouldUseMockData) {
      setFormData(prev => ({ ...prev, ...mentalHealthData }));
    }
  }, [mentalHealthData, shouldUseMockData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, selectedOption) => {
    setFormData(prev => ({
      ...prev,
      [name]: selectedOption
    }));
  };

  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    setModalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewArrestChange = (e) => {
    const { name, value } = e.target;
    setNewArrest(prev => ({ ...prev, [name]: value }));
  };

  const handleNewArrestSelectChange = (name, selectedOption) => {
    setNewArrest(prev => ({ ...prev, [name]: selectedOption }));
  };

  const handleSubstanceChange = (substance, field, value) => {
    setSubstanceData(prev => ({
      ...prev,
      [substance]: { ...prev[substance], [field]: value }
    }));
  };

  const toggleModal = (modalName) => {
    setModalOpen(prev => ({ ...prev, [modalName]: !prev[modalName] }));
    if (modalOpen[modalName]) {
      setModalFormData({
        mhpCurrentAgency: '', mhpCurrentWorker: '', mhpCurrentPhone: '',
        mhpCurrentLastApptDate: '', mhpCurrentNextApptDate: '',
        mhhLocation: '', mhhReasons: '', mhhDate: '',
        mhmName: '', mhmDose: '', mhmSide: '',
      });
    }
  };

  const addProvider = () => {
    const newProvider = {
      agency: modalFormData.mhpCurrentAgency,
      worker: modalFormData.mhpCurrentWorker,
      phone: modalFormData.mhpCurrentPhone,
      lastAppointment: modalFormData.mhpCurrentLastApptDate,
      nextAppointment: modalFormData.mhpCurrentNextApptDate,
    };
    dispatch(addProviderLocal(newProvider));
    toggleModal('addProvider');
  };

  const addHospitalization = () => {
    const newHospitalization = {
      location: modalFormData.mhhLocation,
      reasons: modalFormData.mhhReasons,
      date: modalFormData.mhhDate,
    };
    dispatch(addHospitalizationLocal(newHospitalization));
    toggleModal('addHospitalization');
  };

  const addMedication = () => {
    const newMedication = {
      name: modalFormData.mhmName,
      dose: modalFormData.mhmDose,
      sideEffects: modalFormData.mhmSide,
    };
    dispatch(addMedicationLocal(newMedication));
    toggleModal('addMedication');
  };

  const removeItem = (arrayName, index) => {
    switch (arrayName) {
      case 'currentProvider': dispatch(removeProviderLocal(index)); break;
      case 'hospitalizations': dispatch(removeHospitalizationLocal(index)); break;
      case 'medications': dispatch(removeMedicationLocal(index)); break;
    }
  };

  const handleSaveArrest = async () => {
    if (!currentClient?.clientID) {
      alert("⚠️ No client selected.");
      return;
    }

    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          alert("✅ Arrest record saved (Mock)!");
          setNewArrest({ mhaDate: '', mhaCharge: '', mhaMF: null, mhaLoc: '', mhaTime: '', mhaResult: '' });
          toggleModal('addArrest');
        }, 1000);
        return;
      }

      // Convert react-select value to simple value for backend
      const arrestToSave = {
        ...newArrest,
        mhaMF: newArrest.mhaMF?.value || newArrest.mhaMF
      };

      await dispatch(saveArrestData(currentClient.clientID, arrestToSave));
      alert("✅ Arrest record saved!");
      
      if (currentUser) {
        await logUserAction(currentUser, "SAVE_ARREST_DATA", {
          clientID: currentClient.clientID,
          arrest: arrestToSave
        });
      }
      
      setNewArrest({ mhaDate: '', mhaCharge: '', mhaMF: null, mhaLoc: '', mhaTime: '', mhaResult: '' });
      toggleModal('addArrest');
    } catch (error) {
      console.error("❌ Error saving arrest data:", error);
      alert("❌ Failed to save arrest data.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentClient?.clientID) {
      alert("Please select a client before saving.");
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      if (shouldUseMockData) {
        setTimeout(() => {
          setSaveSuccess(true);
          setLoading(false);
          setTimeout(() => setSaveSuccess(false), 3000);
        }, 1000);
        return;
      }

      // Convert react-select values to simple values for backend
      const formDataToSave = { ...formData };
      
      // Convert single select values
      Object.keys(formDataToSave).forEach(key => {
        if (formDataToSave[key] && typeof formDataToSave[key] === 'object' && formDataToSave[key].value !== undefined) {
          formDataToSave[key] = formDataToSave[key].value;
        }
      });

      // Convert multi-select arrays
      ['mentalHealthDiagnosis', 'mhAbuse', 'clientRisk', 'clientLegalIssues', 'clientPatFamNeeds', 
       'cmOb1', 'cmOb2', 'cmOb3', 'cmOb4', 'cmOb5', 'cmOb6', 'cmOb7', 'cmOb8', 'cmOb9', 'cmOb10', 'cmOb11', 'cmObNone'
      ].forEach(key => {
        if (Array.isArray(formDataToSave[key])) {
          formDataToSave[key] = formDataToSave[key].map(item => item.value || item);
        }
      });

      if (dispatch) {
        await dispatch(saveMentalHealthData({
          clientId: currentClient.clientID,
          formData: {
            ...formDataToSave,
            substanceData,
            currentProvider: mentalHealthData.currentProvider || [],
            hospitalizations: mentalHealthData.hospitalizations || [],
            medications: mentalHealthData.medications || [],
            updatedBy: currentUser?.email || "unknown",
            updatedAt: new Date().toISOString(),
          },
          user: currentUser
        }));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error saving Mental Health data:", error);
      setError("Failed to save mental health data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get arrays from Redux data
  const currentProviders = mentalHealthData.currentProvider || [];
  const hospitalizations = mentalHealthData.hospitalizations || [];
  const medications = mentalHealthData.medications || [];

  // ✅ No client selected
  if (!currentClient) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {isDevelopment 
            ? `Development Mode: No client selected. Mock data ${shouldUseMockData ? 'enabled' : 'disabled'}.`
            : "Please select a client to view mental health information."
          }
        </Alert>
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card sx={{ padding: 3 }}>
        {/* ✅ Development indicator */}
        {shouldUseMockData && (
          <Alert severity="info" sx={{ mb: 3 }}>
            🔧 Development Mode: Using mock mental health data for {currentClient.clientFirstName} {currentClient.clientLastName}
          </Alert>
        )}

        {/* ✅ Error display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* ✅ Success message */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✅ Mental Health Data Saved Successfully!
          </Alert>
        )}

        <Typography variant="h4" gutterBottom align="center">
          Mental Health Assessment
        </Typography>

        {loading && !dataLoaded ? (
          <Alert severity="info">Loading mental health data...</Alert>
        ) : (
          <>
            {/* Mental Health History Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                Mental Health History
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Ever been diagnosed with a mental illness?
                  </Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mentalHealthHistory}
                    onChange={(option) => handleSelectChange('mentalHealthHistory', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={7}>
                  <Typography variant="body1" sx={{ mb: 1 }}>If YES, select below:</Typography>
                  <Select
                    isMulti
                    options={mhList}
                    value={formData.mentalHealthDiagnosis}
                    onChange={(options) => handleSelectChange('mentalHealthDiagnosis', options)}
                    placeholder="Select mental health diagnoses..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Mental Health Treatment History */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                Mental Health Treatment History
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Ever utilized mental health services?
                  </Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mentalHealthTreatment}
                    onChange={(option) => handleSelectChange('mentalHealthTreatment', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Currently utilizing mental health services?
                  </Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mentalHealthCurrentTreatment}
                    onChange={(option) => handleSelectChange('mentalHealthCurrentTreatment', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Current Mental Health Provider */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Current Mental Health Provider</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => toggleModal('addProvider')}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                Add Provider
              </Button>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Agency</TableCell>
                    <TableCell>MH Worker</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Last Appointment</TableCell>
                    <TableCell>Next Appointment</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentProviders.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.agency}</TableCell>
                      <TableCell>{item.worker}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.lastAppointment}</TableCell>
                      <TableCell>{item.nextAppointment}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => removeItem('currentProvider', idx)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {currentProviders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                        No providers added yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>

            {/* Mental Health Hospitalizations */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Mental Health Hospitalizations</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => toggleModal('addHospitalization')}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                Add Hospitalization
              </Button>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Location</TableCell>
                    <TableCell>Reasons</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hospitalizations.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>{item.reasons}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => removeItem('hospitalizations', idx)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Psychiatric Medications */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Psychiatric Medications</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => toggleModal('addMedication')}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                Add Medication
              </Button>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Medication</TableCell>
                    <TableCell>Dose / Frequency</TableCell>
                    <TableCell>Effectiveness/Side Effects</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medications.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.dose}</TableCell>
                      <TableCell>{item.sideEffects}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => removeItem('medications', idx)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Symptom Assessment */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                Symptom Assessment
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <Typography variant="body1" sx={{ mb: 1 }}>How often do you feel sad?</Typography>
                  <Select
                    options={formatArrayToOptions(gadList)}
                    value={formData.mhSad}
                    onChange={(option) => handleSelectChange('mhSad', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body1" sx={{ mb: 1 }}>How often do you feel anxious?</Typography>
                  <Select
                    options={formatArrayToOptions(gadList)}
                    value={formData.mhAnxious}
                    onChange={(option) => handleSelectChange('mhAnxious', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Describe your sleep pattern:</Typography>
                  <Select
                    options={formatArrayToOptions(sleepPatternList)}
                    value={formData.mhSleepPattern}
                    onChange={(option) => handleSelectChange('mhSleepPattern', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Describe your energy level:</Typography>
                  <Select
                    options={formatArrayToOptions(energyLevelList)}
                    value={formData.mhEnergyLevel}
                    onChange={(option) => handleSelectChange('mhEnergyLevel', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Do you find it difficult to concentrate?
                  </Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mhConcentrate}
                    onChange={(option) => handleSelectChange('mhConcentrate', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Are there thoughts/voices you cannot get out of your head?
                  </Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mhThoughts}
                    onChange={(option) => handleSelectChange('mhThoughts', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Do you hear voices?</Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mhVoices}
                    onChange={(option) => handleSelectChange('mhVoices', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="If you hear voices, specify what they say:"
                    name="mhVoicesSay"
                    value={formData.mhVoicesSay}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Mental Health Screening Summary Notes"
                  name="mhSummary"
                  value={formData.mhSummary}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Risk Screening */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                RISK SCREENING
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Trauma Assessment
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Does patient report any history of abuse (Select all that apply):
                </Typography>
                <Select
                  isMulti
                  options={traumaList}
                  value={formData.mhAbuse}
                  onChange={(options) => handleSelectChange('mhAbuse', options)}
                  placeholder="Select trauma history..."
                  isDisabled={loading}
                  styles={customSelectStyles}
                />
              </Box>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Safety Risk Assessment
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Does client currently report any "DANGER TO SELF" and/or "DANGER TO OTHERS" (check all that apply):
                </Typography>
                <Select
                  isMulti
                  options={riskList}
                  value={formData.clientRisk}
                  onChange={(options) => handleSelectChange('clientRisk', options)}
                  placeholder="Select risk factors..."
                  isDisabled={loading}
                  styles={customSelectStyles}
                />
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Past thoughts of harm to self or others</Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mhSelfHarm}
                    onChange={(option) => handleSelectChange('mhSelfHarm', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                  <TextField
                    fullWidth
                    label="If yes, when was the last occurrence?"
                    name="mhSelfHarmOccurrence"
                    value={formData.mhSelfHarmOccurrence}
                    onChange={handleInputChange}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Past Suicide Attempts</Typography>
                  <Select
                    options={formatYesNoOptions()}
                    value={formData.mhSuicide}
                    onChange={(option) => handleSelectChange('mhSuicide', option)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                  <TextField
                    fullWidth
                    label="If yes, when was the last occurrence?"
                    name="mhSuicideLast"
                    value={formData.mhSuicideLast}
                    onChange={handleInputChange}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Risk Screening Summary Notes"
                name="mhRiskSummary"
                value={formData.mhRiskSummary}
                onChange={handleInputChange}
                disabled={loading}
                sx={{ mt: 3 }}
              />
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Substance Abuse Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                Substance Use Assessment
              </Typography>
              
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Substance</TableCell>
                    <TableCell>Do you use? (Now/Past)</TableCell>
                    <TableCell>How often? (Current use)</TableCell>
                    <TableCell>Method/Amount Per Use</TableCell>
                    <TableCell>Year Started</TableCell>
                    <TableCell>Year Quit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {substanceList.map((substance, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{substance}</TableCell>
                      <TableCell>
                        <Select
                          options={formatArrayToOptions(substanceAbuseUse)}
                          value={substanceData[substance]?.use || null}
                          onChange={(option) => handleSubstanceChange(substance, 'use', option)}
                          placeholder="Select..."
                          isDisabled={loading}
                          styles={{ ...customSelectStyles, control: (provided) => ({ ...provided, minHeight: '40px' }) }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          options={formatArrayToOptions(substanceAbuseOften)}
                          value={substanceData[substance]?.frequency || null}
                          onChange={(option) => handleSubstanceChange(substance, 'frequency', option)}
                          placeholder="Select..."
                          isDisabled={loading}
                          styles={{ ...customSelectStyles, control: (provided) => ({ ...provided, minHeight: '40px' }) }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={substanceData[substance]?.method || ''}
                          onChange={(e) => handleSubstanceChange(substance, 'method', e.target.value)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={substanceData[substance]?.yearStarted || ''}
                          onChange={(e) => handleSubstanceChange(substance, 'yearStarted', e.target.value)}
                          disabled={loading}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={substanceData[substance]?.yearQuit || ''}
                          onChange={(e) => handleSubstanceChange(substance, 'yearQuit', e.target.value)}
                          disabled={loading}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Substance Abuse Summary Notes"
                name="mhSubAbSum"
                value={formData.mhSubAbSum}
                onChange={handleInputChange}
                disabled={loading}
                sx={{ mt: 3 }}
              />
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Legal Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                LEGAL
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Do you currently have any pending legal issues (Select all that apply):
                </Typography>
                <Select
                  isMulti
                  options={legalList}
                  value={formData.clientLegalIssues}
                  onChange={(options) => handleSelectChange('clientLegalIssues', options)}
                  placeholder="Select legal issues..."
                  isDisabled={loading}
                  styles={customSelectStyles}
                />
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Probation"
                    name="clientLegalProbation"
                    value={formData.clientLegalProbation}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Parole"
                    name="clientLegalParole"
                    value={formData.clientLegalParole}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </Grid>
              </Grid>

              {/* Arrest Screening Questions */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Arrest Screening
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Have you ever been arrested for production or manufacturing of methamphetamines?
                    </Typography>
                    <Select
                      options={formatYesNoOptions()}
                      value={formData.arrestMeth}
                      onChange={(option) => handleSelectChange('arrestMeth', option)}
                      placeholder="Select..."
                      isDisabled={loading}
                      styles={customSelectStyles}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Have you ever been arrested for any other drug and/or alcohol related crime?
                    </Typography>
                    <Select
                      options={formatYesNoOptions()}
                      value={formData.arrestDrugAlcohol}
                      onChange={(option) => handleSelectChange('arrestDrugAlcohol', option)}
                      placeholder="Select..."
                      isDisabled={loading}
                      styles={customSelectStyles}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Have you ever been arrested for a violent crime?
                    </Typography>
                    <Select
                      options={formatYesNoOptions()}
                      value={formData.arrestViolent}
                      onChange={(option) => handleSelectChange('arrestViolent', option)}
                      placeholder="Select..."
                      isDisabled={loading}
                      styles={customSelectStyles}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Arrest History */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Arrest History</Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => toggleModal('addArrest')}
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  Add Arrest
                </Button>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Charge</TableCell>
                      <TableCell>M/F</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Time Served</TableCell>
                      <TableCell>Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {arrests.map((arrest, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{arrest.date}</TableCell>
                        <TableCell>{arrest.charge}</TableCell>
                        <TableCell>{arrest.misdemeanorOrFelony}</TableCell>
                        <TableCell>{arrest.location}</TableCell>
                        <TableCell>{arrest.timeServed}</TableCell>
                        <TableCell>{arrest.result}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Legal Summary Notes"
                name="mhLegalSum"
                value={formData.mhLegalSum}
                onChange={handleInputChange}
                disabled={loading}
                sx={{ mt: 3 }}
              />
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Needs Assessment */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                NEEDS ASSESSMENT
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Patient/Family Needs:
                </Typography>
                <Select
                  isMulti
                  options={needsCol1}
                  value={formData.clientPatFamNeeds}
                  onChange={(options) => handleSelectChange('clientPatFamNeeds', options)}
                  placeholder="Select needs..."
                  isDisabled={loading}
                  styles={customSelectStyles}
                />
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Needs Assessment Summary"
                name="mhNeedsSum"
                value={formData.mhNeedsSum}
                onChange={handleInputChange}
                disabled={loading}
              />
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Case Manager Observations */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
                CASE MANAGER OBSERVATIONS
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Grooming & Hygiene:</Typography>
                  <Select
                    isMulti
                    options={cmOb1}
                    value={formData.cmOb1}
                    onChange={(options) => handleSelectChange('cmOb1', options)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Eye Contact:</Typography>
                  <Select
                    isMulti
                    options={cmOb2}
                    value={formData.cmOb2}
                    onChange={(options) => handleSelectChange('cmOb2', options)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Motor Activity:</Typography>
                  <Select
                    isMulti
                    options={cmOb3}
                    value={formData.cmOb3}
                    onChange={(options) => handleSelectChange('cmOb3', options)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Speech:</Typography>
                  <Select
                    isMulti
                    options={cmOb4}
                    value={formData.cmOb4}
                    onChange={(options) => handleSelectChange('cmOb4', options)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Mood:</Typography>
                  <Select
                    isMulti
                    options={cmOb6}
                    value={formData.cmOb6}
                    onChange={(options) => handleSelectChange('cmOb6', options)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body1" sx={{ mb: 1 }}>Affect:</Typography>
                  <Select
                    isMulti
                    options={cmOb7}
                    value={formData.cmOb7}
                    onChange={(options) => handleSelectChange('cmOb7', options)}
                    placeholder="Select..."
                    isDisabled={loading}
                    styles={customSelectStyles}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Summary and Any Other Observations"
                name="cmObvSum"
                value={formData.cmObvSum}
                onChange={handleInputChange}
                disabled={loading}
                sx={{ mt: 3 }}
              />
            </Box>

            {/* Save Button */}
            {!exportMode && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  type="submit"
                  disabled={loading}
                  size="large"
                  sx={{ minWidth: 200 }}
                >
                  {loading ? "Saving..." : "Save Mental Health Assessment"}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* Modals */}
        {/* Add Provider Modal */}
        <Dialog open={modalOpen.addProvider} onClose={() => toggleModal('addProvider')} maxWidth="md" fullWidth>
          <DialogTitle>Add Mental Health Provider</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Agency"
                  name="mhpCurrentAgency"
                  value={modalFormData.mhpCurrentAgency}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="MH Worker"
                  name="mhpCurrentWorker"
                  value={modalFormData.mhpCurrentWorker}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="mhpCurrentPhone"
                  value={modalFormData.mhpCurrentPhone}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Last Appointment"
                  name="mhpCurrentLastApptDate"
                  value={modalFormData.mhpCurrentLastApptDate}
                  onChange={handleModalInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Next Appointment"
                  name="mhpCurrentNextApptDate"
                  value={modalFormData.mhpCurrentNextApptDate}
                  onChange={handleModalInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={addProvider} variant="contained" color="primary">Add Provider</Button>
            <Button onClick={() => toggleModal('addProvider')}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Add Hospitalization Modal */}
        <Dialog open={modalOpen.addHospitalization} onClose={() => toggleModal('addHospitalization')} maxWidth="md" fullWidth>
          <DialogTitle>Add Hospitalization</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location of Hospitalization"
                  name="mhhLocation"
                  value={modalFormData.mhhLocation}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Reasons for Hospitalization"
                  name="mhhReasons"
                  value={modalFormData.mhhReasons}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Hospitalization"
                  name="mhhDate"
                  value={modalFormData.mhhDate}
                  onChange={handleModalInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={addHospitalization} variant="contained" color="primary">Add Hospitalization</Button>
            <Button onClick={() => toggleModal('addHospitalization')}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Add Medication Modal */}
        <Dialog open={modalOpen.addMedication} onClose={() => toggleModal('addMedication')} maxWidth="md" fullWidth>
          <DialogTitle>Add Psychiatric Medication</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Medication"
                  name="mhmName"
                  value={modalFormData.mhmName}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Dose/Frequency"
                  name="mhmDose"
                  value={modalFormData.mhmDose}
                  onChange={handleModalInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Effectiveness/Side Effects"
                  name="mhmSide"
                  value={modalFormData.mhmSide}
                  onChange={handleModalInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={addMedication} variant="contained" color="primary">Add Medication</Button>
            <Button onClick={() => toggleModal('addMedication')}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Add Arrest Modal */}
        <Dialog open={modalOpen.addArrest} onClose={() => toggleModal('addArrest')} maxWidth="md" fullWidth>
          <DialogTitle>Add Arrest</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  name="mhaDate"
                  value={newArrest.mhaDate}
                  onChange={handleNewArrestChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Charge"
                  name="mhaCharge"
                  value={newArrest.mhaCharge}
                  onChange={handleNewArrestChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body1" sx={{ mb: 1 }}>Misdemeanor(M) or Felony(F)</Typography>
                <Select
                  options={formatMFOptions()}
                  value={newArrest.mhaMF}
                  onChange={(option) => handleNewArrestSelectChange('mhaMF', option)}
                  placeholder="Select..."
                  styles={customSelectStyles}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location of Offense (City/State)"
                  name="mhaLoc"
                  value={newArrest.mhaLoc}
                  onChange={handleNewArrestChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Time Served"
                  name="mhaTime"
                  value={newArrest.mhaTime}
                  onChange={handleNewArrestChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Result In?"
                  name="mhaResult"
                  value={newArrest.mhaResult}
                  onChange={handleNewArrestChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSaveArrest} variant="contained" color="primary">Save</Button>
            <Button onClick={() => toggleModal('addArrest')}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Card>
    </form>
  );
};

export default MentalHealth;