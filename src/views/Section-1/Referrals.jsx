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
  IconButton
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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

  // Local state for file uploads - track per referral type
  const [filesToUpload, setFilesToUpload] = React.useState({});
  const [uploadingType, setUploadingType] = React.useState(null);

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
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleChange = (referralType, value) => {
    dispatch(updateReferralField({ field: referralType, value }));
  };

  const handleFileSelect = (referralType, file) => {
    setFilesToUpload((prev) => ({
      ...prev,
      [referralType]: file,
    }));
  };

  const handleFileUpload = async (referralType) => {
    const file = filesToUpload[referralType];
    if (!currentClient?.clientID || !file) {
      return;
    }

    setUploadingType(referralType);
    
    try {
      await dispatch(uploadReferralFile({
        file,
        clientID: currentClient.clientID,
        referralType
      })).unwrap();
      
      // Clear the file input after successful upload
      setFilesToUpload((prev) => ({ ...prev, [referralType]: null }));
      
      // Reset the file input element
      const fileInput = document.querySelector(`input[data-type="${referralType}"]`);
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingType(null);
    }
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

  const renderUploadCard = (referralType) => {
    const isUploading = uploadingType === referralType.key;
    const hasFile = filesToUpload[referralType.key];
    const currentProgress = uploadProgress[referralType.key];

    return (
      <Grid item xs={12} md={6} key={referralType.key}>
        <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {referralType.label}
            </Typography>
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
              inputProps={{ 'data-type': referralType.key }}
              onChange={(e) => handleFileSelect(referralType.key, e.target.files[0])}
              fullWidth
              disabled={isUploading}
              sx={{ mb: 1 }}
            />
            
            {hasFile && !isUploading && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Selected: {hasFile.name}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    setFilesToUpload((prev) => ({ ...prev, [referralType.key]: null }));
                    const fileInput = document.querySelector(`input[data-type="${referralType.key}"]`);
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {/* Upload progress */}
            {isUploading && currentProgress !== undefined && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress variant="determinate" value={currentProgress} />
                <Typography variant="caption" color="text.secondary">
                  Uploading... {currentProgress}%
                </Typography>
              </Box>
            )}

            {/* Show uploaded file info */}
            {referrals[`${referralType.key}File`] && !hasFile && (
              <Alert severity="success" sx={{ mt: 1 }}>
                File uploaded: {referrals[`${referralType.key}File`]}
              </Alert>
            )}
          </CardContent>
          
          <CardActions>
            <Button
              variant="contained"
              fullWidth
              startIcon={<CloudUploadIcon />}
              onClick={() => handleFileUpload(referralType.key)}
              disabled={!hasFile || isUploading || uploading}
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
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
      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearErrors}>
          {error}
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