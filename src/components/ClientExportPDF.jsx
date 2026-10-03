/**
 * ClientExportPDF.jsx
 * Frontend component — Client record PDF export (full record, selected
 * sections, or a single section)
 *
 * Usage: Drop inside any section tab, or as a standalone Export tab.
 * Requires: selectedClient in Redux store, MSAL context in component tree.
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
  Checkbox,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import useClientPdfExport from '../hooks/useClientPdfExport';

const SECTIONS = [
  { num: 1, label: 'Section 1 – Identification & Referrals',          color: '#1565C0' },
  { num: 2, label: 'Section 2 – Authorization & Signature Forms',     color: '#1976D2' },
  { num: 3, label: 'Section 3 – Assessment & Care Plans',             color: '#388E3C' },
  { num: 4, label: 'Section 4 – Client Progress',                     color: '#F57C00' },
  { num: 5, label: 'Section 5 – Medical Information & Screenings',    color: '#7B1FA2' },
  { num: 6, label: 'Section 6 – Case Management',                     color: '#C62828' },
];
const ALL_NUMS = SECTIONS.map((s) => s.num);

export default function ClientExportPDF({ clientID: propClientID }) {
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const { exportPdf, exporting, error, clearError } = useClientPdfExport();

  const clientID   = propClientID || selectedClient?.clientID;
  const clientName = selectedClient
    ? `${selectedClient.clientLastName || ''}, ${selectedClient.clientFirstName || ''}`.trim()
    : clientID || 'Unknown Client';

  const [selected, setSelected] = useState(ALL_NUMS);
  const [doneKey,  setDoneKey]  = useState(null);

  const allSelected = selected.length === ALL_NUMS.length;
  const isLoading   = exporting !== null;

  const toggleSection = (num) => {
    setSelected((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const runExport = async (sections) => {
    setDoneKey(null);
    const ok = await exportPdf(clientID, { sections });
    if (ok) {
      const key = sections.length === ALL_NUMS.length ? 'all' : sections.join(',');
      setDoneKey(key);
      setTimeout(() => setDoneKey((k) => (k === key ? null : k)), 5000);
    }
  };

  const mainKey = allSelected ? 'all' : selected.join(',');
  const mainBusy = exporting === mainKey;
  const mainDone = doneKey === mainKey;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', mt: 3 }}>
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <PictureAsPdfIcon color="error" fontSize="large" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Export Client Record
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Export the full record, the sections you check, or a single section using its download button.
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

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {selected.length} of {ALL_NUMS.length} sections selected
            </Typography>
            <Button
              size="small"
              onClick={() => setSelected(allSelected ? [] : ALL_NUMS)}
              disabled={isLoading}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          </Box>

          <List dense disablePadding>
            {SECTIONS.map((s) => {
              const key  = String(s.num);
              const busy = exporting === key;
              const done = doneKey === key;
              return (
                <ListItem
                  key={s.num}
                  disableGutters
                  sx={{ py: 0 }}
                  secondaryAction={
                    <Tooltip title={`Export ${s.label.split(' – ')[0]} only`}>
                      <span>
                        <IconButton
                          edge="end"
                          size="small"
                          aria-label={`Export ${s.label} as PDF`}
                          disabled={isLoading || !clientID}
                          onClick={() => runExport([s.num])}
                        >
                          {busy ? (
                            <CircularProgress size={16} />
                          ) : done ? (
                            <DownloadDoneIcon fontSize="small" color="success" />
                          ) : (
                            <DownloadIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={selected.includes(s.num)}
                      onChange={() => toggleSection(s.num)}
                      disabled={isLoading}
                      inputProps={{ 'aria-label': `Include ${s.label}` }}
                      sx={{ color: s.color, '&.Mui-checked': { color: s.color }, p: 0.5 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={s.label}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 1.5 }} />

          {isLoading && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" mb={0.5}>
                Building PDF — please wait…
              </Typography>
              <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
          )}

          {doneKey && !isLoading && (
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <DownloadDoneIcon color="success" />
              <Typography variant="body2" color="success.main" fontWeight="bold">
                PDF downloaded successfully!
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            color={mainDone ? 'success' : 'primary'}
            size="large"
            fullWidth
            disabled={isLoading || !clientID || selected.length === 0}
            onClick={() => runExport(selected)}
            startIcon={
              mainBusy ? (
                <CircularProgress size={18} color="inherit" />
              ) : mainDone ? (
                <DownloadDoneIcon />
              ) : (
                <PictureAsPdfIcon />
              )
            }
            sx={{ mt: 1, py: 1.2, fontWeight: 'bold', borderRadius: 2 }}
          >
            {mainBusy
              ? 'Generating PDF…'
              : mainDone
              ? 'Downloaded!'
              : allSelected
              ? 'Export Full Record as PDF'
              : selected.length === 0
              ? 'Select at least one section'
              : `Export ${selected.length} Selected Section${selected.length > 1 ? 's' : ''} as PDF`}
          </Button>

          <Typography variant="caption" color="text.secondary" display="block" mt={1} textAlign="center">
            ⚠ This PDF contains Protected Health Information (PHI). Handle per your organization's privacy policy.
          </Typography>
        </CardContent>
      </Card>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
