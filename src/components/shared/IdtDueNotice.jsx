// Reminder on the Section 5 IDT note tabs: nursing and provider IDT notes are
// due every 90 days. Same rule as the Section 5 documentation report.
import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '@mui/material';

export const IDT_EVERY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const fmt = (d) => d.toLocaleDateString([], { dateStyle: 'medium' });

const IdtDueNotice = ({ notes, label }) => {
  const latest = (notes || [])
    .map(n => new Date(n.createdAt))
    .filter(d => !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a)[0];

  if (!latest) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {label} IDT notes are required every {IDT_EVERY_DAYS} days. No note on file yet —
        the first one is due within {IDT_EVERY_DAYS} days of admission.
      </Alert>
    );
  }

  const due = new Date(latest.getTime() + IDT_EVERY_DAYS * DAY_MS);
  const daysLeft = Math.ceil((due - Date.now()) / DAY_MS);
  const severity = daysLeft < 0 ? 'error' : daysLeft <= 14 ? 'warning' : 'info';
  const status = daysLeft < 0
    ? `overdue by ${-daysLeft} day${daysLeft === -1 ? '' : 's'}`
    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      {label} IDT notes are required every {IDT_EVERY_DAYS} days. Last note: {fmt(latest)}.
      Next due: <strong>{fmt(due)}</strong> ({status}).
    </Alert>
  );
};

IdtDueNotice.propTypes = {
  notes: PropTypes.array,
  label: PropTypes.string.isRequired,
};

export default IdtDueNotice;
