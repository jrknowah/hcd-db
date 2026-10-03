import groups from './groups.json';

// Group object IDs live in groups.json so the backend enforces the same list.
// HOPE_it was verified against Entra > Groups > HOPE_it > Object Id (Aug 2026).
export const GROUP_MAPPINGS = groups.groupIds;

// Define role-based permissions for HOPE system
export const ROLE_PERMISSIONS = {
  IT_ADMIN: [
    'read', 'write', 'delete', 'admin', 
    'manage_users', 'system_config', 'backup_restore',
    'audit_logs', 'all_sections'
  ],
  LEVEL1: [
    'read', 'write', 'delete', 
    'medical_records', 'prescriptions', 'diagnosis',
    'all_sections', 'discharge_approve', 'treatment_plans'
  ],
  CASE_MANAGER: [
    'read', 'write', 
    'case_notes', 'discharge_planning', 'assessments',
    'section1', 'section2', 'section3', 'section4', 'section6'
  ],
  NURSE: [
    'read', 'write',
    'nursing_notes', 'vital_signs', 'medications', 'care_plans',
    'section1', 'section2', 'section5'
  ],
  AUDITOR: [
    'read', 'audit_access', 'generate_reports', 
    'all_sections', 'audit_trail', 'compliance_check'
  ],
  READONLY: [
    'read', 'section1', 'section2'
  ],
};

// ✅ Map your actual IT group to IT_ADMIN role  
export const GROUP_TO_ROLE = Object.fromEntries(
  Object.entries(groups.roleGroups).map(([groupName, role]) => [GROUP_MAPPINGS[groupName], role])
);

// Define what sections each role can access
export const SECTION_ACCESS = {
  IT_ADMIN: ['section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'admin'],
  LEVEL1: ['section1', 'section2', 'section3', 'section4', 'section5', 'section6'],
  CASE_MANAGER: ['section1', 'section2', 'section3', 'section4', 'section6'],
  NURSE: ['section1', 'section2', 'section5'],
  AUDITOR: ['section1', 'section2', 'section3', 'section4', 'section5', 'section6'],
  READONLY: ['section1', 'section2'],
};

// Helper function to check if user has access to a section
export const hasAccessToSection = (userRoles, sectionName) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  
  return userRoles.some(role => 
    SECTION_ACCESS[role] && SECTION_ACCESS[role].includes(sectionName)
  );
};

// Helper function to get user's highest permission level
export const getUserPermissionLevel = (userRoles) => {
  if (!userRoles || !Array.isArray(userRoles)) return 'READONLY';
  
  const roleHierarchy = ['READONLY', 'AUDITOR', 'NURSE', 'CASE_MANAGER', 'LEVEL1', 'IT_ADMIN'];
  
  for (let i = roleHierarchy.length - 1; i >= 0; i--) {
    if (userRoles.includes(roleHierarchy[i])) {
      return roleHierarchy[i];
    }
  }
  return 'READONLY';
};

// Role display names for UI
// Admin console (/admin/*) access. The app assigns roles through group
// membership, so HOPE_it members are admins; the 'ITAdmin' Entra app role is
// also honoured. Must stay in sync with requireAdmin in middleware/auth.js.
export const ADMIN_APP_ROLE = 'ITAdmin';

export const isAdminAccount = (account) => {
  const claims = account?.idTokenClaims || {};
  return (claims.roles || []).includes(ADMIN_APP_ROLE) ||
         (claims.groups || []).includes(GROUP_MAPPINGS.HOPE_it);
};

export const ROLE_DISPLAY_NAMES = {
  IT_ADMIN: 'IT Administrator',
  LEVEL1: 'Level 1 Staff',
  CASE_MANAGER: 'Case Manager',
  NURSE: 'Nurse',
  AUDITOR: 'Auditor',
  READONLY: 'Read Only User',
};