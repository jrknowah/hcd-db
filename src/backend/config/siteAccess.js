// config/siteAccess.js
// Which clients a signed-in user may see, by the site of the client
// (dbo.Clients.clientSite) and the user's Entra ID (Azure AD) groups.
//
//   - IT admins (HOPE_it) and auditors (HOPE_audit) see every site.
//   - Everyone else sees the sites of the hope_* site groups they belong to.
//   - A user in none of the configured site groups sees every site for now,
//     because most site groups have no Object ID yet. Set SITE_ACCESS_STRICT=true
//     once all of them are filled in, and such users will see no clients.
//
// Group Object IDs: Entra > Groups > <group> > Object Id. Keep in step with
// GROUP_MAPPINGS in config/groupConfig.js (the frontend copy).

const AUDIT_GROUP_ID = 'fec5c917-431c-4663-85b2-efc9e9053e96'; // HOPE_audit

// Site name (as stored in clientSite / the New Client site list) -> group Object ID
const SITE_GROUPS = {
  'Eubanks': 'd5115dd6-74f0-4abe-951f-6dc3e96fb1ee',        // hope_eubanks
  'Pacific': '1985ac8b-285d-45c1-9d0e-1ded3d3f6fca',        // hope_pacific
  'Heart Haven': '',                                         // hope_heart
  'Hope Haven': '',                                          // hope_hope
  'Downey': '',                                              // hope_downey
  'Heritage House': '',                                      // hope_heritage
  'Northridge': '',                                          // hope_northridge
  'Casa Amore': '',                                          // hope_casa
  '97th': '',                                                // hope_97
  '104th': '',                                               // hope_104
  '238th': '',                                               // hope_238
};

const normalizeSite = (site) => String(site || '').trim().toLowerCase();

// null = every site; otherwise the set of (normalized) site names the user may see
const allowedSites = (user, { strict = process.env.SITE_ACCESS_STRICT === 'true' } = {}) => {
  const groups = user?.groups || [];
  if (user?.isAdmin || groups.includes(AUDIT_GROUP_ID)) return null;

  const sites = Object.entries(SITE_GROUPS)
    .filter(([, groupID]) => groupID && groups.includes(groupID))
    .map(([site]) => normalizeSite(site));

  if (sites.length === 0) return strict ? new Set() : null;
  return new Set(sites);
};

const canSeeClient = (sites, client) => sites === null || sites.has(normalizeSite(client?.clientSite));

module.exports = { SITE_GROUPS, AUDIT_GROUP_ID, allowedSites, canSeeClient };
