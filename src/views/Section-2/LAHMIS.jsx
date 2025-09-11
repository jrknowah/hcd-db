import React, { useState, useEffect, useCallback } from "react";
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

const LAHMIS = ({ clientID: propClientID }) => {
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
        <Typography sx={{ ml: 2 }}>Loading LAHMIS consent form...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Header Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HMISIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, textAlign: 'center' }}>
                LA HMIS CONSENT TO SHARE PROTECTED PERSONAL INFORMATION
              </Typography>
              <Typography variant="h6" color="primary" sx={{ textAlign: 'center', fontWeight: 500 }}>
                Greater Los Angeles Homeless Management Information System
              </Typography>
            </Box>
          </Box>

          {/* Client Info */}
          {selectedClient && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Client: <strong>{selectedClient.firstName} {selectedClient.lastName}</strong> 
                {selectedClient.clientID && ` (ID: ${selectedClient.clientID})`}
              </Typography>
            </Box>
          )}

          {/* Progress Indicator */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Form Completion Progress
              </Typography>
              <Chip 
                label={`${completionPercentage}% Complete`}
                color={completionPercentage === 100 ? 'success' : 'primary'}
                size="small"
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completionPercentage} 
              sx={{ height: 8, borderRadius: 4 }}
              color={completionPercentage === 100 ? 'success' : 'primary'}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {(localErrors.length > 0 || formErrors) && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={handleClearErrors}
        >
          {localErrors.length > 0 ? (
            <Box>
              {localErrors.map((error, index) => (
                <Typography key={index} variant="body2">
                  • {error}
                </Typography>
              ))}
            </Box>
          ) : (
            formErrors
          )}
        </Alert>
      )}

      {/* HMIS Information Accordion */}
      <Accordion 
        expanded={expandedSection === 'information'} 
        onChange={handleAccordionChange('information')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DocumentIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">HMIS Information & Your Rights</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 1 }}>
            <Typography variant="body2" paragraph>
              The LA HMIS is a local electronic database that securely records information (data) about clients accessing housing and homeless services within the Greater Los Angeles County. This organization participates in the HMIS database and shares information with other organizations that use this database. This information is utilized to provide supportive services to you and your household members.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, color: 'primary.main' }}>
              What information is shared in the HMIS database?
            </Typography>
            <Typography variant="body2" paragraph>
              We share both Protected Personal Information (PPI) and general information obtained during your intake and assessment, which may include but is not limited to:
            </Typography>
            
            <Box component="ul" sx={{ pl: 3, mb: 3 }}>
              {[
                "Your name and your contact information",
                "Your social security number",
                "Your birthdate",
                "Your basic demographic information such as gender and race/ethnicity",
                "Your history of homelessness and housing",
                "Your self-reported medical history, including any mental health and substance abuse issues",
                "Your case notes and services",
                "Your case manager's contact information",
                "Your income sources and amounts; and non-cash benefits",
                "Your veteran status",
                "Your disability status",
                "Your household composition",
                "Your emergency contact information",
                "Any history of domestic violence",
                "Your photo (optional)"
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
            />
          </Grid>
          <Grid item xs={12} >
            <TextField
              fullWidth
              label="Head of Household"
              value={formData.headOfHousehold}
              onChange={(e) => handleFieldChange('headOfHousehold', e.target.value)}
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
};

export default LAHMIS;