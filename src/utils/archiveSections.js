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

// Upload categories offered by each section's archive
export const SECTION_CATEGORIES = {
  [ARCHIVE_SECTIONS.IDENTIFICATION]: [
    "Identification Card", "Driver's License", "Social Security Card", "Permanent Resident Alien Card",
    "Medi-Cal Benefits", "Medicare", "TB Clearance", "Income", "Other"
  ],
  [ARCHIVE_SECTIONS.AUTH_SIG]: [
    'Consent for Treatment',
    'Photo Release',
    'Release of PHI',
    'Authorization for Disclosure',
    'Housing Agreement',
    'Residence Policy',
    'Termination Agreement',
    'HIPAA Notice',
    'Client Rights',
    'Financial Agreement',
    'Medication Consent',
    'Transportation Consent',
    'Emergency Treatment',
    'General Consent',
    'Other Authorization Forms'
  ],
  [ARCHIVE_SECTIONS.NURSING]: [
    'Nursing Assessment',
    'Nursing Notes',
    'Progress Notes',
    'Vital Signs Record',
    'Medication Administration Record (MAR)',
    'Treatment Plan',
    'Care Plan',
    'Wound Care Documentation',
    'IV Therapy Record',
    'Discharge Summary',
    'Lab Results',
    'Imaging Reports',
    'Consultation Notes',
    'Incident Report',
    'Transfer Summary',
    'Other Nursing Documentation'
  ],
  [ARCHIVE_SECTIONS.MISC_DOCS]: [
    'General Documents',
    'Medical Records',
    'Legal Documents',
    'Financial Records',
    'Identification',
    'Benefits Documentation',
    'Housing Documents',
    'Employment Records',
    'Other'
  ],
  [ARCHIVE_SECTIONS.PERSONAL_INVENTORY]: [
    'Electronics',
    'Jewelry',
    'Furniture',
    'Appliances',
    'Clothing',
    'Documents',
    'Medical Equipment',
    'Personal Items',
    'Other'
  ],
  [ARCHIVE_SECTIONS.MENTAL_HEALTH]: [
    'Mental Health Archive',
    'Assessment Report',
    'Treatment Plan',
    'Progress Notes',
    'Discharge Summary',
    'Psychiatric Evaluation',
    'Therapy Notes',
    'Medication Records',
    'Crisis Intervention',
    'Family Session Notes',
    'Group Therapy Notes',
    'Court Documents',
    'Insurance Forms',
    'Medical Records',
    'Lab Results',
    'Imaging Studies',
    'Historical Document',
    'Paper Conversion',
    'Other'
  ],
  [ARCHIVE_SECTIONS.CM_NOTES]: ['CM Notes Archive']
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

const matchCategory = (folder, categories) =>
  categories.find(c => c === folder || sanitizeSegment(c) === folder) || null;

const matchesAnySection = (folder) =>
  Object.values(SECTION_CATEGORIES).some(cats => matchCategory(folder, cats));

// The folder a file was stored in: {clientID}/{folder}/{file}
const folderOf = (file) => {
  if (file?.docType) return file.docType;
  const parts = String(file?.blobName || '').split('/');
  return parts.length >= 3 ? parts[1] : null;
};

// Category label for a file, or null if the file belongs to another section.
// - Section-prefixed files go only to their own section.
// - Older, unprefixed files go to the section whose category they match (a
//   category name two sections share shows in both).
// - Older files that match no section's categories (or have no folder at all)
//   are shown in every archive rather than hidden.
const categoryFor = (file, section, categories) => {
  const folder = folderOf(file);
  const prefix = `${section}${SEPARATOR}`;
  if (folder && folder.startsWith(prefix)) {
    const rest = folder.slice(prefix.length);
    return matchCategory(rest, categories) || rest.replace(/_/g, ' ');
  }
  if (folder && Object.values(ARCHIVE_SECTIONS).some(s => folder.startsWith(`${s}${SEPARATOR}`))) {
    return null;
  }
  const own = folder && matchCategory(folder, categories);
  if (own) return own;
  if (folder && matchesAnySection(folder)) return null;
  return folder ? folder.replace(/_/g, ' ') : 'Uncategorized';
};

// Keep only this section's files, with docType relabelled to the readable category.
export const filterSectionFiles = (files, section, categories = SECTION_CATEGORIES[section] || []) =>
  (Array.isArray(files) ? files : []).reduce((acc, file) => {
    const category = file && categoryFor(file, section, categories);
    if (category) acc.push({ ...file, docType: category });
    return acc;
  }, []);
