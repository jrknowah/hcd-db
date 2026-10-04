// Per-section archive helpers.
//
// Every section's archive uploads through the shared /api/upload route, which
// stores blobs at {clientID}/{sanitized docType}/..., and lists through
// /api/files/:clientID, which returns ALL of a client's blobs. Category names
// overlap between sections ('Other', 'Progress Notes', 'Medical Records', ...),
// so each section uploads with a section prefix (e.g. "S6__Medical Records")
// and filters the shared list down to its own folder prefix.

export const ARCHIVE_SECTIONS = {
  IDENTIFICATION: 'S1',
  AUTH_SIG: 'S2',
  MENTAL_HEALTH: 'S3',
  CM_NOTES: 'S4',
  NURSING: 'S5',
  MISC_DOCS: 'S6',
  PERSONAL_INVENTORY: 'S6INV'
};

const SEPARATOR = '__';

// Mirrors sanitizeSegment() in src/backend/routes/files.js
export const sanitizeSegment = (s) =>
  String(s || '')
    .replace(/[^\w\- ]+/g, '_')
    .trim()
    .replace(/\s+/g, '_');

// docType to send to azureBlobService.uploadFile / filesSlice.uploadFile
export const sectionDocType = (section, category) => `${section}${SEPARATOR}${category}`;

// Category label for a file's folder, or null if the file isn't this section's.
// Files uploaded before section prefixes existed are matched by category name;
// a legacy category shared by two sections shows in both.
const categoryFor = (docType, section, categories) => {
  if (!docType) return null;
  const prefix = `${section}${SEPARATOR}`;
  if (docType.startsWith(prefix)) {
    const rest = docType.slice(prefix.length);
    return categories.find(c => c === rest || sanitizeSegment(c) === rest) || rest.replace(/_/g, ' ');
  }
  if (Object.values(ARCHIVE_SECTIONS).some(s => docType.startsWith(`${s}${SEPARATOR}`))) {
    return null;
  }
  return categories.find(c => c === docType || sanitizeSegment(c) === docType) || null;
};

// Keep only this section's files, with docType relabelled to the readable category.
export const filterSectionFiles = (files, section, categories) =>
  (Array.isArray(files) ? files : []).reduce((acc, file) => {
    const category = categoryFor(file?.docType, section, categories);
    if (category) acc.push({ ...file, docType: category });
    return acc;
  }, []);
