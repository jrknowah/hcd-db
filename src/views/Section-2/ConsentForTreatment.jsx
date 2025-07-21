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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  LocalHospital as MedicalIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Security as ConfidentialityIcon,
  VolunteerActivism as VoluntaryIcon
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
} from '../../store/slices/authSigSlice';

const ConsentForTreatment = ({ clientID: propClientID }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const consentForm = useSelector(selectFormByType('consentTreatment'));
  const formLoading = useSelector(selectFormLoading('consentTreatment'));
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const formErrors = useSelector((state) => state.authSig.formErrors.consentTreatment);
  
  // Local state
  const [consentTreatSig, setConsentTreatSig] = useState("");
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const completionPercentage = consentTreatSig.trim() && acknowledged ? 100 : 
                             consentTreatSig.trim() || acknowledged ? 50 : 0;

  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'consentTreatment' }));
    }
  }, [dispatch, clientID]);

  // Update local state when Redux form data changes
  useEffect(() => {
    if (consentForm && Object.keys(consentForm).length > 0) {
      setConsentTreatSig(consentForm.signature || "");
      setAcknowledged(consentForm.acknowledged || false);
    }
  }, [consentForm]);

  // Handle signature changes
  const handleSigChange = useCallback((e) => {
    const signature = e.target.value;
    setConsentTreatSig(signature);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'consentTreatment',
      formData: {
        signature,
        acknowledged: signature.trim() !== "" ? acknowledged : false,
        completionPercentage: signature.trim() && acknowledged ? 100 : 50
      }
    }));
  }, [dispatch, acknowledged]);

  // Handle acknowledgment
  const handleAcknowledgment = useCallback(() => {
    const isAcknowledged = !acknowledged;
    setAcknowledged(isAcknowledged);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'consentTreatment',
      formData: {
        signature: consentTreatSig,
        acknowledged: isAcknowledged,
        completionPercentage: consentTreatSig.trim() && isAcknowledged ? 100 : 50
      }
    }));
  }, [dispatch, acknowledged, consentTreatSig]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }

    if (!consentTreatSig.trim()) {
      errors.push("Electronic signature is required to complete the consent.");
    }

    if (!acknowledged) {
      errors.push("You must acknowledge that you have read and understood the consent terms.");
    }

    return errors;
  }, [clientID, consentTreatSig, acknowledged]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const formData = {
      signature: consentTreatSig,
      acknowledged: true,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        consentedAt: new Date().toISOString(),
        consentType: 'treatment_and_services'
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'consentTreatment', 
        formData 
      })).unwrap();
      
      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save consent for treatment']);
    }
  }, [dispatch, clientID, validateForm, consentTreatSig, acknowledged]);

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
        <Typography sx={{ ml: 2 }}>Loading consent form data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MedicalIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Consent for Treatment & Services
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please review and provide consent for medical and mental health services
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
                Consent Progress
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

      {/* Consent Content */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 600, mb: 3, color: 'primary.main' }}>
          Consent for Treatment & Services
        </Typography>

        <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
          I, the undersigned client, consent to and authorize medical/mental health services from Holliday's Helping Hands.
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
          As a patient of Holliday's Helping Hands, I am eligible for a wide range of services which may include but are not limited to case management, advocacy, counseling, medication management, psychiatric services, vocational training/services, laboratory tests, money management and other appropriate services.
        </Typography>

        {/* Voluntary Services Section */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'info.50', 
          borderRadius: 2, 
          border: '1px solid',
          borderColor: 'info.200',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <VoluntaryIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
              All Services Received are Voluntary
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            I, the undersigned, have the right to:
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'info.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  1
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Be informed of and participate in the selection of services which are available"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'info.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  2
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Receive any of the available services without being required to receive other services, unless program rules dictate otherwise"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'info.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  3
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Request a change of service providers or;"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'info.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  4
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="Withdraw this consent at any time"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        {/* Confidentiality Section */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'warning.50', 
          borderRadius: 2, 
          border: '1px solid',
          borderColor: 'warning.200',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ConfidentialityIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
              CONFIDENTIALITY
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            I understand my records of treatment and information discussed are confidential except in cases where program staff are mandated by law to report.
          </Typography>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            These cases include:
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'warning.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  1
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="When I am a danger to myself because I am suicidal or unable to take care of myself."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'warning.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  2
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="When there is any serious threat to harm another person's life."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: 'warning.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  3
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary="When there is suspected child, elder or dependent abuse or neglect or domestic violence."
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.7 }}>
          Holliday's Helping Hands staff will act to ensure the safety of all concerned and may notify the appropriate persons/legal authorities. More detailed information about the use of my Personal Health Information is included in the Serenity Recuperative Care Notice of Privacy Practices which I will also read and sign.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Acknowledgment Section */}
        <Box sx={{ 
          p: 3, 
          bgcolor: 'success.50', 
          borderRadius: 2, 
          border: '2px solid',
          borderColor: 'success.200'
        }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
            Consent Acknowledgment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            By clicking below, you acknowledge that you have read this consent and agree to its provisions.
          </Typography>
          
          <Button
            variant={acknowledged ? "contained" : "outlined"}
            color="success"
            onClick={handleAcknowledgment}
            startIcon={acknowledged ? <CheckCircleIcon /> : <MedicalIcon />}
            sx={{ mb: 2 }}
          >
            {acknowledged ? "Consent Acknowledged ✓" : "Click to Acknowledge Consent"}
          </Button>
        </Box>
      </Paper>

      {/* Signature Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Electronic Signature
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please type your full name below to provide your electronic signature for this consent.
        </Typography>
        
        <TextField
          fullWidth
          label="Type your full name as electronic signature"
          variant="outlined"
          value={consentTreatSig}
          onChange={handleSigChange}
          placeholder="Enter your full legal name"
          required
          sx={{ mb: 2 }}
          helperText="This serves as your electronic signature for this treatment consent"
          disabled={!acknowledged}
        />

        {consentTreatSig && acknowledged && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'success.50', 
            border: '1px solid',
            borderColor: 'success.200',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
            <Typography variant="body2" color="success.main">
              Signature captured: <strong>{consentTreatSig}</strong>
            </Typography>
          </Box>
        )}
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
          {saving ? 'Saving...' : 'Save Treatment Consent'}
        </Button>

        {completionPercentage < 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="warning.main">
              Please acknowledge consent and provide signature before saving
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
          ✅ Treatment consent saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConsentForTreatment;