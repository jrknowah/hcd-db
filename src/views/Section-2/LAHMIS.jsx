import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Snackbar,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  BusinessCenter as HMISIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Security as SecurityIcon,
  Description as DocumentIcon
} from '@mui/icons-material';

// Import Redux actions
import {
  fetchFormData,
  saveFormData,
  updateFormLocal,
  clearErrors,
  clearSuccessFlags,
  selectFormByType,
  selectFormLoading,
  selectSaving,
  selectSaveSuccess
} from '../../backend/store/slices/authSigSlice';

// ✅ UPDATED: Wrapped with forwardRef to work with FormModal
const LAHMIS = forwardRef(({ clientID: propClientID, title, formType = 'lahmis' }, ref) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const lahmisForm = useSelector(selectFormByType('lahmis'));
  const formLoading = useSelector(selectFormLoading('lahmis'));
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const formErrors = useSelector((state) => state.authSig.formErrors.lahmis);
  
  // Local state
  const [formData, setFormData] = useState({
    clientName: "",
    clientDOB: "",
    clientSSN: "",
    clientSignature: "",
    signatureDate: "",
    headOfHousehold: "",
    staffSignature: "",
    organization: "",
    consentGiven: false
  });
  
  const [children, setChildren] = useState([
    { name: "", dob: "", ssn: "", livingWithYou: "" }
  ]);
  
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [expandedSection, setExpandedSection] = useState('information');
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const requiredFields = ['clientName', 'clientDOB', 'clientSSN', 'clientSignature', 'signatureDate'];
  const completedFields = requiredFields.filter(field => formData[field]?.trim()).length;
  const completionPercentage = Math.round(((completedFields + (formData.consentGiven ? 1 : 0)) / (requiredFields.length + 1)) * 100);

  // ✅ ADDED: Expose getFormData method to parent FormModal
  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      formData,
      children: children.filter(child => child.name.trim()),
      signature: formData.clientSignature,
      completionPercentage,
      status: completionPercentage === 100 ? 'completed' : 'in_progress',
      consentGiven: formData.consentGiven,
      submittedAt: new Date().toISOString()
    })
  }));

  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'lahmis' }));
    }
  }, [dispatch, clientID]);

  // Update local state when Redux form data changes
  useEffect(() => {
    if (lahmisForm && Object.keys(lahmisForm).length > 0) {
      setFormData(lahmisForm.formData || formData);
      setChildren(lahmisForm.children || children);
    }
  }, [lahmisForm]);

  // Handle form field changes
  const handleFieldChange = useCallback((field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'lahmis',
      formData: {
        formData: newFormData,
        children,
        completionPercentage: Math.round(((requiredFields.filter(f => newFormData[f]?.trim()).length + (newFormData.consentGiven ? 1 : 0)) / (requiredFields.length + 1)) * 100)
      }
    }));
  }, [dispatch, formData, children, requiredFields]);

  // Handle child information changes
  const handleChildChange = useCallback((index, field, value) => {
    const newChildren = [...children];
    newChildren[index][field] = value;
    setChildren(newChildren);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'lahmis',
      formData: {
        formData,
        children: newChildren,
        completionPercentage
      }
    }));
  }, [dispatch, formData, children, completionPercentage]);

  // Add child
  const addChild = useCallback(() => {
    const newChildren = [...children, { name: "", dob: "", ssn: "", livingWithYou: "" }];
    setChildren(newChildren);
  }, [children]);

  // Remove child
  const removeChild = useCallback((index) => {
    if (children.length > 1) {
      const newChildren = children.filter((_, i) => i !== index);
      setChildren(newChildren);
    }
  }, [children]);

  // Handle accordion changes
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  // Validate form
  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }

    if (!formData.clientName.trim()) {
      errors.push("Client name is required.");
    }

    if (!formData.clientDOB.trim()) {
      errors.push("Date of birth is required.");
    }

    if (!formData.clientSSN.trim()) {
      errors.push("Last 4 digits of SSN are required.");
    }

    if (!formData.clientSignature.trim()) {
      errors.push("Client signature is required.");
    }

    if (!formData.consentGiven) {
      errors.push("Consent must be given to proceed.");
    }

    return errors;
  }, [clientID, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const submitData = {
      formData,
      children: children.filter(child => child.name.trim()),
      signature: formData.clientSignature,
      completionPercentage: 100,
      status: 'completed',
      consentGiven: formData.consentGiven,
      submittedAt: new Date().toISOString()
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'lahmis', 
        formData: submitData 
      })).unwrap();
      
      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save LAHMIS consent']);
    }
  }, [dispatch, clientID, validateForm, formData, children]);

  // Clear success messages
  const handleCloseSuccessSnackbar = useCallback(() => {
    setShowSuccessSnackbar(false);
    dispatch(clearSuccessFlags());
  }, [dispatch]);

  // Clear errors
  const handleClearErrors = useCallback(() => {
    setLocalErrors([]);
    dispatch(clearErrors());
  }, [dispatch]);

  if (formLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading HMIS consent data...</Typography>
      </Box>
    );
  }

  if (!clientID) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        No client selected. Please select a client to view their HMIS consent form.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Header Section */}
      <Card elevation={3} sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <HMISIcon sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              LA HMIS Consent Form
            </Typography>
          </Box>
          <Typography variant="subtitle1">
            Los Angeles Homeless Management Information System
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
            Protected Personal Information Sharing Consent
          </Typography>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Form Completion
            </Typography>
            <Chip 
              label={`${completionPercentage}%`}
              color={completionPercentage === 100 ? "success" : "warning"}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionPercentage} 
            sx={{ height: 8, borderRadius: 5 }}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {(localErrors.length > 0 || formErrors) && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={handleClearErrors}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Please correct the following errors:
          </Typography>
          {localErrors.map((error, index) => (
            <Typography key={index} variant="body2">• {error}</Typography>
          ))}
          {formErrors && <Typography variant="body2">• {formErrors}</Typography>}
        </Alert>
      )}

      {/* Information About HMIS Accordion */}
      <Accordion 
        expanded={expandedSection === 'information'} 
        onChange={handleAccordionChange('information')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DocumentIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">What is LA HMIS?</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              What is the HMIS database?
            </Typography>
            <Typography variant="body2" paragraph>
              The Homeless Management Information System (HMIS) database is a computerized data system that contains information about people receiving services from homeless service providers throughout Los Angeles County. It helps us coordinate the most effective services for you. The following information is called your "Protected Personal Information" (PPI) and may be collected from you directly as well as gathered from other organizations who are also HMIS participating agencies:
            </Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              {[
                "Name, date of birth, Social Security Number",
                "Race/ethnicity, gender, veteran status, household income",
                "Disabling conditions, residential history, and services received"
              ].map((item, index) => (
                <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
                  {item}
                </Typography>
              ))}
            </Box>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, color: 'primary.main' }}>
              How do you benefit from providing your information?
            </Typography>
            <Typography variant="body2" paragraph>
              The information you provide for the HMIS database helps us coordinate the most effective services for you and your household members. By sharing your information, you may be able to avoid being screened more than once, get faster services, and minimize how many times you tell your 'story.' Collecting this information also gives us a better understanding of homelessness and the effectiveness of services in your local area.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, color: 'primary.main' }}>
              How is your personal information protected?
            </Typography>
            <Typography variant="body2" paragraph>
              Your information is protected by the federal HMIS Privacy Standards and is secured by passwords and encryption technology. In addition, each participating organization has signed an agreement to maintain the security and confidentiality of the information. In some instances, when the participating organization is a health care organization, your information may be protected by the privacy standards of the Health Insurance Portability and Accountability Act (HIPAA).
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Consent Agreement Accordion */}
      <Accordion 
        expanded={expandedSection === 'consent'} 
        onChange={handleAccordionChange('consent')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Consent Agreement & Your Rights</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            By signing below, you understand and agree that:
          </Typography>
          
          <Box component="ul" sx={{ pl: 3, mb: 3 }}>
            {[
              "You have the right to receive services, even if you do not sign this consent form.",
              "You have the right to receive a copy of this consent form.",
              "Your consent permits any participating organization to add to or update your information in HMIS, without asking you to sign another consent form.",
              "This consent is valid for seven (7) years from the date the PPI was created or last changed.",
              "You may revoke your consent at any time, but your revocation must be provided either in writing or by completing the Revocation of Consent form.",
              "The Privacy Notice for the LA HMIS contains more detailed information about how your information may be used and disclosed.",
              "No later than five (5) business days of your written request, we will provide you with corrections, copies, and current participant lists.",
              "Aggregate or statistical data that is released from the HMIS database will not disclose any of your PPI.",
              "You have the right to file a grievance against any organization whether or not you sign this consent.",
              "You are not waiving any rights protected under Federal and/or California law."
            ].map((item, index) => (
              <Typography key={index} component="li" variant="body2" sx={{ mb: 1 }}>
                {item}
              </Typography>
            ))}
          </Box>

          {/* Consent Toggle */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.50', 
            borderRadius: 1, 
            border: '1px solid',
            borderColor: 'primary.200'
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.consentGiven}
                  onChange={(e) => handleFieldChange('consentGiven', e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  I understand and consent to the sharing of my protected personal information as described above
                </Typography>
              }
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Client Information Form */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Client Information
        </Typography>
        
        <Grid container spacing={3}>
          
          <Grid item xs={12} >
            <TextField
              fullWidth
              label="Client Signature"
              value={formData.clientSignature}
              onChange={(e) => handleFieldChange('clientSignature', e.target.value)}
              required
              placeholder="Type your full legal name"
              helperText="Electronic signature"
            />
          </Grid>
          <Grid item xs={12} >
            <TextField
              fullWidth
              label="Head of Household"
              value={formData.headOfHousehold}
              onChange={(e) => handleFieldChange('headOfHousehold', e.target.value)}
              helperText="If different from client"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Children Information */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Children Information (if applicable)
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={addChild}
            variant="outlined"
            size="small"
          >
            Add Child
          </Button>
        </Box>

        {children.map((child, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Child {index + 1}
              </Typography>
              {children.length > 1 && (
                <IconButton onClick={() => removeChild(index)} size="small" color="error">
                  <RemoveIcon />
                </IconButton>
              )}
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Child Name"
                  value={child.name}
                  onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={child.dob}
                  onChange={(e) => handleChildChange(index, 'dob', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Last 4 of SSN"
                  value={child.ssn}
                  onChange={(e) => handleChildChange(index, 'ssn', e.target.value)}
                  inputProps={{ maxLength: 4 }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Living With You?"
                  value={child.livingWithYou}
                  onChange={(e) => handleChildChange(index, 'livingWithYou', e.target.value)}
                  size="small"
                  placeholder="Yes/No"
                />
              </Grid>
            </Grid>
            {index < children.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
      </Paper>

      {/* Submit Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving || !clientID}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontWeight: 600,
            fontSize: '1.1rem'
          }}
        >
          {saving ? 'Saving...' : 'Save HMIS Consent'}
        </Button>

        {completionPercentage < 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="warning.main">
              Please complete all required fields and provide consent before saving
            </Typography>
          </Box>
        )}
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar || saveSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccessSnackbar}
      >
        <Alert 
          onClose={handleCloseSuccessSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          ✅ HMIS consent form saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
});

// ✅ ADDED: Set display name for debugging
LAHMIS.displayName = 'LAHMIS';

export default LAHMIS;