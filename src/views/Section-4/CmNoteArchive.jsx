import React, { useState, useEffect } from "react";
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  uploadNoteFile,
  fetchNoteArchiveFiles
} from "../../backend/store/slices/noteArchiveSlice";

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CmNoteArchive = ({ clientID: clientIDProp }) => {
  const dispatch = useDispatch();

  // Read clientID from prop or wherever your app stores the current client.
  // Adjust this selector to match your store shape if needed.
  const currentClientID = useSelector(
    (state) => state.clients?.currentClientID || state.client?.currentClientID
  );
  const clientID = clientIDProp || currentClientID;

  const {
    loading,
    error,
    successMessage,
    uploadProgress,
    uploadedFiles,
    filesLoading
  } = useSelector((state) => state.noteArchive);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Load existing files when client changes
  useEffect(() => {
    if (clientID) {
      dispatch(fetchNoteArchiveFiles(clientID));
    }
  }, [clientID, dispatch]);

  // Refresh list after a successful upload
  useEffect(() => {
    if (successMessage && clientID) {
      dispatch(fetchNoteArchiveFiles(clientID));
      setSelectedFile(null);
    }
  }, [successMessage, clientID, dispatch]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
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
    if (!selectedFile) return;
    dispatch(uploadNoteFile({ file: selectedFile, clientID }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  };

  const getFileTypeColor = (fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
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
    <Card sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <UploadIcon color="primary" fontSize="large" />
            <Typography variant="h5" component="h2">
              Notes Archive
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
                    Uploading file... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                  </Typography>
                  <LinearProgress
                    variant={uploadProgress > 0 ? 'determinate' : 'indeterminate'}
                    value={uploadProgress}
                  />
                </Box>
              </Grid>
            )}

            {/* Success / Error */}
            {successMessage && !loading && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<SuccessIcon />}>
                  <Typography variant="body1">{successMessage}</Typography>
                </Alert>
              </Grid>
            )}

            {error && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="body1">
                    <strong>Upload Failed:</strong> {error}
                  </Typography>
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
                  sx={{ minWidth: 200, py: 1.5, px: 4 }}
                >
                  {loading ? 'Uploading...' : 'Upload File'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>

        <Divider sx={{ my: 4 }} />

        {/* Uploaded Files List */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Uploaded Files {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
          </Typography>
          <Tooltip title="Refresh list">
            <IconButton
              size="small"
              onClick={() => clientID && dispatch(fetchNoteArchiveFiles(clientID))}
              disabled={filesLoading || !clientID}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {filesLoading && <LinearProgress sx={{ mb: 2 }} />}

        {!filesLoading && uploadedFiles.length === 0 && (
          <Alert severity="info">
            No files uploaded yet{clientID ? ' for this client' : ''}.
          </Alert>
        )}

        {uploadedFiles.length > 0 && (
          <Paper variant="outlined">
            <List dense disablePadding>
              {uploadedFiles.map((file, idx) => (
                <React.Fragment key={file.noteArchiveID || idx}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItem>
                    <ListItemIcon>
                      <FileIcon color={getFileTypeColor(file.fileName)} />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.fileName}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.fileSize)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(file.uploadedAt)}
                          </Typography>
                          {file.uploadedBy && (
                            <>
                              <Typography variant="caption" color="text.secondary">•</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {file.uploadedBy}
                              </Typography>
                            </>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="View / Download">
                        <IconButton
                          edge="end"
                          size="small"
                          component="a"
                          href={`${API}${file.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default CmNoteArchive;