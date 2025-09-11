import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useLocation } from "react-router-dom";
import Select from "react-select";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Paper
} from "@mui/material";
import {
  ContactPhone as ContactPhoneIcon,
  Email as EmailIcon,
  LocalHospital as MedicalIcon,
  Save as SaveIcon
} from "@mui/icons-material";
import {
  fetchClientFaceData,
  saveClientFaceData,
  updateFormField,
  updateAllergies,
  setValidationErrors,
  clearErrors,
  clearSuccess,
  setCurrentClient,
  selectFormData,
  selectAllergies,
  selectLoading,
  selectSaving,
  selectError,
  selectValidationErrors,
  selectSaveSuccess,
  selectDataLoaded
} from "../../backend/store/slices/clientFaceSlice";
import { allergyList } from "../../data/arrayList";

// ✅ Safe hook wrapper
const useSafeRouter = () => {
  try {
    const searchParams = useSearchParams();
    const location = useLocation();
    return { searchParams: searchParams[0], location, hasRouter: true };
  } catch (error) {
    console.warn('⚠️ ClientFace: Router context not available, using fallback');
    return { 
      searchParams: new URLSearchParams(), 
      location: { pathname: '', search: '' }, 
      hasRouter: false 
    };
  }
};

const ClientFace = ({ exportMode = false }) => {
  const dispatch = useDispatch();
  
  // ✅ Safe router hooks
  const { searchParams, location, hasRouter } = useSafeRouter();
  
  // ✅ Redux selectors - get data directly from store
  const formData = useSelector(selectFormData);
  const allergies = useSelector(selectAllergies);
  const loading = useSelector(selectLoading);
  const saving = useSelector(selectSaving);
  const error = useSelector(selectError);
  const validationErrors = useSelector(selectValidationErrors);
  const saveSuccess = useSelector(selectSaveSuccess);
  const dataLoaded = useSelector(selectDataLoaded);
  
  // ✅ Get current client and user from Redux
  const currentClient = useSelector((state) => state?.clients?.selectedClient);
  const currentUser = useSelector((state) => state?.auth?.user);
  
  // ✅ Local UI state only (not duplicating Redux data)
  const [selectedAllergies, setSelectedAllergies] = useState([]);

  // ✅ Load data when client changes
  useEffect(() => {
    if (currentClient?.clientID) {
      dispatch(setCurrentClient(currentClient.clientID));
      dispatch(fetchClientFaceData(currentClient.clientID));
    }
  }, [dispatch, currentClient?.clientID]);

  // ✅ Handle URL parameters only if router is available
  useEffect(() => {
    if (!hasRouter) {
      console.log('🔍 ClientFace: No router context, skipping URL parameter handling');
      return;
    }

    const clientIDFromURL = searchParams.get('clientID');
    if (clientIDFromURL && (!currentClient || currentClient.clientID !== clientIDFromURL)) {
      console.log('🔍 ClientFace: Client ID from URL:', clientIDFromURL);
      // In this case, the parent component should handle loading the client
      // We'll just log it for debugging
    }
  }, [hasRouter, searchParams, currentClient]);

  // ✅ Sync allergies from Redux to local UI state
  useEffect(() => {
    if (allergies && allergies.length > 0) {
      const allergyOptions = allergies.map((name) => ({ 
        value: name, 
        label: name 
      }));
      setSelectedAllergies(allergyOptions);
    } else {
      setSelectedAllergies([]);
    }
  }, [allergies]);

  // ✅ Clear success message automatically
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearSuccess());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess, dispatch]);

  // ✅ Form validation function
  const validateForm = () => {
    const errors = [];
    
    if (!formData.clientContactNum?.trim()) {
  errors.push('Phone number is required');
} 
// Remove or comment out the strict format check
// else if (!/^\(\d{3}\)\s\d{3}-\d{4}$/.test(formData.clientContactNum)) {
//   errors.push('Phone number must be in format (xxx) xxx-xxxx');
// }
    if (!formData.clientEmail?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      errors.push('Email must be a valid email address');
    }
    
    if (!formData.clientMedInsType?.trim()) {
      errors.push('Insurance type is required');
    }
    
    return errors;
  };

  // ✅ Calculate form completion percentage
  const getCompletionPercentage = () => {
    const requiredFields = ['clientContactNum', 'clientEmail', 'clientMedInsType'];
    const optionalFields = ['clientContactAltNum', 'clientEmgContactName', 'clientEmgContactNum', 
                           'clientEmgContactRel', 'clientEmgContactAddress', 'clientMedCarrier', 
                           'clientMedInsNum', 'clientAllergyComments'];
    
    const totalFields = requiredFields.length + optionalFields.length;
    const completedRequired = requiredFields.filter(field => 
      formData[field] && formData[field].trim() !== ''
    ).length;
    const completedOptional = optionalFields.filter(field => 
      formData[field] && formData[field].trim() !== ''
    ).length;
    
    // Weight required fields more heavily
    const score = (completedRequired * 2) + completedOptional;
    const maxScore = (requiredFields.length * 2) + optionalFields.length;
    
    return Math.round((score / maxScore) * 100);
  };

  // ✅ Format phone number
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return value;
  };

  // ✅ Handle form field changes
  const handleFieldChange = (fieldName) => (event) => {
    let value = event.target.value;
    
    // Format phone numbers automatically
    if (fieldName.includes('ContactNum') || fieldName.includes('Phone')) {
      value = formatPhoneNumber(value);
    }
    
    dispatch(updateFormField({ field: fieldName, value }));
  };

  // ✅ Handle allergy selection changes
  const handleAllergyChange = (selectedOptions) => {
    const allergyList = (selectedOptions || []).map(option => option.value);
    setSelectedAllergies(selectedOptions || []);
    dispatch(updateAllergies(allergyList));
  };

  // ✅ Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      dispatch(setValidationErrors(errors));
      return;
    }
    
    // Clear any existing errors
    dispatch(clearErrors());
    
    // Save data
    try {
      await dispatch(saveClientFaceData({
        clientID: currentClient.clientID,
        formData,
        allergies
      })).unwrap();
    } catch (error) {
      // Error is handled by Redux
      console.error('Save failed:', error);
    }
  };

  // ✅ Clear errors handler
  const handleClearErrors = () => {
    dispatch(clearErrors());
  };

  const completionPercentage = getCompletionPercentage();
  const isFormValid = validationErrors.length === 0 && 
                     formData.clientContactNum && 
                     formData.clientEmail && 
                     formData.clientMedInsType;

  // ✅ Loading state
  if (loading && !dataLoaded) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <LinearProgress sx={{ width: '100%', mr: 2 }} />
            <Typography variant="body2">Loading client data...</Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // ✅ No client selected
  if (!currentClient) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
        <Alert severity="info">
          Please select a client to view client face information.
          {!hasRouter && (
            <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
              (Router context not available)
            </Typography>
          )}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* ✅ Header Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Client Face Sheet
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Essential client contact and medical information for {currentClient.clientFirstName} {currentClient.clientLastName}
        </Typography>

        {/* ✅ Progress indicator */}
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2">Form Completion</Typography>
            <Typography variant="body2">{completionPercentage}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionPercentage} 
            sx={{ height: 8, borderRadius: 4 }}
            color={completionPercentage >= 80 ? 'success' : completionPercentage >= 50 ? 'warning' : 'error'}
          />
        </Box>

        {/* ✅ Status indicators */}
        <Box display="flex" gap={1} mt={2}>
          {saving && (
            <Chip label="Saving..." color="info" size="small" />
          )}
          {isFormValid && (
            <Chip label="Form Valid" color="success" size="small" />
          )}
          {validationErrors.length > 0 && (
            <Chip label={`${validationErrors.length} Error(s)`} color="error" size="small" />
          )}
          {!hasRouter && (
            <Chip label="Standalone Mode" color="warning" size="small" />
          )}
        </Box>
      </Paper>

      {/* ✅ Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={handleClearErrors}
        >
          {error}
        </Alert>
      )}

      {/* ✅ Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following issues:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* ✅ Success message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Client Face Data Saved Successfully!
        </Alert>
      )}

      {/* ✅ Main Form */}
      <form onSubmit={handleSubmit}>
        {/* Contact Information Section */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <ContactPhoneIcon color="primary" />
              <Typography variant="h6">Contact Information</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography>Primary Phone</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientContactNum"
                  value={formData.clientContactNum || ""}
                  onChange={handleFieldChange('clientContactNum')}
                  disabled={saving}
                  error={!formData.clientContactNum && validationErrors.some(err => err.includes('phone'))}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography>Alternate Phone</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientContactAltNum"
                  value={formData.clientContactAltNum || ""}
                  onChange={handleFieldChange('clientContactAltNum')}
                  disabled={saving}
                  placeholder="(XXX) XXX-XXXX"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography>Email Address</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientEmail"
                  type="email"
                  value={formData.clientEmail || ""}
                  onChange={handleFieldChange('clientEmail')}
                  disabled={saving}
                  error={!formData.clientEmail && validationErrors.some(err => err.includes('email'))}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Emergency Contact Section */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Emergency Contact Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography>Contact Name</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientEmgContactName"
                  value={formData.clientEmgContactName || ""}
                  onChange={handleFieldChange('clientEmgContactName')}
                  disabled={saving}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>  
                <Typography>Contact Phone</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientEmgContactNum"
                  value={formData.clientEmgContactNum || ""}
                  onChange={handleFieldChange('clientEmgContactNum')}
                  disabled={saving}
                  placeholder="(555) 123-4567"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography>Relationship</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientEmgContactRel"
                  value={formData.clientEmgContactRel || ""}
                  onChange={handleFieldChange('clientEmgContactRel')}
                  disabled={saving}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography>Emergency Contact Address</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientEmgContactAddress"
                  value={formData.clientEmgContactAddress || ""}
                  onChange={handleFieldChange('clientEmgContactAddress')}
                  disabled={saving}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Medical Information Section */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
              <MedicalIcon color="primary" />
              <Typography variant="h6">Medical Insurance Information</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography>Insurance Type *</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientMedInsType"
                  value={formData.clientMedInsType || ""}
                  onChange={handleFieldChange('clientMedInsType')}
                  disabled={saving}
                  error={!formData.clientMedInsType && validationErrors.some(err => err.includes('insurance'))}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography>Insurance Carrier</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientMedCarrier"
                  value={formData.clientMedCarrier || ""}
                  onChange={handleFieldChange('clientMedCarrier')}
                  disabled={saving}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography>Insurance Number</Typography>
                <TextField
                  fullWidth
                  label=""
                  name="clientMedInsNum"
                  value={formData.clientMedInsNum || ""}
                  onChange={handleFieldChange('clientMedInsNum')}
                  disabled={saving}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Allergies Section */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Allergies & Intolerances
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Select Known Allergies
                </Typography>
                <Select
                  isMulti
                  options={allergyList?.map((item) => ({ 
                    label: item.value, 
                    value: item.value 
                  })) || []}
                  value={selectedAllergies}
                  onChange={handleAllergyChange}
                  isDisabled={saving}
                  placeholder="Select allergies..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '56px'
                    })
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography> Allergy Comments & Details </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label=""
                  name="clientAllergyComments"
                  value={formData.clientAllergyComments || ""}
                  onChange={handleFieldChange('clientAllergyComments')}
                  disabled={saving}
                  helperText="Include severity, symptoms, and any special instructions"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ✅ Submit Button - Only show in non-export mode */}
        {/* ✅ Submit Button - Only show in non-export mode */}
        {!exportMode && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="large"
              disabled={saving || !isFormValid}
              startIcon={<SaveIcon />}
              sx={{ minWidth: 200 }}
            >
              {saving ? 'Saving...' : 'Save Client Face Sheet'}
            </Button>
          </Box>
        )}
      </form>
    </Box>
  );
};

export default ClientFace;