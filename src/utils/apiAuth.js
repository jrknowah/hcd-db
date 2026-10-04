// Authorization header for backend routes behind middleware/auth.js.
// Must be an ID token (audience = this app): scopes ['openid', 'profile'] make
// MSAL return result.idToken. A Graph access token would fail verification.
import { msalInstance } from '../backend/config/authConfig';

export async function getApiAuthHeaders() {
  try {
    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) return {};
    const result = await msalInstance.acquireTokenSilent({
      scopes: ['openid', 'profile'],
      account,
    });
    return result?.idToken ? { Authorization: `Bearer ${result.idToken}` } : {};
  } catch (err) {
    console.warn('Could not acquire ID token for API call:', err?.message);
    return {};
  }
}
