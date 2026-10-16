// A readmitted client's earlier stays. Each is kept read-only under
// '<clientID>~<n>' (backend store/dbScripts/ClientStays.sql) and can be
// downloaded as a complete chart PDF.
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import useClientPdfExport from '../../hooks/useClientPdfExport';
import { getApiAuthHeaders } from '../../utils/apiAuth';
import { formatDateOnly } from '../../utils/dateOnly';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function PreviousStays({ clientID }) {
  const [stays, setStays] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [downloading, setDownloading] = useState(null); // priorStayClientID being exported
  const { exportPdf, exporting, error: exportError } = useClientPdfExport();

  useEffect(() => {
    if (!clientID) return undefined;
    let cancelled = false;
    setStays(null);
    setLoadError('');
    (async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/clients/${encodeURIComponent(clientID)}/stays`,
          { headers: await getApiAuthHeaders() }
        );
        if (!cancelled) setStays(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (!cancelled) {
          setStays([]);
          setLoadError(err?.response?.data?.error || 'Could not load previous stays');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [clientID]);

  if (stays === null) {
    return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={20} /></Box>;
  }
  if (loadError) return <Alert severity="warning">{loadError}</Alert>;
  if (stays.length === 0) {
    return <Typography variant="body2" color="text.secondary">No previous stays.</Typography>;
  }

  return (
    <>
      {exportError && <Alert severity="error" sx={{ mb: 1 }}>{exportError}</Alert>}
      <List dense disablePadding>
        {stays.map((stay) => (
          <ListItem
            key={stay.priorStayClientID}
            disableGutters
            secondaryAction={
              <Button
                size="small"
                startIcon={downloading === stay.priorStayClientID ? <CircularProgress size={14} /> : <PdfIcon />}
                disabled={Boolean(exporting)}
                onClick={async () => {
                  setDownloading(stay.priorStayClientID);
                  await exportPdf(stay.priorStayClientID);
                  setDownloading(null);
                }}
              >
                Chart
              </Button>
            }
          >
            <ListItemText
              primary={`Stay ${stay.stayNumber} · ${stay.site || 'No site'}${stay.program ? ` · ${stay.program}` : ''}`}
              secondary={`${formatDateOnly(stay.admitDate, '?')} – ${formatDateOnly(stay.dischargeDate, '?')}${stay.exitReason ? ` · ${stay.exitReason}` : ''}`}
            />
          </ListItem>
        ))}
      </List>
    </>
  );
}
