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
  LinearProgress
} from "@mui/material";
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
} from "../../store/slices/referralSlice";

const Referrals = ({ exportMode }) => {
  const dispatch = useDispatch();
  
  // ✅ Redux selectors
  const referrals = useSelector(selectReferrals);
  const loading = useSelector(selectReferralsLoading);
  const saving = useSelector(selectReferralsSaving);
  const uploading = useSelector(selectReferralsUploading);
  const error = useSelector(selectReferralsError);
  const successMessage = useSelector(selectReferralsSuccess);
  const dataLoaded = useSelector(selectReferralsDataLoaded);
  const uploadProgress = useSelector(selectReferralUploadProgress);
  
  // ✅ Get current client and user from Redux
  const currentClient = useSelector((state) => state?.clients?.selectedClient);
  const currentUser = useSelector((state) => state?.auth?.user);

  // ✅ Local state for file uploads
  const [filesToUpload, setFilesToUpload] = React.useState({});

  // ✅ Load data when client changes
  useEffect(() => {
    if (currentClient?.clientID) {
      dispatch(setCurrentClient(currentClient.clientID));
      if (!dataLoaded) {
        dispatch(fetchReferralData(currentClient.clientID));
      }
    }
  }, [dispatch, currentClient?.clientID, dataLoaded]);

  // ✅ Clear success message automatically
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
      dispatch(setError("Please select a client and file before uploading."));
      return;
    }

    try {
      await dispatch(uploadReferralFile({
        file,
        clientID: currentClient.clientID,
        referralType
      })).unwrap();
      
      // Clear the file input
      setFilesToUpload((prev) => ({ ...prev, [referralType]: null }));
    } catch (error) {
      // Error is handled by Redux
      console.error('Upload failed:', error);
    }
  };

  const handleSave = async () => {
    if (!currentClient?.clientID) {
      dispatch(setError("Please select a client before saving."));
      return;
    }

    try {
      await dispatch(saveReferralData({
        clientID: currentClient.clientID,
        referrals
      })).unwrap();
    } catch (error) {
      // Error is handled by Redux
      console.error('Save failed:', error);
    }
  };

  const handleClearErrors = () => {
    dispatch(clearError());
  };

  const referralTypes = [
    {
      key: "lahsaReferral",
      label: "LAHSA Referral",
      description: "Los Angeles Homeless Services Authority referral documentation"
    },
    {
      key: "odrReferral", 
      label: "ODR Referral",
      description: "Office of Disability Rights referral and assessment"
    },
    {
      key: "dhsReferral",
      label: "DHS Referral", 
      description: "Department of Health Services benefits and referral"
    }
  ];

  const renderUploadCard = (referralType) => (
    <Grid item xs={12} md={4} key={referralType.key}>
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
            disabled={loading || saving}
            sx={{ mb: 2 }}
          />
          
          {/* File upload section */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Upload Document:
          </Typography>
          <OutlinedInput
            type="file"
            onChange={(e) => handleFileSelect(referralType.key, e.target.files[0])}
            fullWidth
            sx={{ mb: 1 }}
          />
          
          {filesToUpload[referralType.key] && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Selected: {filesToUpload[referralType.key].name}
            </Typography>
          )}
          
          {/* Upload progress */}
          {uploadProgress[referralType.key] !== undefined && (
            <Box sx={{ mb: 1 }}>
              <LinearProgress variant="determinate" value={uploadProgress[referralType.key]} />
              <Typography variant="caption" color="text.secondary">
                Uploading... {uploadProgress[referralType.key]}%
              </Typography>
            </Box>
          )}
        </CardContent>
        
        <CardActions>
          <Button
            variant="contained"
            fullWidth
            onClick={() => handleFileUpload(referralType.key)}
            disabled={uploading || !filesToUpload[referralType.key]}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  // ✅ Loading state
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

  // ✅ No client selected
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
      {/* ✅ Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearErrors}>
          {error}
        </Alert>
      )}

      {/* ✅ Success message */}
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

      {/* ✅ Only show save button in non-export mode */}
      {!exportMode && (
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Button 
            variant="contained" 
            color="success" 
            size="large" 
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? "Saving..." : "Save All Referrals"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Referrals;