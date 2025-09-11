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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon,
  GetApp as DownloadIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon,
  Search as SearchIcon
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchPersonalInventory, 
  uploadInventoryFile, 
  deleteInventoryItem,
  addInventoryItem,
  fetchInventorySummary,
  fetchInventoryCategories,
  setCategoryFilter,
  setStatusFilter,
  setSearchQuery
} from "../../backend/store/slices/personalInventorySlice";

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

const PersonalInventory = ({ clientID }) => {
  const dispatch = useDispatch();
  const { 
    items, 
    itemsLoading, 
    itemsError, 
    uploading, 
    uploadError, 
    uploadSuccess,
    summary,
    categories,
    categoryFilter,
    statusFilter,
    searchQuery
  } = useSelector((state) => state.personalInventory || {});

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [fileDescription, setFileDescription] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (clientID) {
      dispatch(fetchPersonalInventory(clientID));
      dispatch(fetchInventorySummary(clientID));
      dispatch(fetchInventoryCategories(clientID));
    }
  }, [clientID, dispatch]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientID) {
      return;
    }

    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("clientID", clientID);
    formData.append("description", fileDescription);

    dispatch(uploadInventoryFile({ clientID, formData })).then((result) => {
      if (!result.error) {
        setSelectedFile(null);
        setFileDescription("");
        // Refresh inventory list
        dispatch(fetchPersonalInventory(clientID));
      }
    });
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileDescription("");
  };

  const handleMenuClick = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleDelete = () => {
    if (selectedItem) {
      dispatch(deleteInventoryItem(selectedItem.inventoryID)).then((result) => {
        if (!result.error) {
          dispatch(fetchPersonalInventory(clientID));
        }
      });
    }
    handleMenuClose();
  };

  const handleDownload = (item) => {
    // Implement download functionality
    if (item.photoDocs) {
      window.open(`/uploads/personal-inventory/${item.photoDocs}`, '_blank');
    }
    handleMenuClose();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Possession':
        return 'success';
      case 'Stored':
        return 'info';
      case 'Returned':
        return 'default';
      case 'Missing':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'Excellent':
        return 'success';
      case 'Good':
        return 'info';
      case 'Fair':
        return 'warning';
      case 'Poor':
        return 'error';
      default:
        return 'default';
    }
  };

  // Filter items based on search and filters
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !categoryFilter || item.itemCategory === categoryFilter;
    const matchesStatus = !statusFilter || item.itemStatus === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Paginate filtered items
  const paginatedItems = filteredItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
      {/* Header Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Personal Inventory Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload and manage client personal inventory documents
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
                onClick={() => document.getElementById('file-input').click()}
              >
                <VisuallyHiddenInput
                  id="file-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
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
                      Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF
                    </Typography>
                  </Box>
                )}
              </UploadArea>
            </Grid>

            {selectedFile && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="File Description (Optional)"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder="Add a description for this file..."
                  multiline
                  rows={2}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              {(itemsError || uploadError) && (
                <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
                  {itemsError || uploadError}
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
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Personal Inventory Items Section */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Personal Inventory Items
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {/* Summary Cards */}
        {summary && Object.keys(summary).length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Items
                  </Typography>
                  <Typography variant="h6">
                    {summary.totalItems || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Value
                  </Typography>
                  <Typography variant="h6">
                    ${(summary.totalValue || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    In Storage
                  </Typography>
                  <Typography variant="h6">
                    {summary.itemsStored || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Missing Items
                  </Typography>
                  <Typography variant="h6" color={summary.itemsMissing > 0 ? "error" : "inherit"}>
                    {summary.itemsMissing || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => dispatch(setCategoryFilter(e.target.value))}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => dispatch(setStatusFilter(e.target.value))}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="In Possession">In Possession</MenuItem>
                <MenuItem value="Stored">Stored</MenuItem>
                <MenuItem value="Returned">Returned</MenuItem>
                <MenuItem value="Missing">Missing</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Inventory Table */}
        {itemsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {items.length === 0 ? 'No inventory items found.' : 'No items match your search criteria.'}
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Condition</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.inventoryID} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {item.itemName}
                          </Typography>
                          {item.itemDescription && (
                            <Typography variant="caption" color="text.secondary">
                              {item.itemDescription}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.itemCategory} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.itemCondition} 
                          size="small" 
                          color={getConditionColor(item.itemCondition)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.itemStatus} 
                          size="small" 
                          color={getStatusColor(item.itemStatus)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ${(item.estimatedValue || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.locationStored || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="More actions">
                          <IconButton 
                            size="small"
                            onClick={(e) => handleMenuClick(e, item)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredItems.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {/* Action Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleDownload(selectedItem)}>
                <DownloadIcon sx={{ mr: 1 }} />
                Download Files
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <EditIcon sx={{ mr: 1 }} />
                Edit Item
              </MenuItem>
              <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                <DeleteIcon sx={{ mr: 1 }} />
                Delete Item
              </MenuItem>
            </Menu>
          </>
        )}
      </Paper>
    </Box>
  );
};

PersonalInventory.propTypes = {
  clientID: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default PersonalInventory;