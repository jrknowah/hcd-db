import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Divider,
  Alert,
  LinearProgress
} from "@mui/material";
import {
  fetchClientDischarge,
  saveClientDischarge,
  updateDischargeField,
  clearError,
  clearSuccess,
  setCurrentClient,
  selectDischargeData,
  selectDischargeLoading,
  selectDischargeSaving,
  selectDischargeError,
  selectDischargeSuccess,
  selectDischargeDataLoaded
} from "../../backend/store/slices/dischargeSlice";

const Discharge = ({ exportMode }) => {
  const dispatch = useDispatch();
  
  // ✅ Redux selectors
  const dischargeData = useSelector(selectDischargeData);
  const loading = useSelector(selectDischargeLoading);
  const saving = useSelector(selectDischargeSaving);
  const error = useSelector(selectDischargeError);
  const successMessage = useSelector(selectDischargeSuccess);
  const dataLoaded = useSelector(selectDischargeDataLoaded);
  
  // ✅ Get current client and user from Redux
  const currentClient = useSelector((state) => state?.clients?.selectedClient);
  const currentUser = useSelector((state) => state?.auth?.user);

  // ✅ Load data when client changes
  useEffect(() => {
    if (currentClient?.clientID) {
      dispatch(setCurrentClient(currentClient.clientID));
      if (!dataLoaded) {
        dispatch(fetchClientDischarge(currentClient.clientID));
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch(updateDischargeField({ field: name, value }));
  };

  const handleSubmit = async () => {
    if (!currentClient) {
      dispatch(setError("Please select a client before submitting."));
      return;
    }

    try {
      await dispatch(saveClientDischarge({
        clientID: currentClient.clientID,
        dischargeData
      })).unwrap();
    } catch (error) {
      // Error is handled by Redux
      console.error('Save failed:', error);
    }
  };

  const handleClearErrors = () => {
    dispatch(clearError());
  };

  const sections = [
    {
      label: "I. Assessment and Goals",
      name: "clientDischargI",
      description: "Summarize the patient's medical condition, functional abilities, support systems, and recovery goals.",
    },
    {
      label: "II. Discharge Destination",
      name: "clientDischargII",
      description: "Specify whether the patient will be discharged to their home or another healthcare facility.",
    },
    {
      label: "III. Medication Management",
      name: "clientDischargIII",
      description: "List prescribed medications and dosages, and provide administration instructions.",
    },
    {
      label: "IV. Medical Equipment and Supplies",
      name: "clientDischargIV",
      description: "Identify equipment, assistive devices, or supplies needed.",
    },
    {
      label: "V. Home Health Services",
      name: "clientDischargV",
      description: "Types and frequency of services such as nursing care or physical therapy.",
    },
    {
      label: "VI. Follow-up Appointments and Communication",
      name: "clientDischargVI",
      description: "Schedule follow-ups and outline team communication protocols.",
    },
    {
      label: "VII. Patient and Caregiver Education",
      name: "clientDischargVII",
      description: "Describe education/training provided to the patient and caregivers.",
    },
  ];

  // ✅ Loading state
  if (loading && !dataLoaded) {
    return (
      <Box sx={{ p: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <LinearProgress sx={{ width: '100%', mr: 2 }} />
          <Typography variant="body2">Loading discharge data...</Typography>
        </Box>
      </Box>
    );
  }

  // ✅ No client selected
  if (!currentClient) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          Please select a client to view discharge information.
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

      <Typography variant="h6" gutterBottom>
        Client Discharge Summary
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Discharge planning for {currentClient.clientFirstName} {currentClient.clientLastName}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Discharge Date"
            name="clientDischargeDate"
            InputLabelProps={{ shrink: true }}
            value={dischargeData.clientDischargeDate || ""}
            onChange={handleChange}
            disabled={loading || saving}
          />
        </Grid>
        <Grid item xs={12} md={9}>
          <TextField
            fullWidth
            multiline
            label="Primary Diagnosis"
            name="clientDischargeDiag"
            value={dischargeData.clientDischargeDiag || ""}
            onChange={handleChange}
            disabled={loading || saving}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {sections.map((section) => (
        <Box key={section.name} sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {section.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {section.description}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            name={section.name}
            value={dischargeData[section.name] || ""}
            onChange={handleChange}
            disabled={loading || saving}
          />
        </Box>
      ))}

      {/* ✅ Only show save button in non-export mode */}
      {!exportMode && (
        <Button 
          variant="contained" 
          size="large" 
          onClick={handleSubmit}
          disabled={loading || saving}
        >
          {saving ? "Saving..." : "Save Discharge Summary"}
        </Button>
      )}
    </Box>
  );
};

export default Discharge;