// The behavioral and medical person assigned to a client, with a dialog to
// change them. Staff are listed from the CARE_TEAM_GROUPS Entra groups; if
// the directory can't be read, an email address can still be typed in.
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Psychology as BehavioralIcon,
  MedicalServices as MedicalIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { assignCareTeam } from '../../backend/store/slices/clientSlice';
import { loadCareTeamStaff } from '../../backend/services/careTeamDirectory';

export const CARE_TEAM_ROLES = [
  {
    role: 'behavioral',
    label: 'Behavioral Health',
    emailField: 'clientBehavioralStaffEmail',
    nameField: 'clientBehavioralStaffName',
    Icon: BehavioralIcon,
  },
  {
    role: 'medical',
    label: 'Medical',
    emailField: 'clientMedicalStaffEmail',
    nameField: 'clientMedicalStaffName',
    Icon: MedicalIcon,
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assigneeOf = (client, { emailField, nameField }) =>
  client?.[emailField] ? { email: client[emailField], name: client[nameField] || client[emailField] } : null;

// A typed-in value (directory unavailable or person not in the group)
const fromText = (text) => {
  const email = String(text || '').trim().toLowerCase();
  return email ? { email, name: email } : null;
};

const StaffPicker = ({ role, label, value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!open || options.length || loadError) return undefined;
    let active = true;
    setLoading(true);
    loadCareTeamStaff(role)
      .then((staff) => active && setOptions(staff))
      .catch((err) => active && setLoadError(err.message || 'Could not load the staff directory'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, role, options.length, loadError]);

  return (
    <Box>
      <Autocomplete
        freeSolo
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={loading}
        disabled={disabled}
        value={value}
        onChange={(_, next) => onChange(typeof next === 'string' ? fromText(next) : next)}
        onInputChange={(_, text, reason) => {
          // Keep a typed address even if the user never presses Enter
          if (reason === 'input' && EMAIL_RE.test(text.trim())) onChange(fromText(text));
          if (reason === 'clear') onChange(null);
        }}
        isOptionEqualToValue={(option, selected) => option.email === selected?.email}
        getOptionLabel={(option) => (typeof option === 'string' ? option : option?.name || '')}
        filterOptions={(opts, { inputValue }) => {
          const q = inputValue.trim().toLowerCase();
          return q ? opts.filter((o) => `${o.name} ${o.email} ${o.jobTitle}`.toLowerCase().includes(q)) : opts;
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <li key={option.email} {...rest}>
              <Box>
                <Typography variant="body2">{option.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {[option.jobTitle, option.email].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={`${label} staff`}
            placeholder="Search by name or type an email"
            helperText={value?.email && value.email !== value.name ? value.email : ' '}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={18} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      {loadError && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {loadError}. You can still type the person's email address.
        </Alert>
      )}
    </Box>
  );
};

export const CareTeamDialog = ({ open, client, onClose }) => {
  const dispatch = useDispatch();
  const [picks, setPicks] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setPicks(Object.fromEntries(CARE_TEAM_ROLES.map((r) => [r.role, assigneeOf(client, r)])));
    setError(null);
  }, [open, client]);

  const invalid = CARE_TEAM_ROLES.find((r) => picks[r.role] && !EMAIL_RE.test(picks[r.role].email));

  const handleSave = async () => {
    if (invalid) return;
    const careTeam = {};
    CARE_TEAM_ROLES.forEach(({ role, emailField, nameField }) => {
      careTeam[emailField] = picks[role]?.email || null;
      careTeam[nameField] = picks[role]?.name || null;
    });
    setSaving(true);
    setError(null);
    try {
      await dispatch(assignCareTeam({ clientID: client.clientID, careTeam })).unwrap();
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Failed to save care team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Care team for {client?.clientFirstName} {client?.clientLastName}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {CARE_TEAM_ROLES.map(({ role, label }) => (
            <StaffPicker
              key={role}
              role={role}
              label={label}
              value={picks[role] || null}
              disabled={saving}
              onChange={(person) => setPicks((prev) => ({ ...prev, [role]: person }))}
            />
          ))}
          {invalid && <Alert severity="error">Enter a valid email address for the {invalid.label.toLowerCase()} staff member.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !!invalid}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CareTeam = ({ client }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  if (!client) return null;

  return (
    <>
      <List dense>
        {CARE_TEAM_ROLES.map((r) => {
          const person = assigneeOf(client, r);
          return (
            <ListItem key={r.role}>
              <ListItemIcon><r.Icon fontSize="small" /></ListItemIcon>
              <ListItemText
                primary={r.label}
                secondary={person ? `${person.name}${person.name !== person.email ? ` (${person.email})` : ''}` : 'Not assigned'}
              />
            </ListItem>
          );
        })}
      </List>
      <Button size="small" startIcon={<EditIcon />} onClick={() => setDialogOpen(true)} sx={{ ml: 1 }}>
        Assign staff
      </Button>
      <CareTeamDialog open={dialogOpen} client={client} onClose={() => setDialogOpen(false)} />
    </>
  );
};

export default CareTeam;
