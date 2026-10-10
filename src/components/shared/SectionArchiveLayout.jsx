// Shared archive tab layout, matching Section 3's Mental Health Archive:
// header, summary stats, one upload card per category, upload dialog,
// archived-documents table, and preview / download / delete actions.
// Data loading and storage stay with each section; this only renders.
import React, { useState } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Alert, LinearProgress,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  OutlinedInput, Tooltip, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Divider
} from '@mui/material';
import {
  CloudUpload, Delete, Download, Visibility, Description, FolderOpen,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { azureBlobService } from '../../backend/services/azureBlobService';

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const DEFAULT_MAX_SIZE = 15 * 1024 * 1024; // matches the backend upload limit

export const formatFileSize = (bytes) => {
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
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (['txt'].includes(ext)) return '📃';
  return '📎';
};

const isPreviewable = (file) => {
  const name = file.fileName?.toLowerCase() || '';
  return name.endsWith('.pdf') || /\.(jpe?g|png|gif)$/.test(name);
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d) ? '—' : d.toLocaleDateString();
};

/**
 * Props
 * - icon, title, subtitle: header
 * - files: [{ fileName, docType, fileSize, uploadDate, blobName?, previewUrl? }]
 * - loading, uploading, error, success, onClearError, onClearSuccess, onError
 * - categories: upload categories (one card each)
 * - accept, allowedTypes, maxSize: upload validation
 * - onUpload(category, file) -> Promise; resolves when stored
 * - onDownload(file), onDelete(file) -> Promise, canDelete(file)
 * - onRefresh: optional refresh button on the documents list
 * - extraColumns: [{ header, render(file) }] after Upload Date
 * - dialogFields: extra nodes in the upload dialog
 * - onDialogClose: called when the upload dialog closes (reset extra fields)
 * - emptyTitle, emptyText, exportMode
 */
const SectionArchiveLayout = ({
  icon,
  title,
  subtitle,
  files = [],
  loading = false,
  uploading = false,
  error,
  success,
  onClearError,
  onClearSuccess,
  onError,
  categories = [],
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt',
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSize = DEFAULT_MAX_SIZE,
  onUpload,
  onDownload,
  onDelete,
  canDelete = () => true,
  onRefresh,
  extraColumns = [],
  dialogFields = null,
  onDialogClose,
  emptyTitle = 'No files in archive',
  emptyText = 'Upload documents using the forms above',
  exportMode = false
}) => {
  const [pendingFile, setPendingFile] = useState(null);
  const [currentDocType, setCurrentDocType] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const summary = {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + (file.fileSize || 0), 0),
    documentTypes: new Set(files.map(f => f.docType)).size,
    recentFiles: files.filter(f => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(f.uploadDate) >= thirtyDaysAgo;
    }).length
  };

  const handleFileSelect = (docType, input) => {
    const file = input.files?.[0];
    input.value = ''; // let the same file be picked again
    if (!file) return;

    if (file.size > maxSize) {
      onError?.(`File "${file.name}" is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
      return;
    }
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      onError?.(`File type "${file.type || 'unknown'}" is not supported.`);
      return;
    }

    setCurrentDocType(docType);
    setPendingFile(file);
    setUploadDialogOpen(true);
  };

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setPendingFile(null);
    setCurrentDocType('');
    onDialogClose?.();
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    try {
      await onUpload(currentDocType, pendingFile);
    } finally {
      closeUploadDialog();
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    try {
      await onDelete(fileToDelete);
    } finally {
      setFileToDelete(null);
    }
  };

  const handlePreview = async (file) => {
    // Legacy records with their own route (no blob)
    if (!file.blobName && file.previewUrl) {
      window.open(file.previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!file.blobName || !isPreviewable(file)) {
      setFilePreview(file);
      return;
    }

    // Open the tab immediately, inside the click, or the popup blocker kills it
    const tab = window.open('', '_blank');
    try {
      const url = await azureBlobService.generateDownloadUrl(file.blobName, 1, { inline: true });
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url); // popup blocked: open in same tab
      }
    } catch (err) {
      tab?.close();
      onError?.(`Failed to open ${file.fileName}: ${err.message}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={onClearSuccess}>
          {success}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {icon}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Summary Stats */}
      {summary.totalFiles > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Grid container spacing={2}>
            {[
              { value: summary.totalFiles, label: 'Total Files', color: 'primary.main' },
              { value: formatFileSize(summary.totalSize), label: 'Total Size', color: 'info.main' },
              { value: summary.documentTypes, label: 'Document Types', color: 'success.main' },
              { value: summary.recentFiles, label: 'Recent (30 days)', color: 'warning.main' }
            ].map(stat => (
              <Grid item xs={12} sm={3} key={stat.label}>
                <Box textAlign="center">
                  <Typography variant="h4" color={stat.color}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Upload Section */}
      {!exportMode && (
        <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upload Documents
            </Typography>

            <Grid container spacing={2}>
              {categories.map((docType) => (
                <Grid item xs={12} sm={6} md={4} key={docType}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        {docType}
                      </Typography>

                      <OutlinedInput
                        type="file"
                        onChange={(e) => handleFileSelect(docType, e.target)}
                        fullWidth
                        disabled={uploading}
                        sx={{ mb: 1 }}
                        inputProps={{ accept }}
                      />

                      {uploading && currentDocType === docType && (
                        <Box sx={{ mb: 1 }}>
                          <LinearProgress />
                          <Typography variant="caption" color="text.secondary">
                            Uploading...
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
      )}

      {/* Files List Section */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" gutterBottom>
              Archived Documents ({files.length})
            </Typography>
            {onRefresh && !exportMode && (
              <Tooltip title="Refresh list">
                <span>
                  <IconButton size="small" onClick={onRefresh} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3 }}>
              <LinearProgress sx={{ flexGrow: 1 }} />
              <Typography variant="body2">Loading documents...</Typography>
            </Box>
          ) : files.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <FolderOpen sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {emptyTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {emptyText}
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
                  {extraColumns.map(col => <TableCell key={col.header}>{col.header}</TableCell>)}
                  {!exportMode && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file, index) => (
                  <TableRow key={file.blobName || file.id || index} hover>
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
                      <Chip label={file.docType || 'Unknown'} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={formatFileSize(file.fileSize)} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(file.uploadDate)}</Typography>
                    </TableCell>
                    {extraColumns.map(col => (
                      <TableCell key={col.header}>{col.render(file)}</TableCell>
                    ))}
                    {!exportMode && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Preview">
                            <IconButton size="small" onClick={() => handlePreview(file)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>

                          {onDownload && (
                            <Tooltip title="Download">
                              <IconButton size="small" onClick={() => onDownload(file)}>
                                <Download />
                              </IconButton>
                            </Tooltip>
                          )}

                          {onDelete && canDelete(file) && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => setFileToDelete(file)}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          )}
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={closeUploadDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload {currentDocType}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Selected: {pendingFile?.name} ({formatFileSize(pendingFile?.size)})
            </Typography>
            {dialogFields}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUploadDialog} disabled={uploading}>Cancel</Button>
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
      <Dialog open={!!fileToDelete} onClose={() => setFileToDelete(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{fileToDelete?.fileName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileToDelete(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog (types the browser can't show inline) */}
      <Dialog open={!!filePreview} onClose={() => setFilePreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="span">{filePreview?.fileName}</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Preview not available for this file type
            </Typography>
            {onDownload && (
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => onDownload(filePreview)}
              >
                Download to View
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SectionArchiveLayout;
