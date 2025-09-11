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
  ListItemText
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Gavel as RightsIcon
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

// Import your actual crList data
import { crList } from "../../data/arrayList";

const ClientRights = ({ clientID: propClientID }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const clientRightsForm = useSelector(selectFormByType('clientRights'));
  const formLoading = useSelector(selectFormLoading('clientRights'));
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const formErrors = useSelector((state) => state.authSig.formErrors.clientRights);
  
  // Local state
  const [patientRightsSig, setPatientRightsSig] = useState("");
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const completionPercentage = patientRightsSig.trim() && acknowledged ? 100 : 
                             patientRightsSig.trim() || acknowledged ? 50 : 0;

  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'clientRights' }));
    }
  }, [dispatch, clientID]);

  // Update local state when Redux form data changes
  useEffect(() => {
    if (clientRightsForm && Object.keys(clientRightsForm).length > 0) {
      setPatientRightsSig(clientRightsForm.signature || "");
      setAcknowledged(clientRightsForm.acknowledged || false);
    }
  }, [clientRightsForm]);

  // Handle signature changes
  const handleSigChange = useCallback((e) => {
    const signature = e.target.value;
    setPatientRightsSig(signature);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'clientRights',
      formData: {
        signature,
        acknowledged: signature.trim() !== "",
        completionPercentage: signature.trim() ? 100 : 0
      }
    }));
  }, [dispatch]);

  // Handle acknowledgment
  const handleAcknowledgment = useCallback(() => {
    const isAcknowledged = !acknowledged;
    setAcknowledged(isAcknowledged);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'clientRights',
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

    if (!acknowledged) {
      errors.push("You must acknowledge that you have read and understood your rights.");
    }

    return errors;
  }, [clientID, patientRightsSig, acknowledged]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
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
        rightsReviewed: crList.length
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'clientRights', 
        formData 
      })).unwrap();
      
      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save client rights acknowledgment']);
    }
  }, [dispatch, clientID, validateForm, patientRightsSig, acknowledged]);

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
        <Typography sx={{ ml: 2 }}>Loading client rights data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <VerifiedIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Client Rights and Responsibilities
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please review your rights and responsibilities as a client of our facility
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

      {/* Client Rights Content */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <RightsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Your Rights as a Client
          </Typography>
        </Box>

        <List sx={{ mb: 3 }}>
          {crList.map((right, index) => (
            <ListItem 
              key={index} 
              sx={{ 
                py: 1,
                px: 0,
                alignItems: 'flex-start'
              }}
            >
              <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {index + 1}
                </Box>
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      lineHeight: 1.6,
                      fontWeight: right.startsWith('The Right:') || right.startsWith('Other Rights:') ? 600 : 400,
                      color: right.startsWith('The Right:') || right.startsWith('Other Rights:') ? 'primary.main' : 'text.primary',
                      fontSize: right.startsWith('All clients have rights') ? '1rem' : '0.95rem'
                    }}
                  >
                    {right}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        {/* Acknowledgment Section */}
        <Box sx={{ 
          p: 3, 
          bgcolor: 'primary.50', 
          borderRadius: 2, 
          border: '2px solid',
          borderColor: 'primary.200'
        }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            Acknowledgment of Rights
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            By signing below, you acknowledge that you have read, understood, and received a copy of your client rights and responsibilities.
          </Typography>
          
          <Button
            variant={acknowledged ? "contained" : "outlined"}
            color="primary"
            onClick={handleAcknowledgment}
            startIcon={acknowledged ? <CheckCircleIcon /> : <VerifiedIcon />}
            sx={{ mb: 2 }}
          >
            {acknowledged ? "Rights Acknowledged ✓" : "Click to Acknowledge Rights"}
          </Button>
        </Box>
      </Paper>

      {/* Signature Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Electronic Signature
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please type your full name below to provide your electronic signature for this acknowledgment.
        </Typography>
        
        <TextField
          fullWidth
          label="Type your full name as electronic signature"
          variant="outlined"
          value={patientRightsSig}
          onChange={handleSigChange}
          placeholder="Enter your full legal name"
          required
          sx={{ mb: 2 }}
          helperText="This serves as your electronic signature for this rights acknowledgment"
          disabled={!acknowledged}
        />

        {patientRightsSig && acknowledged && (
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
              Signature captured: <strong>{patientRightsSig}</strong>
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
          {saving ? 'Saving...' : 'Save Rights Acknowledgment'}
        </Button>

        {completionPercentage < 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="warning.main">
              Please acknowledge your rights and provide signature before saving
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
          ✅ Client rights acknowledgment saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientRights;