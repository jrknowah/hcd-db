// utils/stayFiles.js
// Uploaded files stay in the client's blob folder when the client is
// readmitted (store/dbScripts/ClientStays.sql), so the Documents & Uploads
// list picks each stay's files by upload time:
//   - the current stay: files uploaded since the last readmission
//   - previous stay n ('<clientID>~<n>'): files uploaded between readmission
//     n-1 (or the beginning) and readmission n
const sql = require('mssql');
const { getPool } = require('../store/azureSql');
const { isPriorStayID } = require('./clientStatus');

// { folderID, from, to }: list blobs under folderID uploaded in [from, to)
async function stayFileScope(clientID) {
  const id = String(clientID || '').trim();
  const prior = isPriorStayID(id);
  const folderID = prior ? id.replace(/~\d+$/, '') : id;
  const stayNumber = prior ? Number(id.match(/~(\d+)$/)[1]) : null;

  let stays = [];
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), folderID)
      .query('SELECT stayNumber, readmittedAt FROM ClientStays WHERE clientID = @clientID');
    stays = result.recordset;
  } catch (err) {
    // Before ClientStays.sql has run there are no stays: show every file
    console.warn('⚠️ Could not load client stays for file listing:', err.message);
  }

  const readmittedAt = (n) => {
    const stay = stays.find(s => s.stayNumber === n);
    return stay ? new Date(stay.readmittedAt) : null;
  };

  if (prior) {
    return { folderID, from: readmittedAt(stayNumber - 1), to: readmittedAt(stayNumber) };
  }
  const latest = stays.reduce((max, s) => (s.stayNumber > (max?.stayNumber || 0) ? s : max), null);
  return { folderID, from: latest ? new Date(latest.readmittedAt) : null, to: null };
}

// Was this blob uploaded during the stay?
function blobInScope(blob, { from, to }) {
  const uploaded = blob.properties?.createdOn || blob.properties?.lastModified;
  if (!uploaded) return from === null;
  const t = new Date(uploaded).getTime();
  return (from === null || t >= from.getTime()) && (to === null || t < to.getTime());
}

module.exports = { stayFileScope, blobInScope };
