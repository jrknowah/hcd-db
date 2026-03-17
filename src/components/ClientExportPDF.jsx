/**
 * ClientExportPDF.jsx
 * Frontend component — Full client record PDF export
 *
 * Usage: Drop inside any section tab, or as a standalone Export tab.
 * Requires: selectedClient in Redux store, JWT token in auth slice.
 *
 * Props:
 *   clientID  {string}  – override; falls back to Redux selectedClient.clientID
 */

import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Typography,
  Chip,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_APP_API_URL || 'http://localhost:5000';

const SECTIONS = [
  { label: 'Section 1 – Identification & Referrals', color: '#1565C0' },
  { label: 'Section 2 – Authorization & Signature Forms', color: '#1976D2' },
  { label: 'Section 3 – Assessment & Care Plans', color: '#388E3C' },
  { label: 'Section 4 – Client Progress', color: '#F57C00' },
  { label: 'Section 5 – Medical Information & Screenings', color: '#7B1FA2' },
  { label: 'Section 6 – Case Management', color: '#C62828' },
];

// Scan sessionStorage for MSAL access token
const getMsalTokenFromSession = () => {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.includes('accesstoken')) {
      try {
        const item = JSON.parse(sessionStorage.getItem(key));
        if (item?.secret) return item.secret;
      } catch {}
    }
  }
  return null;
};

export default function ClientExportPDF({ clientID: propClientID }) {
  const selectedClient = useSelector((state) => state.clients?.selectedClient);

  // Try every common Redux location for the token
  const reduxToken = useSelector((state) =>
    state.auth?.token ||
    state.auth?.accessToken ||
    state.auth?.idToken ||
    state.auth?.msalToken ||
    state.user?.token ||
    state.user?.accessToken ||
    null
  );

  const clientID = propClientID || selectedClient?.clientID;
  const clientName = selectedClient
    ? `${selectedClient.clientLastName || ''}, ${selectedClient.clientFirstName || ''}`.trim()
    : clientID || 'Unknown Client';

  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);

  const getAuthToken = () => {
    // 1. Try Redux store
    if (reduxToken) {
      console.log('🔑 Token source: Redux store');
      return reduxToken;
    }
    // 2. Try MSAL sessionStorage
    const msalToken = getMsalTokenFromSession();
    if (msalToken) {
      console.log('🔑 Token source: MSAL sessionStorage');
      return msalToken;
    }
    // 3. Try localStorage fallbacks
    const localToken = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (localToken) {
      console.log('🔑 Token source: localStorage');
      return localToken;
    }
    // 4. Dev bypass
    console.log('🔑 Token source: dev-bypass-token');
    return 'dev-bypass-token';
  };

  const handleExport = async () => {
    if (!clientID) {
      setErrorMsg('No client selected. Please select a client before exporting.');
      setSnackOpen(true);
      return;
    }

    setStatus('loading');
    setProgress(10);
    setErrorMsg('');

    const ticker = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 5 : p));
    }, 600);

    try {
      const authToken = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      console.log('📤 Fetching:', `${API_BASE}/api/export/client/${clientID}/pdf`);

      const response = await fetch(
        `${API_BASE}/api/export/client/${encodeURIComponent(clientID)}/pdf`,
        { method: 'GET', headers }
      );

      clearInterval(ticker);

      if (!response.ok) {
        let msg = `Export failed (${response.status})`;
        try {
          const body = await response.json();
          msg = body.error || msg;
        } catch {}
        throw new Error(msg);
      }

      // Stream blob → trigger download
      const blob = await response.blob();
      setProgress(100);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      a.href = url;
      a.download = match ? match[1] : `${clientID}_Complete_Record.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus('done');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      clearInterval(ticker);
      setErrorMsg(err.message || 'Export failed. Please try again.');
      setStatus('error');
      setSnackOpen(true);
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const isLoading = status === 'loading';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', mt: 3 }}>
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <PictureAsPdfIcon color="error" fontSize="large" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Export Complete Client Record
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generates a single HIPAA-compliant PDF containing all six sections.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Selected client indicator */}
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="body2" color="text.secondary">
              Client:
            </Typography>
            {clientID ? (
              <Chip
                label={`${clientName} (${clientID})`}
                color="primary"
                size="small"
                icon={<FolderIcon />}
              />
            ) : (
              <Chip label="No client selected" color="warning" size="small" />
            )}
          </Box>

          {/* Sections list */}
          <List dense disablePadding>
            {SECTIONS.map((s) => (
              <ListItem key={s.label} disableGutters sx={{ py: 0.2 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: s.color }} />
                </ListItemIcon>
                <ListItemText
                  primary={s.label}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 1.5 }} />

          {/* Progress bar */}
          {isLoading && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                Building PDF — please wait…
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
          )}

          {/* Done indicator */}
          {isDone && (
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <DownloadDoneIcon color="success" />
              <Typography variant="body2" color="success.main" fontWeight="bold">
                PDF downloaded successfully!
              </Typography>
            </Box>
          )}

          {/* Export button */}
          <Button
            variant="contained"
            color={isDone ? 'success' : isError ? 'error' : 'primary'}
            size="large"
            fullWidth
            disabled={isLoading || !clientID}
            onClick={handleExport}
            startIcon={
              isLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : isDone ? (
                <DownloadDoneIcon />
              ) : (
                <PictureAsPdfIcon />
              )
            }
            sx={{ mt: 1, py: 1.2, fontWeight: 'bold', borderRadius: 2 }}
          >
            {isLoading
              ? 'Generating PDF…'
              : isDone
              ? 'Downloaded!'
              : isError
              ? 'Retry Export'
              : 'Export Full Record as PDF'}
          </Button>

          <Typography variant="caption" color="text.secondary" display="block" mt={1} textAlign="center">
            ⚠ This PDF contains Protected Health Information (PHI). Handle per your organization's privacy policy.
          </Typography>
        </CardContent>
      </Card>

      {/* Error snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}