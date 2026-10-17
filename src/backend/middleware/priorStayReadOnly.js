// middleware/priorStayReadOnly.js
// A readmitted client's previous stays ('<clientID>~<n>', see
// store/dbScripts/ClientStays.sql) are read-only: refuse any change that names
// one in the URL or JSON body. Multipart uploads are not parsed yet at this
// point; the app never opens a previous stay's chart, only its PDF export.
const { isPriorStayID } = require('../utils/clientStatus');

module.exports = function priorStayReadOnly(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  let segments;
  try {
    segments = decodeURIComponent(req.path).split('/');
  } catch {
    segments = req.path.split('/');
  }
  const named = [...segments, req.body?.clientID, req.query?.clientID];
  if (named.some(isPriorStayID)) {
    return res.status(403).json({ error: 'Previous stays are read-only' });
  }
  next();
};
