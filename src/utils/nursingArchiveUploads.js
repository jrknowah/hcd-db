// Who uploaded each Section 5 Nursing Archive file. The file itself goes to blob
// storage via azureBlobService.uploadFile; the uploader is recorded (DB + audit
// log) by backend routes/nursingArchiveUploads.js from the user's sign-in.
import { getApiAuthHeaders } from './apiAuth';
import { httpError } from './section5Lock';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function recordNursingArchiveUpload({ clientID, blobName, fileName, docType }) {
  const response = await fetch(`${API_BASE_URL}/api/section5/archive-uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getApiAuthHeaders()) },
    body: JSON.stringify({ clientID, blobName, fileName, docType }),
  });
  if (!response.ok) throw await httpError(response);
  return response.json();
}

// blobName -> { uploadedBy, uploadedByName, uploadedAt }
export async function fetchNursingArchiveUploaders(clientID) {
  const response = await fetch(
    `${API_BASE_URL}/api/section5/archive-uploads/${encodeURIComponent(clientID)}`,
    { headers: await getApiAuthHeaders() }
  );
  if (!response.ok) throw await httpError(response);
  const body = await response.json();
  return Object.fromEntries((body.data || []).map(row => [row.blobName, row]));
}

// Display name for an uploader row, or null when unknown (uploaded before tracking)
export const uploaderName = (row) => row?.uploadedByName || row?.uploadedBy || null;

// Add `uploader` to each listed file; a failed lookup just leaves it unknown
export async function withUploaders(clientID, files) {
  let uploaders = {};
  try {
    uploaders = await fetchNursingArchiveUploaders(clientID);
  } catch (err) {
    console.warn('Could not load Nursing Archive uploaders:', err.message);
  }
  return files.map(file => ({ ...file, uploader: uploaderName(uploaders[file.blobName]) }));
}
