import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  GetApp as DownloadIcon,
  Folder as FolderIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchMiscDocuments, 
  uploadMiscDocument, 
  deleteMiscDocument,
  fetchDocumentSummary,
  fetchDocumentCategories,
  downloadDocument
} from "../../backend/store/slices/miscDocSlice";

// Styled components for file upload
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const UploadArea = styled(Box)(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease-in-out',
  backgroundColor: isDragActive ? theme.palette.action.hover : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

const documentCategories = [
  { value: 'general', label: 'General Documents' },
  { value: 'medical', label: 'Medical Records' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'financial', label: 'Financial Records' },
  { value: 'identification', label: 'Identification' },
  { value: 'benefits', label: 'Benefits Documentation' },
  { value: 'housing', label: 'Housing Documents' },
  { value: 'employment', label: 'Employment Records' },
  { value: 'other', label: 'Other' }
];

const MiscDoc = ({ clientID }) => {
  const dispatch = useDispatch();
  const { 
    documents = [], // Default to empty array to prevent map errors
    documentsLoading, 
    documentsError, 
    uploading, 
    uploadError, 
    uploadSuccess,
    summary,
    categories = [] // Default to empty array
  } = useSelector((state) => state.miscDoc || {});

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [fileDescription, setFileDescription] = useState("");
  const [documentCategory, setDocumentCategory] = useState("general");

  useEffect(() => {
    if (clientID) {
      dispatch(fetchMiscDocuments(clientID));
      dispatch(fetchDocumentSummary(clientID));
      dispatch(fetchDocumentCategories(clientID));
    }
  }, [clientID, dispatch]);

  const fetchUploadedFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/misc-documents/${clientID}`);
      setUploadedFiles(response.data);
    } catch (err) {
      console.error('Error fetching files:', err);
      // Use mock data for development
      setUploadedFiles([
        {
          id: 1,
          fileName: 'medical-records.pdf',
          fileSize: 2456789,
          category: 'medical',
          description: 'Latest medical examination results',
          uploadDate: '2025-07-15',
          uploadedBy: 'john.doe@example.com'
        },
        {
          id: 2,
          fileName: 'benefits-letter.pdf',
          fileSize: 1234567,
          category: 'benefits',
          description: 'SSI benefits approval letter',
          uploadDate: '2025-07-14',
          uploadedBy: 'jane.smith@example.com'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientID) {
      setError("Client ID is missing.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("clientID", clientID);
    formData.append("description", fileDescription);
    formData.append("category", documentCategory);

    try {
      setUploading(true);
      setUploadProgress(0);
      
      await axios.post("/api/misc-documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      setUploading(false);
      setSuccess(true);
      setSelectedFile(null);
      setFileDescription("");
      setDocumentCategory("general");
      setUploadProgress(0);
      
      // Refresh file list
      fetchUploadedFiles();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileDescription("");
    setError(null);
    setSuccess(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon color="primary" />;
      default:
        return <FileIcon />;
    }
  };

  const handleDownload = (fileId, fileName) => {
    // Implement download functionality
    console.log('Downloading file:', fileId, fileName);
  };

  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await axios.delete(`/api/misc-documents/${fileId}`);
        fetchUploadedFiles();
      } catch (err) {
        console.error('Error deleting file:', err);
        setError('Failed to delete file. Please try again.');
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* Header Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Miscellaneous Documents
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload and manage client miscellaneous documents and records
        </Typography>
      </Paper>

      {/* Upload Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upload New Document
        </Typography>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <UploadArea
                isDragActive={dragActive}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('misc-file-input').click()}
              >
                <VisuallyHiddenInput
                  id="misc-file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xls,.xlsx"
                />
                
                {selectedFile ? (
                  <Box>
                    <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      File Selected
                    </Typography>
                    <Chip
                      icon={<DescriptionIcon />}
                      label={`${selectedFile.name} (${formatFileSize(selectedFile.size)})`}
                      onDelete={removeSelectedFile}
                      deleteIcon={<DeleteIcon />}
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                  </Box>
                ) : (
                  <Box>
                    <CloudUploadIcon sx={{ fontSize: 48, mb: 1, color: 'primary.main' }} />
                    <Typography variant="h6" gutterBottom>
                      Drag & Drop or Click to Select File
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, TXT, XLS, XLSX
                    </Typography>
                  </Box>
                )}
              </UploadArea>
            </Grid>

            {selectedFile && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Document Category</InputLabel>
                    <Select
                      value={documentCategory}
                      onChange={(e) => setDocumentCategory(e.target.value)}
                      label="Document Category"
                    >
                      {documentCategories.map((category) => (
                        <MenuItem key={category.value} value={category.value}>
                          {category.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="File Description"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder="Add a description for this file..."
                    multiline
                    rows={2}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              {(documentsError || uploadError) && (
                <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
                  {documentsError || uploadError}
                </Alert>
              )}
              
              {uploadSuccess && (
                <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                  ✅ File uploaded successfully!
                </Alert>
              )}

              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Uploading... {uploadProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={uploading || !selectedFile}
                  startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  sx={{ minWidth: 150 }}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Previously Uploaded Files Section */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Previously Uploaded Documents
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {documentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !documents || documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No documents uploaded yet.
          </Typography>
        ) : (
          <List>
            {documents.map((file) => (
              <ListItem key={file.documentID || file.id} divider>
                <ListItemIcon>
                  {getFileIcon(file.originalFileName || file.fileName)}
                </ListItemIcon>
                <ListItemText
                  primary={file.originalFileName || file.fileName}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {file.documentDescription || file.description || 'No description'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip 
                          size="small" 
                          label={documentCategories.find(cat => cat.value === (file.documentCategory || file.category))?.label || 'General'} 
                          variant="outlined"
                        />
                        <Chip 
                          size="small" 
                          label={formatFileSize(file.fileSize)} 
                          variant="outlined"
                        />
                        <Chip 
                          size="small" 
                          label={new Date(file.uploadDate).toLocaleDateString()} 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="download"
                    onClick={() => handleDownload(file.documentID || file.id, file.originalFileName || file.fileName)}
                    sx={{ mr: 1 }}
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => handleDelete(file.documentID || file.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

MiscDoc.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default MiscDoc;