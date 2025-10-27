import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Grid,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  CardActions,
  Alert,
  OutlinedInput,
  LinearProgress,
  IconButton,
  Chip,
  Tooltip
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RetryIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import {
  fetchReferralData,
  saveReferralData,
  uploadReferralFile,
  updateReferralField,
  setUploadProgress,
  clearUploadProgress,
  clearError,
  clearSuccess,
  setCurrentClient,
  selectReferrals,
  selectReferralsLoading,
  selectReferralsSaving,
  selectReferralsUploading,
  selectReferralsError,
  selectReferralsSuccess,
  selectReferralsDataLoaded,
  selectReferralUploadProgress
} from "../../backend/store/slices/referralSlice";

const Referrals = ({ exportMode }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const referrals = useSelector(selectReferrals);
  const loading = useSelector(selectReferralsLoading);
  const saving = useSelector(selectReferralsSaving);
  const uploading = useSelector(selectReferralsUploading);
  const error = useSelector(selectReferralsError);
  const successMessage = useSelector(selectReferralsSuccess);
  const dataLoaded = useSelector(selectReferralsDataLoaded);
  const uploadProgress = useSelector(selectReferralUploadProgress);
  
  // Get current client and user from Redux
  const currentClient = useSelector((state) => state?.clients?.selectedClient);
  const currentUser = useSelector((state) => state?.auth?.user);

  // ✅ NEW: Enhanced local state for file uploads with retry tracking
  const [filesToUpload, setFilesToUpload] = React.useState({});
  const [uploadingType, setUploadingType] = React.useState(null);
  const [fileValidationErrors, setFileValidationErrors] = React.useState({});
  const [retryCount, setRetryCount] = React.useState({});
  const [uploadAttempts, setUploadAttempts] = React.useState({});

  // ✅ NEW: File validation configuration
  const FILE_VALIDATION = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
  };

  // ✅ NEW: Retry configuration
  const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 8000, // 8 seconds
    backoffMultiplier: 2
  };

  // Load data when client changes
  useEffect(() => {
    if (currentClient?.clientID) {
      dispatch(setCurrentClient(currentClient.clientID));
      if (!dataLoaded) {
        dispatch(fetchReferralData(currentClient.clientID));
      }
    }
  }, [dispatch, currentClient?.clientID, dataLoaded]);

  // Clear success message automatically
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccess());
      }, 5000); // Increased to 5 seconds for better UX
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  // ✅ NEW: File validation function
  const validateFile = (file) => {
    const errors = [];

    // Check file size
    if (file.size > FILE_VALIDATION.maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`);
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!FILE_VALIDATION.allowedExtensions.includes(fileExtension)) {
      errors.push(`File type "${fileExtension}" is not allowed. Allowed types: PDF, JPG, PNG, DOC, DOCX`);
    }

    // Check MIME type
    if (!FILE_VALIDATION.allowedTypes.includes(file.type)) {
      errors.push(`File MIME type "${file.type}" is not supported`);
    }

    return errors;
  };

  // ✅ NEW: Calculate retry delay with exponential backoff
  const calculateRetryDelay = (attemptNumber) => {
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber),
      RETRY_CONFIG.maxDelay
    );
    return delay;
  };

  // ✅ NEW: Sleep utility for retry delays
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleChange = (referralType, value) => {
    dispatch(updateReferralField({ field: referralType, value }));
  };

  // ✅ ENHANCED: File select with validation
  const handleFileSelect = (referralType, file) => {
    if (!file) {
      setFilesToUpload((prev) => ({
        ...prev,
        [referralType]: null,
      }));
      setFileValidationErrors((prev) => ({
        ...prev,
        [referralType]: null,
      }));
      return;
    }

    // Validate file
    const validationErrors = validateFile(file);
    
    if (validationErrors.length > 0) {
      setFileValidationErrors((prev) => ({
        ...prev,
        [referralType]: validationErrors,
      }));
      // Still set the file so user can see what they selected
      setFilesToUpload((prev) => ({
        ...prev,
        [referralType]: file,
      }));
    } else {
      setFileValidationErrors((prev) => ({
        ...prev,
        [referralType]: null,
      }));
      setFilesToUpload((prev) => ({
        ...prev,
        [referralType]: file,
      }));
    }
  };

  // ✅ ENHANCED: File upload with retry logic and timeout handling
  const handleFileUpload = async (referralType, isRetry = false) => {
    const file = filesToUpload[referralType];
    if (!currentClient?.clientID || !file) {
      return;
    }

    // Don't upload if there are validation errors
    if (fileValidationErrors[referralType]?.length > 0) {
      return;
    }

    const currentAttempt = (uploadAttempts[referralType] || 0) + 1;
    setUploadAttempts((prev) => ({ ...prev, [referralType]: currentAttempt }));
    setUploadingType(referralType);
    
    try {
      // Clear any previous errors for this referral type
      if (error?.includes(referralType)) {
        dispatch(clearError());
      }

      await dispatch(uploadReferralFile({
        file,
        clientID: currentClient.clientID,
        referralType
      })).unwrap();
      
      // ✅ Success - clear all retry tracking
      setFilesToUpload((prev) => ({ ...prev, [referralType]: null }));
      setRetryCount((prev) => ({ ...prev, [referralType]: 0 }));
      setUploadAttempts((prev) => ({ ...prev, [referralType]: 0 }));
      
      // Reset the file input element
      const fileInput = document.querySelector(`input[data-type="${referralType}"]`);
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload failed:', error);
      
      // ✅ Check if error is retryable (503, 500, network errors)
      const isRetryableError = 
        error?.message?.includes('503') || 
        error?.message?.includes('Service Unavailable') ||
        error?.message?.includes('500') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Network Error');

      const currentRetries = retryCount[referralType] || 0;
      
      if (isRetryableError && currentRetries < RETRY_CONFIG.maxRetries && !isRetry) {
        // ✅ Retry with exponential backoff
        const delay = calculateRetryDelay(currentRetries);
        setRetryCount((prev) => ({ ...prev, [referralType]: currentRetries + 1 }));
        
        console.log(`🔄 Retrying upload for ${referralType} in ${delay}ms (attempt ${currentRetries + 2}/${RETRY_CONFIG.maxRetries + 1})`);
        
        await sleep(delay);
        
        // Recursive retry
        return handleFileUpload(referralType, true);
      } else {
        // ✅ Max retries reached or non-retryable error
        setRetryCount((prev) => ({ ...prev, [referralType]: 0 }));
      }
    } finally {
      setUploadingType(null);
    }
  };

  // ✅ NEW: Manual retry button handler
  const handleManualRetry = (referralType) => {
    setRetryCount((prev) => ({ ...prev, [referralType]: 0 }));
    setUploadAttempts((prev) => ({ ...prev, [referralType]: 0 }));
    dispatch(clearError());
    handleFileUpload(referralType);
  };

  const handleSaveNotes = async () => {
    if (!currentClient?.clientID) {
      return;
    }

    try {
      await dispatch(saveReferralData({
        clientID: currentClient.clientID,
        referrals
      })).unwrap();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleClearErrors = () => {
    dispatch(clearError());
    setFileValidationErrors({});
  };

  // ✅ NEW: Clear file and reset all tracking
  const handleClearFile = (referralType) => {
    setFilesToUpload((prev) => ({ ...prev, [referralType]: null }));
    setFileValidationErrors((prev) => ({ ...prev, [referralType]: null }));
    setRetryCount((prev) => ({ ...prev, [referralType]: 0 }));
    setUploadAttempts((prev) => ({ ...prev, [referralType]: 0 }));
    
    const fileInput = document.querySelector(`input[data-type="${referralType}"]`);
    if (fileInput) fileInput.value = '';
  };

  const referralTypes = [
    {
      key: "lahsaReferral",
      label: "LAHSA",
      description: "Los Angeles Homeless Services Authority referral documentation"
    },
    {
      key: "odrReferral", 
      label: "ODR",
      description: "Office of Disability Rights referral and assessment"
    },
    {
      key: "dhsReferral",
      label: "DHS", 
      description: "Department of Health Services benefits and referral"
    },
    {
      key: "dmhReferral",
      label: "DMH", 
      description: "Department of Mental Health"
    }
  ];

  // ✅ ENHANCED: Upload card with better error display and retry UI
  const renderUploadCard = (referralType) => {
    const isUploading = uploadingType === referralType.key;
    const hasFile = filesToUpload[referralType.key];
    const currentProgress = uploadProgress[referralType.key];
    const validationErrors = fileValidationErrors[referralType.key];
    const currentRetries = retryCount[referralType.key] || 0;
    const attempts = uploadAttempts[referralType.key] || 0;

    return (
      <Grid item xs={12} md={6} key={referralType.key}>
        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                {referralType.label}
              </Typography>
              {attempts > 0 && (
                <Chip 
                  label={`Attempt ${attempts}`}
                  size="small" 
                  color={attempts > 2 ? "error" : "info"}
                />
              )}
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {referralType.description}
            </Typography>
            
            {/* Text notes section */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Referral Notes"
              value={referrals[referralType.key] || ""}
              onChange={(e) => handleChange(referralType.key, e.target.value)}
              disabled={loading || saving || isUploading}
              sx={{ mb: 2 }}
            />
            
            {/* File upload section */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Upload Document:
            </Typography>
            <OutlinedInput
              type="file"
              inputProps={{ 
                'data-type': referralType.key,
                accept: FILE_VALIDATION.allowedExtensions.join(',')
              }}
              onChange={(e) => handleFileSelect(referralType.key, e.target.files[0])}
              fullWidth
              disabled={isUploading}
              sx={{ mb: 1 }}
            />
            
            {/* ✅ NEW: File validation errors */}
            {validationErrors && validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  <WarningIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  File Validation Failed:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {validationErrors.map((err, idx) => (
                    <li key={idx}><Typography variant="body2">{err}</Typography></li>
                  ))}
                </ul>
              </Alert>
            )}
            
            {/* Selected file display */}
            {hasFile && !isUploading && !validationErrors && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                <Typography variant="body2" color="success.main" sx={{ flexGrow: 1 }}>
                  ✓ Selected: {hasFile.name} ({(hasFile.size / 1024).toFixed(1)} KB)
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleClearFile(referralType.key)}
                  title="Remove file"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* ✅ ENHANCED: Upload progress with retry info */}
            {isUploading && currentProgress !== undefined && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress variant="determinate" value={currentProgress} />
                <Typography variant="caption" color="text.secondary">
                  Uploading... {currentProgress}%
                  {currentRetries > 0 && ` (Retry ${currentRetries}/${RETRY_CONFIG.maxRetries})`}
                </Typography>
              </Box>
            )}

            {/* ✅ NEW: Retry indicator */}
            {isUploading && currentRetries > 0 && (
              <Alert severity="info" icon={<RetryIcon />} sx={{ mb: 1 }}>
                Retrying upload... (Attempt {currentRetries + 1}/{RETRY_CONFIG.maxRetries + 1})
              </Alert>
            )}

            {/* Show uploaded file info */}
            {referrals[`${referralType.key}File`] && !hasFile && (
              <Alert severity="success" sx={{ mt: 1 }}>
                File uploaded: {referrals[`${referralType.key}File`]}
              </Alert>
            )}

            {/* ✅ NEW: Manual retry button for failed uploads */}
            {error && attempts > 0 && !isUploading && (
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RetryIcon />}
                  onClick={() => handleManualRetry(referralType.key)}
                  fullWidth
                >
                  Retry Upload
                </Button>
              </Box>
            )}
          </CardContent>
          
          <CardActions>
            <Tooltip title={validationErrors ? "Fix validation errors before uploading" : "Upload file to Azure Blob Storage"}>
              <span style={{ width: '100%' }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={isUploading ? <RetryIcon /> : <CloudUploadIcon />}
                  onClick={() => handleFileUpload(referralType.key)}
                  disabled={!hasFile || isUploading || uploading || (validationErrors && validationErrors.length > 0)}
                >
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
              </span>
            </Tooltip>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  // Loading state
  if (loading && !dataLoaded) {
    return (
      <Box sx={{ p: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <LinearProgress sx={{ width: '100%', mr: 2 }} />
          <Typography variant="body2">Loading referral data...</Typography>
        </Box>
      </Box>
    );
  }

  // No client selected
  if (!currentClient) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          Please select a client to view referral information.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* ✅ ENHANCED: Error display with better 503 messaging */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearErrors}>
          <Typography variant="subtitle2" gutterBottom>
            {error.includes('503') || error.includes('Service Unavailable') 
              ? '🔴 Service Temporarily Unavailable' 
              : '❌ Upload Error'}
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
          {(error.includes('503') || error.includes('Service Unavailable')) && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              💡 <strong>This usually means:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Azure service is warming up (cold start) - retry in 30 seconds</li>
                <li>Backend is temporarily down - check with IT</li>
                <li>Azure Blob Storage not configured - contact administrator</li>
              </ul>
            </Typography>
          )}
        </Alert>
      )}

      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        Client Referrals
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage referral documentation and notes for {currentClient.clientFirstName} {currentClient.clientLastName}
      </Typography>

      <Grid container spacing={3}>
        {referralTypes.map(renderUploadCard)}
      </Grid>

      {/* Save notes button - separate from file uploads */}
      {!exportMode && (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large" 
            onClick={handleSaveNotes}
            disabled={loading || saving || uploading}
          >
            {saving ? "Saving..." : "Save Referral Notes"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Referrals;