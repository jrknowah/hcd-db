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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TablePagination
} from '@mui/material';
import {
  CloudUpload,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Description as FileIcon,
  Visibility as ViewIcon,
  AttachFile as AttachFileIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import {
  uploadFile,
  fetchClientFiles,
  deleteFile,
  downloadFile,
  selectFiles,
  selectFilesLoading,
  selectFilesUploading,
  selectFilesError,
  selectFilesSuccess,
  clearError,
  clearSuccess,
  setCurrentClient
} from '../../backend/store/slices/filesSlice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Inventory categories — used as docType for the shared /api/upload route
const INVENTORY_CATEGORIES = [
  'Electronics',
  'Jewelry',
  'Furniture',
  'Appliances',
  'Clothing',
  'Documents',
  'Medical Equipment',
  'Personal Items',
  'Other'
];

const PersonalInventory = () => {
  const dispatch = useDispatch();
  const { clientID } = useClientPersistence();

  // Redux state
  const inventoryItems = useSelector(selectFiles);
  const loading = useSelector(selectFilesLoading);
  const uploading = useSelector(selectFilesUploading);
  const reduxError = useSelector(selectFilesError);
  const reduxSuccess = useSelector(selectFilesSuccess);

  // Local UI state
  const [category, setCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sync client and fetch files
  useEffect(() => {
    if (clientID) {
      dispatch(setCurrentClient(clientID));
      dispatch(fetchClientFiles(clientID));
    }
  }, [clientID, dispatch]);

  // Surface Redux success/error as snackbar
  useEffect(() => {
    if (reduxSuccess) {
      showSnackbar(reduxSuccess, 'success');
      dispatch(clearSuccess());
    }
  }, [reduxSuccess, dispatch]);

  useEffect(() => {
    if (reduxError) {
      showSnackbar(reduxError, 'error');
      dispatch(clearError());
    }
  }, [reduxError, dispatch]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      showSnackbar('File size must be less than 100MB', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!clientID) {
      showSnackbar('Please select a client first', 'error');
      return;
    }
    if (!selectedFile) {
      showSnackbar('Please select a file to upload', 'error');
      return;
    }
    if (!category) {
      showSnackbar('Please select a category', 'error');
      return;
    }

    // ✅ Use the same filesSlice thunk every other section uses.
    // It builds FormData with file + clientID + docType and POSTs to /api/upload.
    const result = await dispatch(uploadFile({
      file: selectedFile,
      clientID,
      docType: category
    }));

    if (uploadFile.fulfilled.match(result)) {
      setCategory('');
      setSelectedFile(null);
      const fileInput = document.getElementById('inventory-file-upload');
      if (fileInput) fileInput.value = '';
      // Refresh list to include the new record
      dispatch(fetchClientFiles(clientID));
    }
  };

  const handleDownload = (item) => {
    if (!item.blobUrl && !item.id) {
      showSnackbar('No file attached to this item', 'warning');
      return;
    }
    dispatch(downloadFile({
      fileId: item.id,
      fileName: item.fileName || item.itemDescription,
      blobUrl: item.blobUrl
    }));
  };

  const handleDeleteClick = (item) => {
    setDeleteDialog({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    const item = deleteDialog.item;
    setDeleteDialog({ open: false, item: null });

    const result = await dispatch(deleteFile({
      fileId: item.id || item.inventoryID,
      fileName: item.fileName || item.itemDescription,
      blobName: item.blobName
    }));

    if (deleteFile.fulfilled.match(result)) {
      dispatch(fetchClientFiles(clientID));
    }
  };

  const handleViewClick = (item) => {
    setViewDialog({ open: true, item });
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!clientID) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select a client from Section 1: Identification to manage their personal inventory.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon /> Personal Inventory
      </Typography>

      {/* Upload Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload File
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required disabled={uploading}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="Category"
                >
                  {INVENTORY_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <input
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                id="inventory-file-upload"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <label htmlFor="inventory-file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AttachFileIcon />}
                  disabled={uploading}
                  fullWidth
                  sx={{ height: '56px' }}
                >
                  {selectedFile ? selectedFile.name : 'Select File *'}
                </Button>
              </label>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !category}
                startIcon={<CloudUpload />}
                fullWidth
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </Grid>
          </Grid>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Uploading file...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Inventory Items List */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Uploaded Files ({inventoryItems.length})
            </Typography>
            <Button
              variant="outlined"
              onClick={() => dispatch(fetchClientFiles(clientID))}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : inventoryItems.length === 0 ? (
            <Alert severity="info">
              No files uploaded for this client. Upload files using the form above.
            </Alert>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>File Name</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Size</strong></TableCell>
                      <TableCell><strong>Date Uploaded</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inventoryItems
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((item, index) => (
                        <TableRow key={item.id || item.inventoryID || index} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FileIcon color="primary" />
                              <Typography variant="body2" fontWeight="medium">
                                {item.fileName || item.itemDescription}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.docType || item.category}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatFileSize(item.fileSize)}</TableCell>
                          <TableCell>{formatDate(item.uploadDate || item.createdAt)}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small" color="primary" onClick={() => handleViewClick(item)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download File">
                              <IconButton size="small" color="info" onClick={() => handleDownload(item)}>
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteClick(item)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={inventoryItems.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>File Details</DialogTitle>
        <DialogContent dividers>
          {viewDialog.item && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary"><strong>File Name:</strong></Typography>
                  <Typography variant="body1" gutterBottom>
                    {viewDialog.item.fileName || viewDialog.item.itemDescription}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary"><strong>Category:</strong></Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={viewDialog.item.docType || viewDialog.item.category} color="primary" size="small" />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary"><strong>Size:</strong></Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatFileSize(viewDialog.item.fileSize)}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary"><strong>Date Uploaded:</strong></Typography>
                  <Typography variant="body1" gutterBottom>
                    {formatDate(viewDialog.item.uploadDate || viewDialog.item.createdAt)}
                  </Typography>
                </Grid>
                {(viewDialog.item.blobUrl || viewDialog.item.photoDocs) && (
                  <Grid item xs={12}>
                    <Alert severity="success" icon={<FileIcon />}>
                      File is stored in Azure Blob Storage. Click Download to retrieve it.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, item: null })}>Close</Button>
          {(viewDialog.item?.blobUrl || viewDialog.item?.photoDocs) && (
            <Button
              onClick={() => {
                handleDownload(viewDialog.item);
                setViewDialog({ open: false, item: null });
              }}
              color="primary"
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              Download File
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, item: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this file?</Typography>
          {deleteDialog.item && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>File:</strong> {deleteDialog.item.fileName || deleteDialog.item.itemDescription}
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> {deleteDialog.item.docType || deleteDialog.item.category}
              </Typography>
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                Note: The file will be permanently deleted from Azure Blob Storage.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" startIcon={<DeleteIcon />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PersonalInventory;