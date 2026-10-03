// middleware/signedFormUnlock.js
// Who may unlock a signed Section 2 form: IT_ADMIN or LEVEL1.
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

const requireSignedFormUnlock = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }
  if (!canUnlockSignedForms(req.user)) {
    return res.status(403).json({
      error: 'Only IT Admin or Level 1 users can unlock a signed form',
      code: 'UNLOCK_NOT_PERMITTED',
    });
  }
  next();
};

module.exports = { canUnlockSignedForms, requireSignedFormUnlock, UNLOCK_GROUP_IDS };
