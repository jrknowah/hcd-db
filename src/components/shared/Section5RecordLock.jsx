// Shared UI for locking Section 5 notes and observation records once submitted.
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { unlockSection5Record } from '../../utils/section5Lock';

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toLocaleString();
};

/** "Submitted" chip for a locked record; "Draft" otherwise. */
export const RecordStatusChip = ({ record }) => {
  if (record?.isLocked) {
    const by = record.submittedBy ? ` by ${record.submittedBy}` : '';
    const at = record.submittedAt ? ` on ${formatDateTime(record.submittedAt)}` : '';
    return (
      <Tooltip title={`Submitted${by}${at}. Locked.`}>
        <Chip icon={<LockIcon />} label="Submitted" size="small" color="success" variant="outlined" />
      </Tooltip>
    );
  }
  return <Chip label="Draft" size="small" color="default" variant="outlined" />;
};

RecordStatusChip.propTypes = { record: PropTypes.object };

/** Unlock icon button, shown on locked rows to IT Admin / Level 1 users only. */
export const UnlockRecordButton = ({ onClick }) => (
  <Tooltip title="Unlock (IT Admin / Level 1)">
    <IconButton size="small" color="warning" onClick={onClick} aria-label="Unlock record">
      <LockOpenIcon fontSize="small" />
    </IconButton>
  </Tooltip>
);

UnlockRecordButton.propTypes = { onClick: PropTypes.func.isRequired };

/** Banner shown on a locked record's row or dialog. */
export const LockedRecordAlert = ({ label = 'record' }) => (
  <Alert severity="info" icon={<LockIcon />} sx={{ mb: 2 }}>
    This {label} has been submitted and is locked. Only an IT Admin or Level 1 user can unlock it.
  </Alert>
);

LockedRecordAlert.propTypes = { label: PropTypes.string };

/**
 * Dialog actions for a note/record form: Cancel, Save Progress (stays
 * editable) and Submit (locks the record).
 */
export const SaveProgressSubmitActions = ({ onCancel, onSaveProgress, onSubmit, saving, disabled }) => (
  <DialogActions>
    <Button onClick={onCancel} disabled={saving} color="inherit">
      Cancel
    </Button>
    <Button
      onClick={onSaveProgress}
      variant="outlined"
      disabled={saving || disabled}
      startIcon={<SaveIcon />}
    >
      Save Progress
    </Button>
    <Button
      onClick={onSubmit}
      variant="contained"
      color="primary"
      disabled={saving || disabled}
      startIcon={saving ? <CircularProgress size={16} /> : <SendIcon />}
    >
      Submit
    </Button>
  </DialogActions>
);

SaveProgressSubmitActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onSaveProgress: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  disabled: PropTypes.bool,
};

/** Line under the form explaining what Submit does. */
export const SubmitLockNotice = () => (
  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 3, pb: 1 }}>
    Save Progress keeps the record editable. Submit locks it; after that only an IT Admin or
    Level 1 user can unlock it.
  </Typography>
);

/**
 * Reason dialog that calls the unlock endpoint. `target` is
 * { recordType, id, label } or null when closed.
 */
export const UnlockRecordDialog = ({ target, onClose, onUnlocked }) => {
  const [reason, setReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (unlocking) return;
    setReason('');
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setUnlocking(true);
    setError(null);
    try {
      await unlockSection5Record(target.recordType, target.id, reason.trim());
      setReason('');
      onUnlocked?.(target);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to unlock record');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Dialog open={!!target} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Unlock submitted {target?.label || 'record'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          A copy of the submitted version will be kept. The record becomes editable again and must
          be submitted again to re-lock it.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Reason for unlocking"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText="Required. Recorded with the unlock (at least 5 characters)."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={unlocking} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirm}
          disabled={unlocking || reason.trim().length < 5}
          startIcon={unlocking ? <CircularProgress size={16} /> : <LockOpenIcon />}
        >
          {unlocking ? 'Unlocking...' : 'Unlock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

UnlockRecordDialog.propTypes = {
  target: PropTypes.shape({
    recordType: PropTypes.string.isRequired,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onUnlocked: PropTypes.func,
};
