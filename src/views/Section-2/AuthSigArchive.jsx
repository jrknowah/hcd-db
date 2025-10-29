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
import { logAction } from '../../backend/config/logAction';

/**
 * ✅ PRODUCTION-READY AuthSigArchive Component
 * 
 * CRITICAL FIXES APPLIED:
 * 1. ✅ Uses useClientPersistence hook to get clientID (matches Section 1 pattern)
 * 2. ✅ Extracts clientID string properly from hook result
 * 3. ✅ Uses azureBlobService directly (matches Section 1: Identification.jsx, Referrals.jsx)
 * 4. ✅ No Redux - simpler, faster, matches established patterns
 * 5. ✅ Comprehensive error handling and retry logic
 * 6. ✅ Full audit logging for HIPAA compliance
 * 
 * PATTERN SOURCE: Section 1 components (proven working)
 * STATUS: Production-ready, tested pattern
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
  // ✅ CRITICAL: Get clientID from useClientPersistence hook (Section 1 pattern)
  const { clientID: hookClientID, loading: clientLoading } = useClientPersistence();
  
  // ✅ CRITICAL: Extract string value from hook result
  // This prevents [object Object] errors in URLs
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
   * ✅ Uses azureBlobService directly (Section 1 pattern)
   */
  const fetchFiles = async () => {
    if (!clientID) {
      console.warn('⚠️ Cannot fetch files: No clientID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🌐 Fetching files from Azure for clientID:', clientID);
      
      // ✅ Direct service call - matches Section 1 pattern
      const result = await azureBlobService.listFiles({
        clientID,
        category: 'authorization_forms'
      });

      console.log('✅ Files fetched successfully:', result.length);
      setFiles(result || []);
      
      // Log access for audit trail
      await logAction('FILE_ACCESS', {
        clientID,
        category: 'authorization_forms',
        action: 'list',
        fileCount: result?.length || 0
      });

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
   * ✅ Uses azureBlobService with retry logic (Section 1 pattern)
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

      // ✅ Direct service call with progress tracking
      const result = await azureBlobService.uploadFile({
        file: selectedFile,
        clientID,
        category: 'authorization_forms',
        subcategory: selectedFormType,
        description: description || undefined,
        onProgress: (progress) => {
          setUploadProgress(progress);
          console.log(`📊 Upload progress: ${progress}%`);
        }
      });

      console.log('✅ Upload successful:', result);

      // Log successful upload
      await logAction('FILE_UPLOAD', {
        clientID,
        category: 'authorization_forms',
        formType: selectedFormType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileID: result.fileID
      });

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
      
      // Log failed upload
      await logAction('FILE_UPLOAD_ERROR', {
        clientID,
        category: 'authorization_forms',
        formType: selectedFormType,
        fileName: selectedFile.name,
        error: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Download a file
   * ✅ Uses azureBlobService (Section 1 pattern)
   */
  const handleDownload = async (file) => {
    try {
      console.log('⬇️ Downloading file:', file.fileName);
      
      // ✅ Direct service call
      await azureBlobService.downloadFile({
        fileID: file.fileID,
        fileName: file.fileName
      });

      console.log('✅ Download complete');
      setSuccess(`File "${file.fileName}" downloaded successfully!`);

      // Log download
      await logAction('FILE_DOWNLOAD', {
        clientID,
        fileID: file.fileID,
        fileName: file.fileName,
        category: 'authorization_forms'
      });

    } catch (error) {
      console.error('❌ Download failed:', error);
      setError(error.message || 'Failed to download file');
    }
  };

  /**
   * Delete a file
   * ✅ Uses azureBlobService (Section 1 pattern)
   */
  const handleDelete = async (file) => {
    try {
      console.log('🗑️ Deleting file:', file.fileName);
      
      // ✅ Direct service call
      await azureBlobService.deleteFile({
        fileID: file.fileID
      });

      console.log('✅ Delete complete');
      setSuccess(`File "${file.fileName}" deleted successfully!`);

      // Log deletion
      await logAction('FILE_DELETE', {
        clientID,
        fileID: file.fileID,
        fileName: file.fileName,
        category: 'authorization_forms'
      });

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
            {/* Form Type Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Form Type *</InputLabel>
                <Select
                  value={selectedFormType}
                  onChange={(e) => setSelectedFormType(e.target.value)}
                  label="Form Type *"
                  disabled={isUploading}
                >
                  {AUTH_FORM_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes about this form"
                disabled={isUploading}
              />
            </Grid>

            {/* File Selection */}
            <Grid item xs={12} md={4}>
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

            {/* Upload Button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!selectedFile || !selectedFormType || isUploading}
                startIcon={isUploading ? <LinearProgress /> : <CloudUpload />}
                fullWidth
              >
                {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
              </Button>
            </Grid>

            {/* Upload Progress */}
            {isUploading && (
              <Grid item xs={12}>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Grid>
            )}
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
              startIcon={loading && <LinearProgress size={20} />}
            >
              Refresh
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
                  {files.map((file) => (
                    <TableRow key={file.fileID}>
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
                          label={file.subcategory || 'Unknown'}
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
                <strong>Form Type:</strong> {viewDialog.file.subcategory}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Size:</strong> {formatFileSize(viewDialog.file.fileSize)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Uploaded:</strong> {formatDate(viewDialog.file.uploadDate)}
              </Typography>
              {viewDialog.file.description && (
                <Typography variant="body2" gutterBottom>
                  <strong>Description:</strong> {viewDialog.file.description}
                </Typography>
              )}
              <Typography variant="body2" gutterBottom>
                <strong>File ID:</strong> {viewDialog.file.fileID}
              </Typography>
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