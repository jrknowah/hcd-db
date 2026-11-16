// Sends the signed-in user's ID token with every call to our backend.
//
// The backend checks that any request naming a client comes from a user who
// can see that client's site (backend/middleware/clientSiteAccess.js), so
// every API call needs an Authorization header, not only the few that set
// one by hand. Installed once at startup (main.jsx) on window.fetch and the
// default axios instance; custom axios instances call addApiAuthInterceptor.
// A header the caller already set is left alone, and no token is sent to any
// other host (Microsoft Graph, Azure Blob Storage, ...).
import axios from 'axios';
import { getApiAuthHeaders } from './apiAuth';

const backendOrigins = () => {
  const origins = new Set(['http://localhost:5000', 'http://localhost:3001']);
  if (typeof window !== 'undefined') origins.add(window.location.origin);
  [
    import.meta.env.VITE_API_BASE_URL,
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_APP_API_URL,
  ].forEach((base) => {
    if (!base) return;
    try {
      origins.add(new URL(base, window.location.origin).origin);
    } catch {
      // not a URL; ignore
    }
  });
  return origins;
};

export const isBackendUrl = (url, base) => {
  if (!url) return false;
  try {
    const resolved = new URL(String(url), base || window.location.origin);
    return resolved.pathname.startsWith('/api/') && backendOrigins().has(resolved.origin);
  } catch {
    return false;
  }
};

const hasAuthHeader = (headers) => {
  if (!headers) return false;
  if (typeof headers.has === 'function') return headers.has('Authorization');
  return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
};

export const addApiAuthInterceptor = (instance) =>
  instance.interceptors.request.use(async (config) => {
    if (!isBackendUrl(config.url, config.baseURL) || hasAuthHeader(config.headers)) return config;
    const auth = await getApiAuthHeaders();
    if (auth.Authorization) {
      if (typeof config.headers?.set === 'function') config.headers.set('Authorization', auth.Authorization);
      else config.headers = { ...(config.headers || {}), ...auth };
    }
    return config;
  });

export const wrapFetch = (originalFetch) => async (input, init) => {
  const url = typeof input === 'string' || input instanceof URL ? input : input?.url;
  if (!isBackendUrl(url)) return originalFetch(input, init);

  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (!headers.has('Authorization')) {
    const auth = await getApiAuthHeaders();
    if (auth.Authorization) headers.set('Authorization', auth.Authorization);
  }
  return originalFetch(input, { ...init, headers });
};

let installed = false;

export const installApiAuth = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  addApiAuthInterceptor(axios);
  window.fetch = wrapFetch(window.fetch.bind(window));
};
