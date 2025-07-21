import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Divider,
  Alert
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

const MOCK_DISCHARGE_DATA = {
  clientDischargeDate: "2024-03-15",
  clientDischargeDiag: "Acute myocardial infarction, resolved",
  clientDischargI: "Patient is a 65-year-old male who presented with acute MI. Recovery goals include cardiac rehabilitation and medication compliance.",
  clientDischargII: "Patient will be discharged to home with spouse as primary caregiver.",
  clientDischargIII: "Metoprolol 50mg BID, Lisinopril 10mg daily, Atorvastatin 40mg at bedtime. Take medications as prescribed.",
  clientDischargIV: "Blood pressure monitor, pill organizer, emergency contact list.",
  clientDischargV: "Home health nursing visits 2x weekly for vital signs and medication compliance assessment.",
  clientDischargVI: "Follow-up with cardiologist in 1 week, primary care physician in 2 weeks.",
  clientDischargVII: "Patient and spouse educated on heart-healthy diet, medication management, and when to seek emergency care.",
};

const Discharge = ({ exportMode }) => {
  // ✅ Simple selectors
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const reduxUser = useSelector((state) => state?.auth?.user);

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;

  // ✅ Component state
  const [form, setForm] = useState({
    clientDischargeDate: "",
    clientDischargeDiag: "",
    clientDischargI: "",
    clientDischargII: "",
    clientDischargIII: "",
    clientDischargIV: "",
    clientDischargV: "",
    clientDischargVI: "",
    clientDischargVII: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ✅ Load data when client changes
  useEffect(() => {
    if (!currentClient?.clientID) return;
    if (dataLoaded && currentClient.clientID === form.clientID) return;

    setLoading(true);
    setError(null);
    setDataLoaded(false);

    if (shouldUseMockData) {
      // Mock data
      setTimeout(() => {
        setForm(MOCK_DISCHARGE_DATA);
        setLoading(false);
        setDataLoaded(true);
      }, 500);
      return;
    }

    // Real API call
    axios
      .get(`${HCD_API}/getClientDischarge/${currentClient.clientID}`)
      .then((res) => {
        if (res.data) {
          setForm((prev) => ({
            ...prev,
            ...res.data,
          }));
        }
        setDataLoaded(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching client discharge data:", err);
        setError("Failed to load discharge data");
        setLoading(false);
      });
  }, [currentClient?.clientID, shouldUseMockData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!currentClient) {
      alert("⚠️ Please select a client before submitting.");
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

      // Real API calls
      await axios.post(`${HCD_API}/saveClientDischarge`, {
        ...form,
        clientID: currentClient.clientID,
      });

      if (currentUser && currentUser.id !== 'mock-user-123') {
        await logUserAction(currentUser, "SAVE_CLIENT_DISCHARGE", {
          clientID: currentClient.clientID,
          dischargeData: form,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("❌ Error saving discharge data:", error);
      setError("Failed to save client discharge data");
    } finally {
      setLoading(false);
    }
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

  // ✅ No client selected
  if (!currentClient) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {isDevelopment 
            ? `Development Mode: No client selected. Mock data ${shouldUseMockData ? 'enabled' : 'disabled'}.`
            : "Please select a client to view discharge information."
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
          🔧 Development Mode: Using mock discharge data for {currentClient.clientFirstName} {currentClient.clientLastName}
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
          ✅ Client Discharge Data Saved Successfully!
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Client Discharge Summary
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Discharge Date"
            name="clientDischargeDate"
            InputLabelProps={{ shrink: true }}
            value={form.clientDischargeDate}
            onChange={handleChange}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} md={9}>
          <TextField
            fullWidth
            multiline
            label="Primary Diagnosis"
            name="clientDischargeDiag"
            value={form.clientDischargeDiag}
            onChange={handleChange}
            disabled={loading}
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
            value={form[section.name]}
            onChange={handleChange}
            disabled={loading}
          />
        </Box>
      ))}

      {/* ✅ Only show save button in non-export mode */}
      {!exportMode && (
        <Button 
          variant="contained" 
          size="large" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      )}
    </Box>
  );
};

export default Discharge;