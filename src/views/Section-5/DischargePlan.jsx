import React from 'react';
import {
  Box, Grid, TextField, Typography, Button, Alert, Divider, LinearProgress, CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { useClientFormRecord } from '../../hooks/useClientFormRecord';
import { formatDateOnly } from '../../utils/dateOnly';
import { formatLocalDateTime } from '../../utils/localDateTime';

export const PLAN_SECTIONS = [
  {
    name: 'assessmentGoals',
    label: 'I. Assessment and Goals',
    description: "Summarize the patient's medical condition, functional abilities, support systems, and recovery goals.",
  },
  {
    name: 'dischargeDestination',
    label: 'II. Discharge Destination',
    description: 'Specify whether the patient will be discharged to their home or another healthcare facility.',
  },
  {
    name: 'medicationManagement',
    label: 'III. Medication Management',
    description: "List the patient's prescribed medications and dosages, and provide instructions for proper administration.",
  },
  {
    name: 'medicalEquipment',
    label: 'IV. Medical Equipment and Supplies',
    description: 'Identify any required medical equipment, assistive devices, or supplies the patient needs.',
  },
  {
    name: 'homeHealthServices',
    label: 'V. Home Health Services',
    description: 'Detail the types and frequency of home health services the patient will receive, such as nursing care or physical therapy.',
  },
  {
    name: 'followUpAppointments',
    label: 'VI. Follow-up Appointments and Communication',
    description: 'Schedule follow-up appointments with healthcare providers and outline communication protocols among the care team.',
  },
  {
    name: 'patientEducation',
    label: 'VII. Patient and Caregiver Education',
    description: 'Describe the education and training provided to the patient and their caregivers to ensure proper care and support during recovery.',
  },
];

const EMPTY_FORM = {
  admissionDate: '',
  dischargeDate: '',
  primaryDiagnosis: '',
  ...Object.fromEntries(PLAN_SECTIONS.map(s => [s.name, ''])),
};

const DischargePlan = () => {
  const { clientID, client, shouldUseMockData } = useClientPersistence();
  const {
    form, setField, saved, loaded, loading, saving, error, setError, success, save,
  } = useClientFormRecord('/api/discharge-plan', clientID, EMPTY_FORM, { mock: shouldUseMockData });

  const datesOutOfOrder = form.admissionDate && form.dischargeDate && form.dischargeDate < form.admissionDate;

  const field = (name) => ({
    name,
    value: form[name],
    onChange: (e) => setField(name, e.target.value),
    disabled: saving,
    fullWidth: true,
  });

  const handleSave = () => {
    if (datesOutOfOrder) {
      setError('The discharge date cannot be before the admission date.');
      return;
    }
    save();
  };

  if (!clientID) {
    return <Alert severity="info">Please select a client to fill out the Discharge Plan.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <LinearProgress sx={{ flexGrow: 1 }} />
        <Typography variant="body2">Loading Discharge Plan...</Typography>
      </Box>
    );
  }

  const lastSaved = saved && (saved.updatedAt
    ? `Last updated ${formatLocalDateTime(saved.updatedAt)}${saved.updatedBy ? ` by ${saved.updatedBy}` : ''}`
    : `Created ${formatLocalDateTime(saved.createdAt)}${saved.createdBy ? ` by ${saved.createdBy}` : ''}`);

  return (
    <Box>
      {lastSaved && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{lastSaved}</Typography>
      )}

      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>Mock data is on: the Discharge Plan can&apos;t be loaded or saved.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={8}>
          <TextField
            label="Patient Name"
            value={[client?.clientFirstName, client?.clientLastName].filter(Boolean).join(' ')}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Date of Birth"
            value={formatDateOnly(client?.clientDOB || client?.dateOfBirth)}
            fullWidth
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Admission Date" type="date" InputLabelProps={{ shrink: true }} {...field('admissionDate')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Discharge Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            {...field('dischargeDate')}
            error={Boolean(datesOutOfOrder)}
            helperText={datesOutOfOrder ? 'Discharge date is before the admission date' : ''}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Primary Diagnosis" multiline minRows={2} {...field('primaryDiagnosis')} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {PLAN_SECTIONS.map(section => (
        <Box key={section.name} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>{section.label}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{section.description}</Typography>
          <TextField multiline minRows={3} inputProps={{ 'aria-label': section.label }} {...field(section.name)} />
        </Box>
      ))}

      {success && <Alert severity="success" sx={{ mb: 2 }}>Discharge Plan saved.</Alert>}
      <Button
        variant="contained"
        size="large"
        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        onClick={handleSave}
        disabled={saving || !loaded || shouldUseMockData}
      >
        {saving ? 'Saving...' : 'Save Discharge Plan'}
      </Button>
    </Box>
  );
};

export default DischargePlan;
