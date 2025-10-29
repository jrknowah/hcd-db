import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Alert,
  IconButton,
  Paper,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  BugReport as DebugIcon
} from '@mui/icons-material';

// Import from centralized filesSlice
import {
  uploadFile,
  fetchClientFiles,
  deleteFile,
  downloadFile,
  clearError,
  clearSuccess,
  selectFiles,
  selectFilesUploading,
  selectFilesError,
  selectFilesSuccess,
  selectUploadProgress,
  selectFilesDeleting
} from '../../backend/store/slices/filesSlice';

// Authorization form document types
const AUTH_FORM_DOC_TYPES = [
  "Patient Orientation Information Sheet",
  "Client Rights",
  "Consent for Treatment and Services",
  "Housing Pre-Screen Form",
  "LA County Notice Of Private Practices",
  "LA HMIS Consent",
  "Client PHI Release",
  "Rules of Residence & Security Policy",
  "Authorization To Share Information",
  "Termination Policy & Procedure",
  "Advance Healthcare Directive Form",
  "Client Grievances",
  "Authorization For Use and/or Disclosure of Health/Mental Health Information",
  "Consent to Taking / Sharing Photograph",
  "Interim Housing (Shelter) Agreement",
  "Other Authorization Forms"
];

const AuthSigArchive = ({ clientID: propClientID }) => {
  const dispatch = useDispatch();
  const clientID = propClientID;
  
  // Redux selectors
  const files = useSelector(selectFiles);
  const uploading = useSelector(selectFilesUploading);
  const error = useSelector(selectFilesError);
  const successMessage = useSelector(selectFilesSuccess);
  const uploadProgress = useSelector(selectUploadProgress);
  const deleting = useSelector(selectFilesDeleting);
  
  // Local state
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState("Patient Orientation Information Sheet");
  const [dragOver, setDragOver] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Fetch files on mount
  useEffect(() => {
    if (clientID) {
      console.log('✅ Fetching files for client:', clientID);
      setIsLoading(true);
      dispatch(fetchClientFiles({ 
        clientID, 
        formType: 'authorization-forms' 
      }))
        .unwrap()
        .then(() => {
          console.log('✅ Files fetched successfully');
        })
        .catch((err) => {
          console.error('❌ Error fetching files:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [dispatch, clientID]);

  // Handle success messages
  useEffect(() => {
    if (successMessage) {
      setShowSuccessSnackbar(true);
      const timer = setTimeout(() => {
        dispatch(clearSuccess());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  // File selection handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        console.error('❌ File too large:', file.size);
        return;
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        console.error('❌ Invalid file type:', file.type);
        return;
      }
      
      console.log('✅ File selected:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      setSelectedFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect({ target: { files: [file] } });
    }
  };

  // 🔍 DIRECT UPLOAD - Bypass Redux to debug
  const handleDirectUpload = async () => {
    if (!selectedFile || !clientID) {
      console.error('❌ Missing file or clientID');
      return;
    }

    console.log('🔍 ========== DIRECT UPLOAD DEBUG ==========');
    console.log('🔍 Testing direct axios upload to backend');
    
    try {
      // Create FormData - TEST MULTIPLE VARIATIONS
      const formData = new FormData();
      
      console.log('📋 Creating FormData with variations...');
      
      // Try 'file' (most common)
      formData.append('file', selectedFile);
      console.log('   ✓ Added as "file"');
      
      // Also try common alternatives
      // formData.append('document', selectedFile);  // Uncomment to test
      // formData.append('upload', selectedFile);     // Uncomment to test
      
      formData.append('clientID', clientID);
      formData.append('formType', 'authorization-forms');
      formData.append('documentType', selectedDocType);
      formData.append('fileName', selectedFile.name);

      // Log all FormData entries
      console.log('📋 FormData contents:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`   ${key}:`, {
            name: value.name,
            type: value.type,
            size: value.size
          });
        } else {
          console.log(`   ${key}:`, value);
        }
      }

      // Get API URL
      const apiUrl = import.meta.env.VITE_API_URL || 'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net';
      const uploadUrl = `${apiUrl}/api/upload`;
      
      console.log('🌐 Upload URL:', uploadUrl);
      console.log('📤 Sending request...');

      // Make direct axios call
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📊 Upload progress: ${percentCompleted}%`);
        }
      });

      console.log('✅ Upload successful!');
      console.log('📥 Response:', response.data);

      // Store debug info
      setDebugInfo({
        success: true,
        response: response.data,
        timestamp: new Date().toISOString()
      });
      setShowDebug(true);

      alert('✅ Direct upload successful! Check console for details.');

      // Refresh files
      dispatch(fetchClientFiles({ 
        clientID, 
        formType: 'authorization-forms' 
      }));
      
    } catch (error) {
      console.error('❌ Direct upload failed!');
      console.error('📋 Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });

      if (error.response) {
        console.error('🔍 Backend responded with:', error.response.data);
        console.error('🔍 Status code:', error.response.status);
        console.error('🔍 Headers:', error.response.headers);
      } else if (error.request) {
        console.error('🔍 Request was made but no response:', error.request);
      } else {
        console.error('🔍 Error setting up request:', error.message);
      }

      // Store debug info
      setDebugInfo({
        success: false,
        error: {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        },
        timestamp: new Date().toISOString()
      });
      setShowDebug(true);

      alert('❌ Direct upload failed! Check console for details.');
    }

    console.log('🔍 ========== END DEBUG ==========');
  };

  // Regular Redux upload
  const handleFileUpload = async () => {
    if (!selectedFile || !clientID) {
      console.error('❌ Missing file or clientID');
      return;
    }

    try {
      console.log('📤 Starting Redux upload...');
      console.log('   Client ID:', clientID);
      console.log('   File:', selectedFile.name);
      console.log('   Document Type:', selectedDocType);

      const formData = new FormData();
      formData.append('file', selectedFile);  // ✅ Critical: must be 'file'
      formData.append('clientID', clientID);
      formData.append('formType', 'authorization-forms');
      formData.append('documentType', selectedDocType);
      formData.append('fileName', selectedFile.name);

      console.log('📋 FormData prepared, dispatching upload action...');

      await dispatch(uploadFile(formData)).unwrap();
      
      console.log('✅ Redux upload successful');
      
      setSelectedFile(null);
      
      dispatch(fetchClientFiles({ 
        clientID, 
        formType: 'authorization-forms' 
      }));
      
    } catch (error) {
      console.error('❌ Redux upload failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status
      });
    }
  };

  // Delete handlers
  const handleDeleteClick = (file) => {
    setFileToDelete(file);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      await dispatch(deleteFile({
        clientID,
        blobUrl: fileToDelete.blobUrl,
        fileName: fileToDelete.fileName
      })).unwrap();
      
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
      
      dispatch(fetchClientFiles({ 
        clientID, 
        formType: 'authorization-forms' 
      }));
      
    } catch (error) {
      console.error('❌ Delete failed:', error);
    }
  };

  // Download handler
  const handleDownload = async (file) => {
    try {
      await dispatch(downloadFile({
        blobUrl: file.blobUrl,
        fileName: file.fileName
      })).unwrap();
    } catch (error) {
      console.error('❌ Download failed:', error);
    }
  };

  // View handler
  const handleView = (file) => {
    window.open(file.blobUrl, '_blank');
  };

  // Filter files
  const authFiles = files.filter(file => 
    file.formType === 'authorization-forms'
  );

  // No client selected
  if (!clientID) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography variant="h6">No Client Selected</Typography>
          <Typography>
            Please select a client from Section 1 to manage authorization form archives.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Authorization Forms Archive - DEBUG MODE
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Client ID: {clientID}
          </Typography>
        </Box>
      </Box>

      {/* Debug Info Alert */}
      {showDebug && debugInfo && (
        <Alert 
          severity={debugInfo.success ? "success" : "error"}
          sx={{ mb: 2 }}
          onClose={() => setShowDebug(false)}
        >
          <Typography variant="h6">
            {debugInfo.success ? '✅ Debug Upload Successful!' : '❌ Debug Upload Failed'}
          </Typography>
          <Typography variant="body2" component="pre" sx={{ mt: 1, overflow: 'auto' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </Typography>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => dispatch(clearError())}
        >
          {error}
        </Alert>
      )}

      {/* Upload Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            {/* Document Type Selector */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  label="Document Type"
                  disabled={uploading}
                >
                  {AUTH_FORM_DOC_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Upload Area */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: dragOver ? 'primary.main' : 'grey.300',
                  bgcolor: dragOver ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                
                {selectedFile ? (
                  <Box>
                    <FileIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body1" fontWeight="bold">
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body1">
                      Drag & drop or click to browse
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF, JPG, PNG (Max 10MB)
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Upload Progress */}
            {uploading && (
              <Grid item xs={12}>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Uploading... {uploadProgress}%
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Upload Buttons - DUAL MODE */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<UploadIcon />}
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploading}
                    color="primary"
                  >
                    {uploading ? 'Uploading...' : 'Upload via Redux'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<DebugIcon />}
                    onClick={handleDirectUpload}
                    disabled={!selectedFile || uploading}
                    color="secondary"
                  >
                    Debug Direct Upload
                  </Button>
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Use "Debug Direct Upload" to bypass Redux and see exact backend error
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Archived Documents ({authFiles.length})
          </Typography>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : authFiles.length === 0 ? (
            <Alert severity="info">No archived documents yet.</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {authFiles.map((file, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileIcon color="primary" />
                          <Typography variant="body2">
                            {file.fileName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={file.documentType || 'Unknown'} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(file.uploadDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton 
                            size="small" 
                            onClick={() => handleView(file)}
                            color="primary"
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownload(file)}
                            color="primary"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteClick(file)}
                            disabled={deleting}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{fileToDelete?.fileName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSuccessSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccessSnackbar(false)} 
          severity="success"
          icon={<SuccessIcon />}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AuthSigArchive;