// middleware/clientSiteAccess.js
// Users see only the clients at their own sites (config/siteAccess.js). The
// client list and /api/clients/:id already filter by site; this guards every
// other route that reads or changes one client's records (face sheet,
// nursing, notes, files, exports, ...), however that route names the client.
//
// A request names a client when a path segment, ?clientID / body.clientID,
// or the first folder of a blob path (?blobName=<clientID>/...) is the ID of
// a row in dbo.Clients. Such a request must be signed in, and the client's
// site must be one the user may see; otherwise it gets 401 / 403. Requests
// naming no client pass through untouched.
//
// Not covered: routes that name only a record ID (e.g. DELETE
// /progress-notes/:noteID) and multipart uploads whose client ID is a form
// field (the body is not parsed yet at this point).
//
// Emergency switch: CLIENT_SITE_CHECK=off disables the check.
const sql = require('mssql');
const { allowedSites, canSeeClient } = require('../config/siteAccess');
const { isPriorStayID } = require('../utils/clientStatus');

const MAX_CANDIDATES = 20;
const MAX_ID_LENGTH = 50;

// Paths that are opened by the browser directly (no Authorization header).
// /file/stream URLs are only handed out by /file/download-url, which is checked.
const EXEMPT = [/^\/file\/stream\//, /^\/health$/, /^\/auth\//, /^\/test$/];

const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const firstFolder = (blobName) =>
  typeof blobName === 'string' ? decode(blobName).replace(/^\/+/, '').split('/')[0] : null;

// Every value in the request that could be a client ID
const candidateIDs = (req) => {
  const values = [
    ...req.path.split('/').map(decode),
    req.query?.clientID,
    req.query?.clientId,
    req.body?.clientID,
    req.body?.clientId,
    firstFolder(req.query?.blobName),
    firstFolder(req.body?.blobName),
  ];
  const ids = new Set();
  values.forEach((value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return;
    let id = String(value).trim();
    if (!id || id.length > MAX_ID_LENGTH) return;
    // A previous stay ('<clientID>~<n>') belongs to the client's current site
    if (isPriorStayID(id)) id = id.replace(/~\d+$/, '');
    ids.add(id);
  });
  return [...ids].slice(0, MAX_CANDIDATES);
};

const findClients = async (pool, ids) => {
  const request = pool.request();
  const params = ids.map((id, i) => {
    request.input(`c${i}`, sql.NVarChar(MAX_ID_LENGTH), id);
    return `@c${i}`;
  });
  const result = await request.query(
    `SELECT clientID, clientSite FROM dbo.Clients WHERE clientID IN (${params.join(', ')})`
  );
  return result.recordset;
};

// authenticate: middleware/auth.js (sets req.user or answers 401)
const createClientSiteAccess = ({ getPool, authenticate }) => async (req, res, next) => {
  if (process.env.CLIENT_SITE_CHECK === 'off') return next();
  if (req.method === 'OPTIONS' || EXEMPT.some((re) => re.test(req.path))) return next();

  const ids = candidateIDs(req);
  if (ids.length === 0) return next();

  let clients;
  try {
    clients = await findClients(await getPool(), ids);
  } catch (err) {
    console.error('❌ Client site check failed:', err.message);
    return res.status(503).json({ error: 'Could not check access to this client. Try again.' });
  }
  if (clients.length === 0) return next();

  const check = () => {
    const sites = allowedSites(req.user);
    const blocked = clients.find((client) => !canSeeClient(sites, client));
    if (blocked) {
      console.warn(`🚫 ${req.user?.email || 'unknown user'} blocked from client ${blocked.clientID} (${req.method} ${req.originalUrl})`);
      return res.status(403).json({
        error: 'You do not have access to clients at this site',
        code: 'CLIENT_SITE_FORBIDDEN',
      });
    }
    return next();
  };

  if (req.user) return check();
  return authenticate(req, res, check);
};

module.exports = { createClientSiteAccess, candidateIDs };
