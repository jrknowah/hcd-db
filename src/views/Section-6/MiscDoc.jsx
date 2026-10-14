import React, { useState, useEffect } from 'react';
import { Box, Alert, LinearProgress, TextField } from '@mui/material';
import { FolderShared as FolderIcon } from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { azureBlobService } from '../../backend/services/azureBlobService';
import { ARCHIVE_SECTIONS, SECTION_CATEGORIES, sectionDocType, filterSectionFiles } from '../../utils/archiveSections';
import SectionArchiveLayout from '../../components/shared/SectionArchiveLayout';

/**
 * MiscDoc (Section 6)
 *
 * Uses the same layout as Section 3's Mental Health Archive
 * (components/shared/SectionArchiveLayout): one upload card per category,
 * an upload dialog, and the archived documents table. Data stays local:
 * - useClientPersistence hook for clientID
 * - Direct azureBlobService calls (no Redux)
 */

// Document categories for miscellaneous documents
const DOCUMENT_CATEGORIES = SECTION_CATEGORIES[ARCHIVE_SECTIONS.MISC_DOCS];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MiscDoc = () => {
  // ✅ Get clientID from useClientPersistence hook (Section 1 pattern)
  const { clientID: hookClientID, loading: clientLoading } = useClientPersistence();

  // ✅ Extract string value from hook result
  const clientID = React.useMemo(() => {
    if (!hookClientID) return null;
    if (typeof hookClientID === 'string') return hookClientID;
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

  // Component state
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch files when clientID changes, dropping the previous client's state
  useEffect(() => {
    setFiles([]);
    setError(null);
    setSuccess(null);
    setDescription('');

    if (clientID) {
      fetchFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientID]);

  const fetchFiles = async () => {
    if (!clientID) return;

    setLoading(true);
    setError(null);

    try {
      const result = await azureBlobService.listClientFiles(clientID, 'misc_documents');
      setFiles(filterSectionFiles(result, ARCHIVE_SECTIONS.MISC_DOCS, DOCUMENT_CATEGORIES));
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setError(error.message || 'Failed to fetch files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (category, file) => {
    if (!clientID) {
      setError('No client selected. Please select a client first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await azureBlobService.uploadFile(
        file,
        clientID,
        sectionDocType(ARCHIVE_SECTIONS.MISC_DOCS, category)
      );
      setSuccess(`File "${file.name}" uploaded successfully!`);
      await fetchFiles();
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const downloadUrl = await azureBlobService.generateDownloadUrl(file.blobName);
      window.open(downloadUrl, '_blank');
      setSuccess(`File "${file.fileName}" download started!`);
    } catch (error) {
      console.error('❌ Download failed:', error);
      setError(error.message || 'Failed to download file');
    }
  };

  const handleDelete = async (file) => {
    try {
      await azureBlobService.deleteFile(file.blobName);
      setSuccess(`File "${file.fileName}" deleted successfully!`);
      await fetchFiles();
    } catch (error) {
      console.error('❌ Delete failed:', error);
      setError(error.message || 'Failed to delete file');
    }
  };

  // Show loading state while client is being loaded
  if (clientLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Loading client information...</Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  // Show message if no client is selected
  if (!clientID) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please select a client from Section 1 (Identification) first.
        </Alert>
      </Box>
    );
  }

  return (
    <SectionArchiveLayout
      icon={<FolderIcon color="primary" fontSize="large" />}
      title="Miscellaneous Documents"
      subtitle={`Upload and manage miscellaneous documents for client: ${clientID}`}
      files={files}
      loading={loading}
      uploading={isUploading}
      error={error}
      success={success}
      onClearError={() => setError(null)}
      onClearSuccess={() => setSuccess(null)}
      onError={setError}
      categories={DOCUMENT_CATEGORIES}
      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.xls,.xlsx"
      allowedTypes={ALLOWED_FILE_TYPES}
      maxSize={MAX_FILE_SIZE}
      onUpload={handleUpload}
      onDownload={handleDownload}
      onDelete={handleDelete}
      onRefresh={fetchFiles}
      onDialogClose={() => setDescription('')}
      dialogFields={
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes"
          disabled={isUploading}
          sx={{ mt: 2 }}
        />
      }
      emptyTitle="No miscellaneous documents found"
      emptyText="Upload documents using the forms above"
    />
  );
};

export default MiscDoc;
