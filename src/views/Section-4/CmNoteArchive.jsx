import React, { useState } from "react";
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
  Chip
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { uploadNoteFile } from "../../store/slices/noteArchiveSlice";

const CmNoteArchive = () => {
  const dispatch = useDispatch();
  const { loading, error, successMessage, fileUrl } = useSelector((state) => state.noteArchive);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      return;
    }
    dispatch(uploadNoteFile(selectedFile));
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
      case 'xlsx':
      case 'xls': return 'success';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <UploadIcon color="primary" fontSize="large" />
            <Typography variant="h5" component="h2">
              Upload Notes Archive
            </Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* File Upload Area */}
            <Grid item xs={12}>
              <Paper
                sx={{
                  p: 4,
                  border: `2px dashed ${dragOver ? '#1976d2' : '#e0e0e0'}`,
                  borderRadius: 2,
                  backgroundColor: dragOver ? 'action.hover' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('noteFileUpload').click()}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Drop files here or click to browse
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supported formats: PDF, DOC, DOCX, TXT, XLS, XLSX
                  </Typography>
                </Box>
                <input
                  type="file"
                  id="noteFileUpload"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                />
              </Paper>
            </Grid>

            {/* Selected File Display */}
            {selectedFile && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FileIcon color="primary" />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {selectedFile.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip 
                          label={formatFileSize(selectedFile.size)} 
                          size="small" 
                          variant="outlined" 
                        />
                        <Chip 
                          label={selectedFile.name.split('.').pop().toUpperCase()} 
                          size="small" 
                          color={getFileTypeColor(selectedFile.name)}
                        />
                      </Box>
                    </Box>
                    <IconButton
                      color="error"
                      onClick={() => setSelectedFile(null)}
                      size="small"
                    >
                      <ErrorIcon />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Loading Progress */}
            {loading && (
              <Grid item xs={12}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Uploading file...
                  </Typography>
                  <LinearProgress />
                </Box>
              </Grid>
            )}

            {/* Success Message */}
            {successMessage && (
              <Grid item xs={12}>
                <Alert 
                  severity="success" 
                  icon={<SuccessIcon />}
                  sx={{ 
                    '& .MuiAlert-message': { 
                      width: '100%' 
                    } 
                  }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {successMessage}
                    </Typography>
                    {fileUrl && (
                      <Button
                        variant="outlined"
                        size="small"
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 1 }}
                        startIcon={<FileIcon />}
                      >
                        View Uploaded File
                      </Button>
                    )}
                  </Box>
                </Alert>
              </Grid>
            )}

            {/* Error Message */}
            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="body1">
                    <strong>Upload Failed:</strong> {error}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Validation Error */}
            {!selectedFile && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Please select a file to upload before saving.
                </Alert>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || !selectedFile}
                  startIcon={loading ? undefined : <UploadIcon />}
                  sx={{ 
                    minWidth: 200,
                    py: 1.5,
                    px: 4
                  }}
                >
                  {loading ? 'Uploading...' : 'Upload File'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>

        {/* Instructions */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            💡 <strong>Tip:</strong> You can drag and drop files directly onto the upload area for faster uploading.
          </Typography>
        </Paper>
      </CardContent>
    </Card>
  );
};

export default CmNoteArchive;