/**
 * useClientPdfExport.js
 * Shared logic for downloading server-generated client PDFs from
 * /api/export/client/:clientID/pdf[...].
 *
 * Usage:
 *   const { exportPdf, exporting, error, clearError } = useClientPdfExport();
 *   exportPdf(clientID, { sections: [5] });            // one or more sections
 *   exportPdf(clientID);                               // full record
 *   exportPdf(clientID, { kind: 'med-face-sheet' });   // Section 5 face sheet
 */

import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMsal } from '@azure/msal-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_APP_API_URL || 'http://localhost:5000';

export function buildExportUrl(clientID, { sections, kind } = {}) {
  const base = `${API_BASE}/api/export/client/${encodeURIComponent(clientID)}/pdf`;
  if (kind === 'med-face-sheet') return `${base}/med-face-sheet`;
  if (Array.isArray(sections) && sections.length > 0 && sections.length < 6) {
    return `${base}?sections=${sections.join(',')}`;
  }
  return base;
}

export default function useClientPdfExport() {
  const { instance, accounts } = useMsal();
  const azureToken = useSelector((state) => state.auth?.azureToken);

  // Key of the export currently running (e.g. 'all', '5', 'med-face-sheet'), or null
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState('');

  // Must return an ID token — audience = AZURE_CLIENT_ID.
  // Using scopes ['openid', 'profile'] forces MSAL to return result.idToken
  // instead of an access token. Never use 'User.Read' here — that returns a
  // Graph access token (aud = 00000003-...) which the backend cannot verify.
  const getAuthToken = useCallback(async () => {
    if (accounts && accounts.length > 0) {
      try {
        const result = await instance.acquireTokenSilent({
          scopes: ['openid', 'profile'],
          account: accounts[0],
        });
        if (result?.idToken) return result.idToken;
      } catch (e) {
        console.warn('acquireTokenSilent failed:', e.message);
        try {
          const result = await instance.acquireTokenPopup({
            scopes: ['openid', 'profile'],
            account: accounts[0],
          });
          if (result?.idToken) return result.idToken;
        } catch (popupErr) {
          console.warn('acquireTokenPopup failed:', popupErr.message);
        }
      }
    }

    // Fall back to Redux store (may already be an idToken stored at login)
    if (azureToken && azureToken !== 'no-token') return azureToken;

    // Fall back to localStorage
    const stored = localStorage.getItem('azureToken');
    if (stored && stored !== 'no-token') return stored;

    return null;
  }, [instance, accounts, azureToken]);

  const exportPdf = useCallback(async (clientID, options = {}) => {
    const key = options.kind || (options.sections?.length ? options.sections.join(',') : 'all');

    if (!clientID) {
      setError('No client selected. Please select a client before exporting.');
      return false;
    }

    setExporting(key);
    setError('');

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('Could not acquire authentication token. Please sign out and sign back in.');
      }

      const response = await fetch(buildExportUrl(clientID, options), {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) {
        let msg = `Export failed (${response.status})`;
        try {
          const body = await response.json();
          msg = body.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+?)"/);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = match ? match[1] : `${clientID}_${key === 'all' ? 'Complete_Record' : key}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      setError(err.message || 'Export failed. Please try again.');
      return false;
    } finally {
      setExporting(null);
    }
  }, [getAuthToken]);

  const clearError = useCallback(() => setError(''), []);

  return { exportPdf, exporting, error, clearError };
}
