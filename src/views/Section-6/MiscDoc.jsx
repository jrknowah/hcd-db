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
  GetApp as DownloadIcon,
  Description as FileIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { azureBlobService } from '../../backend/services/azureBlobService';

/**
 * ✅ PRODUCTION-READY MiscDoc Component
 * Following the exact pattern from AuthSigArchive
 * 
 * Features:
 * - Azure Blob Storage integration
 * - useClientPersistence hook for client management
 * - Full CRUD operations
 * - File upload/download/delete
 * - Error handling with snackbars
 * - Loading states
 * - Responsive design
 */

// Document categories for miscellaneous documents
const DOCUMENT_CATEGORIES = [
  'General Documents',
  'Medical Records',
  'Legal Documents',
  'Financial Records',
  'Identification',
  'Benefits Documentation',
  'Housing Documents',
  'Employment Records',
  'Other'
];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MiscDoc = () => {
  // ✅ Get clientID from useClientPersistence hook (Section 1 pattern)
  const { clientID: hookClientID, loading: clientLoading } = useClientPersistence();
  
  // ✅ Extract string value from hook result
  const clientID = React.useMemo(() => {
    if (!hookClientID) return null;
    if (typeof hookClientID === 'string') return hookClientID;
    if (typeof hookClientID === 'object' && hookClientID.clientID) {
      return String(hookClientID.clientID);
    }
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null });
  const [viewDialog, setViewDialog] = useState({ open: false, file: null });

  // Fetch files when component mounts or clientID changes
  useEffect(() => {
    if (clientID) {
      console.log('📂 Fetching miscellaneous documents for client:', clientID);
      fetchFiles();
    }
  }, [clientID]);

  /**
   * Fetch files for the current client
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
      
      // Use Azure Blob Service to list files
      const result = await azureBlobService.listClientFiles(
        clientID,
        'misc_documents'
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
    
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX, TXT, XLS, XLSX`);
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
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a document category');
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
        category: selectedCategory,
        fileSize: selectedFile.size
      });

      // Upload file using Azure Blob Service
      const result = await azureBlobService.uploadFile(
        selectedFile,
        clientID,
        selectedCategory
      );

      console.log('✅ Upload successful:', result);

      setSuccess(`File "${selectedFile.name}" uploaded successfully!`);
      
      // Reset form
      setSelectedFile(null);
      setSelectedCategory('');
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
   */
  const handleDownload = async (file) => {
    try {
      console.log('⬇️ Downloading file:', file.fileName);
      
      const downloadUrl = await azureBlobService.generateDownloadUrl(file.blobName);
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
   */
  const handleDelete = async (file) => {
    try {
      console.log('🗑️ Deleting file:', file.fileName);
      
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

  // Get file icon based on type
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon color="primary" />;
      default:
        return <FileIcon />;
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
        Miscellaneous Documents
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload and manage miscellaneous documents for client: {clientID}
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
            Upload Document
          </Typography>

          <Grid container spacing={2}>
            {/* Category Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Document Category *</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label="Document Category *"
                  disabled={isUploading}
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* File Selection */}
            <Grid item xs={12} md={6}>
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
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.xls,.xlsx"
                  onChange={handleFileSelect}
                />
              </Button>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this document..."
                multiline
                rows={2}
                disabled={isUploading}
              />
            </Grid>

            {/* File Info */}
            {selectedFile && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>File:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Type:</strong> {selectedFile.type}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Upload Button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !selectedCategory}
                startIcon={isUploading ? null : <CloudUpload />}
                fullWidth
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Uploaded Documents ({files.length})
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
              No documents found. Upload your first document above.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Category</TableCell>
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
                          {getFileIcon(file.fileName)}
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
                <strong>Category:</strong> {viewDialog.file.docType}
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

export default MiscDoc;