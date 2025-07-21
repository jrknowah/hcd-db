import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
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
  OutlinedInput
} from "@mui/material";
import logUserAction from "../../config/logAction";

const HCD_API = `${import.meta.env.VITE_API_URL}`;

// ✅ Static mock data outside component
const MOCK_CLIENT = {
  clientID: 'mock-123',
  clientFirstName: 'John',
  clientLastName: 'Doe',
};

const MOCK_USER = {
  id: 'mock-user-123',
  name: 'Test User',
};

const MOCK_REFERRALS_DATA = {
  lahsaReferral: "LAHSA referral completed on 2024-03-10. Case worker: Jane Smith. Housing voucher approved.",
  odrReferral: "ODR evaluation scheduled for 2024-03-20. Disability determination pending review.",
  dhsReferral: "DHS benefits application submitted. CalFresh and Medi-Cal eligibility confirmed.",
};

const Referrals = ({ exportMode }) => {
  // ✅ Simple selectors
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const reduxUser = useSelector((state) => state?.auth?.user);

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;

  // ✅ Component state
  const [clientReferrals, setClientReferrals] = useState({
    lahsaReferral: "",
    odrReferral: "",
    dhsReferral: "",
  });

  const [uploading, setUploading] = useState({});
  const [filesToUpload, setFilesToUpload] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ✅ Load data when client changes
  useEffect(() => {
    if (!currentClient?.clientID) return;
    if (dataLoaded && currentClient.clientID === clientReferrals.clientID) return;

    setLoading(true);
    setError(null);
    setDataLoaded(false);

    if (shouldUseMockData) {
      // Mock data
      setTimeout(() => {
        setClientReferrals(MOCK_REFERRALS_DATA);
        setLoading(false);
        setDataLoaded(true);
      }, 500);
      return;
    }

    // Real API call
    axios
      .get(`${HCD_API}/clientReferrals/${currentClient.clientID}`)
      .then((response) => {
        if (response.data) {
          setClientReferrals({
            lahsaReferral: response.data.lahsaReferral || "",
            odrReferral: response.data.odrReferral || "",
            dhsReferral: response.data.dhsReferral || "",
          });
        }
        setDataLoaded(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching client referrals:", err);
        setError("Failed to load referral data");
        setLoading(false);
      });
  }, [currentClient?.clientID, shouldUseMockData]);

  const handleChange = (referralType, value) => {
    setClientReferrals((prev) => ({
      ...prev,
      [referralType]: value,
    }));
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
      alert("Please select a client and file before uploading.");
      return;
    }

    setUploading((prev) => ({ ...prev, [referralType]: true }));

    try {
      if (shouldUseMockData) {
        // Mock upload
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert(`✅ ${referralType} uploaded successfully (Mock).`);
        setFilesToUpload((prev) => ({ ...prev, [referralType]: null }));
        return;
      }

      // Real upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientID", currentClient.clientID);
      formData.append("type", referralType);

      await axios.post(`${HCD_API}/uploadReferral`, formData);

      alert(`✅ ${referralType} uploaded successfully.`);

      if (currentUser && currentUser.id !== 'mock-user-123') {
        await logUserAction(currentUser, "UPLOAD_REFERRAL", {
          clientID: currentClient.clientID,
          referralType,
          fileName: file.name,
        });
      }

      setFilesToUpload((prev) => ({ ...prev, [referralType]: null }));
    } catch (error) {
      console.error(`❌ Error uploading ${referralType}:`, error);
      alert(`Failed to upload ${referralType}.`);
    } finally {
      setUploading((prev) => ({ ...prev, [referralType]: false }));
    }
  };

  const handleSave = async () => {
    if (!currentClient?.clientID) {
      alert("Please select a client before saving.");
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      if (shouldUseMockData) {
        // Mock save
        setTimeout(() => {
          setSaveSuccess(true);
          setLoading(false);
          setTimeout(() => setSaveSuccess(false), 3000);
        }, 1000);
        return;
      }

      // Real save
      await axios.post(`${HCD_API}/saveClientReferrals`, {
        clientID: currentClient.clientID,
        ...clientReferrals,
      });

      if (currentUser && currentUser.id !== 'mock-user-123') {
        await logUserAction(currentUser, "SAVE_CLIENT_REFERRALS", {
          clientID: currentClient.clientID,
          referrals: clientReferrals,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error saving referrals:", error);
      setError("Failed to save referrals");
    } finally {
      setLoading(false);
    }
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
            value={clientReferrals[referralType.key]}
            onChange={(e) => handleChange(referralType.key, e.target.value)}
            disabled={loading}
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
            <Typography variant="body2" color="text.secondary">
              Selected: {filesToUpload[referralType.key].name}
            </Typography>
          )}
        </CardContent>
        <CardActions>
          <Button
            variant="contained"
            fullWidth
            onClick={() => handleFileUpload(referralType.key)}
            disabled={uploading[referralType.key] || !filesToUpload[referralType.key]}
          >
            {uploading[referralType.key] ? "Uploading..." : "Upload Document"}
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  // ✅ No client selected
  if (!currentClient) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {isDevelopment 
            ? `Development Mode: No client selected. Mock data ${shouldUseMockData ? 'enabled' : 'disabled'}.`
            : "Please select a client to view referral information."
          }
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock referral data for {currentClient.clientFirstName} {currentClient.clientLastName}
        </Alert>
      )}

      {/* ✅ Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ✅ Success message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Referral Data Saved Successfully!
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        Client Referrals
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage referral documentation and notes for {currentClient.clientFirstName} {currentClient.clientLastName}
      </Typography>

      {loading && !dataLoaded ? (
        <Alert severity="info">Loading referral data...</Alert>
      ) : (
        <>
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
                disabled={loading}
              >
                {loading ? "Saving..." : "Save All Referrals"}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default Referrals;