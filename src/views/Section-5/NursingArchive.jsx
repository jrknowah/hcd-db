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
  LocalHospital as MedicalIcon
} from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { azureBlobService } from '../../backend/services/azureBlobService';

/**
 * ✅ REFACTORED NursingArchive Component
 * 
 * NOW MATCHES AuthSigArchive PATTERN:
 * 1. ✅ Uses useClientPersistence hook for clientID
 * 2. ✅ Direct azureBlobService calls (no Redux)
 * 3. ✅ Same file operations as AuthSigArchive
 * 4. ✅ Simplified UI matching AuthSigArchive structure
 * 5. ✅ Snackbar notifications
 * 
 * Nursing-specific features retained:
 * - Nursing document types
 * - Confidentiality levels
 * - Medical document categories
 */

// Nursing document types for the archive
const NURSING_DOC_TYPES = [
  'Nursing Assessment',
  'Nursing Notes',
  'Progress Notes',
  'Vital Signs Record',
  'Medication Administration Record (MAR)',
  'Treatment Plan',
  'Care Plan',
  'Wound Care Documentation',
  'IV Therapy Record',
  'Discharge Summary',
  'Lab Results',
  'Imaging Reports',
  'Consultation Notes',
  'Incident Report',
  'Transfer Summary',
  'Other Nursing Documentation'
];

// Confidentiality levels
const CONFIDENTIALITY_LEVELS = [
  'Standard',
  'Confidential',
  'Restricted',
  'Highly Confidential'
];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Max file size (15MB - matching files.js backend)
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const NursingArchive = () => {
  // ✅ Get clientID from useClientPersistence hook (matches AuthSigArchive)
  const { clientID: hookClientID, loading: clientLoading } = useClientPersistence();
  
  // ✅ Extract string value from hook result (matches AuthSigArchive)
  const clientID = React.useMemo(() => {
    if (!hookClientID) return null;
    
    if (typeof hookClientID === 'string') {
      return hookClientID;
    }
    
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

  // Component state (matches AuthSigArchive pattern)
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [confidentialityLevel, setConfidentialityLevel] = useState('Standard');
  const [description, setDescription] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null });
  const [viewDialog, setViewDialog] = useState({ open: false, file: null });

  // ✅ Fetch files when component mounts (matches AuthSigArchive)
  // 🔁 Section-switch fix: this component is NOT backed by Redux, so the
  // Section-5 slice wipe in Medical.jsx can't clear it. When the selected
  // client changes we therefore reset ALL local state ourselves BEFORE the
  // refetch — otherwise the previous client's file list, staged upload, and
  // any banners would linger on screen until the new fetch resolves.
  useEffect(() => {
    // Always clear the prior client's local state on a client change.
    setFiles([]);
    setError(null);
    setSuccess(null);
    setSelectedFile(null);
    setSelectedDocType('');
    setConfidentialityLevel('Standard');
    setDescription('');
    setDocumentDate('');
    setDeleteDialog({ open: false, file: null });
    setViewDialog({ open: false, file: null });

    if (clientID) {
      console.log('🏥 Fetching nursing documents for client:', clientID);
      fetchFiles();
    } else {
      console.log('⚠️ No clientID available, skipping file fetch');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientID]);

  /**
   * ✅ Fetch files using azureBlobService.listClientFiles (matches AuthSigArchive)
   */
  const fetchFiles = async () => {
    if (!clientID) {
      console.warn('⚠️ Cannot fetch files: No clientID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🌐 Fetching nursing documents for clientID:', clientID);
      
      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      const result = await azureBlobService.listClientFiles(
        clientID,
        'nursing_archive'  // docType for nursing documents
      );

      console.log('✅ Nursing documents fetched:', result?.length || 0);
      setFiles(result || []);

    } catch (error) {
      console.error('❌ Error fetching nursing documents:', error);
      setError(error.message || 'Failed to fetch documents');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle file selection (matches AuthSigArchive)
   */
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size: 15MB`);
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
   * ✅ Upload file using azureBlobService.uploadFile (matches AuthSigArchive)
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!selectedDocType) {
      setError('Please select a document type');
      return;
    }

    if (!clientID) {
      setError('No client selected. Please select a client first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🚀 Starting nursing document upload:', {
        clientID,
        fileName: selectedFile.name,
        docType: selectedDocType,
        confidentiality: confidentialityLevel,
        fileSize: selectedFile.size
      });

      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      const result = await azureBlobService.uploadFile(
        selectedFile,
        clientID,
        selectedDocType  // docType parameter
      );

      console.log('✅ Upload successful:', result);

      setSuccess(`Document "${selectedFile.name}" uploaded successfully!`);
      
      // Reset form
      setSelectedFile(null);
      setSelectedDocType('');
      setConfidentialityLevel('Standard');
      setDescription('');
      setDocumentDate('');

      // Refresh file list
      await fetchFiles();

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * ✅ Download file using azureBlobService (matches AuthSigArchive)
   */
  const handleDownload = async (file) => {
    try {
      console.log('⬇️ Downloading document:', file.fileName);
      
      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      const downloadUrl = await azureBlobService.generateDownloadUrl(file.blobName);
      
      window.open(downloadUrl, '_blank');

      console.log('✅ Download initiated');
      setSuccess(`Document "${file.fileName}" download started!`);

    } catch (error) {
      console.error('❌ Download failed:', error);
      setError(error.message || 'Failed to download document');
    }
  };

  /**
   * ✅ Delete file using azureBlobService (matches AuthSigArchive)
   */
  const handleDelete = async (file) => {
    try {
      console.log('🗑️ Deleting document:', file.fileName);
      
      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      await azureBlobService.deleteFile(file.blobName);

      console.log('✅ Delete complete');
      setSuccess(`Document "${file.fileName}" deleted successfully!`);

      setDeleteDialog({ open: false, file: null });
      await fetchFiles();

    } catch (error) {
      console.error('❌ Delete failed:', error);
      setError(error.message || 'Failed to delete document');
      setDeleteDialog({ open: false, file: null });
    }
  };

  /**
   * View file details
   */
  const handleView = (file) => {
    setViewDialog({ open: true, file });
  };

  // Format helpers (matches AuthSigArchive)
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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

  // Get confidentiality color
  const getConfidentialityColor = (level) => {
    switch (level) {
      case 'Standard': return 'default';
      case 'Confidential': return 'warning';
      case 'Restricted': return 'error';
      case 'Highly Confidential': return 'error';
      default: return 'default';
    }
  };

  // Show loading state (matches AuthSigArchive)
  if (clientLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" icon={<MedicalIcon />}>
          Loading client information...
        </Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  // Show message if no client selected (matches AuthSigArchive)
  if (!clientID) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" icon={<MedicalIcon />}>
          Please select a client from Section 1 (Identification) first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header (matches AuthSigArchive) */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <MedicalIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" gutterBottom>
            Nursing Documentation Archive
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage nursing documents and medical records for client: {clientID}
          </Typography>
        </Box>
      </Box>

      {/* Error Alert (matches AuthSigArchive) */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Snackbar (matches AuthSigArchive) */}
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

      {/* Upload Section (matches AuthSigArchive structure) */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Nursing Document
          </Typography>

          <Grid container spacing={2}>
            {/* Document Type Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Document Type *</InputLabel>
                <Select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  label="Document Type *"
                  disabled={isUploading}
                >
                  {NURSING_DOC_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Confidentiality Level */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Confidentiality Level</InputLabel>
                <Select
                  value={confidentialityLevel}
                  onChange={(e) => setConfidentialityLevel(e.target.value)}
                  label="Confidentiality Level"
                  disabled={isUploading}
                >
                  {CONFIDENTIALITY_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
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
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </Button>
            </Grid>

            {/* Document Date */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Document Date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={isUploading}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes about this document"
                disabled={isUploading}
              />
            </Grid>

            {/* Upload Button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                startIcon={isUploading ? <LinearProgress /> : <CloudUpload />}
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !selectedDocType}
                fullWidth
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </Grid>
          </Grid>

          {/* File Info (matches AuthSigArchive) */}
          {selectedFile && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>File:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Type:</strong> {selectedFile.type}
              </Typography>
              {confidentialityLevel && (
                <Chip
                  label={confidentialityLevel}
                  size="small"
                  color={getConfidentialityColor(confidentialityLevel)}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Files List (matches AuthSigArchive structure) */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Nursing Documents ({files.length})
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
                Loading documents...
              </Typography>
            </Box>
          ) : files.length === 0 ? (
            <Alert severity="info" icon={<MedicalIcon />}>
              No nursing documents found. Upload your first document above.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Document Name</TableCell>
                    <TableCell>Document Type</TableCell>
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

      {/* Delete Confirmation Dialog (matches AuthSigArchive) */}
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

      {/* View File Details Dialog (matches AuthSigArchive) */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, file: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Document Details</DialogTitle>
        <DialogContent>
          {viewDialog.file && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Document Name:</strong> {viewDialog.file.fileName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Document Type:</strong> {viewDialog.file.docType}
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

export default NursingArchive;