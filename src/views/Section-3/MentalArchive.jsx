import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Grid,
  Typography,
  Box,
  Alert,
  IconButton,
  Paper,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  History as HistoryIcon,
  FolderOpen as FolderIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Document types for mental archive
const DOCUMENT_TYPES = [
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
  // State management
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [summary, setSummary] = useState(null);
  
  // Form state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [formData, setFormData] = useState({
    documentType: 'Mental Health Archive',
    description: '',
    archiveDate: '',
    originalDate: ''
  });

  // Redux selectors
  const currentUser = useSelector((state) => state?.auth?.user);
  const selectedClient = useSelector((state) => state?.clients?.selectedClient);
  
  // Environment detection
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  // Mock client for development
  const MOCK_CLIENT = { clientID: 'mock-123', clientFirstName: 'John', clientLastName: 'Doe' };
  
  const currentClient = shouldUseMockData && !selectedClient ? MOCK_CLIENT : selectedClient;
  const effectiveClientID = propClientID || currentClient?.clientID;

  // Load files on component mount
  useEffect(() => {
    if (effectiveClientID) {
      loadFiles();
      loadSummary();
    }
  }, [effectiveClientID]);

  const loadFiles = async () => {
    if (!effectiveClientID) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/mental-archive/${effectiveClientID}`);
      setFiles(response.data.files || []);
      setError(null);
    } catch (err) {
      console.error('Error loading mental archive files:', err);
      setError('Failed to load archive files');
      // Mock data for development
      if (shouldUseMockData) {
        setFiles([
          {
            fileId: 'MAF-001',
            originalName: 'Assessment_Report_2023.pdf',
            fileSize: 2048576,
            documentType: 'Assessment Report',
            description: 'Initial mental health assessment from 2023',
            uploadDate: '2025-01-01T10:00:00Z',
            uploadedBy: 'dr.smith@example.com'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!effectiveClientID) return;
    
    try {
      const response = await axios.get(`${API_URL}/mental-archive/${effectiveClientID}/summary`);
      setSummary(response.data.summary);
    } catch (err) {
      console.error('Error loading summary:', err);
      // Mock summary for development
      if (shouldUseMockData) {
        setSummary({
          totalFiles: 1,
          totalSize: 2048576,
          documentTypes: 1,
          recentFiles: 1
        });
      }
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    if (files.length > 0) {
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !effectiveClientID) return;

    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      
      selectedFiles.forEach((file) => {
        uploadFormData.append('files', file);
      });
      
      uploadFormData.append('documentType', formData.documentType);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('archiveDate', formData.archiveDate);
      uploadFormData.append('originalDate', formData.originalDate);

      const response = await axios.post(
        `${API_URL}/mental-archive/upload/${effectiveClientID}`,
        uploadFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes timeout for large files
        }
      );

      setSuccessMessage(`${selectedFiles.length} file(s) uploaded successfully!`);
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setFormData({
        documentType: 'Mental Health Archive',
        description: '',
        archiveDate: '',
        originalDate: ''
      });
      
      // Reload files and summary
      await loadFiles();
      await loadSummary();

    } catch (err) {
      console.error('Error uploading files:', err);
      setError(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await axios.get(
        `${API_URL}/mental-archive/file/${fileId}/download`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(`Download failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`${API_URL}/mental-archive/file/${fileId}`);
      setSuccessMessage('File deleted successfully');
      await loadFiles();
      await loadSummary();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(`Delete failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleEdit = (file) => {
    setEditingFile(file);
    setFormData({
      documentType: file.documentType || 'Mental Health Archive',
      description: file.description || '',
      archiveDate: file.archiveDate ? file.archiveDate.split('T')[0] : '',
      originalDate: file.originalDate ? file.originalDate.split('T')[0] : ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingFile) return;

    try {
      await axios.put(`${API_URL}/mental-archive/file/${editingFile.fileId}`, formData);
      setSuccessMessage('File updated successfully');
      setEditDialogOpen(false);
      setEditingFile(null);
      await loadFiles();
    } catch (err) {
      console.error('Error updating file:', err);
      setError(`Update failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeColor = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf': return 'error';
      case 'doc':
      case 'docx': return 'primary';
      case 'txt': return 'info';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'tiff': return 'success';
      default: return 'default';
    }
  };

  // No client selected
  if (!effectiveClientID) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {isDevelopment 
            ? `Development Mode: No client selected. Mock data ${shouldUseMockData ? 'enabled' : 'disabled'}.`
            : "Please select a client to view mental archive."
          }
        </Alert>
      </Box>
    );
  }

  return (
    <Card sx={{ width: '100%' }}>
      {/* Development indicator */}
      {shouldUseMockData && (
        <Alert severity="info" sx={{ m: 2 }}>
          🔧 Development Mode: Using mock mental archive data for {currentClient?.clientFirstName} {currentClient?.clientLastName}
        </Alert>
      )}

      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ArchiveIcon color="primary" fontSize="large" />
            <Typography variant="h5" component="h2">
              Mental Health Archive
            </Typography>
          </Box>
          {!exportMode && (
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              component="label"
              disabled={uploading || loading}
            >
              Upload Files
              <input
                type="file"
                hidden
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.tiff,.bmp"
                onChange={handleFileSelect}
              />
            </Button>
          )}
        </Box>

        {/* Summary Stats */}
        {summary && (
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
                    Recent Files
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Messages */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Files Table */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>Document Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Upload Date</TableCell>
              <TableCell>Uploaded By</TableCell>
              {!exportMode && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={exportMode ? 5 : 6} align="center">
                  <Box sx={{ py: 4 }}>
                    <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      No files in mental archive
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upload historical documents, paper conversions, or mental health records
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.fileId} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileIcon color="primary" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {file.originalName}
                        </Typography>
                        {file.description && (
                          <Typography variant="caption" color="text.secondary">
                            {file.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={file.documentType} 
                      size="small" 
                      variant="outlined"
                      color="primary"
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
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {file.uploadedBy}
                    </Typography>
                  </TableCell>
                  {!exportMode && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleDownload(file.fileId, file.originalName)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(file)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(file.fileId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <UploadIcon />
              Upload Mental Archive Files
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Selected Files: {selectedFiles.map(f => f.name).join(', ')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={formData.documentType}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                    label="Document Type"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Archive Date"
                  value={formData.archiveDate}
                  onChange={(e) => setFormData({...formData, archiveDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Original Document Date"
                  value={formData.originalDate}
                  onChange={(e) => setFormData({...formData, originalDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  helperText="Date when the original document was created"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the contents and context of these files..."
                />
              </Grid>
            </Grid>

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Uploading files...
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleUpload} variant="contained" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EditIcon />
              Edit File Information
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  File: {editingFile?.originalName}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={formData.documentType}
                    onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                    label="Document Type"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Archive Date"
                  value={formData.archiveDate}
                  onChange={(e) => setFormData({...formData, archiveDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Original Document Date"
                  value={formData.originalDate}
                  onChange={(e) => setFormData({...formData, originalDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the contents and context of this file..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleUpdate} variant="contained">
              Update
            </Button>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MentalArchive;