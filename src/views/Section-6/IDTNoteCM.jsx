// ✅ SIMPLIFIED IDTNoteCM.jsx - No external error handling needed
import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  TextField,
  Grid,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  LinearProgress,
  Paper,
  CircularProgress
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Save as SaveIcon
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";

// ✅ SIMPLE: Direct imports - slice handles all error cases
import { 
  fetchIDTCaseManager,
  saveIDTCaseManager,
  clearError,
  clearSaveSuccess,
  selectIDTData,
  selectIDTLoading,
  selectIDTError,
  selectIDTSaving,
  selectIDTSaveSuccess,
  selectAPIConnected
} from "../../store/slices/idtNoteCmSlice";

// ✅ SIMPLE: Inline data - no external dependencies
const identityList = [
  { value: 'state_id', label: 'State ID' },
  { value: 'drivers_license', label: 'Driver\'s License' },
  { value: 'passport', label: 'Passport' },
  { value: 'ssn_card', label: 'Social Security Card' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'medical_card', label: 'Medical Insurance Card' }
];

const highestEdu = [
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

const IDTNoteCM = ({ clientID }) => {
  const dispatch = useDispatch();
  
  // ✅ SIMPLE: Safe selectors from slice - no destructuring errors
  const data = useSelector(selectIDTData);
  const loading = useSelector(selectIDTLoading);
  const error = useSelector(selectIDTError);
  const saving = useSelector(selectIDTSaving);
  const saveSuccess = useSelector(selectIDTSaveSuccess);
  const apiConnected = useSelector(selectAPIConnected);
  
  const user = useSelector((state) => state.auth?.user || null);
  
  const [formData, setFormData] = useState({
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
    clientPayeeAssistance: ""
  });

  const [expandedAccordion, setExpandedAccordion] = useState(0);

  // ✅ SIMPLE: Direct dispatch - slice handles all scenarios
  useEffect(() => {
    if (clientID) {
      dispatch(fetchIDTCaseManager(clientID));
    }
  }, [clientID, dispatch]);

  // ✅ SIMPLE: Safe data loading
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData({
        idtMemberSituation: data.idtMemberSituation || "",
        idtMemberSupport: data.idtMemberSupport || "",
        idtIncomeSource: data.idtIncomeSource || "",
        clientGovIssued: Array.isArray(data.clientGovIssued) 
          ? data.clientGovIssued.map(item => 
              typeof item === 'string' ? { label: item, value: item } : item
            )
          : [],
        idtResources: data.idtResources || "",
        idtHfhCM: data.idtHfhCM || "",
        idtRecommend: data.idtRecommend || "",
        clientHighEnd: data.clientHighEnd || "",
        idtGoals: data.idtGoals || "",
        clientPayeeBarriers: data.clientPayeeBarriers || "",
        clientPayeeAssistance: data.clientPayeeAssistance || ""
      });
    }
  }, [data]);

  // ✅ SIMPLE: Auto-clear success messages
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearSaveSuccess());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGovIssuedChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      clientGovIssued: typeof value === 'string' 
        ? value.split(',').map(v => ({ label: v, value: v })) 
        : value.map(v => ({ label: v, value: v }))
    }));
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  // ✅ SIMPLE: Direct save - slice handles all scenarios
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      clientGovIssued: formData.clientGovIssued.map((option) => option.value),
      clientID,
      updatedBy: user?.email || "system"
    };
    
    dispatch(saveIDTCaseManager(payload));
  };

  const getCompletionPercentage = () => {
    const fields = [
      'idtMemberSituation', 'idtMemberSupport', 'idtIncomeSource',
      'idtResources', 'idtHfhCM', 'idtRecommend', 'clientHighEnd',
      'idtGoals', 'clientPayeeBarriers', 'clientPayeeAssistance'
    ];
    const completed = fields.filter(field => formData[field] && formData[field].trim() !== '').length;
    const govIdCompleted = formData.clientGovIssued && formData.clientGovIssued.length > 0 ? 1 : 0;
    return Math.round(((completed + govIdCompleted) / (fields.length + 1)) * 100);
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* Header Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          IDT Case Manager Assessment
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Comprehensive case management evaluation and goal setting
        </Typography>
        
        {/* ✅ SIMPLE: Connection status indicator */}
        {!apiConnected && (
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            🔧 Development Mode: Using demo data (API not connected)
          </Alert>
        )}
        
        {/* Progress Indicator */}
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">Assessment Completion</Typography>
            <Typography variant="body2">{completionPercentage}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionPercentage} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      {/* ✅ SIMPLE: Error handling */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => dispatch(clearError())}
        >
          {error}
        </Alert>
      )}

      {saveSuccess && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }} 
          onClose={() => dispatch(clearSaveSuccess())}
        >
          ✅ Assessment saved successfully!
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Box display="flex" justifyContent="center" mb={3}>
          <CircularProgress />
        </Box>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        {/* Accordion 1: Member Assessment & Support System */}
        <Accordion 
          expanded={expandedAccordion === 0} 
          onChange={handleAccordionChange(0)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <PsychologyIcon sx={{ mr: 2, color: 'primary.main' }} />
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
                  name="idtMemberSituation"
                  value={formData.idtMemberSituation}
                  onChange={handleChange}
                  helperText="What is the member situation in relation to his/her mental health needs, living conditions/family/finances, transportation issues?"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Support System"
                  name="idtMemberSupport"
                  value={formData.idtMemberSupport}
                  onChange={handleChange}
                  helperText="Who are the member's support system and dynamics of the support system? Family, significant other, friends?"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Accordion 2: Financial & Documentation Status */}
        <Accordion 
          expanded={expandedAccordion === 1} 
          onChange={handleAccordionChange(1)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <MoneyIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Financial & Documentation Status</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography>Income Source</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="idtIncomeSource"
                  value={formData.idtIncomeSource}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Government Issued ID</Typography>
                <FormControl fullWidth>
                  <Select
                    multiple
                    value={formData.clientGovIssued.map(item => item.value)}
                    onChange={handleGovIssuedChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {identityList.map((id) => (
                      <MenuItem key={id.value} value={id.value}>
                        {id.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Available Resources</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label=""
                  name="idtResources"
                  value={formData.idtResources}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Accordion 3: Case Management & Recommendations */}
        <Accordion 
          expanded={expandedAccordion === 2} 
          onChange={handleAccordionChange(2)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <AssignmentIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Case Management & Recommendations</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography>HFH Case Manager</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="idtHfhCM"
                  value={formData.idtHfhCM}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography>Recommendations</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label=""
                  name="idtRecommend"
                  value={formData.idtRecommend}
                  onChange={handleChange} 
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Accordion 4: Education & Employment Readiness */}
        <Accordion 
          expanded={expandedAccordion === 3} 
          onChange={handleAccordionChange(3)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Education & Employment Readiness</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography>Highest Educational Level</Typography>
                <FormControl fullWidth> 
                  <Select
                    name="clientHighEnd"
                    value={formData.clientHighEnd}
                    onChange={handleChange}
                    label="Educational Level"
                  >
                    <MenuItem value="">Select Education</MenuItem>
                    {highestEdu.map((hEdu) => (
                      <MenuItem key={hEdu} value={hEdu}>
                        {hEdu}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Work Goals</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label=""
                  name="idtGoals"
                  value={formData.idtGoals}
                  onChange={handleChange} 
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography>Employment Barriers</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label=""
                  name="clientPayeeBarriers"
                  value={formData.clientPayeeBarriers}
                  onChange={handleChange} 
                />
              </Grid>
              <Grid item xs={12}>
                <Typography>Assistance Plan</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label=""
                  name="clientPayeeAssistance"
                  value={formData.clientPayeeAssistance}
                  onChange={handleChange} 
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Save Button */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || loading}
            startIcon={<SaveIcon />}
            sx={{ minWidth: 150 }}
          >
            {saving ? 'Saving...' : 'Save Assessment'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

IDTNoteCM.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default IDTNoteCM;