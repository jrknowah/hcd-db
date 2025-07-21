import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Card,
    CardContent,
    CardActions,
    IconButton,
    LinearProgress,
    Alert,
    Tabs,
    Tab,
    Badge,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Download as DownloadIcon,
    Delete as DeleteIcon,
    Share as ShareIcon,
    Visibility as ViewIcon,
    Description as DocumentIcon,
    Image as ImageIcon,
    PictureAsPdf as PdfIcon,
    Assignment as ReportIcon,
    Security as SecurityIcon,
    History as HistoryIcon,
    AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import {
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    searchDocuments,
    fetchCategories
} from "../../store/slices/nursingArchiveSlice";

const NursingArchive = ({ clientID = "CLIENT-123" }) => {
    const dispatch = useDispatch();
    const {
        documents,
        documentsLoading,
        uploading,
        uploadProgress,
        categories,
        searchQuery,
        selectedCategory,
        useMockData
    } = useSelector((state) => state.nursingArchive);

    // Local state
    const [activeTab, setActiveTab] = useState(0);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadMetadata, setUploadMetadata] = useState({
        category: '',
        description: '',
        documentDate: '',
        confidentialityLevel: 'Standard'
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    // File input ref
    const fileInputRef = useRef(null);

    // Document categories
    const documentCategories = [
        { id: 1, name: 'Nursing Notes', icon: 'Assignment', color: '#1976d2' },
        { id: 2, name: 'Lab Reports', icon: 'Science', color: '#388e3c' },
        { id: 3, name: 'Imaging', icon: 'Biotech', color: '#f57c00' },
        { id: 4, name: 'Medications', icon: 'LocalPharmacy', color: '#7b1fa2' },
        { id: 5, name: 'Assessments', icon: 'Assessment', color: '#d32f2f' },
        { id: 6, name: 'Care Plans', icon: 'EventNote', color: '#0288d1' },
        { id: 7, name: 'Forms', icon: 'Description', color: '#5d4037' },
        { id: 8, name: 'Images', icon: 'Image', color: '#e64a19' }
    ];

    // File type configurations
    const fileTypeConfig = {
        pdf: { icon: PdfIcon, color: '#d32f2f', label: 'PDF' },
        doc: { icon: DocumentIcon, color: '#1976d2', label: 'Word' },
        docx: { icon: DocumentIcon, color: '#1976d2', label: 'Word' },
        jpg: { icon: ImageIcon, color: '#388e3c', label: 'Image' },
        jpeg: { icon: ImageIcon, color: '#388e3c', label: 'Image' },
        png: { icon: ImageIcon, color: '#388e3c', label: 'Image' },
        txt: { icon: DocumentIcon, color: '#616161', label: 'Text' }
    };

    // Confidentiality levels
    const confidentialityLevels = ['Standard', 'Confidential', 'Restricted', 'Top Secret'];

    // Mock documents for development
    const mockDocuments = [
        {
            archiveID: 1,
            documentName: "Nursing Assessment Form - July 2025",
            originalFileName: "nursing_assessment_20250717.pdf",
            fileExtension: "pdf",
            fileSize: 245760,
            categoryName: "Nursing Notes",
            description: "Initial nursing assessment for client admission",
            documentDate: "2025-07-17",
            confidentialityLevel: "Standard",
            uploadedBy: "nurse@hospital.com",
            uploadedAt: "2025-07-17T10:30:00Z",
            downloadCount: 3
        },
        {
            archiveID: 2,
            documentName: "Lab Results - Complete Blood Count",
            originalFileName: "cbc_results_20250716.pdf",
            fileExtension: "pdf",
            fileSize: 189440,
            categoryName: "Lab Reports",
            description: "CBC results showing normal values",
            documentDate: "2025-07-16",
            confidentialityLevel: "Confidential",
            uploadedBy: "lab@hospital.com",
            uploadedAt: "2025-07-16T14:20:00Z",
            downloadCount: 5
        },
        {
            archiveID: 3,
            documentName: "Chest X-Ray",
            originalFileName: "chest_xray_20250715.jpg",
            fileExtension: "jpg",
            fileSize: 512000,
            categoryName: "Imaging",
            description: "Chest X-ray showing clear lungs",
            documentDate: "2025-07-15",
            confidentialityLevel: "Confidential",
            uploadedBy: "radiologist@hospital.com",
            uploadedAt: "2025-07-15T09:15:00Z",
            downloadCount: 2
        }
    ];

    // ✅ Fetch documents when component loads
    useEffect(() => {
        if (useMockData) {
            // Use mock data for development
        } else {
            dispatch(fetchDocuments(clientID));
            dispatch(fetchCategories());
        }
    }, [dispatch, clientID, useMockData]);

    // ✅ Handle file selection
    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        setSelectedFiles(files);
        if (files.length > 0) {
            setUploadDialogOpen(true);
        }
    };

    // ✅ Open file dialog
    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    // ✅ Handle file upload
    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            alert("Please select files to upload");
            return;
        }

        const uploadPromises = selectedFiles.map(file => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', uploadMetadata.category);
            formData.append('description', uploadMetadata.description);
            formData.append('documentDate', uploadMetadata.documentDate);
            formData.append('confidentialityLevel', uploadMetadata.confidentialityLevel);

            return dispatch(uploadDocument({ clientID, formData }));
        });

        try {
            await Promise.all(uploadPromises);
            setUploadDialogOpen(false);
            setSelectedFiles([]);
            setUploadMetadata({
                category: '',
                description: '',
                documentDate: '',
                confidentialityLevel: 'Standard'
            });
            // Refresh documents list
            dispatch(fetchDocuments(clientID));
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    // ✅ Handle document deletion
    const handleDelete = async (documentID) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            await dispatch(deleteDocument(documentID));
            dispatch(fetchDocuments(clientID));
        }
    };

    // ✅ Handle document download
    const handleDownload = (documentID, fileName) => {
        dispatch(downloadDocument({ documentID, fileName }));
    };

    // ✅ Get file type icon
    const getFileIcon = (extension) => {
        const config = fileTypeConfig[extension?.toLowerCase()] || fileTypeConfig.txt;
        const IconComponent = config.icon;
        return <IconComponent sx={{ color: config.color }} />;
    };

    // ✅ Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ✅ Get confidentiality color
    const getConfidentialityColor = (level) => {
        switch (level) {
            case 'Standard': return 'default';
            case 'Confidential': return 'warning';
            case 'Restricted': return 'error';
            case 'Top Secret': return 'error';
            default: return 'default';
        }
    };

    // ✅ Filter documents based on search and category
    const filteredDocuments = useMockData ? mockDocuments.filter(doc => {
        const matchesSearch = !searchTerm || 
            doc.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || doc.categoryName === categoryFilter;
        return matchesSearch && matchesCategory;
    }) : documents;

    // ✅ Tab panels
    const TabPanel = ({ children, value, index }) => (
        <div hidden={value !== index}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );

    return (
        <Paper elevation={3} sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    Nursing Archive
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Secure Document Management System
                </Typography>
            </Box>

            {/* Tabs */}
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab 
                    label={
                        <Badge badgeContent={filteredDocuments.length} color="primary">
                            Documents
                        </Badge>
                    } 
                />
                <Tab label="Upload" />
                <Tab label="Categories" />
                <Tab label="Security" />
            </Tabs>

            {/* Documents Tab */}
            <TabPanel value={activeTab} index={0}>
                {/* Search and Filter Bar */}
                <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    label="Category"
                                >
                                    <MenuItem value="">All Categories</MenuItem>
                                    {documentCategories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button
                                variant="contained"
                                startIcon={<UploadIcon />}
                                onClick={() => setActiveTab(1)}
                                fullWidth
                            >
                                Upload Documents
                            </Button>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Tooltip title="Switch View">
                                <IconButton 
                                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                    color="primary"
                                >
                                    <FilterIcon />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                    </Grid>
                </Box>

                {/* Documents Grid/List */}
                {documentsLoading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {filteredDocuments.map((document) => (
                            <Grid item xs={12} sm={6} md={4} key={document.archiveID}>
                                <Card elevation={2} sx={{ height: '100%' }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" mb={2}>
                                            {getFileIcon(document.fileExtension)}
                                            <Box ml={2} flexGrow={1}>
                                                <Typography variant="h6" component="div" noWrap>
                                                    {document.documentName}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {formatFileSize(document.fileSize)}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Box mb={2}>
                                            <Chip 
                                                label={document.categoryName}
                                                size="small"
                                                color="primary"
                                                sx={{ mr: 1, mb: 1 }}
                                            />
                                            <Chip 
                                                label={document.confidentialityLevel}
                                                size="small"
                                                color={getConfidentialityColor(document.confidentialityLevel)}
                                                sx={{ mb: 1 }}
                                            />
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {document.description}
                                        </Typography>

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(document.uploadedAt).toLocaleDateString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Downloads: {document.downloadCount}
                                            </Typography>
                                        </Box>
                                    </CardContent>

                                    <CardActions>
                                        <Tooltip title="Download">
                                            <IconButton 
                                                size="small" 
                                                color="primary"
                                                onClick={() => handleDownload(document.archiveID, document.originalFileName)}
                                            >
                                                <DownloadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="View">
                                            <IconButton size="small" color="info">
                                                <ViewIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Share">
                                            <IconButton size="small" color="success">
                                                <ShareIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDelete(document.archiveID)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {filteredDocuments.length === 0 && !documentsLoading && (
                    <Box textAlign="center" py={6}>
                        <DocumentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No documents found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Upload documents to get started
                        </Typography>
                        <Button 
                            variant="contained" 
                            startIcon={<UploadIcon />}
                            onClick={() => setActiveTab(1)}
                        >
                            Upload Documents
                        </Button>
                    </Box>
                )}
            </TabPanel>

            {/* Upload Tab */}
            <TabPanel value={activeTab} index={1}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        {/* File Upload Area */}
                        <Paper
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                border: '2px dashed',
                                borderColor: 'grey.300',
                                bgcolor: 'grey.50',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'primary.50'
                                }
                            }}
                        >
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            
                            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                Select Files to Upload
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Maximum file size: 50MB per file
                            </Typography>
                            <Button 
                                variant="contained" 
                                startIcon={<AttachFileIcon />}
                                onClick={openFileDialog}
                                size="large"
                            >
                                Choose Files
                            </Button>
                        </Paper>

                        {/* Selected Files Preview */}
                        {selectedFiles.length > 0 && (
                            <Paper sx={{ mt: 2, p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Selected Files ({selectedFiles.length})
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {selectedFiles.map((file, index) => (
                                        <Chip 
                                            key={index}
                                            label={`${file.name} (${formatFileSize(file.size)})`}
                                            onDelete={() => {
                                                setSelectedFiles(files => files.filter((_, i) => i !== index));
                                            }}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        )}

                        {/* Upload Progress */}
                        {uploading && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" gutterBottom>
                                    Uploading... {uploadProgress}%
                                </Typography>
                                <LinearProgress variant="determinate" value={uploadProgress} />
                            </Box>
                        )}
                    </Grid>

                    <Grid item xs={12} md={4}>
                        {/* Upload Instructions */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Security Guidelines
                                </Typography>
                                <List dense>
                                    <ListItem>
                                        <ListItemText 
                                            primary="PHI Protection"
                                            secondary="All uploads are encrypted and logged"
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Virus Scanning"
                                            secondary="Files are automatically scanned"
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Access Control"
                                            secondary="Role-based document access"
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText 
                                            primary="Audit Trail"
                                            secondary="All activities are tracked"
                                        />
                                    </ListItem>
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Categories Tab */}
            <TabPanel value={activeTab} index={2}>
                <Grid container spacing={2}>
                    {documentCategories.map((category) => (
                        <Grid item xs={12} sm={6} md={3} key={category.id}>
                            <Card sx={{ textAlign: 'center', p: 2 }}>
                                <Box sx={{ color: category.color, mb: 1 }}>
                                    <ReportIcon sx={{ fontSize: 40 }} />
                                </Box>
                                <Typography variant="h6">{category.name}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {filteredDocuments.filter(doc => doc.categoryName === category.name).length} documents
                                </Typography>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel value={activeTab} index={3}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                    Security Status
                                </Typography>
                                <List>
                                    <ListItem>
                                        <ListItemIcon>
                                            <SecurityIcon color="success" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Encryption Enabled"
                                            secondary="All documents are encrypted at rest"
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemIcon>
                                            <SecurityIcon color="success" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Virus Scanning Active"
                                            secondary="Real-time malware protection"
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemIcon>
                                            <HistoryIcon color="info" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Audit Logging"
                                            secondary="Complete access history maintained"
                                        />
                                    </ListItem>
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Document Statistics
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Documents: {filteredDocuments.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Size: {formatFileSize(filteredDocuments.reduce((sum, doc) => sum + doc.fileSize, 0))}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Categories: {documentCategories.length}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Upload Dialog */}
            <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        Ready to upload {selectedFiles.length} file(s). Please provide metadata for the documents.
                    </Alert>

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Category *</InputLabel>
                                <Select
                                    value={uploadMetadata.category}
                                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                                    label="Category *"
                                >
                                    {documentCategories.map(cat => (
                                        <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Confidentiality Level</InputLabel>
                                <Select
                                    value={uploadMetadata.confidentialityLevel}
                                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, confidentialityLevel: e.target.value }))}
                                    label="Confidentiality Level"
                                >
                                    {confidentialityLevels.map(level => (
                                        <MenuItem key={level} value={level}>{level}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Document Date"
                                type="date"
                                value={uploadMetadata.documentDate}
                                onChange={(e) => setUploadMetadata(prev => ({ ...prev, documentDate: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description"
                                value={uploadMetadata.description}
                                onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter a description for the documents..."
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleUpload} 
                        variant="contained"
                        disabled={uploading || !uploadMetadata.category}
                        startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default NursingArchive;