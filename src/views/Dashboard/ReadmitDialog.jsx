// Readmit a discharged client who was referred back to the SAME program.
// They keep their client ID and start a new stay with a blank chart; the
// previous stay is kept read-only (see backend store/dbScripts/ClientStays.sql).
// A referral to a different program is a new client instead.
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { hhhSiteList2 } from '../../data/arrayList';
import { getApiAuthHeaders } from '../../utils/apiAuth';
import { formatDateOnly } from '../../utils/dateOnly';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Today's date on this computer, YYYY-MM-DD
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const errorText = (err) => {
  const body = err?.response?.data;
  if (body?.errors) return Object.values(body.errors).join(' ');
  if (body?.error && body?.message) return `${body.error}: ${body.message}`;
  return body?.error || err?.message || 'Readmission failed';
};

export default function ReadmitDialog({ client, onClose, onReadmitted }) {
  const [admitDate, setAdmitDate] = useState(today());
  const [site, setSite] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!client) return;
    setAdmitDate(today());
    setSite(client.clientSite || '');
    setError('');
  }, [client]);

  if (!client) return null;

  const name = `${client.clientFirstName || ''} ${client.clientLastName || ''}`.trim();

  const handleReadmit = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/clients/${encodeURIComponent(client.clientID)}/readmit`,
        { admitDate, clientSite: site },
        { headers: await getApiAuthHeaders() }
      );
      onReadmitted(response.data);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Readmit {name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {name} keeps client ID <strong>{client.clientID}</strong> and starts a new stay
          in <strong>{client.clientProgram || 'the same program'}</strong> with a blank chart.
          The stay that ended {formatDateOnly(client.clientDischargeDate, '')} is kept, read-only,
          under Previous Stays on their profile.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Referred to a different program? Add them as a new client instead. They get a new ID.
        </Alert>

        <TextField
          label="Admit date"
          type="date"
          value={admitDate}
          onChange={(e) => setAdmitDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          sx={{ mb: 2 }}
          disabled={saving}
        />
        <TextField
          select
          label="Site"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          fullWidth
          disabled={saving}
        >
          {hhhSiteList2.map((s) => (
            <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
          ))}
        </TextField>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleReadmit} disabled={saving || !admitDate || !site}>
          {saving ? 'Readmitting…' : 'Readmit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
