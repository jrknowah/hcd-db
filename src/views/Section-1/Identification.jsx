import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Tabs, Tab, Typography, Button, Grid, Card, InputLabel, OutlinedInput, 
  Modal, IconButton, Chip, LinearProgress, Alert, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  ListItemSecondaryAction, Tooltip, CircularProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Visibility as ViewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import html2pdf from 'html2pdf.js';
import { azureBlobService } from '../../backend/services/azureBlobService';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import logUserAction from '../../backend/config/logAction';
import ClientFace from './ClientFace';
import Referrals from './Referrals';
import Discharge from './Discharge';

const DOC_TYPES = [
  "Identification Card", "Driver's License", "Social Security Card", "Permanent Resident Alien Card",
  "Medi-Cal Benefits", "Medicare", "TB Clearance", "Income", "Other"
];

const MOCK_FILES = [
  { 
    fileName: 'mock_id_card.pdf', 
    blobUrl: '/mock/path/id_card.pdf',
    docType: 'Identification Card',
    uploadDate: '2024-03-15T10:30:00Z',
    fileSize: 1024000
  },
  { 
    fileName: 'mock_drivers_license.jpg', 
    blobUrl: '/mock/path/drivers_license.jpg',
    docType: "Driver's License",
    uploadDate: '2024-03-14T15:45:00Z',
    fileSize: 2048000
  },
];

const Identification = () => {
  const API_URL = import.meta.env.VITE_APP_API_URL;
  
  // ✅ USE THE HOOK - Replaces all client management logic
  const { clientID, client, hasClient, user, shouldUseMockData, isDevelopment } = useClientPersistence();
  
  // ✅ CRITICAL FIX: Add loading guard at component level
  if (!hasClient || !client) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', p: 4 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading client data...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please wait while we retrieve the client information
        </Typography>
      </Box>
    );
  }
  
  // State management
  const [forceMockData, setForceMockData] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [files, setFiles] = useState([]);
  const [filesToUpload, setFilesToUpload] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // PDF Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // File management states
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ✅ Allow local override of mock data for testing
  const effectiveMockData = forceMockData || shouldUseMockData;

  const exportRef = useRef();

  // Load files when client changes
  useEffect(() => {
    if (!client?.clientID) return;

    setLoading(true);
    setError(null);
    
    if (effectiveMockData) {
      // Mock data
      const timer = setTimeout(() => {
        setFiles(MOCK_FILES);
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Load files from Azure Blob Storage
      azureBlobService.listClientFiles(client.clientID)
        .then((filesData) => {
          console.log('📂 Azure files loaded:', filesData);
          setFiles(Array.isArray(filesData) ? filesData : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("❌ Error fetching files from Azure:", err);
          
          // More detailed error message
          const errorMsg = err.response?.data?.message 
            || err.message 
            || "Failed to load client files from Azure storage";
          
          setError(`Error loading files: ${errorMsg}. Please try again or contact support.`);
          setFiles([]);
          setLoading(false);
          
          // Optional: Fall back to mock data in development
          if (isDevelopment) {
            console.warn("⚠️ Falling back to mock data due to API error");
            setFiles(MOCK_FILES);
            setForceMockData(true);
          }
        });
    }
  }, [client?.clientID, effectiveMockData, isDevelopment]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleTabChange = (event, newValue) => setTabIndex(newValue);

  const handleFileSelect = (docType, file) => {
    if (!file) return;
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError(`File "${file.name}" is too large. Maximum size is 10MB.`);
      return;
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError(`File type "${file.type}" is not supported. Please upload PDF, Word, or image files.`);
      return;
    }

    setError(null);
    setFilesToUpload((prev) => ({ ...prev, [docType]: file }));
  };

  const handleFileUpload = async (docType) => {
    const fileToUpload = filesToUpload[docType];
    if (!fileToUpload || !client) {
      setError("Please select a file and ensure a client is selected.");
      return;
    }

    setUploadProgress((prev) => ({ ...prev, [docType]: 0 }));
    setError(null);

    try {
      if (effectiveMockData) {
        // Mock upload with progress simulation
        for (let i = 0; i <= 100; i += 10) {
          setUploadProgress((prev) => ({ ...prev, [docType]: i }));
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        const mockFile = {
          fileName: fileToUpload.name,
          blobUrl: `/mock/uploads/${fileToUpload.name}`,
          docType: docType,
          uploadDate: new Date().toISOString(),
          fileSize: fileToUpload.size
        };
        
        setFiles((prev) => [mockFile, ...prev]);
        setSuccessMessage(`✅ ${fileToUpload.name} uploaded successfully (Mock)`);
      } else {
        // Real Azure upload
        setUploadProgress((prev) => ({ ...prev, [docType]: 20 }));
        
        const uploadResult = await azureBlobService.uploadFile(
          fileToUpload, 
          client.clientID, 
          docType
        );
        
        setUploadProgress((prev) => ({ ...prev, [docType]: 100 }));
        
        // Add to files list
        const newFile = {
          fileName: uploadResult.fileName,
          blobUrl: uploadResult.blobUrl,
          blobName: uploadResult.blobName,
          docType: docType,
          uploadDate: uploadResult.uploadDate,
          fileSize: uploadResult.fileSize
        };
        
        setFiles((prev) => [newFile, ...prev]);
        setSuccessMessage(`✅ ${uploadResult.fileName} uploaded successfully to Azure`);

        // Log user action
        if (user && user.id !== 'mock-user-123') {
          await logUserAction(user, "UPLOAD_DOCUMENT", {
            clientID: client.clientID,
            docType,
            fileName: uploadResult.fileName,
            blobName: uploadResult.blobName
          });
        }
      }
      
      // Clear the uploaded file from state
      setFilesToUpload((prev) => {
        const updated = { ...prev };
        delete updated[docType];
        return updated;
      });
      
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[docType];
          return updated;
        });
      }, 2000);
      
    } catch (err) {
      console.error("❌ Error uploading file:", err);
      
      const errorMsg = err.response?.data?.message 
        || err.message 
        || "Failed to upload file";
      
      setError(`Upload failed: ${errorMsg}`);
      
      setUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[docType];
        return updated;
      });
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      if (effectiveMockData) {
        // Mock download
        alert(`Mock download: ${file.fileName}`);
        return;
      }

      const downloadUrl = await azureBlobService.getDownloadUrl(file.blobName || file.fileName, client.clientID);
      
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (user && user.id !== 'mock-user-123') {
        await logUserAction(user, "DOWNLOAD_DOCUMENT", {
          clientID: client.clientID,
          fileName: file.fileName,
          blobName: file.blobName
        });
      }
    } catch (err) {
      console.error("❌ Error downloading file:", err);
      setError(`Failed to download ${file.fileName}: ${err.message}`);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      if (effectiveMockData) {
        // Mock delete
        setFiles((prev) => prev.filter(f => f.fileName !== fileToDelete.fileName));
        setSuccessMessage(`✅ ${fileToDelete.fileName} deleted successfully (Mock)`);
      } else {
        await azureBlobService.deleteFile(fileToDelete.blobName || fileToDelete.fileName, client.clientID);
        setFiles((prev) => prev.filter(f => f.fileName !== fileToDelete.fileName));
        setSuccessMessage(`✅ ${fileToDelete.fileName} deleted successfully`);
        
        if (user && user.id !== 'mock-user-123') {
          await logUserAction(user, "DELETE_DOCUMENT", {
            clientID: client.clientID,
            fileName: fileToDelete.fileName,
            blobName: fileToDelete.blobName
          });
        }
      }
    } catch (err) {
      console.error("❌ Error deleting file:", err);
      setError(`Failed to delete ${fileToDelete.fileName}: ${err.message}`);
    } finally {
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    }
  };

  const handlePreviewFile = (file) => {
    setFilePreview(file);
    setPreviewOpen(true);
  };

  const getFileIcon = (file) => {
    const fileName = file.fileName.toLowerCase();
    if (fileName.endsWith('.pdf')) return <PdfIcon color="error" />;
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) return <ViewIcon color="primary" />;
    return <UploadIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const element = exportRef.current;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const opt = {
        margin: 10,
        filename: `client-chart-${client.clientID}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
      
      clearInterval(progressInterval);
      setExportProgress(100);
      setSuccessMessage('✅ Client chart exported successfully!');
      
      if (user && user.id !== 'mock-user-123') {
        await logUserAction(user, "EXPORT_CHART", {
          clientID: client.clientID
        });
      }
    } catch (err) {
      console.error("❌ Error exporting PDF:", err);
      setError(`Failed to export chart: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Client Identification & Documents
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {/* ✅ FIXED: Added safe null checks */}
        Viewing documents for: <strong>{client?.clientFirstName || 'Unknown'} {client?.clientLastName || 'Client'}</strong>
        {clientID && ` (ID: ${clientID})`}
      </Typography>

      {/* Success/Error Messages */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Mock Data Toggle for Development */}
      {isDevelopment && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Development Mode: 
          <Button 
            size="small" 
            onClick={() => setForceMockData(!forceMockData)}
            sx={{ ml: 2 }}
          >
            {effectiveMockData ? "Switch to Real Data" : "Switch to Mock Data"}
          </Button>
        </Alert>
      )}

      <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Client Face Sheet" />
        <Tab label="Documents & Uploads" />
        <Tab label="Referrals" />
        <Tab label="Discharge" />
        <Tab label="Export Complete Chart" />
      </Tabs>

      {tabIndex === 0 && <Box p={3}><ClientFace /></Box>}
      
      {tabIndex === 1 && (
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Upload Client Documents
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload supporting documents for the client. Accepted formats: PDF, Word, Images (JPEG, PNG, GIF). Max file size: 10MB.
          </Typography>

          {/* Upload Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {DOC_TYPES.map((docTitle) => (
              <Grid item xs={12} sm={6} md={4} key={docTitle}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {docTitle}
                    </Typography>
                    <InputLabel htmlFor={`file-${docTitle}`}>
                      Choose File
                    </InputLabel>
                    <OutlinedInput
                      id={`file-${docTitle}`}
                      type="file"
                      fullWidth
                      onChange={(e) => handleFileSelect(docTitle, e.target.files[0])}
                      sx={{ mt: 1 }}
                    />
                    {filesToUpload[docTitle] && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Selected: {filesToUpload[docTitle].name}
                      </Typography>
                    )}
                    {uploadProgress[docTitle] !== undefined && (
                      <Box sx={{ mt: 2 }}>
                        <LinearProgress variant="determinate" value={uploadProgress[docTitle]} />
                        <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                          Uploading... {uploadProgress[docTitle]}%
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<UploadIcon />}
                      onClick={() => handleFileUpload(docTitle)}
                      disabled={!filesToUpload[docTitle] || uploadProgress[docTitle] !== undefined}
                    >
                      {uploadProgress[docTitle] !== undefined ? "Uploading..." : "Upload"}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Files List Section */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Uploaded Documents ({files.length})
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LinearProgress sx={{ flexGrow: 1 }} />
                <Typography variant="body2">Loading files...</Typography>
              </Box>
            ) : files.length === 0 ? (
              <Alert severity="info">
                No documents uploaded yet. Use the upload forms above to add client documents.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {files.map((file, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Typography variant="h6" component="span">
                            {getFileIcon(file)}
                          </Typography>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" noWrap title={file.fileName}>
                              {file.fileName}
                            </Typography>
                            <Chip 
                              label={file.docType} 
                              size="small" 
                              variant="outlined" 
                              sx={{ mb: 1 }}
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              Size: {formatFileSize(file.fileSize)}
                            </Typography>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Uploaded: {new Date(file.uploadDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                      
                      <CardActions>
                        <Tooltip title="Preview">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePreviewFile(file)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Download">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownloadFile(file)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => {
                              setFileToDelete(file);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>
      )}
      
      {tabIndex === 2 && <Box p={3}><Referrals /></Box>}
      {tabIndex === 3 && <Box p={3}><Discharge /></Box>}
      
      {tabIndex === 4 && (
        <Box p={3}>
          <Typography variant="h5" gutterBottom>
            Export Complete Client Chart
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Export the complete client chart including all sections to a comprehensive PDF file.
          </Typography>
          
          <Button 
            variant="contained" 
            size="large"
            startIcon={<PdfIcon />}
            onClick={handleExport}
            disabled={isExporting}
            sx={{ mb: 3 }}
          >
            {isExporting ? `Exporting... ${exportProgress}%` : "Export Complete Chart to PDF"}
          </Button>

          {/* Hidden export content */}
          <div ref={exportRef} style={{ display: "none" }}>
            <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
                {/* ✅ FIXED: Added safe null checks with optional chaining */}
                <h1>Client Chart - {client?.clientFirstName || 'Unknown'} {client?.clientLastName || 'Client'}</h1>
                <p>Generated on: {new Date().toLocaleDateString()}</p>
              </div>
              
              <div style={{ pageBreakAfter: 'always' }}>
                <h2>Client Face Sheet</h2>
                <ClientFace exportMode />
              </div>
              
              <div style={{ pageBreakAfter: 'always' }}>
                <h2>Referrals</h2>
                <Referrals exportMode />
              </div>
              
              <div>
                <h2>Discharge Summary</h2>
                <Discharge exportMode />
              </div>
            </div>
          </div>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteFile} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {filePreview?.fileName}
            </Typography>
            <IconButton onClick={() => setPreviewOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {filePreview && (
            <Box sx={{ textAlign: 'center' }}>
              {filePreview.fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                <img 
                  src={filePreview.blobUrl} 
                  alt={filePreview.fileName}
                  style={{ maxWidth: '100%', maxHeight: '500px' }}
                />
              ) : (
                <Box sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Preview not available for this file type
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadFile(filePreview)}
                  >
                    Download to View
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Identification;