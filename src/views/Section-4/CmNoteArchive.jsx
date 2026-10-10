// Section 4 Notes Archive - same layout as Section 3's Mental Health Archive
import React, { useState, useEffect, useMemo } from "react";
import { Card, Alert } from "@mui/material";
import { Archive as ArchiveIcon } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  uploadNoteFile,
  fetchNoteArchiveFiles,
  clearError,
  clearSuccess
} from "../../backend/store/slices/noteArchiveSlice";
import { azureBlobService } from "../../backend/services/azureBlobService";
import { ARCHIVE_SECTIONS, SECTION_CATEGORIES } from "../../utils/archiveSections";
import SectionArchiveLayout from "../../components/shared/SectionArchiveLayout";

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const CM_NOTES_CATEGORIES = SECTION_CATEGORIES[ARCHIVE_SECTIONS.CM_NOTES];

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const CmNoteArchive = ({ clientID: clientIDProp, exportMode = false }) => {
  const dispatch = useDispatch();

  // Fall back to the selected client when no prop is passed.
  const currentClient = useSelector((state) => state.clients?.selectedClient);
  const clientID = clientIDProp || currentClient?.clientID;

  const {
    loading,
    error,
    successMessage,
    uploadedFiles,
    filesLoading,
    filesError
  } = useSelector((state) => state.noteArchive);

  const [localError, setLocalError] = useState(null);
  const [localSuccess, setLocalSuccess] = useState(null);

  // Load existing files when client changes, and drop the previous
  // client's banners
  useEffect(() => {
    setLocalError(null);
    setLocalSuccess(null);
    if (clientID) {
      dispatch(fetchNoteArchiveFiles(clientID));
    }
  }, [clientID, dispatch]);

  // Legacy note-archive records have their own download route instead of a blob
  const files = useMemo(
    () => (uploadedFiles || []).map(f => ({
      ...f,
      docType: f.docType || CM_NOTES_CATEGORIES[0],
      uploadDate: f.uploadedAt || f.uploadDate,
      previewUrl: !f.blobName && f.fileUrl ? `${API}${f.fileUrl}` : undefined
    })),
    [uploadedFiles]
  );

  const refresh = () => clientID && dispatch(fetchNoteArchiveFiles(clientID));

  const handleUpload = async (_category, file) => {
    await dispatch(uploadNoteFile({ file, clientID }));
    refresh();
  };

  const handleDownload = async (file) => {
    if (!file.blobName) {
      if (file.previewUrl) window.open(file.previewUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const url = await azureBlobService.generateDownloadUrl(file.blobName);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setLocalError(err.message || 'Failed to download file');
    }
  };

  const handleDelete = async (file) => {
    try {
      await azureBlobService.deleteFile(file.blobName);
      setLocalSuccess(`🗑️ ${file.fileName} deleted successfully`);
      refresh();
    } catch (err) {
      setLocalError(err.message || 'Failed to delete file');
    }
  };

  const shownError = localError || error || (filesError && `Could not load files: ${filesError}`);
  const shownSuccess = localSuccess || successMessage;

  const clientName = [currentClient?.clientFirstName, currentClient?.clientLastName]
    .filter(Boolean).join(' ');

  if (!clientID) {
    return (
      <Card sx={{ padding: 3 }}>
        <Alert severity="info">
          Please select a client to view notes archive documents.
        </Alert>
      </Card>
    );
  }

  return (
    <SectionArchiveLayout
      icon={<ArchiveIcon color="primary" fontSize="large" />}
      title="Notes Archive"
      subtitle={`Upload and manage case management note documents${clientName ? ` for ${clientName}` : ''}`}
      files={files}
      loading={filesLoading}
      uploading={loading}
      error={shownError}
      success={shownSuccess}
      onClearError={() => { setLocalError(null); dispatch(clearError()); }}
      onClearSuccess={() => { setLocalSuccess(null); dispatch(clearSuccess()); }}
      onError={setLocalError}
      categories={CM_NOTES_CATEGORIES}
      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
      allowedTypes={ALLOWED_TYPES}
      onUpload={handleUpload}
      onDownload={handleDownload}
      onDelete={handleDelete}
      canDelete={(file) => !!file.blobName}
      onRefresh={refresh}
      emptyTitle="No files in notes archive"
      emptyText="Upload case management notes using the form above"
      exportMode={exportMode}
    />
  );
};

export default CmNoteArchive;
