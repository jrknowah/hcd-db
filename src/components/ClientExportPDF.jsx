/**
 * ClientExportPDF.jsx
 * Frontend component — Full client record PDF export
 *
 * Usage: Drop inside any section tab, or as a standalone Export tab.
 * Requires: selectedClient in Redux store, MSAL context in component tree.
 *
 * Props:
 *   clientID  {string}  – override; falls back to Redux selectedClient.clientID
 */

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useMsal } from '@azure/msal-react';
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
  { label: 'Section 1 – Identification & Referrals',          color: '#1565C0' },
  { label: 'Section 2 – Authorization & Signature Forms',     color: '#1976D2' },
  { label: 'Section 3 – Assessment & Care Plans',             color: '#388E3C' },
  { label: 'Section 4 – Client Progress',                     color: '#F57C00' },
  { label: 'Section 5 – Medical Information & Screenings',    color: '#7B1FA2' },
  { label: 'Section 6 – Case Management',                     color: '#C62828' },
];

export default function ClientExportPDF({ clientID: propClientID }) {
  const { instance, accounts } = useMsal();
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const azureToken     = useSelector((state) => state.auth?.azureToken);

  const clientID   = propClientID || selectedClient?.clientID;
  const clientName = selectedClient
    ? `${selectedClient.clientLastName || ''}, ${selectedClient.clientFirstName || ''}`.trim()
    : clientID || 'Unknown Client';

  const [status,    setStatus]    = useState('idle');
  const [progress,  setProgress]  = useState(0);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [snackOpen, setSnackOpen] = useState(false);

  // ── Token acquisition ───────────────────────────────────────────────────────
  // Must return an ID token — audience = AZURE_CLIENT_ID.
  // Using scopes ['openid', 'profile'] forces MSAL to return result.idToken
  // instead of an access token. Never use 'User.Read' here — that returns a
  // Graph access token (aud = 00000003-...) which the backend cannot verify.
  const getAuthToken = async () => {
    if (accounts && accounts.length > 0) {
      try {
        const result = await instance.acquireTokenSilent({
          scopes: ['openid', 'profile'],
          account: accounts[0],
        });
        if (result?.idToken) {
          console.log('✅ Export: got idToken from MSAL');
          return result.idToken;
        }
      } catch (e) {
        console.warn('acquireTokenSilent failed:', e.message);
        // Try interactive fallback
        try {
          const result = await instance.acquireTokenPopup({
            scopes: ['openid', 'profile'],
            account: accounts[0],
          });
          if (result?.idToken) {
            console.log('✅ Export: got idToken from popup');
            return result.idToken;
          }
        } catch (popupErr) {
          console.warn('acquireTokenPopup failed:', popupErr.message);
        }
      }
    }

    // Fall back to Redux store (may already be an idToken stored at login)
    if (azureToken && azureToken !== 'no-token') {
      console.log('✅ Export: using Redux azureToken');
      return azureToken;
    }

    // Fall back to localStorage
    const stored = localStorage.getItem('azureToken');
    if (stored && stored !== 'no-token') {
      console.log('✅ Export: using localStorage azureToken');
      return stored;
    }

    console.warn('⚠️ Export: no token available');
    return null;
  };

  // ── Export handler ──────────────────────────────────────────────────────────
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
      const authToken = await getAuthToken();

      if (!authToken) {
        throw new Error('Could not acquire authentication token. Please sign out and sign back in.');
      }

      console.log('📤 Fetching:', `${API_BASE}/api/export/client/${clientID}/pdf`);
      console.log('🔑 Token prefix:', authToken?.substring(0, 20));

      const response = await fetch(
        `${API_BASE}/api/export/client/${encodeURIComponent(clientID)}/pdf`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        }
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

      const blob = await response.blob();
      setProgress(100);

      const url         = URL.createObjectURL(blob);
      const a           = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const match       = disposition.match(/filename="(.+)"/);

      a.href     = url;
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
  const isDone    = status === 'done';
  const isError   = status === 'error';

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

          {isDone && (
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <DownloadDoneIcon color="success" />
              <Typography variant="body2" color="success.main" fontWeight="bold">
                PDF downloaded successfully!
              </Typography>
            </Box>
          )}

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