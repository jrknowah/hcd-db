// ===== IMPORTS MUST BE AT THE TOP OF THE FILE =====
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
  Card,
  CardContent,
  LinearProgress,
  Paper
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
import { identityList, highestEdu } from "../../data/arrayList";

// TODO: Update these imports to match your existing slice exports
// Check your slice file for the correct export names and path:
// Example possibilities:
// import { saveIDTNote, fetchIDTNote } from "../../../../store/apps/notes/IDTNoteCMSlice";
// import { saveIDTNote, fetchIDTNote } from "../../../store/slices/idtNoteCmSlice";
// Or check what exports are actually available in your slice file

// ===== COMPONENT STARTS HERE =====
const IDTNoteCM = ({ clientID }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  
  // TODO: Update this to match your actual state structure
  // const { data, loading, error } = useSelector((state) => state.idtNoteCM || {});
  
  // For now, using local state until Redux is connected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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

  useEffect(() => {
    // TODO: Replace with your actual fetch action
    // if (clientID) dispatch(fetchIDTNote(clientID));
    
    // Mock data for testing the UI
    console.log('Loading data for client:', clientID);
  }, [clientID, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGovIssuedChange = (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      clientGovIssued: typeof value === 'string' ? value.split(',').map(v => ({ label: v, value: v })) : value.map(v => ({ label: v, value: v }))
    }));
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Replace with your actual save action
      // const payload = {
      //   ...formData,
      //   clientGovIssued: formData.clientGovIssued.map((option) => option.value),
      //   clientID,
      //   updatedBy: user?.email || "unknown"
      // };
      // dispatch(saveIDTNote(payload));
      
      // Mock save for testing
      console.log('Saving data:', formData);
      setTimeout(() => {
        setLoading(false);
        alert('Data saved successfully! (Mock save)');
      }, 1000);
      
    } catch (err) {
      setError('Error saving data');
      setLoading(false);
    }
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
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
                <TextField
                  fullWidth
                  label="Income Source"
                  name="idtIncomeSource"
                  value={formData.idtIncomeSource}
                  onChange={handleChange}
                  helperText="Member source of income?"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Government Issued ID</InputLabel>
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
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Available Resources"
                  name="idtResources"
                  value={formData.idtResources}
                  onChange={handleChange}
                  helperText="What resources/assistance can we provide?"
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
                <TextField
                  fullWidth
                  label="HFH Case Manager"
                  name="idtHfhCM"
                  value={formData.idtHfhCM}
                  onChange={handleChange}
                  helperText="HFH case manager that will follow this client?"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Recommendations"
                  name="idtRecommend"
                  value={formData.idtRecommend}
                  onChange={handleChange}
                  helperText="Recommendations to address problems?"
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
                <FormControl fullWidth>
                  <InputLabel>Educational Level</InputLabel>
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
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Work Goals"
                  name="idtGoals"
                  value={formData.idtGoals}
                  onChange={handleChange}
                  helperText="Is a work goal feasible and how long will it take to achieve?"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Employment Barriers"
                  name="clientPayeeBarriers"
                  value={formData.clientPayeeBarriers}
                  onChange={handleChange}
                  helperText="Any mental/physical barriers to attaining employment?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Assistance Plan"
                  name="clientPayeeAssistance"
                  value={formData.clientPayeeAssistance}
                  onChange={handleChange}
                  helperText="How will we assist the member in attaining these goals?"
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
            disabled={loading}
            startIcon={<SaveIcon />}
            sx={{ minWidth: 150 }}
          >
            {loading ? 'Saving...' : 'Save Assessment'}
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