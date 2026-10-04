// Section 5 notes and observation records lock once submitted. Staff can save
// progress as often as they like; "Submit" locks the record. Only IT Admin or
// Level 1 users can unlock it (backend routes/section5Lock.js enforces this).
import { getApiAuthHeaders } from './apiAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Roles from authSlice (config/groupConfig.js GROUP_TO_ROLE)
const UNLOCK_ROLES = ['IT_ADMIN', 'LEVEL1'];

export const canUnlockSection5Records = (userRoles) =>
  Array.isArray(userRoles) && userRoles.some((role) => UNLOCK_ROLES.includes(role));

export const isRecordLocked = (record) => record?.isLocked === true || record?.isLocked === 1;

// Error for a failed fetch, using the server's message (e.g. the 409 RECORD_LOCKED text)
export async function httpError(response) {
  let message = `HTTP error! status: ${response.status}`;
  try {
    const body = await response.json();
    if (body?.message) message = body.message;
    else if (body?.error) message = body.error;
  } catch { /* not JSON */ }
  return new Error(message);
}

// Message from a rejected thunk payload (string, Error or response body)
export const errorMessage = (err) =>
  (typeof err === 'string' ? err : err?.message || err?.error) || 'Unknown error';

export async function unlockSection5Record(recordType, id, reason) {
  const response = await fetch(
    `${API_BASE_URL}/api/section5/records/${encodeURIComponent(recordType)}/${encodeURIComponent(id)}/unlock`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getApiAuthHeaders()) },
      body: JSON.stringify({ reason }),
    }
  );
  if (!response.ok) throw await httpError(response);
  return response.json();
}
