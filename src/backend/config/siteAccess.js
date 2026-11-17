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
// Group Object IDs live in config/orgs/<ORG>.json, shared with the frontend.

const { ORG, group } = require('./orgConfig.cjs');

const AUDIT_GROUP_ID = group('HOPE_audit');

// Site name (as stored in clientSite / the New Client site list) -> group Object ID,
// from config/orgs/<ORG>.json
const SITE_GROUPS = Object.fromEntries(ORG.sites.map(({ name, groupId }) => [name, groupId || '']));

const normalizeSite = (site) => String(site || '').trim().toLowerCase();

// null = every site; otherwise the set of (normalized) site names the user may see
const allowedSites = (user, { strict = process.env.SITE_ACCESS_STRICT === 'true' } = {}) => {
  const groups = user?.groups || [];
  if (user?.isAdmin || (AUDIT_GROUP_ID && groups.includes(AUDIT_GROUP_ID))) return null;

  const sites = Object.entries(SITE_GROUPS)
    .filter(([, groupID]) => groupID && groups.includes(groupID))
    .map(([site]) => normalizeSite(site));

  if (sites.length === 0) return strict ? new Set() : null;
  return new Set(sites);
};

const canSeeClient = (sites, client) => sites === null || sites.has(normalizeSite(client?.clientSite));

module.exports = { SITE_GROUPS, AUDIT_GROUP_ID, allowedSites, canSeeClient };
