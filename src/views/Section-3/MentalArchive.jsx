// Section3/MentalArchive.jsx - Updated to use fetchMentalArchiveFiles
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActions,
  Alert, LinearProgress, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, OutlinedInput, Tooltip, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, TextField,
  FormControl, InputLabel, Select, MenuItem, Divider
} from '@mui/material';
import {
  CloudUpload, Delete, Download, Visibility, Description, Edit,
  Archive as ArchiveIcon, FolderOpen
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import {
  uploadFile,
  fetchMentalArchiveFiles,  // Changed from fetchClientFiles
  deleteFile,
  downloadFile,
  clearError,
  clearSuccess,
  selectFiles,
  selectFilesLoading,
  selectFilesUploading,
  selectFilesError,
  selectFilesSuccess,
  selectUploadProgress
} from '../../backend/store/slices/filesSlice';

// Complete document types for Mental Archive
const MENTAL_ARCHIVE_DOC_TYPES = [
  'Mental Health Archive',
  'Assessment Report', 
  'Treatment Plan',
  'Progress Notes',
  'Discharge Summary',
  'Psychiatric Evaluation',
  'Therapy Notes',
  'Medication Records',
  'Crisis Intervention',
  'Family Session Notes',
  'Group Therapy Notes',
  'Court Documents',
  'Insurance Forms',
  'Medical Records',
  'Lab Results',
  'Imaging Studies',
  'Historical Document',
  'Paper Conversion',
  'Other'
];

const MentalArchive = ({ clientID: propClientID, exportMode = false }) => {
  const dispatch = useDispatch();
  
  // Redux state
  const currentClient = useSelector((state) => state?.clients?.selectedClient);
  const files = useSelector(selectFiles);
  const loading = useSelector(selectFilesLoading);
  const uploading = useSelector(selectFilesUploading);
  const error = useSelector(selectFilesError);
  const successMessage = useSelector(selectFilesSuccess);
  const uploadProgress = useSelector(selectUploadProgress);
  
  // Local state
  const [filesToUpload, setFilesToUpload] = useState({});
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState('');
  const [fileMetadata, setFileMetadata] = useState({
    description: '',
    archiveDate: '',
    originalDate: ''
  });

  // Determine effective client ID
  const effectiveClientID = propClientID || currentClient?.clientID;

  // No need to filter - backend already returns only mental health files
  const mentalArchiveFiles = files;

  // Calculate summary statistics
  const summary = {
    totalFiles: mentalArchiveFiles.length,
    totalSize: mentalArchiveFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0),
    documentTypes: new Set(mentalArchiveFiles.map(f => f.docType)).size,
    recentFiles: mentalArchiveFiles.filter(f => {
      const uploadDate = new Date(f.uploadDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return uploadDate >= thirtyDaysAgo;
    }).length
  };

  // Load files when client changes - use mental archive specific action
  useEffect(() => {
    if (effectiveClientID) {
      dispatch(fetchMentalArchiveFiles(effectiveClientID));  // Changed from fetchClientFiles
    }
  }, [effectiveClientID, dispatch]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => dispatch(clearSuccess()), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleFileSelect = (docType, file) => {
    if (!file) return;
    
    // Validate file size (max 15MB to match backend)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      dispatch({ type: 'files/setError', payload: `File "${file.name}" is too large. Maximum size is 15MB.` });
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      dispatch({ type: 'files/setError', payload: `File type "${file.type}" is not supported.` });
      return;
    }

    setCurrentDocType(docType);
    setFilesToUpload({ [docType]: file });
    setUploadDialogOpen(true);
  };

  const handleUpload = async () => {
    const docType = currentDocType;
    const fileToUpload = filesToUpload[docType];
    
    if (!fileToUpload || !effectiveClientID) {
      return;
    }

    await dispatch(uploadFile({
      file: fileToUpload,
      clientID: effectiveClientID,
      docType: docType
    }));
    
    // Reload mental archive files after upload
    dispatch(fetchMentalArchiveFiles(effectiveClientID));
    
    // Clear the file input
    setFilesToUpload({});
    setUploadDialogOpen(false);
    setFileMetadata({ description: '', archiveDate: '', originalDate: '' });
    setCurrentDocType('');
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    await dispatch(deleteFile({
      fileId: fileToDelete.id,
      fileName: fileToDelete.fileName,
      blobName: fileToDelete.blobName
    }));
    
    setDeleteConfirmOpen(false);
    setFileToDelete(null);
  };

  const handlePreviewFile = (file) => {
    setFilePreview(file);
    setPreviewOpen(true);
  };

  const handleDownloadFile = async (file) => {
    await dispatch(downloadFile({
      fileId: file.id,
      fileName: file.fileName,
      blobUrl: file.blobUrl,
      blobName: file.blobName
    }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    const ext = file.fileName?.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return '📄';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['txt'].includes(ext)) return '📃';
    return '📎';
  };

  // No client selected
  if (!effectiveClientID) {
    return (
      <Card sx={{ padding: 3 }}>
        <Alert severity="info">
          Please select a client to view mental health archive documents.
        </Alert>
      </Card>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => dispatch(clearSuccess())}>
          {successMessage}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <ArchiveIcon color="primary" fontSize="large" />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" gutterBottom>
            Mental Health Archive
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload and manage mental health assessment documents for {currentClient?.clientFirstName} {currentClient?.clientLastName}
          </Typography>
        </Box>
      </Box>

      {/* Summary Stats */}
      {summary.totalFiles > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary.main">
                  {summary.totalFiles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Files
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {formatFileSize(summary.totalSize)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Size
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {summary.documentTypes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Document Types
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {summary.recentFiles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recent (30 days)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Upload Section */}
      <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload Documents
          </Typography>
          
          <Grid container spacing={2}>
            {MENTAL_ARCHIVE_DOC_TYPES.map((docType) => (
              <Grid item xs={12} sm={6} md={4} key={docType}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      {docType}
                    </Typography>
                    
                    <OutlinedInput
                      type="file"
                      onChange={(e) => handleFileSelect(docType, e.target.files[0])}
                      fullWidth
                      sx={{ mb: 1 }}
                      inputProps={{
                        accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt'
                      }}
                    />
                    
                    {uploadProgress[docType] !== undefined && (
                      <Box sx={{ mb: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress[docType]} />
                        <Typography variant="caption" color="text.secondary">
                          Uploading... {uploadProgress[docType]}%
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Files List Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Archived Documents ({mentalArchiveFiles.length})
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
              <LinearProgress sx={{ flexGrow: 1 }} />
              <Typography variant="body2">Loading documents...</Typography>
            </Box>
          ) : mentalArchiveFiles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FolderOpen sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No files in mental archive
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload historical documents, paper conversions, or mental health records using the forms above
              </Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File Name</TableCell>
                  <TableCell>Document Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Upload Date</TableCell>
                  {!exportMode && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {mentalArchiveFiles.map((file, index) => (
                  <TableRow key={file.id || index} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" component="span">
                          {getFileIcon(file)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {file.fileName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={file.docType} 
                        size="small" 
                        color="primary"
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={formatFileSize(file.fileSize)} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(file.uploadDate).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    {!exportMode && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Preview">
                            <IconButton 
                              size="small" 
                              onClick={() => handlePreviewFile(file)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Download">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download />
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
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Metadata Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upload {currentDocType}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selected: {filesToUpload[currentDocType]?.name}
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description (Optional)"
              value={fileMetadata.description}
              onChange={(e) => setFileMetadata({...fileMetadata, description: e.target.value})}
              placeholder="Describe the contents and context of this file..."
              sx={{ mt: 2 }}
            />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Archive Date"
                  value={fileMetadata.archiveDate}
                  onChange={(e) => setFileMetadata({...fileMetadata, archiveDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  helperText="Date archived"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Original Date"
                  value={fileMetadata.originalDate}
                  onChange={(e) => setFileMetadata({...fileMetadata, originalDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  helperText="Original doc date"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={uploading}
            startIcon={<CloudUpload />}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

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
              <Description />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {filePreview && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              {filePreview.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? (
                <img 
                  src={filePreview.blobUrl} 
                  alt={filePreview.fileName}
                  style={{ maxWidth: '100%', maxHeight: '500px' }}
                />
              ) : (
                <Box sx={{ p: 4 }}>
                  <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Preview not available for this file type
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Download />}
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
    </Box>
  );
};

export default MentalArchive;