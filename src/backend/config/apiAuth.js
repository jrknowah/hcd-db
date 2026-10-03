// src/backend/config/apiAuth.js
// Attaches the signed-in user's ID token to every call to our backend API, so the
// server can attribute each request in the audit trail (see middleware/auth.js
// optionalAuth and middleware/auditTrail.cjs). Covers axios (default + created
// instances) and fetch. Never blocks a request: if no token is available it is
// sent as before.
import axios from 'axios';

// Every base URL the app uses for the backend, across the env var names in use.
const API_ORIGINS = new Set(
  [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_APP_API_URL,
    'http://localhost:5000',
    'http://localhost:3001',
    'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net',
  ]
    .filter(Boolean)
    .map((u) => {
      try {
        return new URL(u).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
);

function isApiUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(String(url), window.location.origin);
    const knownOrigin = API_ORIGINS.has(parsed.origin) || parsed.origin === window.location.origin;
    return knownOrigin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

let installed = false;

export function installApiAuth(msalInstance) {
  if (installed || !msalInstance) return;
  installed = true;

  // Same token AdminAudit already sends; MSAL serves it from cache and refreshes as needed.
  const getIdToken = async () => {
    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) return null;
    try {
      const result = await msalInstance.acquireTokenSilent({ scopes: ['openid', 'profile'], account });
      return result.idToken || null;
    } catch {
      return null;
    }
  };

  // --- axios ---------------------------------------------------------------
  const addAxiosAuth = async (config) => {
    const url = config.baseURL && !/^https?:\/\//i.test(config.url || '')
      ? `${config.baseURL.replace(/\/$/, '')}/${(config.url || '').replace(/^\//, '')}`
      : config.url;
    const existing = config.headers?.get?.('Authorization') ?? config.headers?.Authorization;
    if (!existing && isApiUrl(url)) {
      const token = await getIdToken();
      if (token) {
        if (typeof config.headers?.set === 'function') config.headers.set('Authorization', `Bearer ${token}`);
        else config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      }
    }
    return config;
  };

  axios.interceptors.request.use(addAxiosAuth);

  // Instances from axios.create() don't inherit default interceptors.
  const originalCreate = axios.create.bind(axios);
  axios.create = (...args) => {
    const instance = originalCreate(...args);
    instance.interceptors.request.use(addAxiosAuth);
    return instance;
  };

  // --- fetch ---------------------------------------------------------------
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    if (isApiUrl(url)) {
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) {
        const token = await getIdToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
          return originalFetch(input, { ...init, headers });
        }
      }
    }
    return originalFetch(input, init);
  };
}
