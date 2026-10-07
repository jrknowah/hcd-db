import React, { useEffect, useRef } from 'react';
import {
  Box, Grid, TextField, Typography, Button, Alert, Divider, Paper, MenuItem,
  FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, RadioGroup, Radio,
  LinearProgress, CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { useClientFormRecord } from '../../hooks/useClientFormRecord';
import { parseDateOnly, toDateInputValue } from '../../utils/dateOnly';
import { formatLocalDateTime } from '../../utils/localDateTime';

export const EXIT_REASONS = [
  'Family Reunification',
  'Incarcerated',
  'Medically Cleared',
  'Client Left Voluntarily/Relinquished Housing',
  'Moved to an Assisted Living Waiver (ERC Only)',
  'Moved to Another County/State',
  'Moved to Another Housing Opportunity',
  'Moved to Unknown Destination/Disappeared',
  'No Longer Eligible',
  'No Longer Requiring Services',
  'Transferred to Another JCOD Project (No Change in Level of Care)',
  'Change in Level of Care',
  'Non-Compliance/Destruction of Property/Violence',
  'Deceased',
  'Other Reason Not Listed Above',
];

const LEVEL_OF_CARE_OPTIONS = [
  'Recuperative Care',
  'Board and Care facility (B&C)',
  'Skilled Nursing Facility (SNF)',
  'Recuperative Care Step Down',
  'Other',
];

const PERMANENT_HOUSING_OPTIONS = [
  'Permanent Housing (Other than RRH) for Formerly Homeless Persons',
  'Owned by Client, No Ongoing Housing Subsidy',
  'Owned by Client, with Ongoing Housing Subsidy',
  'Rental by Client in a Public Housing Unit',
  'Rental by Client, No Ongoing Housing Subsidy',
  'Rental by Client, with GDP TIP Housing Subsidy',
  'Rental by Client, with HCV Voucher (Tenant or Project Based)',
  'Rental by Client, with Other Ongoing Housing Subsidy',
  'Rental by Client, with RRH or Equivalent Subsidy',
  'Rental by Client, with VASH Housing Subsidy',
  'Staying or Living with Family, Permanent Tenure',
  'Staying or Living with Friends, Permanent Tenure',
];

const INCIDENT_REPORT_REASONS = ['Non-Compliance/Destruction of Property/Violence', 'Deceased'];

const EMPTY_FORM = {
  staffNotifiedDate: '',
  employeeNotified: '',
  notificationMethods: [],
  formDate: '',
  agency: '',
  staffName: '',
  staffPhone: '',
  admitDate: '',
  exitDate: '',
  icmsProvider: '',
  icmsNotified: '',
  icmsCaseManager: '',
  icmsCaseManagerPhone: '',
  exitReason: '',
  levelOfCareChange: '',
  levelOfCareOther: '',
  permanentHousingType: '',
  otherReason: '',
  additionalInfo: '',
  dischargeDestination: '',
};

// Days in Interim Housing: the intake date counts, the exit date does not
export const lengthOfStayDays = (admitDate, exitDate) => {
  const admit = parseDateOnly(admitDate);
  const exit = parseDateOnly(exitDate);
  if (!admit || !exit || exit < admit) return null;
  return Math.round((exit - admit) / 86400000);
};

const ExitForm = () => {
  const { clientID, client, shouldUseMockData } = useClientPersistence();
  const {
    form, setField, saved, loaded, loading, saving, error, setError, success, save,
  } = useClientFormRecord('/api/exit-form', clientID, EMPTY_FORM, { mock: shouldUseMockData });

  // New form: start from the client's admit date (once, so it can still be cleared)
  const prefilledFor = useRef(null);
  useEffect(() => {
    if (!loaded || saved || prefilledFor.current === clientID) return;
    prefilledFor.current = clientID;
    const admitDate = toDateInputValue(client?.clientAdmitDate);
    if (admitDate) setField('admitDate', admitDate);
  }, [loaded, saved, clientID, client?.clientAdmitDate, setField]);

  const lengthOfStay = lengthOfStayDays(form.admitDate, form.exitDate);
  const datesOutOfOrder = form.admitDate && form.exitDate && lengthOfStay == null;

  const text = (name) => ({
    name,
    value: form[name],
    onChange: (e) => setField(name, e.target.value),
    disabled: saving,
    fullWidth: true,
  });
  const date = (name) => ({ ...text(name), type: 'date', InputLabelProps: { shrink: true } });

  const toggleMethod = (method) => {
    const current = form.notificationMethods;
    setField('notificationMethods', current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method]);
  };

  const handleReasonChange = (reason) => {
    setField('exitReason', reason);
    if (reason !== 'Change in Level of Care') {
      setField('levelOfCareChange', '');
      setField('levelOfCareOther', '');
    }
  };

  const handleSave = () => {
    if (datesOutOfOrder) {
      setError('The exit date cannot be before the admit date.');
      return;
    }
    const values = { ...form, lengthOfStay };
    if (values.exitReason !== 'Other Reason Not Listed Above') values.otherReason = '';
    if (values.levelOfCareChange !== 'Other') values.levelOfCareOther = '';
    save(values);
  };

  if (!clientID) {
    return <Alert severity="info">Please select a client to fill out the Exit Form.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <LinearProgress sx={{ flexGrow: 1 }} />
        <Typography variant="body2">Loading Exit Form...</Typography>
      </Box>
    );
  }

  const lastSaved = saved && (saved.updatedAt
    ? `Last updated ${formatLocalDateTime(saved.updatedAt)}${saved.updatedBy ? ` by ${saved.updatedBy}` : ''}`
    : `Created ${formatLocalDateTime(saved.createdAt)}${saved.createdBy ? ` by ${saved.createdBy}` : ''}`);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Typography variant="h5">Exit Form</Typography>
        {lastSaved && <Typography variant="body2" color="text.secondary">{lastSaved}</Typography>}
      </Box>
      <Alert severity="warning" sx={{ mb: 3 }}>
        Forms must be submitted within 24 to 48 hours of the client&apos;s exit.
      </Alert>

      {shouldUseMockData && (
        <Alert severity="info" sx={{ mb: 2 }}>Mock data is on: the Exit Form can&apos;t be loaded or saved.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Exit request notification */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Exit Request</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField label="Date Staff Notified of Exit Request" {...date('staffNotifiedDate')} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Name of Employee Notified" {...text('employeeNotified')} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Notified By</FormLabel>
              <FormGroup row>
                {['Called', 'Emailed'].map(method => (
                  <FormControlLabel
                    key={method}
                    label={method}
                    control={(
                      <Checkbox
                        checked={form.notificationMethods.includes(method)}
                        onChange={() => toggleMethod(method)}
                        disabled={saving}
                      />
                    )}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Submitting staff and client stay */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Staff &amp; Client</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}><TextField label="Date" {...date('formDate')} /></Grid>
          <Grid item xs={12} sm={3}><TextField label="Agency" {...text('agency')} /></Grid>
          <Grid item xs={12} sm={3}><TextField label="Staff Name" {...text('staffName')} /></Grid>
          <Grid item xs={12} sm={3}><TextField label="Phone #" {...text('staffPhone')} /></Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              label="Client's Name"
              value={[client?.clientFirstName, client?.clientLastName].filter(Boolean).join(' ')}
              fullWidth
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="ID #" value={clientID} fullWidth InputProps={{ readOnly: true }} />
          </Grid>

          <Grid item xs={12} sm={4}><TextField label="Interim Housing Admit Date" {...date('admitDate')} /></Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Interim Housing Exit Date"
              {...date('exitDate')}
              error={Boolean(datesOutOfOrder)}
              helperText={datesOutOfOrder ? 'Exit date is before the admit date' : ''}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Length of Stay (days)"
              value={lengthOfStay ?? ''}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Includes the intake date but not the exit date"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ICMS */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>ICMS</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField label="ICMS Provider" {...text('icmsProvider')} /></Grid>
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Has ICMS Provider Been Notified?</FormLabel>
              <RadioGroup row value={form.icmsNotified} onChange={(e) => setField('icmsNotified', e.target.value)}>
                <FormControlLabel value="Yes" control={<Radio disabled={saving} />} label="Yes" />
                <FormControlLabel value="No" control={<Radio disabled={saving} />} label="No" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}><TextField label="Name of ICMS Case Manager" {...text('icmsCaseManager')} /></Grid>
          <Grid item xs={12} sm={6}><TextField label="Case Manager Phone" {...text('icmsCaseManagerPhone')} /></Grid>
        </Grid>
      </Paper>

      {/* Exit reason */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Exit Reason</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Check the field that best describes the circumstances. Please provide additional information below if needed.
        </Typography>
        <RadioGroup value={form.exitReason} onChange={(e) => handleReasonChange(e.target.value)}>
          <Grid container>
            {EXIT_REASONS.map(reason => (
              <Grid item xs={12} md={6} key={reason}>
                <FormControlLabel value={reason} control={<Radio disabled={saving} />} label={reason} />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>

        {form.exitReason === 'Change in Level of Care' && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField select label="Change in Level of Care" {...text('levelOfCareChange')}>
                {LEVEL_OF_CARE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
            </Grid>
            {form.levelOfCareChange === 'Other' && (
              <Grid item xs={12} sm={6}>
                <TextField label="Other Level of Care" {...text('levelOfCareOther')} />
              </Grid>
            )}
          </Grid>
        )}

        {INCIDENT_REPORT_REASONS.includes(form.exitReason) && (
          <Alert severity="warning" sx={{ mt: 2 }}>Attach an Incident Report for this exit reason.</Alert>
        )}

        {form.exitReason === 'Other Reason Not Listed Above' && (
          <TextField
            label="Other Reason Not Listed Above"
            multiline
            minRows={3}
            sx={{ mt: 2 }}
            {...text('otherReason')}
          />
        )}

        <Divider sx={{ my: 2 }} />

        <TextField
          select
          label="If the client moves to permanent housing, select one"
          {...text('permanentHousingType')}
        >
          <MenuItem value=""><em>Not applicable</em></MenuItem>
          {PERMANENT_HOUSING_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </TextField>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <TextField label="Additional Information" multiline minRows={3} sx={{ mb: 2 }} {...text('additionalInfo')} />
        <TextField label="Discharge Destination (if known)" multiline minRows={2} {...text('dischargeDestination')} />
      </Paper>

      {success && <Alert severity="success" sx={{ mb: 2 }}>Exit Form saved.</Alert>}
      <Button
        variant="contained"
        size="large"
        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        onClick={handleSave}
        disabled={saving || !loaded || shouldUseMockData}
      >
        {saving ? 'Saving...' : 'Save Exit Form'}
      </Button>
    </Box>
  );
};

export default ExitForm;
