import { ORG } from './org';

// Entra group Object IDs for this deployment's organization, from
// config/orgs/<VITE_ORG>.json (see config/orgs/README.md). Site groups are
// keyed by site name in ORG.sites; the backend reads the same file.
export const GROUP_MAPPINGS = { ...ORG.groups };

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
export const GROUP_TO_ROLE = {
  [GROUP_MAPPINGS.HOPE_it]: 'IT_ADMIN',           // Your IT group -> IT_ADMIN (full access)
  [GROUP_MAPPINGS.HOPE_level1]: 'LEVEL1',         
  [GROUP_MAPPINGS.HOPE_case]: 'CASE_MANAGER',     
  [GROUP_MAPPINGS.HOPE_nursing]: 'NURSE',
  [GROUP_MAPPINGS.HOPE_audit]: 'AUDITOR',
  [GROUP_MAPPINGS.HOPE_readonly]: 'READONLY',
};

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

// Who may unlock locked records (signed Section 2 forms, submitted Section 4
// notes and care plans): HOPE_it or HOPE_level1. Display-only; the backend
// (middleware/signedFormUnlock.js) enforces it.
export const canUnlockLockedRecords = (account) => {
  const groups = account?.idTokenClaims?.groups || [];
  return isAdminAccount(account) || groups.includes(GROUP_MAPPINGS.HOPE_level1);
};

// Admin > Audit Trail: IT Admin or Level 1. The rest of the admin console
// stays IT Admin only. Must stay in sync with requireAuditAccess
// (middleware/signedFormUnlock.js) on /api/admin/audit.
export const canViewAuditTrail = (account) => canUnlockLockedRecords(account);

// Admin > Behavioral Health (Sections 1-4) and Admin > Nursing (Section 5)
// documentation reports: IT Admin sees both; HOPE_behavioral_admin and
// HOPE_nursing_admin each see their own. Display-only; the backend
// (middleware/documentationAccess.js) enforces it.
export const DOCUMENTATION_REPORT_GROUPS = {
  behavioral: GROUP_MAPPINGS.HOPE_behavioral_admin,
  nursing: GROUP_MAPPINGS.HOPE_nursing_admin,
};

export const canViewDocumentationReport = (account, area) => {
  if (isAdminAccount(account)) return true;
  const groupId = DOCUMENTATION_REPORT_GROUPS[area];
  return !!groupId && (account?.idTokenClaims?.groups || []).includes(groupId);
};

export const canViewNursingReport = (account) => canViewDocumentationReport(account, 'nursing');
export const canViewBehavioralReport = (account) => canViewDocumentationReport(account, 'behavioral');

// Who may open the /admin console at all: anyone with at least one page in it
export const canOpenAdminConsole = (account) =>
  canViewAuditTrail(account) || canViewNursingReport(account) || canViewBehavioralReport(account);

export const ROLE_DISPLAY_NAMES = {
  IT_ADMIN: 'IT Administrator',
  LEVEL1: 'Level 1 Staff',
  CASE_MANAGER: 'Case Manager',
  NURSE: 'Nurse',
  AUDITOR: 'Auditor',
  READONLY: 'Read Only User',
};
// Care team pickers on the client profile: the behavioral and medical person
// assigned to a client are chosen from the members of these Entra groups
// (Microsoft Graph, GroupMember.Read.All). Add group IDs to widen a list.
export const CARE_TEAM_GROUPS = {
  behavioral: [GROUP_MAPPINGS.HOPE_case],
  medical: [GROUP_MAPPINGS.HOPE_nursing],
};
