import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Alert,
  LinearProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { LocalHospital as MedicalIcon } from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { azureBlobService } from '../../backend/services/azureBlobService';
import { ARCHIVE_SECTIONS, SECTION_CATEGORIES, sectionDocType, filterSectionFiles } from '../../utils/archiveSections';
import { recordNursingArchiveUpload, withUploaders } from '../../utils/nursingArchiveUploads';
import SectionArchiveLayout from '../../components/shared/SectionArchiveLayout';

/**
 * NursingArchive (Section 5)
 *
 * Uses the same layout as Section 3's Mental Health Archive
 * (components/shared/SectionArchiveLayout). Data stays local:
 * - useClientPersistence hook for clientID
 * - Direct azureBlobService calls (no Redux)
 * - Uploader recorded per file and shown in an "Uploaded By" column
 */

// Nursing document types for the archive
const NURSING_DOC_TYPES = SECTION_CATEGORIES[ARCHIVE_SECTIONS.NURSING];

// Confidentiality levels
const CONFIDENTIALITY_LEVELS = [
  'Standard',
  'Confidential',
  'Restricted',
  'Highly Confidential'
];

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Max file size (15MB - matching files.js backend)
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const NursingArchive = () => {
  // ✅ Get clientID from useClientPersistence hook (matches AuthSigArchive)
  const { clientID: hookClientID, loading: clientLoading } = useClientPersistence();
  
  // ✅ Extract string value from hook result (matches AuthSigArchive)
  const clientID = React.useMemo(() => {
    if (!hookClientID) return null;
    
    if (typeof hookClientID === 'string') {
      return hookClientID;
    }
    
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

  // Component state (matches AuthSigArchive pattern)
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Upload dialog state
  const [confidentialityLevel, setConfidentialityLevel] = useState('Standard');
  const [description, setDescription] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);


  // ✅ Fetch files when component mounts (matches AuthSigArchive)
  // 🔁 Section-switch fix: this component is NOT backed by Redux, so the
  // Section-5 slice wipe in Medical.jsx can't clear it. When the selected
  // client changes we therefore reset ALL local state ourselves BEFORE the
  // refetch — otherwise the previous client's file list, staged upload, and
  // any banners would linger on screen until the new fetch resolves.
  useEffect(() => {
    // Always clear the prior client's local state on a client change.
    setFiles([]);
    setError(null);
    setSuccess(null);
    setConfidentialityLevel('Standard');
    setDescription('');
    setDocumentDate('');

    if (clientID) {
      console.log('🏥 Fetching nursing documents for client:', clientID);
      fetchFiles();
    } else {
      console.log('⚠️ No clientID available, skipping file fetch');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientID]);

  /**
   * ✅ Fetch files using azureBlobService.listClientFiles (matches AuthSigArchive)
   */
  const fetchFiles = async () => {
    if (!clientID) {
      console.warn('⚠️ Cannot fetch files: No clientID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🌐 Fetching nursing documents for clientID:', clientID);
      
      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      const result = await azureBlobService.listClientFiles(
        clientID,
        'nursing_archive'  // docType for nursing documents
      );

      console.log('✅ Nursing documents fetched:', result?.length || 0);
      const nursingFiles = filterSectionFiles(result, ARCHIVE_SECTIONS.NURSING, NURSING_DOC_TYPES);
      setFiles(await withUploaders(clientID, nursingFiles));

    } catch (error) {
      console.error('❌ Error fetching nursing documents:', error);
      setError(error.message || 'Failed to fetch documents');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Upload file using azureBlobService.uploadFile (matches AuthSigArchive)
   */
  const handleUpload = async (docType, file) => {
    if (!clientID) {
      setError('No client selected. Please select a client first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🚀 Starting nursing document upload:', {
        clientID,
        fileName: file.name,
        docType,
        confidentiality: confidentialityLevel,
        fileSize: file.size
      });

      const result = await azureBlobService.uploadFile(
        file,
        clientID,
        sectionDocType(ARCHIVE_SECTIONS.NURSING, docType)
      );

      console.log('✅ Upload successful:', result);

      // Record who uploaded it (DB + audit log); the file is already stored either way
      let uploaderNote = '';
      if (!result?.mock) {
        try {
          await recordNursingArchiveUpload({
            clientID,
            blobName: result.blobName,
            fileName: file.name,
            docType,
          });
        } catch (recordErr) {
          console.error('❌ Could not record uploader:', recordErr);
          uploaderNote = ` (but who uploaded it could not be recorded: ${recordErr.message})`;
        }
      }

      setSuccess(`Document "${file.name}" uploaded successfully!${uploaderNote}`);

      // Refresh file list
      await fetchFiles();

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(error.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * ✅ Download file using azureBlobService (matches AuthSigArchive)
   */
  const handleDownload = async (file) => {
    try {
      console.log('⬇️ Downloading document:', file.fileName);
      
      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      const downloadUrl = await azureBlobService.generateDownloadUrl(file.blobName);
      
      window.open(downloadUrl, '_blank');

      console.log('✅ Download initiated');
      setSuccess(`Document "${file.fileName}" download started!`);

    } catch (error) {
      console.error('❌ Download failed:', error);
      setError(error.message || 'Failed to download document');
    }
  };

  /**
   * ✅ Delete file using azureBlobService (matches AuthSigArchive)
   */
  const handleDelete = async (file) => {
    try {
      console.log('🗑️ Deleting document:', file.fileName);
      
      // ✅ Use existing azureBlobService function (matches AuthSigArchive)
      await azureBlobService.deleteFile(file.blobName);

      console.log('✅ Delete complete');
      setSuccess(`Document "${file.fileName}" deleted successfully!`);

      await fetchFiles();

    } catch (error) {
      console.error('❌ Delete failed:', error);
      setError(error.message || 'Failed to delete document');
    }
  };

  // Show loading state (matches AuthSigArchive)
  if (clientLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" icon={<MedicalIcon />}>
          Loading client information...
        </Alert>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  // Show message if no client selected (matches AuthSigArchive)
  if (!clientID) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" icon={<MedicalIcon />}>
          Please select a client from Section 1 (Identification) first.
        </Alert>
      </Box>
    );
  }

  const resetDialogFields = () => {
    setConfidentialityLevel('Standard');
    setDescription('');
    setDocumentDate('');
  };

  return (
    <SectionArchiveLayout
      icon={<MedicalIcon color="primary" fontSize="large" />}
      title="Nursing Documentation Archive"
      subtitle={`Upload and manage nursing documents and medical records for client: ${clientID}`}
      files={files}
      loading={loading}
      uploading={isUploading}
      error={error}
      success={success}
      onClearError={() => setError(null)}
      onClearSuccess={() => setSuccess(null)}
      onError={setError}
      categories={NURSING_DOC_TYPES}
      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      allowedTypes={ALLOWED_FILE_TYPES}
      maxSize={MAX_FILE_SIZE}
      onUpload={handleUpload}
      onDownload={handleDownload}
      onDelete={handleDelete}
      onRefresh={fetchFiles}
      extraColumns={[{ header: 'Uploaded By', render: (file) => file.uploader || '—' }]}
      onDialogClose={resetDialogFields}
      dialogFields={
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Confidentiality Level</InputLabel>
              <Select
                value={confidentialityLevel}
                onChange={(e) => setConfidentialityLevel(e.target.value)}
                label="Confidentiality Level"
                disabled={isUploading}
              >
                {CONFIDENTIALITY_LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Document Date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={isUploading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes about this document"
              disabled={isUploading}
            />
          </Grid>
        </Grid>
      }
      emptyTitle="No nursing documents found"
      emptyText="Upload nursing documents using the forms above"
    />
  );
};

export default NursingArchive;