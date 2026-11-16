// Staff who can be assigned to a client's care team, read from the members of
// the CARE_TEAM_GROUPS Entra groups through Microsoft Graph.
import { msalInstance, graphRequest } from '../config/authConfig';
import { CARE_TEAM_GROUPS } from '../config/groupConfig';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const cache = new Map(); // role -> Promise<staff[]>

const getGraphToken = async () => {
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) throw new Error('Not signed in');
  try {
    return (await msalInstance.acquireTokenSilent({ ...graphRequest, account })).accessToken;
  } catch {
    return (await msalInstance.acquireTokenPopup({ ...graphRequest, account })).accessToken;
  }
};

const groupMembers = async (token, groupId) => {
  const people = [];
  let url = `${GRAPH}/groups/${groupId}/transitiveMembers/microsoft.graph.user` +
    '?$select=id,displayName,mail,userPrincipalName,jobTitle,accountEnabled&$top=999';
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Could not load the staff directory (Graph ${res.status})`);
    const data = await res.json();
    people.push(...(data.value || []));
    url = data['@odata.nextLink'];
  }
  return people;
};

// The email stored on the client is the sign-in name (UPN), which is what the
// backend sees as req.user.email; fall back to mail when there is no UPN.
export const toStaff = (user) => ({
  email: String(user.userPrincipalName || user.mail || '').toLowerCase(),
  name: user.displayName || user.userPrincipalName || user.mail || '',
  jobTitle: user.jobTitle || '',
});

export const loadCareTeamStaff = (role) => {
  if (!cache.has(role)) {
    const groupIds = (CARE_TEAM_GROUPS[role] || []).filter(Boolean);
    const promise = (async () => {
      if (groupIds.length === 0) return [];
      const token = await getGraphToken();
      const lists = await Promise.all(groupIds.map((id) => groupMembers(token, id)));
      const byEmail = new Map();
      lists.flat()
        .filter((user) => user.accountEnabled !== false)
        .map(toStaff)
        .filter((staff) => staff.email)
        .forEach((staff) => byEmail.set(staff.email, staff));
      return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
    })();
    // Retry on the next call if this one fails
    promise.catch(() => cache.delete(role));
    cache.set(role, promise);
  }
  return cache.get(role);
};
