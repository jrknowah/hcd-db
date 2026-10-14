// ============================================================================
// clientSearch.js - Match clients against the dashboard search box
// ============================================================================
// The query is split into words, and every word must match at least one
// field. That way "Jane Doe", "Doe Jane" and "Doe, Jane" all find the same
// client, while a single word still matches any field as before.
// ============================================================================

const SEARCH_FIELDS = ['clientFirstName', 'clientLastName', 'clientID', 'clientSite'];

export const matchesClientSearch = (client, query) => {
  const terms = (query || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (terms.length === 0) return true;

  const values = SEARCH_FIELDS
    .map((field) => client?.[field])
    .filter((value) => value != null)
    .map((value) => String(value).toLowerCase());

  return terms.every((term) => values.some((value) => value.includes(term)));
};
