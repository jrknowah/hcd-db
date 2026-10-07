// middleware/signedFormUnlock.js
// Who may unlock a locked record (signed Section 2 forms, submitted Section 4
// notes and care plans) and view the Admin > Audit Trail: IT_ADMIN or LEVEL1.
//
// Roles are assigned through Entra group membership. These IDs must stay in
// sync with GROUP_MAPPINGS in config/groupConfig.js (HOPE_it, HOPE_level1).
// req.user.isAdmin (set by middleware/auth.js) already covers HOPE_it and the
// ITAdmin app role.
const HOPE_IT_GROUP_ID = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const HOPE_LEVEL1_GROUP_ID = 'f47eca14-0206-4719-91c7-fba7b2be382c';

const UNLOCK_GROUP_IDS = [HOPE_IT_GROUP_ID, HOPE_LEVEL1_GROUP_ID];

const canUnlockSignedForms = (user) =>
  !!user && (user.isAdmin === true || (user.groups || []).some(g => UNLOCK_GROUP_IDS.includes(g)));

const requireUnlockPermission = (what) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  if (!canUnlockSignedForms(req.user)) {
    return res.status(403).json({
      error: `Only IT Admin or Level 1 users can unlock ${what}`,
      code: 'UNLOCK_NOT_PERMITTED',
    });
  }
  next();
};

const requireSignedFormUnlock = requireUnlockPermission('a signed form');

// Admin > Audit Trail (/api/admin/audit). The rest of the admin console
// (errors, analytics) stays IT Admin only via requireAdmin.
const requireAuditAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  if (!canUnlockSignedForms(req.user)) {
    return res.status(403).json({
      error: 'Only IT Admin or Level 1 users can view the audit trail',
      code: 'AUDIT_ACCESS_REQUIRED',
    });
  }
  next();
};

// Admin > Behavioral Health / Nursing documentation reports
// (/api/admin/documentation): IT Admin or Level 1, same as the audit trail.
const requireSupervisorAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  if (!canUnlockSignedForms(req.user)) {
    return res.status(403).json({
      error: 'Only IT Admin or Level 1 users can view documentation reports',
      code: 'SUPERVISOR_ACCESS_REQUIRED',
    });
  }
  next();
};

module.exports = {
  canUnlockSignedForms,
  requireSupervisorAccess,
  requireSignedFormUnlock,
  requireUnlockPermission,
  requireAuditAccess,
  UNLOCK_GROUP_IDS,
};
