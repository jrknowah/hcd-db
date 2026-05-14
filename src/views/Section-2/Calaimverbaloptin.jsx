import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Snackbar,
  Stack,
  Divider,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  FormHelperText
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Mic as MicIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Import Redux actions
import {
  fetchFormData,
  saveFormData,
  updateFormLocal,
  clearErrors,
  clearSuccessFlags,
  selectFormByType,
  selectFormLoading,
  selectSaving,
  selectSaveSuccess
} from '../../backend/store/slices/authSigSlice';

// ============================================================================
// Form configuration
// ============================================================================

const ACK_OPTIONS = [
  { value: 'yes',     label: 'Yes' },
  { value: 'no',      label: 'No' },
  { value: 'refused', label: 'Refused to answer' }
];

const QUESTIONS = [
  {
    id: 'acknowledgmentExplained',
    text: 'Do you acknowledge we have explained the CalAIM program to you?'
  },
  {
    id: 'understandsVoluntary',
    text: 'Do you understand the terms of voluntary participation?'
  },
  {
    id: 'agreesToParticipate',
    text: 'Do you agree to participate in CalAIM Community Supports Short Term Post Hospitalization Housing?'
  }
];

// ============================================================================
// Component
// ============================================================================

const CalAIMVerbalOptIn = forwardRef(({ clientID: propClientID, title, formType = 'calaimVerbalOptIn' }, ref) => {
  const dispatch = useDispatch();

  // Redux selectors — mirrors ClientRights pattern
  const selectedClient   = useSelector((state) => state.clients?.selectedClient);
  const savedForm        = useSelector(selectFormByType('calaimVerbalOptIn'));
  const formLoading      = useSelector(selectFormLoading('calaimVerbalOptIn'));
  const saving           = useSelector(selectSaving);
  const saveSuccess      = useSelector(selectSaveSuccess);
  const formErrors       = useSelector((state) => state.authSig.formErrors.calaimVerbalOptIn);

  // Resolve client ID from prop or Redux
  const clientID = propClientID || selectedClient?.clientID;

  // Local state
  const [answers, setAnswers]               = useState({
    acknowledgmentExplained: '',
    understandsVoluntary:    '',
    agreesToParticipate:     ''
  });
  const [staffName, setStaffName]           = useState('');
  const [witnessName, setWitnessName]       = useState('');
  const [consentDate, setConsentDate]       = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]                   = useState('');
  const [signature, setSignature]           = useState('');
  const [localErrors, setLocalErrors]       = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);

  // ────────────────────────────────────────────────────────────────────────
  // Completion calculation (computed inline, never in useEffect)
  // ────────────────────────────────────────────────────────────────────────
  const allQuestionsAnswered = QUESTIONS.every((q) => !!answers[q.id]);
  const allYes               = QUESTIONS.every((q) => answers[q.id] === 'yes');

  const completionPercentage = (() => {
    let filled = 0;
    const totalRequired = 6; // 3 answers + staffName + consentDate + signature
    if (answers.acknowledgmentExplained) filled += 1;
    if (answers.understandsVoluntary)    filled += 1;
    if (answers.agreesToParticipate)     filled += 1;
    if (staffName.trim())                filled += 1;
    if (consentDate)                     filled += 1;
    if (signature.trim())                filled += 1;
    return Math.round((filled / totalRequired) * 100);
  })();

  const consentGranted = allYes;
  const isComplete     = completionPercentage === 100;

  // ────────────────────────────────────────────────────────────────────────
  // Expose getFormData to parent FormModal
  // ────────────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      // Three verbal answers
      acknowledgmentExplained: answers.acknowledgmentExplained,
      understandsVoluntary:    answers.understandsVoluntary,
      agreesToParticipate:     answers.agreesToParticipate,
      // Attestation
      staffName,
      witnessName,
      consentDate,
      notes,
      signature,
      // Computed flags
      consentGranted,
      completionPercentage,
      lastModified: new Date().toISOString(),
      status: isComplete ? 'completed' : 'in_progress',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        programs: ['ODR', 'HSH']
      }
    })
  }));

  // ────────────────────────────────────────────────────────────────────────
  // Load form data on mount / client change
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'calaimVerbalOptIn' }));
    }
  }, [dispatch, clientID]);

  // Sync Redux → local state when form data loads
  useEffect(() => {
    if (savedForm && Object.keys(savedForm).length > 0) {
      setAnswers({
        acknowledgmentExplained: savedForm.acknowledgmentExplained || '',
        understandsVoluntary:    savedForm.understandsVoluntary    || '',
        agreesToParticipate:     savedForm.agreesToParticipate     || ''
      });
      setStaffName(savedForm.staffName     || '');
      setWitnessName(savedForm.witnessName || '');
      setConsentDate(savedForm.consentDate || new Date().toISOString().slice(0, 10));
      setNotes(savedForm.notes             || '');
      setSignature(savedForm.signature     || '');
    }
  }, [savedForm]);

  // ────────────────────────────────────────────────────────────────────────
  // Field handlers
  // ────────────────────────────────────────────────────────────────────────
  const handleAnswerChange = useCallback((questionId, value) => {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    setLocalErrors([]);

    dispatch(updateFormLocal({
      formType: 'calaimVerbalOptIn',
      formData: { ...nextAnswers }
    }));
  }, [answers, dispatch]);

  const handleStaffNameChange = useCallback((e) => {
    const value = e.target.value;
    setStaffName(value);
    setLocalErrors([]);
    dispatch(updateFormLocal({
      formType: 'calaimVerbalOptIn',
      formData: { staffName: value }
    }));
  }, [dispatch]);

  const handleSignatureChange = useCallback((e) => {
    const value = e.target.value;
    setSignature(value);
    setLocalErrors([]);
    dispatch(updateFormLocal({
      formType: 'calaimVerbalOptIn',
      formData: { signature: value }
    }));
  }, [dispatch]);

  // ────────────────────────────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────────────────────────────
  const validateForm = useCallback(() => {
    const errors = [];

    if (!clientID) {
      errors.push("No client selected. Please select a client first.");
      return errors;
    }

    if (!allQuestionsAnswered) {
      errors.push("All three consent questions must be answered before saving.");
    }

    if (!staffName.trim()) {
      errors.push("Staff member name is required.");
    }

    if (!consentDate) {
      errors.push("Consent date is required.");
    }

    if (!signature.trim()) {
      errors.push("Staff electronic signature is required to attest to the verbal consent.");
    }

    return errors;
  }, [clientID, allQuestionsAnswered, staffName, consentDate, signature]);

  // ────────────────────────────────────────────────────────────────────────
  // Submit
  // ────────────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const formData = {
      acknowledgmentExplained: answers.acknowledgmentExplained,
      understandsVoluntary:    answers.understandsVoluntary,
      agreesToParticipate:     answers.agreesToParticipate,
      staffName,
      witnessName,
      consentDate,
      notes,
      signature,
      consentGranted,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        programs: ['ODR', 'HSH']
      }
    };

    try {
      await dispatch(saveFormData({
        clientID,
        formType: 'calaimVerbalOptIn',
        formData
      })).unwrap();

      setShowSuccessSnackbar(true);
      setLocalErrors([]);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save CalAIM verbal opt-in']);
    }
  }, [dispatch, clientID, validateForm, answers, staffName, witnessName, consentDate, notes, signature, consentGranted]);

  const handleCloseSuccessSnackbar = useCallback(() => {
    setShowSuccessSnackbar(false);
    dispatch(clearSuccessFlags());
  }, [dispatch]);

  const handleClearErrors = useCallback(() => {
    setLocalErrors([]);
    dispatch(clearErrors());
  }, [dispatch]);

  // ────────────────────────────────────────────────────────────────────────
  // Loading state
  // ────────────────────────────────────────────────────────────────────────
  if (formLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading CalAIM verbal opt-in data...</Typography>
      </Box>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <VerifiedIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                {title || 'CalAIM Community Supports — Verbal Opt-In'}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Short-Term Post-Hospitalization Housing (STPH)
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                label="ODR"
                size="small"
                sx={{ backgroundColor: '#1565c0', color: 'white', fontWeight: 700 }}
              />
              <Chip
                label="HSH"
                size="small"
                sx={{ backgroundColor: '#2e7d32', color: 'white', fontWeight: 700 }}
              />
            </Stack>
          </Box>

          {/* Client Info */}
          {selectedClient && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Client: <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                {selectedClient.clientID && ` (ID: ${selectedClient.clientID})`}
              </Typography>
            </Box>
          )}

          {/* Progress Indicator */}
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Consent Completion Progress
              </Typography>
              <Chip
                label={`${completionPercentage}% Complete`}
                color={completionPercentage === 100 ? 'success' : 'primary'}
                size="small"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{ height: 8, borderRadius: 4 }}
              color={completionPercentage === 100 ? 'success' : 'primary'}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {(localErrors.length > 0 || formErrors) && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={handleClearErrors}
        >
          {localErrors.length > 0 ? (
            <Box>
              {localErrors.map((error, index) => (
                <Typography key={index} variant="body2">
                  • {error}
                </Typography>
              ))}
            </Box>
          ) : (
            formErrors
          )}
        </Alert>
      )}

      {/* Script to read aloud */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <MicIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Read the following aloud to the client
          </Typography>
        </Box>

        <Typography variant="body2" paragraph>
          Los Angeles (LA) County has a new program called <strong>CalAIM Community Supports</strong> that
          is available to Medi-Cal members like yourself. Community Supports includes <strong>Short Term
          Post Hospitalization Housing</strong> to provide interim housing for unhoused individuals who
          are already enrolled in a Medi-Cal managed care plan. Despite its name, STPH is available to
          any individual who has recently exited an institution setting including hospitals, residential
          treatment programs, nursing facilities, or jail. This community supports service is offered
          once in a lifetime to be covered by your Managed Care Plan.
        </Typography>

        <Typography variant="body2" paragraph>
          While you are or will be receiving these services through DHS, your participation in CalAIM
          Community Supports will cover some of the costs for you to receive interim housing services
          and allow us to support more individuals such as yourself.{' '}
          <strong>We invite you to participate in this program.</strong>
        </Typography>

        <Typography variant="body2" paragraph>
          Your participation in CalAIM Community Supports Short Term Post Hospitalization Housing would
          be <strong>voluntary</strong>. You will not be paid to participate. You will also not be charged
          to participate.
        </Typography>

        <Typography variant="body2" paragraph>
          You have the right to refuse services or opt out at any time. Enrollment in CalAIM Community
          Supports will <strong>NOT</strong> impact the housing/services you currently receive or might
          receive in the future from LA County. If you opt-in, LA County will determine if you are
          eligible and will complete all the necessary requirements.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <InfoIcon sx={{ color: 'info.main', mr: 1, mt: 0.25, fontSize: 20 }} />
          <Typography variant="caption" color="text.secondary">
            After all three questions are answered "Yes": the client's insurance plan will be notified
            that they have opted to participate. The client may receive a letter once these services are
            authorized.
          </Typography>
        </Box>
      </Paper>

      {/* Three acknowledgment questions */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Client Verbal Responses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Record the client's verbal answer to each question below. All three must be "Yes" for the
          consent to be valid.
        </Typography>

        <Stack spacing={3}>
          {QUESTIONS.map((q, idx) => (
            <Box
              key={q.id}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: answers[q.id] === 'yes'
                  ? 'success.light'
                  : answers[q.id] === 'no' || answers[q.id] === 'refused'
                  ? 'warning.light'
                  : 'divider',
                borderRadius: 1,
                bgcolor: answers[q.id] === 'yes' ? 'success.50' : 'background.paper'
              }}
            >
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 1, color: 'text.primary', fontWeight: 600 }}>
                  {idx + 1}. {q.text}
                </FormLabel>
                <RadioGroup
                  row
                  value={answers[q.id]}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                >
                  {ACK_OPTIONS.map((opt) => (
                    <FormControlLabel
                      key={opt.value}
                      value={opt.value}
                      control={<Radio />}
                      label={opt.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Box>
          ))}
        </Stack>

        {/* Consent result banner */}
        {allQuestionsAnswered && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: consentGranted ? 'success.50' : 'warning.50',
              border: '1px solid',
              borderColor: consentGranted ? 'success.light' : 'warning.light',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {consentGranted ? (
              <>
                <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2" color="success.main">
                  <strong>Consent granted.</strong> Client has opted into CalAIM Community Supports STPH.
                </Typography>
              </>
            ) : (
              <>
                <WarningIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="body2" color="warning.main">
                  <strong>Consent NOT granted.</strong> Client did not affirmatively agree to all three
                  questions. Document the reason in the notes field below.
                </Typography>
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Staff attestation */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Staff Attestation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The staff member who obtained verbal consent attests below.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Staff Member Name"
            variant="outlined"
            value={staffName}
            onChange={handleStaffNameChange}
            placeholder="Enter your full name"
            required
          />
          <TextField
            fullWidth
            label="Consent Date"
            type="date"
            variant="outlined"
            value={consentDate}
            onChange={(e) => setConsentDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Box>

        <TextField
          fullWidth
          label="Witness Name (optional)"
          variant="outlined"
          value={witnessName}
          onChange={(e) => setWitnessName(e.target.value)}
          placeholder="If another staff member witnessed the verbal consent"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Notes (optional)"
          variant="outlined"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Document any refusal reasons, client questions, or relevant context"
          sx={{ mb: 2 }}
        />
      </Paper>

      {/* Electronic signature */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Staff Electronic Signature
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          By typing your full name below, you attest that you read the script aloud to the client and
          accurately recorded their verbal responses.
        </Typography>

        <TextField
          fullWidth
          label="Type your full name as electronic signature"
          variant="outlined"
          value={signature}
          onChange={handleSignatureChange}
          placeholder="Enter your full legal name"
          required
          helperText="This serves as your electronic signature attesting to the verbal consent"
          disabled={!allQuestionsAnswered}
        />

        {signature && allQuestionsAnswered && (
          <Box sx={{
            mt: 2,
            p: 2,
            bgcolor: 'success.50',
            border: '1px solid',
            borderColor: 'success.200',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
            <Typography variant="body2" color="success.main">
              Signature captured: <strong>{signature}</strong>
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Submit */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSubmit}
          disabled={saving || !clientID}
          sx={{
            px: 4,
            py: 1.5,
            fontWeight: 600,
            fontSize: '1.1rem'
          }}
        >
          {saving ? 'Saving...' : 'Save CalAIM Verbal Opt-In'}
        </Button>

        {completionPercentage < 100 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
            <Typography variant="body2" color="warning.main">
              Answer all three questions, enter your name and date, and sign before saving
            </Typography>
          </Box>
        )}
      </Box>

      {/* Success snackbar */}
      <Snackbar
        open={showSuccessSnackbar || saveSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccessSnackbar}
      >
        <Alert
          onClose={handleCloseSuccessSnackbar}
          severity="success"
          sx={{ width: '100%' }}
        >
          ✅ CalAIM verbal opt-in saved successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
});

CalAIMVerbalOptIn.displayName = 'CalAIMVerbalOptIn';

export default CalAIMVerbalOptIn;