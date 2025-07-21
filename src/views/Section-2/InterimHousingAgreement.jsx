import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Grid,
  Divider
} from '@mui/material';
import {
  Gavel as TerminationIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  AutoMode as AutoSaveIcon,
  CloudDone as CloudDoneIcon,
  Policy as PolicyIcon,
  Assignment as ProcedureIcon,
  Security as SecurityIcon,
  NightShelter as ShelterIcon
} from '@mui/icons-material';

// Import Redux actions and selectors
import {
  fetchFormData,
  saveFormData,
  autoSaveFormData,
  updateFormLocal,
  clearErrors,
  clearSuccessFlags,
  setUnsavedChanges,
  selectFormByType,
  selectFormLoading,
  selectSaving,
  selectAutoSaving,
  selectSaveSuccess,
  selectUnsavedChanges
} from '../../store/slices/authSigSlice';

const InterimHousingAgreement = ({ clientID: propClientID, formConfig }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const terminationForm = useSelector(selectFormByType('termination'));
  const formLoading = useSelector(selectFormLoading('termination'));
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  const formErrors = useSelector((state) => state.authSig.formErrors.termination);
  
  // Local state
  const [tppSign, setPatientSignature] = useState("");
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const policyRead = hasReadPolicy ? 50 : 0;
    const signatureComplete = tppSign.trim() ? 50 : 0;
    return Math.round(policyRead + signatureComplete);
  }, [hasReadPolicy, tppSign]);
  
  // Form validation
  const isValid = useMemo(() => {
    return clientID && tppSign.trim() && hasReadPolicy;
  }, [clientID, tppSign, hasReadPolicy]);
  
  // Auto-save form data
  const formData = useMemo(() => ({
    tppSign,
    hasReadPolicy,
    completionPercentage,
    lastModified: new Date().toISOString()
  }), [tppSign, hasReadPolicy, completionPercentage]);
  
  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'termination' }));
    }
  }, [dispatch, clientID]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (terminationForm && Object.keys(terminationForm).length > 0) {
      setPatientSignature(terminationForm.tppSign || "");
      setHasReadPolicy(terminationForm.hasReadPolicy || false);
    }
  }, [terminationForm]);
  
  // Update unsaved changes in Redux
  useEffect(() => {
    dispatch(setUnsavedChanges(completionPercentage > 0 && !saveSuccess));
  }, [dispatch, completionPercentage, saveSuccess]);
  
  // Handle success notifications
  useEffect(() => {
    if (saveSuccess) {
      setShowSuccessSnackbar(true);
    }
  }, [saveSuccess]);

  // Handle signature changes
  const handleSigChange = useCallback((e) => {
    const signature = e.target.value;
    setPatientSignature(signature);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'termination',
      formData: {
        tppSign: signature,
        hasReadPolicy,
        completionPercentage: hasReadPolicy && signature.trim() ? 100 : 
                            (hasReadPolicy ? 50 : 0) + (signature.trim() ? 50 : 0)
      }
    }));
  }, [dispatch, hasReadPolicy]);

  // Handle policy read acknowledgment
  const handlePolicyRead = useCallback(() => {
    const newReadStatus = !hasReadPolicy;
    setHasReadPolicy(newReadStatus);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'termination',
      formData: {
        tppSign,
        hasReadPolicy: newReadStatus,
        completionPercentage: newReadStatus && tppSign.trim() ? 100 : 
                            (newReadStatus ? 50 : 0) + (tppSign.trim() ? 50 : 0)
      }
    }));
  }, [dispatch, hasReadPolicy, tppSign]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    
    const validationErrors = [];
    
    if (!clientID) {
      validationErrors.push("No client selected. Please select a client first.");
    }

    if (!tppSign.trim()) {
      validationErrors.push("Electronic signature is required to complete the acknowledgment.");
    }
    
    if (!hasReadPolicy) {
      validationErrors.push("Please acknowledge that you have read and understand the termination policy.");
    }
    
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const submitData = {
      tppSign,
      hasReadPolicy: true,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        policyVersion: formConfig?.version || '2024-v1',
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'termination', 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save termination policy acknowledgment']);
    }
  }, [dispatch, clientID, tppSign, hasReadPolicy, formConfig]);

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, minHeight: 400 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading termination policy data...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we retrieve the policy information
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header Section */}
      <Card elevation={3} sx={{ mb: 4, overflow: 'hidden' }}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            color: 'white',
            p: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TerminationIcon sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                  Termination Policy & Procedure
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                  Interim Housing Program Guidelines
                </Typography>
              </Box>
            </Box>
            
            {/* Auto-save indicator */}
            {autoSaving && (
              <Zoom in={autoSaving}>
                <Chip 
                  label="Auto-saving..." 
                  icon={<AutoSaveIcon />}
                  color="default"
                  variant="filled"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
              </Zoom>
            )}
          </Box>

          {/* Client Info */}
          {selectedClient && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonIcon sx={{ mr: 1, opacity: 0.9 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Client: {selectedClient.firstName} {selectedClient.lastName}
                {selectedClient.clientID && ` (ID: ${selectedClient.clientID})`}
              </Typography>
            </Box>
          )}
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* Progress Indicator */}
          <Box sx={{ p: 4, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Acknowledgment Progress
              </Typography>
              <Chip 
                label={`${completionPercentage}% Complete`}
                color={completionPercentage === 100 ? 'success' : 'primary'}
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={completionPercentage} 
              sx={{ 
                height: 12, 
                borderRadius: 6,
                bgcolor: alpha(theme.palette.grey[300], 0.3),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: completionPercentage === 100 
                    ? `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
                    : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                }
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Policy review: {hasReadPolicy ? 'Complete' : 'Pending'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Signature: {tppSign ? 'Provided' : 'Required'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {(localErrors.length > 0 || formErrors) && (
        <Fade in>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={handleClearErrors}
            action={
              <Button color="inherit" size="small" onClick={handleClearErrors}>
                Dismiss
              </Button>
            }
          >
            {localErrors.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Please correct the following issues:
                </Typography>
                {localErrors.map((error, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                    • {error}
                  </Typography>
                ))}
              </Box>
            ) : (
              formErrors
            )}
          </Alert>
        </Fade>
      )}

      {/* Important Notice Banner */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          IMPORTANT POLICY NOTICE
        </Typography>
        <Typography variant="body2">
          Please carefully review the termination policy and procedures below. 
          Understanding these policies helps ensure a successful program experience.
        </Typography>
      </Alert>

      {/* Policy Content */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600, 
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center'
          }}>
            <PolicyIcon sx={{ mr: 1 }} />
            Program Commitment & Support
          </Typography>
          <Typography variant="body1" paragraph>
            Holliday's Helping Hands makes every effort to assist participants to remain in the 
            Interim Housing Program (IHP). However, the reasons below may result in immediate termination:
          </Typography>
        </Box>

        {/* Immediate Termination Reasons */}
        <Card elevation={1} sx={{ mb: 3, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ 
              fontWeight: 600, 
              color: 'error.main',
              display: 'flex',
              alignItems: 'center',
              mb: 2
            }}>
              <SecurityIcon sx={{ mr: 1 }} />
              Immediate Termination Reasons
            </Typography>
            <List dense>
              {[
                'Physical aggression',
                'Possession of weapons',
                'Verbally/physically threatening behaviors',
                'Engaging in illegal activity on site',
                'Sexual misconduct',
                'Destruction and/or defacing property'
              ].map((reason, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={reason}
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        {/* Consultation Process */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ 
            fontWeight: 600, 
            color: 'info.main',
            display: 'flex',
            alignItems: 'center'
          }}>
            <ProcedureIcon sx={{ mr: 1 }} />
            Consultation Process
          </Typography>
          <Typography variant="body1" paragraph>
            All other reasons for termination will be in consultation with the participant's care team.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Termination Notice Process */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ 
            fontWeight: 600, 
            color: 'warning.main',
            display: 'flex',
            alignItems: 'center'
          }}>
            <ShelterIcon sx={{ mr: 1 }} />
            Termination Notice Procedure
          </Typography>
          <Typography variant="body1" paragraph>
            Program participants who are terminated from the IHP will be provided a written notice that includes:
          </Typography>
          <List dense>
            {[
              'Reason(s) for termination',
              'Effective date of termination',
              'Grievance procedure'
            ].map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={item}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Policy Acknowledgment */}
        <Card elevation={1} sx={{ mt: 3, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <CardContent>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
              I have read and understand the Termination Policy & Procedure.
            </Typography>
            
            <Button
              variant={hasReadPolicy ? "contained" : "outlined"}
              color={hasReadPolicy ? "success" : "primary"}
              onClick={handlePolicyRead}
              startIcon={hasReadPolicy ? <CheckCircleIcon /> : <PolicyIcon />}
              sx={{ mb: 2 }}
            >
              {hasReadPolicy ? 'Policy Acknowledged' : 'Acknowledge Policy'}
            </Button>

            {hasReadPolicy && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  ✅ You have acknowledged reading and understanding the termination policy.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Paper>

      {/* Signature Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Electronic Signature
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          By providing your electronic signature below, you acknowledge that you have read, 
          understood, and agree to comply with the Termination Policy & Procedure.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Electronic Signature"
            variant="outlined"
            value={tppSign}
            onChange={handleSigChange}
            placeholder="Type your full legal name"
            required
            sx={{ mb: 2 }}
            helperText="Type your name to provide your electronic signature for this acknowledgment"
            disabled={!hasReadPolicy}
          />

          {tppSign && (
            <Zoom in={!!tppSign}>
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />}
                sx={{ mb: 3 }}
              >
                <Typography variant="body2">
                  Signature captured: <strong>{tppSign}</strong>
                </Typography>
              </Alert>
            </Zoom>
          )}

          {/* Submit Button */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={saving || !clientID || !isValid}
              sx={{ 
                px: 4, 
                py: 1.5,
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              {saving ? 'Saving...' : 'Save Acknowledgment'}
            </Button>

            {!isValid && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="warning.main">
                  Please acknowledge the policy and provide your signature before saving
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSuccessSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
          icon={<CloudDoneIcon />}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ✅ Termination policy acknowledgment saved successfully!
          </Typography>
        </Alert>
      </Snackbar>

      {/* Unsaved Changes Warning */}
      {unsavedChanges && (
        <Paper 
          elevation={3}
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            p: 2,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            zIndex: 1000
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              You have unsaved changes
            </Typography>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default InterimHousingAgreement;