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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Grid,
  Divider
} from '@mui/material';
import {
  LocalHospital as HealthIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  AutoMode as AutoSaveIcon,
  CloudDone as CloudDoneIcon,
  Assignment as DirectiveIcon,
  Info as InfoIcon,
  Description as DocumentIcon,
  Group as ResponsibleIcon,
  RecordVoiceOver as WitnessIcon
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
} from '../../backend/store/slices/authSigSlice';

const AdvCareAck = ({ clientID: propClientID, formConfig }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const advCareForm = useSelector(selectFormByType('advDirective'));
  const formLoading = useSelector(selectFormLoading('advDirective'));
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  const formErrors = useSelector((state) => state.authSig.formErrors.advDirective);
  
  // Local state
  const [formData, setFormData] = useState({
    factSheetGiven: "",
    factSheetNotGivenReason: "",
    hasDirective: "",
    clientSignature: "",
    responsibleAdultSignature: "",
    witnessSignature: "",
    relationshipToClient: "",
  });
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = ['factSheetGiven', 'hasDirective', 'clientSignature'];
    const optionalFields = ['responsibleAdultSignature', 'witnessSignature', 'relationshipToClient'];
    const conditionalFields = formData.factSheetGiven === 'No' ? ['factSheetNotGivenReason'] : [];
    
    const allRequiredFields = [...requiredFields, ...conditionalFields];
    const completedRequired = allRequiredFields.filter(field => 
      formData[field] && formData[field].trim()
    ).length;
    
    const completedOptional = optionalFields.filter(field => 
      formData[field] && formData[field].trim()
    ).length;
    
    const requiredPercentage = (completedRequired / allRequiredFields.length) * 80;
    const optionalPercentage = (completedOptional / optionalFields.length) * 20;
    
    return Math.round(requiredPercentage + optionalPercentage);
  }, [formData]);
  
  // Form validation
  const isValid = useMemo(() => {
    return clientID && 
           formData.factSheetGiven && 
           formData.hasDirective &&
           formData.clientSignature.trim() &&
           (formData.factSheetGiven !== 'No' || formData.factSheetNotGivenReason.trim());
  }, [clientID, formData]);
  
  // Auto-save form data
  const autoSaveData = useMemo(() => ({
    ...formData,
    completionPercentage,
    lastModified: new Date().toISOString()
  }), [formData, completionPercentage]);
  
  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'advDirective' }));
    }
  }, [dispatch, clientID]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (advCareForm && Object.keys(advCareForm).length > 0) {
      setFormData({
        factSheetGiven: advCareForm.factSheetGiven || "",
        factSheetNotGivenReason: advCareForm.factSheetNotGivenReason || "",
        hasDirective: advCareForm.hasDirective || "",
        clientSignature: advCareForm.clientSignature || "",
        responsibleAdultSignature: advCareForm.responsibleAdultSignature || "",
        witnessSignature: advCareForm.witnessSignature || "",
        relationshipToClient: advCareForm.relationshipToClient || "",
      });
    }
  }, [advCareForm]);
  
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

  // Handle form field changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    
    setFormData(newFormData);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'advDirective',
      formData: newFormData
    }));
  }, [dispatch, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationErrors = [];
    
    if (!clientID) {
      validationErrors.push("No client selected. Please select a client first.");
    }

    if (!formData.factSheetGiven) {
      validationErrors.push("Please indicate whether the fact sheet was given to the client.");
    }
    
    if (formData.factSheetGiven === 'No' && !formData.factSheetNotGivenReason.trim()) {
      validationErrors.push("Please explain why the fact sheet was not given.");
    }

    if (!formData.hasDirective) {
      validationErrors.push("Please indicate whether the client has an advance directive.");
    }

    if (!formData.clientSignature.trim()) {
      validationErrors.push("Client signature is required.");
    }
    
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const submitData = {
      ...formData,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        directiveVersion: formConfig?.version || '2024-v1',
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'advDirective', 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save advance care acknowledgment']);
    }
  }, [dispatch, clientID, formData, formConfig]);

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
            Loading advance care data...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we retrieve the directive information
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
            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            color: 'white',
            p: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HealthIcon sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                  Advance Healthcare Directive Acknowledgment
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                  California Probate Code 4600 Compliance
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
                Form Completion Progress
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
                Required fields completed
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ready for submission: {isValid ? 'Yes' : 'No'}
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

      {/* Background Information */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Background Information
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          In accordance with California Probate Code 4600 et seq. and Federal requirements under Title 42,
          clients 18 years of age and older shall receive information about Advance Health Care Directives
          and be informed of their right to make decisions about their medical treatment.
        </Typography>
      </Paper>

      {/* Staff Completion Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            To Be Completed by Staff
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                <TableCell sx={{ fontWeight: 600 }}>Question</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 200 }}>Response</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    The client was given a copy of the Advance Health Care
                    Directive Fact Sheet at the first face-to-face contact or clinic visit.
                  </Typography>
                </TableCell>
                <TableCell>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>Select</InputLabel>
                    <Select
                      name="factSheetGiven"
                      value={formData.factSheetGiven}
                      onChange={handleChange}
                      label="Select"
                    >
                      <MenuItem value="">Select</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
              
              {formData.factSheetGiven === 'No' && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <TextField
                      fullWidth
                      label="If 'No', please explain:"
                      variant="outlined"
                      name="factSheetNotGivenReason"
                      value={formData.factSheetNotGivenReason}
                      onChange={handleChange}
                      multiline
                      rows={2}
                      placeholder="Please provide an explanation..."
                    />
                  </TableCell>
                </TableRow>
              )}
              
              <TableRow>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Does the client have an Advance Health Care Directive currently in place?
                  </Typography>
                </TableCell>
                <TableCell>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>Select</InputLabel>
                    <Select
                      name="hasDirective"
                      value={formData.hasDirective}
                      onChange={handleChange}
                      label="Select"
                    >
                      <MenuItem value="">Select</MenuItem>
                      <MenuItem value="Yes">Yes</MenuItem>
                      <MenuItem value="No">No</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Client/Responsible Adult Completion Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            To Be Completed by the Client/Responsible Adult*
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            I have been asked about having an Advance Health Care Directive, and I have been given 
            or offered an Advance Health Care Directive Fact Sheet.
          </Typography>
        </Alert>

        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                <TableCell sx={{ fontWeight: 600 }}>Client Signature</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Responsible Adult Signature</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Witness/Interpreter Signature</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Relationship to Client</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <TextField
                    fullWidth
                    placeholder="Client Signature"
                    name="clientSignature"
                    value={formData.clientSignature}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                    required
                    InputProps={{
                      startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    placeholder="Responsible Adult Signature"
                    name="responsibleAdultSignature"
                    value={formData.responsibleAdultSignature}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      startAdornment: <ResponsibleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    placeholder="Witness/Interpreter Signature"
                    name="witnessSignature"
                    value={formData.witnessSignature}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      startAdornment: <WitnessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    placeholder="Relationship to Client"
                    name="relationshipToClient"
                    value={formData.relationshipToClient}
                    onChange={handleChange}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          * If the client is unable to sign, a responsible adult may sign on their behalf
        </Typography>
      </Paper>

      {/* Signatures Summary */}
      {(formData.clientSignature || formData.responsibleAdultSignature || formData.witnessSignature) && (
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
            Signature Summary
          </Typography>
          <Grid container spacing={2}>
            {formData.clientSignature && (
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Client:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formData.clientSignature}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {formData.responsibleAdultSignature && (
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Responsible Adult:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formData.responsibleAdultSignature}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {formData.witnessSignature && (
              <Grid item xs={12} sm={6} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Witness:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formData.witnessSignature}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Submit Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSubmit}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSuccessSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
          icon={<CloudDoneIcon />}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ✅ Advance care acknowledgment saved successfully!
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

export default AdvCareAck;