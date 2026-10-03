// src/utils/secureSession.js
//
// Helpers for ending a session without leaving client data or credentials
// behind in the browser.

// Legacy keys the app used to persist auth state / client selection in.
// Auth is now derived from MSAL on every load, so none of these should exist;
// they are removed on login screens and on logout to clean up old browsers.
const LOCAL_KEYS = [
  'authData',
  'azureToken',
  'user',
  'userRoles',
  'permissions',
  'azureGroups',
  'selectedClientID',
  'lastClientID',
  'redux_cache',
];

// Written on logout so other open tabs log out too; read via the storage event.
export const LOGOUT_BROADCAST_KEY = 'hope_logout';

// Shared across tabs so activity in one tab keeps the others signed in.
export const LAST_ACTIVITY_KEY = 'hope_last_activity';

const safely = (fn) => {
  try {
    fn();
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
};

export const clearSensitiveStorage = () => {
  safely(() => LOCAL_KEYS.forEach((key) => localStorage.removeItem(key)));
  safely(() => localStorage.removeItem(LAST_ACTIVITY_KEY));
  safely(() => {
    sessionStorage.removeItem('redux_cache');
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('client_'))
      .forEach((key) => sessionStorage.removeItem(key));
  });
};

export const broadcastLogout = () => {
  safely(() => localStorage.setItem(LOGOUT_BROADCAST_KEY, String(Date.now())));
};
