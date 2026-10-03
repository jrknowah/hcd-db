// src/backend/config/apiAuth.js
// Attaches the signed-in user's ID token to every call to our backend API, which
// requires it (middleware/auth.js requireApiAuth) and records who made each call
// (middleware/auditTrail.cjs). Covers axios (default + created instances) and fetch.
// When the API rejects the token, the user is sent back through sign-in.
import axios from 'axios';
import { loginRequest } from './authConfig';

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

// 401 codes from middleware/auth.js that mean "sign in again".
const AUTH_FAILURE_CODES = new Set(['NO_AUTH_HEADER', 'NO_TOKEN', 'INVALID_TOKEN']);

let installed = false;
let msal = null;
let redirecting = false;

// Same token AdminAudit already sends. MSAL can hand back an expired ID token from
// cache, so force a refresh when it expires within the next minute.
async function getIdToken() {
  if (!msal) return null;
  const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
  if (!account) return null;
  const request = { scopes: ['openid', 'profile'], account };
  try {
    let result = await msal.acquireTokenSilent(request);
    const exp = result.idTokenClaims?.exp;
    if (exp && exp * 1000 < Date.now() + 60_000) {
      result = await msal.acquireTokenSilent({ ...request, forceRefresh: true });
    }
    return result.idToken || null;
  } catch {
    return null;
  }
}

// Don't bounce through sign-in more than once in this window, so a server that
// rejects even fresh tokens can't trap the user in a redirect loop.
const REDIRECT_COOLDOWN_MS = 2 * 60_000;
const REDIRECT_KEY = 'apiAuth.lastSignInRedirect';

function recentlyRedirected() {
  try {
    const last = Number(sessionStorage.getItem(REDIRECT_KEY));
    return last && Date.now() - last < REDIRECT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function handleAuthFailure(status, code) {
  if (status !== 401 || !AUTH_FAILURE_CODES.has(code) || redirecting || !msal) return;
  if (recentlyRedirected()) {
    console.error('API rejected the sign-in token again; not redirecting to avoid a loop.');
    return;
  }
  redirecting = true;
  try {
    sessionStorage.setItem(REDIRECT_KEY, String(Date.now()));
  } catch {
    // Storage unavailable; the in-memory flag still prevents repeats on this page.
  }
  msal.loginRedirect(loginRequest).catch((err) => {
    redirecting = false;
    console.error('Sign-in redirect failed:', err);
  });
}

/**
 * Opens an API file (download/preview link) in a new tab. Plain links can't carry
 * the token, so fetch it with auth and hand the tab a blob URL.
 * Call from a click handler so the popup isn't blocked.
 */
export async function openApiFile(url) {
  const tab = window.open('', '_blank');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const blobUrl = URL.createObjectURL(await res.blob());
    if (tab) {
      tab.opener = null;
      tab.location.href = blobUrl;
    } else {
      window.location.assign(blobUrl);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}

export function installApiAuth(msalInstance) {
  if (installed || !msalInstance) return;
  installed = true;
  msal = msalInstance;

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

  const onAxiosError = (error) => {
    handleAuthFailure(error.response?.status, error.response?.data?.code);
    return Promise.reject(error);
  };

  axios.interceptors.request.use(addAxiosAuth);
  axios.interceptors.response.use(undefined, onAxiosError);

  // Instances from axios.create() don't inherit default interceptors.
  const originalCreate = axios.create.bind(axios);
  axios.create = (...args) => {
    const instance = originalCreate(...args);
    instance.interceptors.request.use(addAxiosAuth);
    instance.interceptors.response.use(undefined, onAxiosError);
    return instance;
  };

  // --- fetch ---------------------------------------------------------------
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    if (!isApiUrl(url)) return originalFetch(input, init);

    let response;
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const token = headers.has('Authorization') ? null : await getIdToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      response = await originalFetch(input, { ...init, headers });
    } else {
      response = await originalFetch(input, init);
    }

    if (response.status === 401) {
      response.clone().json()
        .then((body) => handleAuthFailure(401, body?.code))
        .catch(() => {});
    }
    return response;
  };
}
