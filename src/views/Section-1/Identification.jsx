import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Tabs, Tab, Typography, Button, Grid, Card, InputLabel, OutlinedInput, 
  Modal, IconButton, Chip, LinearProgress, Alert, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
  ListItemSecondaryAction, Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Visibility as ViewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { azureBlobService } from '../../services/azureBlobService'; // Import our service
import logUserAction from '../../config/logAction';
import ClientFace from './ClientFace';
import Referrals from './Referrals';
import Discharge from './Discharge';

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
  
  // ✅ Simple state
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

  // ✅ Simple selectors
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const reduxUser = useSelector((state) => state?.auth?.user);

  // ✅ Simple computed values
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = forceMockData || (isDevelopment && !import.meta.env.VITE_USE_REAL_DATA);
  
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;

  const exportRef = useRef();

  // ✅ Load files when client changes
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
      // Load files from Azure Blob Storage
      azureBlobService.listClientFiles(currentClient.clientID)
        .then((filesData) => {
          console.log('📁 Azure files loaded:', filesData);
          setFiles(Array.isArray(filesData) ? filesData : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("❌ Error fetching files from Azure:", err);
          setError("Failed to load client files from Azure storage");
          setFiles([]);
          setLoading(false);
        });
    }
  }, [currentClient?.clientID, shouldUseMockData]);

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
    if (!fileToUpload || !currentClient) {
      setError("Please select a file and ensure a client is selected.");
      return;
    }

    setUploadProgress((prev) => ({ ...prev, [docType]: 0 }));
    setError(null);

    try {
      if (shouldUseMockData) {
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
          currentClient.clientID, 
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
        if (currentUser && currentUser.id !== 'mock-user-123') {
          await logUserAction(currentUser, "UPLOAD_DOCUMENT", {
            clientID: currentClient.clientID,
            docType,
            fileName: uploadResult.fileName,
            blobName: uploadResult.blobName
          });
        }
      }
      
      // Clear the file input
      setFilesToUpload((prev) => ({ ...prev, [docType]: null }));
      
    } catch (err) {
      console.error(`❌ Upload Error for ${docType}:`, err);
      setError(`Failed to upload ${fileToUpload.name}: ${err.message}`);
    } finally {
      setUploadProgress((prev) => ({ ...prev, [docType]: null }));
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      if (shouldUseMockData) {
        // Mock delete
        setFiles((prev) => prev.filter(f => f.fileName !== fileToDelete.fileName));
        setSuccessMessage(`🗑️ ${fileToDelete.fileName} deleted successfully (Mock)`);
      } else {
        // Real Azure delete
        await azureBlobService.deleteFile(fileToDelete.blobName);
        setFiles((prev) => prev.filter(f => f.blobName !== fileToDelete.blobName));
        setSuccessMessage(`🗑️ ${fileToDelete.fileName} deleted successfully`);

        // Log user action
        if (currentUser && currentUser.id !== 'mock-user-123') {
          await logUserAction(currentUser, "DELETE_DOCUMENT", {
            clientID: currentClient.clientID,
            fileName: fileToDelete.fileName,
            blobName: fileToDelete.blobName
          });
        }
      }
    } catch (err) {
      console.error("❌ Delete Error:", err);
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

  const handleDownloadFile = async (file) => {
    try {
      if (shouldUseMockData) {
        // Mock download
        window.open(file.blobUrl, '_blank');
        return;
      }

      const downloadUrl = await azureBlobService.generateDownloadUrl(file.blobName);
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error("❌ Download Error:", err);
      setError(`Failed to download ${file.fileName}: ${err.message}`);
    }
  };

  const handleExport = async () => {
    if (!currentClient) {
      setError("Please select a client first.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Configure PDF options
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${currentClient.clientLastName}_${currentClient.clientFirstName}_Complete_Chart.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Generate PDF
      await html2pdf().set(opt).from(exportRef.current).save();
      
      clearInterval(progressInterval);
      setExportProgress(100);
      setSuccessMessage('📄 PDF exported successfully!');

      // Log user action
      if (currentUser && currentUser.id !== 'mock-user-123') {
        await logUserAction(currentUser, "EXPORT_CLIENT_CHART", {
          clientID: currentClient.clientID,
          exportType: 'PDF',
          filename: opt.filename
        });
      }

    } catch (err) {
      console.error("❌ PDF Export Error:", err);
      setError(`Failed to export PDF: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 2000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    const ext = file.fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    return '📎';
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
      {/* Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock data for {currentClient.clientFirstName} {currentClient.clientLastName}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Export Progress */}
      {isExporting && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ width: '100%' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Exporting PDF... {exportProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={exportProgress} />
          </Box>
        </Alert>
      )}

      <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
        <Tab label="Client Face Sheet" />
        <Tab label="Identification Documents" />
        <Tab label="Referrals" />
        <Tab label="Discharge" />
        <Tab label="Export Chart" />
        <Tab label={`${currentClient.clientFirstName} ${currentClient.clientLastName}`} disabled />
      </Tabs>

      {tabIndex === 0 && <Box p={3}><ClientFace /></Box>}
      
      {tabIndex === 1 && (
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Document Upload & Management
          </Typography>
          
          {/* Upload Section */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {DOC_TYPES.map((docTitle) => (
              <Grid item xs={12} sm={6} md={4} key={docTitle}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {docTitle}
                    </Typography>
                    
                    <OutlinedInput
                      type="file"
                      onChange={(e) => handleFileSelect(docTitle, e.target.files[0])}
                      fullWidth
                      sx={{ mb: 1 }}
                      inputProps={{
                        accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif'
                      }}
                    />
                    
                    {filesToUpload[docTitle] && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Selected: {filesToUpload[docTitle].name}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          Size: {formatFileSize(filesToUpload[docTitle].size)}
                        </Typography>
                      </Box>
                    )}
                    
                    {uploadProgress[docTitle] !== null && uploadProgress[docTitle] !== undefined && (
                      <Box sx={{ mb: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress[docTitle]} />
                        <Typography variant="caption" color="text.secondary">
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
                      disabled={!filesToUpload[docTitle] || uploadProgress[docTitle] !== null}
                    >
                      {uploadProgress[docTitle] !== null ? "Uploading..." : "Upload"}
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
                <h1>Client Chart - {currentClient.clientFirstName} {currentClient.clientLastName}</h1>
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