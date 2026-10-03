// src/components/Auth/IdleLogout.jsx
//
// Automatic logoff for unattended sessions (HIPAA §164.312(a)(2)(iii)).
//
// - Signs the user out after VITE_IDLE_TIMEOUT_MINUTES of inactivity
//   (default 15), with a warning dialog for the final 2 minutes.
// - Activity is shared across tabs through localStorage, so working in one tab
//   keeps the others signed in.
// - A logout in any tab logs out every other open tab too.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { selectIsAuthenticated } from '../../backend/store/slices/authSlice';
import { LAST_ACTIVITY_KEY, LOGOUT_BROADCAST_KEY } from '../../utils/secureSession';

const DEFAULT_TIMEOUT_MINUTES = 15;
const WARNING_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 5000;
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'];

const getIdleTimeoutMs = () => {
  const minutes = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_TIMEOUT_MINUTES) * 60 * 1000;
};

const readSharedActivity = () => {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
};

const writeSharedActivity = (ts) => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch {
    // Storage unavailable: idle tracking falls back to this tab only.
  }
};

const formatRemaining = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const IdleLogout = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { logout, msalInstance } = useAuth();
  const timeoutMs = getIdleTimeoutMs();

  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const loggingOutRef = useRef(false);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  const [remainingMs, setRemainingMs] = useState(null); // null = no warning

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (now - lastWriteRef.current > ACTIVITY_WRITE_THROTTLE_MS) {
      lastWriteRef.current = now;
      writeSharedActivity(now);
    }
  }, []);

  const stayActive = useCallback(() => {
    lastWriteRef.current = 0;
    recordActivity();
    setRemainingMs(null);
  }, [recordActivity]);

  // Idle timer
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    loggingOutRef.current = false;
    stayActive();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    const timer = setInterval(() => {
      const last = Math.max(lastActivityRef.current, readSharedActivity());
      const remaining = timeoutMs - (Date.now() - last);

      if (remaining <= 0) {
        if (!loggingOutRef.current) {
          loggingOutRef.current = true;
          setRemainingMs(null);
          logoutRef.current();
        }
      } else if (remaining <= WARNING_MS) {
        setRemainingMs(remaining);
      } else {
        setRemainingMs(null);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
    };
  }, [isAuthenticated, timeoutMs, recordActivity, stayActive]);

  // Logout in another tab -> log out here too.
  useEffect(() => {
    const onStorage = async (event) => {
      if (event.key !== LOGOUT_BROADCAST_KEY || !event.newValue) return;
      try {
        await msalInstance.clearCache();
      } finally {
        window.location.assign('/');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [msalInstance]);

  if (!isAuthenticated || remainingMs === null) return null;

  return (
    <Dialog open onClose={stayActive} aria-labelledby="idle-logout-title">
      <DialogTitle id="idle-logout-title">Are you still there?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          For client privacy you will be signed out in {formatRemaining(remainingMs)} due to
          inactivity. Unsaved changes will be lost.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => logout()} color="inherit">
          Sign out now
        </Button>
        <Button onClick={stayActive} variant="contained" autoFocus>
          Stay signed in
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IdleLogout;
