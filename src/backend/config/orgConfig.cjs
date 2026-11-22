// Backend: the organization this server serves, chosen by the ORG app setting
// (default 'hope'). The frontend reads the same files through org.js.
// See orgs/README.md.
const ORGS = {
  hope: require('./orgs/hope.json'),
  src: require('./orgs/src.json'),
};

const ORG_KEY = (process.env.ORG || 'hope').trim().toLowerCase();
if (!ORGS[ORG_KEY]) throw new Error(`Unknown ORG "${ORG_KEY}". Expected one of: ${Object.keys(ORGS).join(', ')}`);

const org = ORGS[ORG_KEY];

module.exports = {
  ORG_KEY,
  ORG: org,
  TENANT_ID: process.env.AUTH_TENANT_ID || org.tenantId,
  CLIENT_ID: process.env.AUTH_CLIENT_ID || org.clientId,
  // Blob storage account for client documents: the org file's value, else the
  // AZURE_STORAGE_ACCOUNT app setting
  STORAGE_ACCOUNT: org.storageAccount || process.env.AZURE_STORAGE_ACCOUNT,
  group: (key) => org.groups[key] || '',
};

if (!module.exports.TENANT_ID || !module.exports.CLIENT_ID) {
  console.warn(`⚠️ ORG "${ORG_KEY}" has no tenantId/clientId; set them in config/orgs/${ORG_KEY}.json or AUTH_TENANT_ID / AUTH_CLIENT_ID. Sign-in will fail.`);
}
