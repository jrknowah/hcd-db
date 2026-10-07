// middleware/documentationAccess.js
// Admin > Behavioral Health (Sections 1-4) and Admin > Nursing (Section 5)
// documentation reports (/api/admin/documentation/:area).
//
// IT Admin (req.user.isAdmin, set by middleware/auth.js) sees both reports;
// HOPE_behavioral_admin and HOPE_nursing_admin each see their own.
// These IDs must stay in sync with GROUP_MAPPINGS in config/groupConfig.js.
// TODO: fill in the Object Ids from Entra > Groups. Empty = nobody matches.
const HOPE_BEHAVIORAL_ADMIN_GROUP_ID = '';
const HOPE_NURSING_ADMIN_GROUP_ID = '';

const AREA_GROUP_IDS = {
  behavioral: HOPE_BEHAVIORAL_ADMIN_GROUP_ID,
  nursing: HOPE_NURSING_ADMIN_GROUP_ID,
};

const AREA_LABELS = {
  behavioral: 'Behavioral Health',
  nursing: 'Nursing',
};

const canViewDocumentationReport = (user, area) => {
  if (!user || !(area in AREA_GROUP_IDS)) return false;
  if (user.isAdmin === true) return true;
  const groupId = AREA_GROUP_IDS[area];
  return !!groupId && (user.groups || []).includes(groupId);
};

// For routes with an :area param
const requireDocumentationAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  const { area } = req.params;
  if (!(area in AREA_GROUP_IDS)) {
    return res.status(404).json({ error: `Unknown report area: ${area}` });
  }
  if (!canViewDocumentationReport(req.user, area)) {
    return res.status(403).json({
      error: `Only IT Admin or ${AREA_LABELS[area]} admins can view this report`,
      code: 'DOCUMENTATION_ACCESS_REQUIRED',
    });
  }
  next();
};

module.exports = { canViewDocumentationReport, requireDocumentationAccess, AREA_GROUP_IDS };
