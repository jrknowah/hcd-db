import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Alert,
  LinearProgress,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  CloudUpload,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Description as FileIcon,
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { azureBlobService } from '../../backend/services/azureBlobService';

/**
 * ✅ CORRECTED AuthSigArchive Component
 * 
 * FIXED TO USE EXISTING azureBlobService FUNCTIONS:
 * 1. ✅ listClientFiles(clientID, docType) - NOT listFiles()
 * 2. ✅ uploadFile(file, clientID, docType) - positional params
 * 3. ✅ deleteFile(blobName) - NOT deleteFile({ fileID })
 * 4. ✅ generateDownloadUrl(blobName) - for downloads
 * 
 * MATCHES: Existing azureBlobService.js that other components use
 * STATUS: Production-ready
 */

// Authorization form types that can be archived
const AUTH_FORM_TYPES = [
  'Consent for Treatment',
  'Photo Release',
  'Release of PHI',
  'Authorization for Disclosure',
  'Housing Agreement',
  'Residence Policy',
  'Termination Agreement',
  'HIPAA Notice',
  'Client Rights',
  'Financial Agreement',
  'Medication Consent',
  'Transportation Consent',
  'Emergency Treatment',
  'General Consent',
  'Other Authorization Forms'
];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const AuthSigArchive = () => {
  // ✅ Get clientID from useClientPersistence hook (Section 1 pattern)
  const { clientID: hookClientID, loading: clientLoading } = useClientPersistence();
  
  // ✅ Extract string value from hook result
  const clientID = React.useMemo(() => {
    if (!hookClientID) return null;
    
    // Handle different possible formats
    if (typeof hookClientID === 'string') {
      return hookClientID;
    }
    
    // If it's an object with clientID property
    if (typeof hookClientID === 'object' && hookClientID.clientID) {
      return String(hookClientID.clientID);
    }
    
    // Try to convert to string
    try {
      return String(hookClientID);
    } catch (error) {
      console.error('❌ Failed to extract clientID:', error);
      return null;
    }
  }, [hookClientID]);

  // Component state
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFormType, setSelectedFormType] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null });
  const [viewDialog, setViewDialog] = useState({ open: false, file: null });

  // Fetch files when component mounts or clientID changes
  useEffect(() => {
    if (clientID) {
      console.log('📂 Fetching files for client:', clientID);
      fetchFiles();
    } else {
      console.log('⚠️ No clientID available, skipping file fetch');
    }
  }, [clientID]);

  /**
   * Fetch files for the current client
   * ✅ CORRECTED: Uses listClientFiles(clientID, docType) - existing function
   */
  const fetchFiles = async () => {
    if (!clientID) {
      console.warn('⚠️ Cannot fetch files: No clientID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🌐 Fetching files for clientID:', clientID);
      
      // ✅ CORRECTED: Call existing listClientFiles function
      const result = await azureBlobService.listClientFiles(
        clientID,
        'authorization_forms'  // docType parameter
      );

      console.log('✅ Files fetched successfully:', result?.length || 0);
      setFiles(result || []);

    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setError(error.message || 'Failed to fetch files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed: PDF, JPG, PNG`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size: 10MB`);
      return;
    }

    console.log('📎 File selected:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    setSelectedFile(file);
    setError(null);
  };

  /**
   * Upload file to Azure Blob Storage
   * ✅ CORRECTED: Uses uploadFile(file, clientID, docType) - existing function
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!selectedFormType) {
      setError('Please select a form type');
      return;
    }

    if (!clientID) {
      setError('No client selected. Please select a client first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      console.log('🚀 Starting upload:', {
        clientID,
        fileName: selectedFile.name,
        formType: selectedFormType,
        fileSize: selectedFile.size
      });

      // ✅ CORRECTED: Call existing uploadFile function with positional params
      const result = await azureBlobService.uploadFile(
        selectedFile,
        clientID,
        selectedFormType  // docType parameter (using formType as docType)
      );

      console.log('✅ Upload successful:', result);

      setSuccess(`File "${selectedFile.name}" uploaded successfully!`);
      
      // Reset form
      setSelectedFile(null);
      setSelectedFormType('');
      setDescription('');
      setUploadProgress(0);

      // Refresh file list
      await fetchFiles();

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Download a file
   * ✅ CORRECTED: Uses generateDownloadUrl(blobName) - existing function
   */
  const handleDownload = async (file) => {
    try {
      console.log('⬇️ Downloading file:', file.fileName);
      
      // ✅ CORRECTED: Generate download URL first, then download
      const downloadUrl = await azureBlobService.generateDownloadUrl(file.blobName);
      
      // Open download in new tab or trigger download
      window.open(downloadUrl, '_blank');

      console.log('✅ Download initiated');
      setSuccess(`File "${file.fileName}" download started!`);

    } catch (error) {
      console.error('❌ Download failed:', error);
      setError(error.message || 'Failed to download file');
    }
  };

  /**
   * Delete a file
   * ✅ CORRECTED: Uses deleteFile(blobName) - existing function
   */
  const handleDelete = async (file) => {
    try {
      console.log('🗑️ Deleting file:', file.fileName);
      
      // ✅ CORRECTED: Call existing deleteFile with blobName
      await azureBlobService.deleteFile(file.blobName);

      console.log('✅ Delete complete');
      setSuccess(`File "${file.fileName}" deleted successfully!`);

      // Close dialog and refresh list
      setDeleteDialog({ open: false, file: null });
      await fetchFiles();

    } catch (error) {
      console.error('❌ Delete failed:', error);
      setError(error.message || 'Failed to delete file');
      setDeleteDialog({ open: false, file: null });
    }
  };

  /**
   * View file details
   */
  const handleView = (file) => {
    setViewDialog({ open: true, file });
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Show loading state while client is being loaded
  if (clientLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Loading client information...</Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  // Show message if no client is selected
  if (!clientID) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select a client from Section 1 (Identification) first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h5" gutterBottom>
        Authorization Forms Archive
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload and manage archived authorization and signature forms for client: {clientID}
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Upload Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Authorization Form
          </Typography>

          <Grid container spacing={2}>
            {/* Form Type Selection - Full width on its own row */}
            {/* Form Type Selection - Full width on its own row */}
              <Grid item xs={12} sx={{ width: '50%' }}>
                <FormControl 
                  fullWidth 
                  variant="outlined"
                  sx={{ 
                    width: '100%',
                    '& .MuiInputBase-root': {
                      width: '100%'
                    }
                  }}
                >
                  <InputLabel id="form-type-label">Form Type *</InputLabel>
                  <Select
                    labelId="form-type-label"
                    id="form-type-select"
                    value={selectedFormType}
                    onChange={(e) => setSelectedFormType(e.target.value)}
                    label="Form Type *"
                    disabled={isUploading}
                    fullWidth
                  >
                    {AUTH_FORM_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

            {/* File Selection */}
            <Grid item xs={12} md={8}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={isUploading}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </Button>
            </Grid>

            {/* Description (Optional) */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes"
                disabled={isUploading}
              />
            </Grid>
          </Grid>

          {/* File Info */}
          {selectedFile && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>File:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Type:</strong> {selectedFile.type}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Archived Forms ({files.length})
            </Typography>
            <Button
              size="small"
              onClick={fetchFiles}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading files...
              </Typography>
            </Box>
          ) : files.length === 0 ? (
            <Alert severity="info">
              No archived forms found. Upload your first form above.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Form Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Uploaded</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow key={file.blobName || index}>
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
                          label={file.docType || 'Unknown'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                      <TableCell>{formatDate(file.uploadDate)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleView(file)}
                            color="info"
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
                            onClick={() => setDeleteDialog({ open: true, file })}
                            color="error"
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
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, file: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.file?.fileName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, file: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(deleteDialog.file)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* View File Details Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, file: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>File Details</DialogTitle>
        <DialogContent>
          {viewDialog.file && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>File Name:</strong> {viewDialog.file.fileName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Form Type:</strong> {viewDialog.file.docType}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Size:</strong> {formatFileSize(viewDialog.file.fileSize)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Uploaded:</strong> {formatDate(viewDialog.file.uploadDate)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Blob Name:</strong> {viewDialog.file.blobName}
              </Typography>
              {viewDialog.file.blobUrl && (
                <Typography variant="body2" gutterBottom>
                  <strong>URL:</strong> {viewDialog.file.blobUrl}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, file: null })}>
            Close
          </Button>
          <Button
            onClick={() => handleDownload(viewDialog.file)}
            color="primary"
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuthSigArchive;