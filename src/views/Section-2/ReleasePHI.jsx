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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Container
} from '@mui/material';
import {
  Security as SecurityIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Policy as PolicyIcon,
  Gavel as LegalIcon,
  VerifiedUser as VerifiedIcon
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

const ReleasePHI = ({ clientID: propClientID }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const phiReleaseForm = useSelector(selectFormByType('phiRelease'));
  const formLoading = useSelector(selectFormLoading('phiRelease'));
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const formErrors = useSelector((state) => state.authSig.formErrors.phiRelease);
  
  // Local state
  const [patientRightsSig, setPatientRightsSig] = useState("");
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [expandedSection, setExpandedSection] = useState('overview');
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const completionPercentage = patientRightsSig.trim() && acknowledged ? 100 : 
                             patientRightsSig.trim() || acknowledged ? 50 : 0;

  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'phiRelease' }));
    }
  }, [dispatch, clientID]);

  // Update local state when Redux form data changes
  useEffect(() => {
    if (phiReleaseForm && Object.keys(phiReleaseForm).length > 0) {
      setPatientRightsSig(phiReleaseForm.signature || "");
      setAcknowledged(phiReleaseForm.acknowledged || false);
    }
  }, [phiReleaseForm]);

  // Handle signature changes
  const handleSigChange = useCallback((e) => {
    const signature = e.target.value;
    setPatientRightsSig(signature);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'phiRelease',
      formData: {
        signature,
        acknowledged: signature.trim() !== "",
        completionPercentage: signature.trim() ? 100 : 50
      }
    }));
  }, [dispatch]);

  // Handle accordion changes
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  // Handle acknowledgment
  const handleAcknowledgment = useCallback(() => {
    const isAcknowledged = !acknowledged;
    setAcknowledged(isAcknowledged);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'phiRelease',
      formData: {
        signature: patientRightsSig,
        acknowledged: isAcknowledged,
        completionPercentage: patientRightsSig.trim() && isAcknowledged ? 100 : 50
      }
    }));
  }, [dispatch, acknowledged, patientRightsSig]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }

    if (!patientRightsSig.trim()) {
      errors.push("Electronic signature is required to complete the acknowledgment.");
    }

    return errors;
  }, [clientID, patientRightsSig]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const formData = {
      signature: patientRightsSig,
      acknowledged: true,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        privacyNoticeVersion: '2024-v1'
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'phiRelease', 
        formData 
      })).unwrap();
      
      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save PHI acknowledgment']);
    }
  }, [dispatch, clientID, validateForm, patientRightsSig]);

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
        <Typography sx={{ ml: 2 }}>Loading PHI release data...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SecurityIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Protected Health Information (PHI) Release
              </Typography>
              <Typography variant="body1" color="text.secondary">
                HIPAA Privacy Notice and Acknowledgment
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

      {/* Important Notice Banner */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          IMPORTANT PRIVACY NOTICE
        </Typography>
        <Typography variant="body2">
          This notice describes how medical information about you may be used and disclosed 
          and how you can get access to this information. Please review it carefully.
        </Typography>
      </Alert>

      {/* Privacy Notice Content - Organized in Accordions */}
      <Box sx={{ mb: 3 }}>
        
        {/* Overview Section */}
        <Accordion expanded={expandedSection === 'overview'} onChange={handleAccordionChange('overview')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PolicyIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Overview & General Information
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              <strong>Notice of Privacy and Personal Health Information Practices Under HIPAA</strong><br/>
              (Health Insurance Portability and Accountability Act. PL104-191 (1996)) Effective July 1, 2012
            </Typography>
            
            <Typography variant="body2" paragraph>
              This company believes in protecting the privacy of your health information. We may use or disclose your Protected Health Information (PHI) only for very specific reasons. PHI consists of any individually identifiable health information related to past, present, and/or future physical or mental health or condition of an individual; the provision of health/mental health services; or the payment for the provision of health care to an individual.
            </Typography>

            <Typography variant="body2" paragraph>
              When disclosing or using PHI, we will use the least amount of information necessary ("minimum necessary"). If we need to use or release information in a way that is not generally described in this notice, we will contact you for your permission before the proposed use or disclosure.
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Uses and Disclosures */}
        <Accordion expanded={expandedSection === 'uses'} onChange={handleAccordionChange('uses')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LegalIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                How We Use and Disclose Your Information
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Treatment
                </Typography>
                <Typography variant="body2">
                  We may use and disclose PHI about you to assist in providing treatment or services, including coordination of health/mental health care, consultation between providers, and referrals.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Payment
                </Typography>
                <Typography variant="body2">
                  We may use and disclose your PHI so that your treatment and services may be billed and payment collected from an insurance company or a third party.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Health Care Operations
                </Typography>
                <Typography variant="body2">
                  We may use or disclose PHI to carry out health/mental health care operations including quality assurance activities, case management, and quality improvement evaluation.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Other Permitted Uses
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>We may also disclose your PHI for:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Health oversight activities and compliance</li>
                    <li>Judicial and administrative proceedings</li>
                    <li>Appointment reminders</li>
                    <li>Treatment alternatives</li>
                    <li>Research purposes (with proper authorization)</li>
                    <li>Emergency situations involving family members</li>
                    <li>Public safety and law enforcement</li>
                    <li>Workers' compensation programs</li>
                  </ul>
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Your Rights */}
        <Accordion expanded={expandedSection === 'rights'} onChange={handleAccordionChange('rights')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <VerifiedIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Your Rights Regarding Your Health Information
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Right to Request Restrictions
                </Typography>
                <Typography variant="body2">
                  You have a right to request limits on certain uses and disclosures of PHI for treatment, payment or health/mental health care operations.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Right to Confidential Communications
                </Typography>
                <Typography variant="body2">
                  You have a right to request that you receive confidential information relating to your PHI at an alternative location or by an alternative means.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Right to Inspect and Copy
                </Typography>
                <Typography variant="body2">
                  You have a right to review and ask for a copy of your PHI that is part of our designated record set.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Right to Amend Information
                </Typography>
                <Typography variant="body2">
                  You have the right to request that we change the information that we have in our records if you believe that the information is incorrect or incomplete.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Right to Accounting of Disclosures
                </Typography>
                <Typography variant="body2">
                  You have a right to receive a listing of PHI disclosures that have been made in the six years prior to your request.
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Contact Information */}
        <Accordion expanded={expandedSection === 'contact'} onChange={handleAccordionChange('contact')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Privacy Officer & Complaints
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Privacy Officer Contact Information
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Gisela Vasquez</strong><br/>
                Privacy Officer<br/>
                17420 Avalon Blvd. Suite 100<br/>
                Carson, CA 90746
              </Typography>
            </Box>

            <Typography variant="body2" paragraph>
              You may file a complaint with us if you feel that your privacy rights have been violated. You may also complain to the US Secretary of Health and Human Services Office of Civil Rights at 1-800-368-1019 or visit http://www.hhs.gov/ocr/privacy/hipaa/complaints/index.html.
            </Typography>

            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                You will not receive a negative reaction from us because you filed a complaint.
              </Typography>
            </Alert>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Acknowledgment Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Acknowledgment
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          I certify that I have received a copy of this privacy notice.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Electronic Signature"
            variant="outlined"
            value={patientRightsSig}
            onChange={handleSigChange}
            placeholder="Enter your full legal name"
            required
            sx={{ mb: 2 }}
            helperText="Type your name to provide your electronic signature for this acknowledgment"
          />

          {patientRightsSig && (
            <Box sx={{ 
              p: 2, 
              bgcolor: 'success.50', 
              border: '1px solid',
              borderColor: 'success.200',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              mb: 3
            }}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="body2" color="success.main">
                Signature captured: <strong>{patientRightsSig}</strong>
              </Typography>
            </Box>
          )}

          {/* Submit Button */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={saving || !clientID}
              sx={{ 
                px: 4, 
                py: 1.5,
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              {saving ? 'Saving...' : 'Save PHI Acknowledgment'}
            </Button>

            {!patientRightsSig && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="warning.main">
                  Please provide your electronic signature before saving
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

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
          ✅ PHI acknowledgment saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReleasePHI;