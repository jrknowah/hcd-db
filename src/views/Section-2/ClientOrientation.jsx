import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon
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

// Import your actual ppcList data
import { ppcList } from "../../data/arrayList";

const ClientOrientation = ({ clientID: propClientID }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const orientationForm = useSelector(selectFormByType('orientation'));
  const formLoading = useSelector(selectFormLoading('orientation'));
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const formErrors = useSelector((state) => state.authSig.formErrors.orientation);
  
  // Local state for form data
  const [checkboxes, setCheckboxes] = useState({});
  const [patientRightsSig, setPatientRightsSig] = useState("");
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage - FIXED
  const totalItems = ppcList.length + 2 + 1; // +2 for additional checkboxes, +1 for signature
  const completedItems = Object.values(checkboxes).filter(Boolean).length + (patientRightsSig.trim() ? 1 : 0);
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'orientation' }));
    }
  }, [dispatch, clientID]);

  // Update local state when Redux form data changes
  useEffect(() => {
    if (orientationForm && Object.keys(orientationForm).length > 0) {
      setCheckboxes(orientationForm.checkboxes || {});
      setPatientRightsSig(orientationForm.signature || "");
    }
  }, [orientationForm]);

  // Handle checkbox changes - FIXED
  const handleCheckboxChange = useCallback((e) => {
    const { name, checked } = e.target;
    const newCheckboxes = { ...checkboxes, [name]: checked };
    
    setCheckboxes(newCheckboxes);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'orientation',
      formData: {
        checkboxes: newCheckboxes,
        signature: patientRightsSig,
        completionPercentage: Math.round(((Object.values(newCheckboxes).filter(Boolean).length + (patientRightsSig.trim() ? 1 : 0)) / totalItems) * 100)
      }
    }));
  }, [dispatch, checkboxes, patientRightsSig, totalItems]);

  // Handle signature changes - FIXED
  const handleSigChange = useCallback((e) => {
    const signature = e.target.value;
    setPatientRightsSig(signature);
    setLocalErrors([]);
    
    // Update Redux store optimistically
    dispatch(updateFormLocal({
      formType: 'orientation',
      formData: {
        checkboxes,
        signature,
        completionPercentage: Math.round(((Object.values(checkboxes).filter(Boolean).length + (signature.trim() ? 1 : 0)) / totalItems) * 100)
      }
    }));
  }, [dispatch, checkboxes, totalItems]);

  // Validate form
  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }

    if (!patientRightsSig.trim()) {
      errors.push("Electronic signature is required to complete the orientation.");
    }

    const requiredCheckboxes = [
      ...ppcList.map(item => item.ppcListTitle),
      "clientAuthHI",
      "clientAuthRel"
    ];

    const missingCheckboxes = requiredCheckboxes.filter(checkbox => !checkboxes[checkbox]);
    
    if (missingCheckboxes.length > 0) {
      errors.push(`Please acknowledge all required items. Missing: ${missingCheckboxes.length} item(s).`);
    }

    return errors;
  }, [clientID, patientRightsSig, checkboxes]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const formData = {
      checkboxes,
      signature: patientRightsSig,
      completionPercentage,
      status: 'completed',
      formData: {
        submittedAt: new Date().toISOString(),
        ipAddress: window.location.hostname // Basic tracking
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'orientation', 
        formData 
      })).unwrap();
      
      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save orientation data']);
    }
  }, [dispatch, clientID, validateForm, checkboxes, patientRightsSig, completionPercentage]);

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
        <Typography sx={{ ml: 2 }}>Loading orientation data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header Section */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssignmentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Patient Orientation Acknowledgment
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please review and acknowledge that you have received and understand the following documents
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

          {/* Progress Indicator - FIXED: Added aria attributes */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Completion Progress
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
              aria-valuenow={completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
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

      {/* Acknowledgment Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          textAlign: 'center', 
          fontWeight: 600,
          color: 'primary.main',
          mb: 3
        }}>
          I have reviewed and acknowledge receipt of the following:
        </Typography>

        <FormGroup>
          <Grid container spacing={1}>
            {/* Dynamic checkboxes from ppcList */}
            {ppcList.map((item, index) => (
              <Grid item xs={12} key={item.ppcListTitle}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name={item.ppcListTitle}
                      checked={checkboxes[item.ppcListTitle] || false}
                      onChange={handleCheckboxChange}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.ppcListTitle}
                    </Typography>
                  }
                  sx={{ 
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.95rem'
                    }
                  }}
                />
              </Grid>
            ))}

            {/* Additional static checkboxes */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Additional Authorizations:
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="clientAuthHI"
                    checked={checkboxes.clientAuthHI || false}
                    onChange={handleCheckboxChange}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Authorization for Use and/or Disclosure of Health Information
                  </Typography>
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="clientAuthRel"
                    checked={checkboxes.clientAuthRel || false}
                    onChange={handleCheckboxChange}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Authorization for Release and Publication of Photograph, Art Work and/or Personal Information
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </FormGroup>
      </Paper>

      {/* Signature Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Electronic Signature
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          By typing your name below, you acknowledge that you have reviewed and understand all the documents listed above.
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
          helperText="This serves as your electronic signature for this acknowledgment"
        />

        {patientRightsSig && (
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
          {saving ? 'Saving...' : 'Save Acknowledgment'}
        </Button>

        {completionPercentage < 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="warning.main">
              Please complete all items before saving
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
          Orientation acknowledgment saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientOrientation;