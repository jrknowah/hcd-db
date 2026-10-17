// utils/clientStatus.js
// Program and active/discharged status for a client (dbo.Clients).
//
// A client is discharged once the exit date on their Section 1 Exit Form has
// arrived. Saving the Exit Form copies exitDate/exitReason onto the Clients row
// (clientDischargeDate/clientExitReason), so lists can show status without
// joining exit_form. See store/dbScripts/ClientStatusProgram.sql.

// The same programs as the Section 1 Referrals tab
const PROGRAMS = ['LAHSA', 'ODR', 'DHS', 'DMH'];

const YMD = /^(\d{4}-\d{2}-\d{2})/;

// 'YYYY-MM-DD' for a DATE column value (a Date at UTC midnight or a string), or null
const toYMD = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(YMD);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// Today's calendar date at the sites (Los Angeles), 'YYYY-MM-DD'
const todayAtSites = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

// 'discharged' once the discharge date has arrived, otherwise 'active'
const getClientStatus = (client, now = new Date()) => {
  const dischargeDate = toYMD(client?.clientDischargeDate);
  return dischargeDate && dischargeDate <= todayAtSites(now) ? 'discharged' : 'active';
};

// Error message for an invalid program, or null. Empty clears the program.
const programError = (program) => {
  if (program == null || program === '') return null;
  return PROGRAMS.includes(program) ? null : `Program must be one of: ${PROGRAMS.join(', ')}`;
};

// A readmitted client's earlier stays are kept read-only under '<clientID>~<n>'
// (store/dbScripts/ClientStays.sql). '~' is not allowed in new client IDs.
const PRIOR_STAY_ID = /~\d+$/;
const isPriorStayID = (clientID) => typeof clientID === 'string' && PRIOR_STAY_ID.test(clientID.trim());

module.exports = { PROGRAMS, toYMD, todayAtSites, getClientStatus, programError, isPriorStayID };
