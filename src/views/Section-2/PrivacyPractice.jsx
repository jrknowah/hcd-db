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
  Chip,
  LinearProgress,
  Snackbar,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Security as SecurityIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Policy as PolicyIcon,
  HealthAndSafety as HealthIcon,
  Gavel as LegalIcon,
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

const PrivacyPractice = ({ clientID: propClientID }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const privacyForm = useSelector(selectFormByType('privacyPractice'));
  const formLoading = useSelector(selectFormLoading('privacyPractice'));
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const formErrors = useSelector((state) => state.authSig.formErrors.privacyPractice);
  
  // Local state
  const [formData, setFormData] = useState({
    // Pledge checkboxes
    ppHI1: false,
    ppHI2: false,
    ppHI3: false,
    ppHI4: false,
    // Signature fields
    clientSignature: "",
    clientPrintedName: "",
    staffSignature: "",
    copyDate: "",
    copyInitials: ""
  });
  
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [expandedSection, setExpandedSection] = useState(false);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const requiredFields = 7; // 4 checkboxes + 3 signatures
  const completedFields = Object.values(formData).filter(value => 
    typeof value === 'boolean' ? value : (value && value.trim() !== "")
  ).length - 2; // Exclude copyDate and copyInitials from required
  const completionPercentage = Math.round((completedFields / requiredFields) * 100);

  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'privacyPractice' }));
    }
  }, [dispatch, clientID]);

  // Update local state when Redux form data changes
  useEffect(() => {
    if (privacyForm && Object.keys(privacyForm).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...privacyForm.formData,
        clientSignature: privacyForm.signature || "",
      }));
    }
  }, [privacyForm]);

  // Handle form field changes
  const handleFieldChange = useCallback((field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'privacyPractice',
      formData: {
        formData: newFormData,
        signature: field === 'clientSignature' ? value : formData.clientSignature,
        completionPercentage: Math.round((Object.values(newFormData).filter(v => 
          typeof v === 'boolean' ? v : (v && v.trim() !== "")
        ).length - 2) / requiredFields * 100)
      }
    }));
  }, [dispatch, formData, requiredFields]);

  // Handle checkbox changes
  const handleCheckboxChange = useCallback((field) => (event) => {
    handleFieldChange(field, event.target.checked);
  }, [handleFieldChange]);

  // Handle text field changes
  const handleTextChange = useCallback((field) => (event) => {
    handleFieldChange(field, event.target.value);
  }, [handleFieldChange]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }

    if (!formData.ppHI1 || !formData.ppHI2 || !formData.ppHI3 || !formData.ppHI4) {
      errors.push("Please acknowledge all pledge items by checking all boxes.");
    }

    if (!formData.clientSignature.trim()) {
      errors.push("Client signature is required.");
    }

    if (!formData.clientPrintedName.trim()) {
      errors.push("Client printed name is required.");
    }

    if (!formData.staffSignature.trim()) {
      errors.push("Staff signature is required.");
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
      signature: formData.clientSignature,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        ...formData,
        acknowledgedAt: new Date().toISOString()
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'privacyPractice', 
        formData: submitData 
      })).unwrap();
      
      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save privacy practice acknowledgment']);
    }
  }, [dispatch, clientID, validateForm, formData]);

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
        <Typography sx={{ ml: 2 }}>Loading privacy practice data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Header Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Notice of Privacy Practices
              </Typography>
              <Typography variant="body1" color="text.secondary">
                This notice describes how medical information about you may be used and disclosed
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
                Acknowledgment Progress
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

      {/* Notice Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'error.50', border: '2px solid', borderColor: 'error.200' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main', textAlign: 'center' }}>
          THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.
        </Typography>
      </Paper>

      {/* Who Will Follow Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          WHO WILL FOLLOW THIS NOTICE OF PRIVACY PRACTICES
        </Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
          This Notice describes the privacy practices followed by the workforce members of the County of Los Angeles Department of Health Services, Mental Health, and Public Health, collectively referred to as the Health Agency (Agency). Workforce members include doctors, nurses, residents, therapists, case managers, students, volunteers, and other health care staff who help with your care at an Agency facility.
        </Typography>
      </Paper>

      {/* Our Pledge Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          OUR PLEDGE REGARDING YOUR HEALTH INFORMATION
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The law requires the Agency to:
        </Typography>
        
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.ppHI1}
                onChange={handleCheckboxChange('ppHI1')}
                color="primary"
              />
            }
            label="Keep your medical records and health information, also known as protected health information, private and secure."
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.ppHI2}
                onChange={handleCheckboxChange('ppHI2')}
                color="primary"
              />
            }
            label="Give you this Notice which explains your rights and our legal duties with respect to your health information."
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.ppHI3}
                onChange={handleCheckboxChange('ppHI3')}
                color="primary"
              />
            }
            label="Tell you about our privacy practices and follow the terms of this Notice."
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.ppHI4}
                onChange={handleCheckboxChange('ppHI4')}
                color="primary"
              />
            }
            label="Notify you if there has been a breach of the privacy of your health information."
          />
        </FormGroup>
      </Paper>

      {/* Expandable Sections for Better Organization */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HealthIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Uses and Disclosures of Your Health Information
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              The following categories describe the different ways that we may use or disclose your health information without obtaining your authorization:
            </Typography>
            
            <List>
              {[
                {
                  title: "Treatment",
                  content: "We may use and disclose your health information to provide you with medical treatment and related services. We may share your health information with doctors, medical staff, counselors, treatment staff, clerks, support staff, and other health care personnel who are involved in your care."
                },
                {
                  title: "Payment", 
                  content: "We may use and disclose your health information to bill and receive payment for the treatment and services you receive. For billing and payment purposes, we may disclose your health information to your payment source, including insurance or managed care company, Medicare, Medicaid, or another third-party payer."
                },
                {
                  title: "Health Care Operations",
                  content: "We may use and share your health information for Agency business purposes, such as quality assurance and improvement actions, reviewing the competence and qualifications of health care professionals, medical review, legal services, audit roles, and general administrative purposes."
                },
                {
                  title: "Business Associates",
                  content: "We may share your health information with our business associates so they can perform the job we have asked them to do. Some services provided by our business associates include a billing service, record storage company, or legal or accounting consultants."
                },
                {
                  title: "Health Information Exchange",
                  content: "We, along with other health care providers in the Los Angeles area, may participate in one or more Health Information Exchanges (HIE). An HIE is a community-wide information system used by participating health care providers to share health information about you for treatment purposes."
                }
              ].map((item, index) => (
                <ListItem key={index} sx={{ alignItems: 'flex-start', py: 1 }}>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        mt: 0.5
                      }}
                    >
                      {index + 1}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {item.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                        {item.content}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LegalIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Your Rights About Your Health Information
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              You have the following rights about your health information:
            </Typography>
            <List>
              {[
                "Right to Request Restrictions of Your Health Information",
                "Right to Ask for Restrictions When You Fully Pay Out-of-Pocket", 
                "Right to Choose Someone to Act for You",
                "Right to Receive Confidential Communications",
                "Right to Access, Inspect, and Copy Your Health Information",
                "Right to Amend Your Health Information",
                "Right to Receive an Accounting of Disclosures",
                "Right to Obtain a Paper Copy of Notice"
              ].map((right, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary={right} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                How to File a Complaint
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
              If you believe your privacy rights have been violated, you may file a complaint with:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                County of Los Angeles Department of Health Services
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Privacy Officer<br />
                313 N. Figueroa Street, Room 703<br />
                Los Angeles, CA 90012<br />
                (800) 711-5366
              </Typography>
              
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                U.S. Department of Health and Human Services
              </Typography>
              <Typography variant="body2">
                Office for Civil Rights<br />
                (800) 368-1019<br />
                www.hhs.gov/ocr/privacy/hipaa/complaints/
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Signature Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
          Acknowledgment and Signatures
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={12}>
            <TextField
              fullWidth
              label="Client Signature"
              variant="outlined"
              value={formData.clientSignature}
              onChange={handleTextChange('clientSignature')}
              required
              sx={{ mb: 2 }}
            />
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Client was given or refused a copy of this consent
        </Typography>
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
          {saving ? 'Saving...' : 'Save Privacy Practice Acknowledgment'}
        </Button>

        {completionPercentage < 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="warning.main">
              Please complete all required fields before saving
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
          ✅ Privacy practice acknowledgment saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PrivacyPractice;