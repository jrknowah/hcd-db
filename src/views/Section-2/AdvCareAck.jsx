import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
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
  Description as DocumentIcon
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

// ✅ MAIN COMPONENT WITH FORWARDREF
const AdvCareAck = forwardRef(({ 
  clientID, 
  title = "Acknowledgment of Advance Care Planning Discussion", 
  formType = "advCareAck" 
}, ref) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors - using the formType parameter
  const existingData = useSelector((state) => selectFormByType(state, formType));
  const loading = useSelector(selectFormLoading);
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  
  // ✅ FIX: Add local loading state to prevent infinite loops
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Local state
  const [formData, setFormData] = useState({
    factSheetGiven: "",
    factSheetNotGivenReason: "",
    hasDirective: "",
    clientSignature: ""
  });
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  
  // ✅ EXPOSE getFormData VIA REF
  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      ...formData,
      clientID,
      formType
    })
  }));
  
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = ['factSheetGiven', 'hasDirective', 'clientSignature'];
    const conditionalFields = formData.factSheetGiven === 'No' ? ['factSheetNotGivenReason'] : [];
    
    const allRequiredFields = [...requiredFields, ...conditionalFields];
    const completedRequired = allRequiredFields.filter(field => 
      formData[field] && formData[field].trim()
    ).length;
    
    return Math.round((completedRequired / allRequiredFields.length) * 100);
  }, [formData]);
  
  // Form validation
  const isValid = useMemo(() => {
    return clientID && 
           formData.factSheetGiven && 
           formData.hasDirective &&
           formData.clientSignature.trim() &&
           (formData.factSheetGiven !== 'No' || formData.factSheetNotGivenReason.trim());
  }, [clientID, formData]);
  
  // ✅ FIX: Load form data with error handling
  useEffect(() => {
    if (clientID && formType) {
      dispatch(fetchFormData({ clientID, formType }))
        .unwrap()
        .then((data) => {
          console.log('Form data loaded:', data);
        })
        .catch((error) => {
          console.warn('Failed to load form data (form will work with empty data):', error);
        })
        .finally(() => {
          setTimeout(() => setIsInitialLoad(false), 1000);
        });
    } else {
      setIsInitialLoad(false);
    }
  }, [dispatch, clientID, formType]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (existingData && Object.keys(existingData).length > 0) {
      setFormData({
        factSheetGiven: existingData.factSheetGiven || "",
        factSheetNotGivenReason: existingData.factSheetNotGivenReason || "",
        hasDirective: existingData.hasDirective || "",
        clientSignature: existingData.clientSignature || ""
      });
    }
  }, [existingData]);
  
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
      formType,
      formData: newFormData
    }));
  }, [dispatch, formData, formType]);

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
      clientID,
      formType,
      acknowledgedAt: new Date().toISOString()
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType, 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save advance care acknowledgment']);
    }
  }, [dispatch, clientID, formData, formType]);

  // Handle close success snackbar
  const handleCloseSuccessSnackbar = useCallback(() => {
    setShowSuccessSnackbar(false);
    dispatch(clearSuccessFlags());
  }, [dispatch]);

  // ✅ FIX: Improved loading state
  if (isInitialLoad && loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400 
        }}>
          <CircularProgress size={60} />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading form...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DirectiveIcon sx={{ fontSize: 48, mr: 2 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Advance Health Care Directive Acknowledgment
        </Typography>
      </Paper>

      {/* Progress Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Form Completion Progress
            </Typography>
            <Chip 
              label={`${completionPercentage}% Complete`}
              color={completionPercentage === 100 ? "success" : "default"}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionPercentage} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Error Messages */}
      {localErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setLocalErrors([])}>
          {localErrors.map((error, index) => (
            <Typography key={index} variant="body2">• {error}</Typography>
          ))}
        </Alert>
      )}

      {/* Information Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          This form documents that the client has been informed about advance health care directives 
          and has been given or offered an Advance Health Care Directive Fact Sheet.
        </Typography>
      </Alert>

      {/* Staff Assessment Section */}
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
                <TableCell sx={{ fontWeight: 600 }}>Response</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Has the Advance Health Care Directive Fact Sheet been given to the Client?
                  </Typography>
                </TableCell>
                <TableCell>
                  <FormControl fullWidth size="small" required>
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
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      If No, explain:
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Explain why the fact sheet was not given"
                      name="factSheetNotGivenReason"
                      value={formData.factSheetNotGivenReason}
                      onChange={handleChange}
                      variant="outlined"
                      size="small"
                      required
                    />
                  </TableCell>
                </TableRow>
              )}

              <TableRow>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Does the client have an Advance Health Care Directive?
                  </Typography>
                </TableCell>
                <TableCell>
                  <FormControl fullWidth size="small" required>
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

      {/* Client Signature Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Client Acknowledgment & Signature
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            I have been asked about having an Advance Health Care Directive, and I have been given 
            or offered an Advance Health Care Directive Fact Sheet.
          </Typography>
        </Alert>

        <TextField
          fullWidth
          label="Client Signature"
          placeholder="Enter your full legal name"
          name="clientSignature"
          value={formData.clientSignature}
          onChange={handleChange}
          variant="outlined"
          required
          sx={{ mb: 2 }}
          helperText="Type your name to provide your electronic signature"
          InputProps={{
            startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />

        {formData.clientSignature && (
          <Zoom in={!!formData.clientSignature}>
            <Alert 
              severity="success" 
              icon={<CheckCircleIcon />}
              sx={{ mt: 2 }}
            >
              <Typography variant="body2">
                Signature captured: <strong>{formData.clientSignature}</strong>
              </Typography>
            </Alert>
          </Zoom>
        )}
      </Paper>

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
});

// ✅ ADD DISPLAY NAME
AdvCareAck.displayName = 'AdvCareAck';

export default AdvCareAck;