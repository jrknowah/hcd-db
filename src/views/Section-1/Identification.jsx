import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Tabs, Tab, Typography, Button, Grid, Card, InputLabel, OutlinedInput
} from '@mui/material';
import { useSelector } from 'react-redux';
import axios from 'axios';
import logUserAction from '../../config/logAction';
import ClientFace from './ClientFace';
import Referrals from './Referrals';
import Discharge from './Discharge';
import html2pdf from 'html2pdf.js';

// ✅ Move all static data outside component
const MOCK_CLIENT = {
  clientID: 'mock-123',
  clientFirstName: 'John',
  clientLastName: 'Doe',
};

const MOCK_USER = {
  id: 'mock-user-123',
  name: 'Test User',
};

const DOC_TYPES = [
  "Identification Card", "Driver's License", "Social Security Card", "Permanent Resident Alien Card",
  "Medi-Cal Benefits", "Medicare", "TB Clearance", "Income", "Other"
];

const MOCK_FILES = [
  { fileName: 'mock_id_card.pdf', filePath: '/mock/path/id_card.pdf' },
  { fileName: 'mock_drivers_license.jpg', filePath: '/mock/path/drivers_license.jpg' },
];

const Identification = () => {
  const API_URL = import.meta.env.VITE_APP_API_URL;
  
  // ✅ Simple state - no complex dependencies
  const [forceMockData, setForceMockData] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [files, setFiles] = useState([]);
  const [filesToUpload, setFilesToUpload] = useState({});
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Simple selectors - just get the data, don't transform it
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const reduxUser = useSelector((state) => state?.auth?.user);

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = forceMockData || (isDevelopment && !import.meta.env.VITE_USE_REAL_DATA);
  
  // ✅ Determine what client/user to use
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;

  const exportRef = useRef();

  // ✅ Simple useEffect with minimal dependencies
  useEffect(() => {
    if (!currentClient?.clientID) return;

    setLoading(true);
    setError(null);
    
    if (shouldUseMockData) {
      // Mock data
      const timer = setTimeout(() => {
        setFiles(MOCK_FILES);
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Real API call
      axios.get(`${API_URL}/files/${currentClient.clientID}`)
        .then((res) => {
          setFiles(res.data || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("❌ Error fetching files:", err);
          setError("Failed to load client files");
          setLoading(false);
        });
    }
  }, [currentClient?.clientID, shouldUseMockData, API_URL]);

  const handleTabChange = (event, newValue) => setTabIndex(newValue);

  const handleFileSelect = (docType, file) => {
    setFilesToUpload((prev) => ({ ...prev, [docType]: file }));
  };

  const handleFileUpload = async (docType) => {
    const fileToUpload = filesToUpload[docType];
    if (!fileToUpload || !currentClient) {
      alert("Please select a file and ensure a client is selected.");
      return;
    }

    setUploadingDocType(docType);

    try {
      if (shouldUseMockData) {
        // Mock upload
        await new Promise(resolve => setTimeout(resolve, 2000));
        setFiles((prev) => [
          ...prev,
          { fileName: fileToUpload.name, filePath: `/mock/uploads/${fileToUpload.name}` },
        ]);
        alert(`✅ ${fileToUpload.name} uploaded as ${docType} (Mock)`);
      } else {
        // Real upload
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("clientID", currentClient.clientID);
        formData.append("docType", docType);

        const res = await axios.post(`${API_URL}/api/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setFiles((prev) => [
          ...prev,
          { fileName: fileToUpload.name, filePath: res.data.filePath },
        ]);

        if (currentUser) {
          await logUserAction(currentUser, "UPLOAD_DOCUMENT", {
            clientID: currentClient.clientID,
            docType,
            fileName: fileToUpload.name,
          });
        }

        alert(`✅ ${fileToUpload.name} uploaded as ${docType}`);
      }
    } catch (err) {
      console.error("❌ Upload Error:", err);
      alert(`Failed to upload ${fileToUpload.name}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleExport = () => {
    if (!currentClient) {
      alert("Please select a client first.");
      return;
    }

    // ✅ Better export implementation
    const exportContent = exportRef.current;
    if (!exportContent) {
      alert("Export content not found.");
      return;
    }

    // Show the export content temporarily
    exportContent.style.display = "block";
    exportContent.style.position = "absolute";
    exportContent.style.left = "-9999px";
    exportContent.style.top = "0";

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `${currentClient.clientLastName}_${currentClient.clientFirstName}_ClientChart_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'in', 
        format: 'letter', 
        orientation: 'portrait',
        compress: true
      }
    };

    html2pdf()
      .set(opt)
      .from(exportContent)
      .save()
      .then(() => {
        // Hide the export content again
        exportContent.style.display = "none";
        alert("✅ PDF exported successfully!");
      })
      .catch((error) => {
        console.error("Export error:", error);
        alert("❌ Failed to export PDF. Please try again.");
        exportContent.style.display = "none";
      });
  };

  // ✅ No client selected
  if (!currentClient) {
    return (
      <Card sx={{ padding: 2 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {isDevelopment ? "Development Mode: No Client Selected" : "Please select a client to view identification documents."}
        </Typography>
        {isDevelopment && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Mock data status: {shouldUseMockData ? "Enabled ✅" : "Disabled ❌"}
            </Typography>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => setForceMockData(!forceMockData)}
              sx={{ mt: 1 }}
            >
              {forceMockData ? "Disable" : "Enable"} Mock Data
            </Button>
          </Box>
        )}
      </Card>
    );
  }

  return (
    <Card sx={{ padding: 2 }}>
      {shouldUseMockData && (
        <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            🔧 Development Mode: Using mock data for {currentClient.clientFirstName} {currentClient.clientLastName}
          </Typography>
        </Box>
      )}

      <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
        <Tab label="Client Face Sheet" />
        <Tab label="Identification" />
        <Tab label="Referrals" />
        <Tab label="Discharge" />
        <Tab label="Export Chart" />
        <Tab label={`${currentClient.clientFirstName} ${currentClient.clientLastName}`} disabled />
      </Tabs>

      {tabIndex === 0 && <Box p={3}><ClientFace /></Box>}
      
      {tabIndex === 1 && (
        <Box p={3}>
          {error && (
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
          )}
          
          <Grid container spacing={2}>
            {DOC_TYPES.map((docTitle) => (
              <Grid item xs={12} sm={6} md={4} key={docTitle}>
                <Card sx={{ padding: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>{docTitle}</Typography>
                  <OutlinedInput
                    type="file"
                    onChange={(e) => handleFileSelect(docTitle, e.target.files[0])}
                    fullWidth
                  />
                  {filesToUpload[docTitle] && (
                    <Typography variant="caption" color="text.secondary">
                      Selected: {filesToUpload[docTitle].name}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleFileUpload(docTitle)}
                    disabled={uploadingDocType === docTitle}
                    sx={{ mt: 1 }}
                  >
                    {uploadingDocType === docTitle ? "Uploading..." : "Upload"}
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box mt={4}>
            <Typography variant="h6">Uploaded Documents</Typography>
            {loading ? (
              <Typography variant="body2">Loading files...</Typography>
            ) : files.length === 0 ? (
              <Typography variant="body2">No files uploaded yet.</Typography>
            ) : (
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    <a href={file.filePath} target="_blank" rel="noopener noreferrer">
                      {file.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Box>
        </Box>
      )}
      
      {tabIndex === 2 && <Box p={3}><Referrals /></Box>}
      {tabIndex === 3 && <Box p={3}><Discharge /></Box>}
      
      {tabIndex === 4 && (
        <Box p={3}>
          <Typography variant="h5" gutterBottom>Export Client Chart</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Export a comprehensive PDF containing all client information including face sheet, referrals, and discharge summary.
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Client:</strong> {currentClient.clientFirstName} {currentClient.clientLastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                <strong>Export Date:</strong> {new Date().toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>

          <Button 
            variant="contained" 
            size="large"
            sx={{ mt: 2 }} 
            onClick={handleExport}
          >
            📄 Export Complete Chart to PDF
          </Button>

          {/* ✅ Improved export container with better styling */}
          <div ref={exportRef} style={{ 
            display: "none",
            backgroundColor: "#ffffff",
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            lineHeight: "1.4",
            color: "#000000"
          }}>
            {/* Export Header */}
            <div style={{ 
              textAlign: "center", 
              marginBottom: "20px", 
              borderBottom: "2px solid #333", 
              paddingBottom: "10px" 
            }}>
              <h1 style={{ margin: "0", fontSize: "24px", color: "#333" }}>
                Client Chart
              </h1>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                {currentClient.clientFirstName} {currentClient.clientLastName} - Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Client Face Sheet Section */}
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                backgroundColor: "#f5f5f5", 
                padding: "10px", 
                margin: "0 0 15px 0", 
                fontSize: "18px",
                borderLeft: "4px solid #1976d2"
              }}>
                Client Face Sheet
              </h2>
              <ClientFace exportMode={true} />
            </div>

            {/* Referrals Section */}
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                backgroundColor: "#f5f5f5", 
                padding: "10px", 
                margin: "0 0 15px 0", 
                fontSize: "18px",
                borderLeft: "4px solid #1976d2"
              }}>
                Referrals
              </h2>
              <Referrals exportMode={true} />
            </div>

            {/* Discharge Section */}
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                backgroundColor: "#f5f5f5", 
                padding: "10px", 
                margin: "0 0 15px 0", 
                fontSize: "18px",
                borderLeft: "4px solid #1976d2"
              }}>
                Discharge Summary
              </h2>
              <Discharge exportMode={true} />
            </div>

            {/* Footer */}
            <div style={{ 
              textAlign: "center", 
              marginTop: "30px", 
              paddingTop: "10px", 
              borderTop: "1px solid #ccc",
              fontSize: "10px",
              color: "#666"
            }}>
              <p>This document contains confidential patient information. Handle according to HIPAA guidelines.</p>
              <p>Generated by Healthcare Management System - {new Date().toLocaleString()}</p>
            </div>
          </div>
        </Box>
      )}
    </Card>
  );
};

export default Identification;