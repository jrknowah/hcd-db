export const GROUP_MAPPINGS = {
  // ✅ Your actual IT group from Azure AD
  'HOPE_it': '5937eaf5-1e32-4fcc-b2a6-2cc6e518ddd6',        // Your IT group -> IT Admin
  
  // Keep the original IDs for future use (in case other groups are created later)
  'HOPE_case': '59b40286-56c6-4b1e-8de2-854c7d91179b',
  'HOPE_nursing': '51b04727-a548-4769-8227-4b055427a9ac',
  'HOPE_level1': 'f47eca14-0206-4719-91c7-fba7b2be382c',
  'HOPE_audit': 'fec5c917-431c-4663-85b2-efc9e9053e96',
  'HOPE_readonly': 'e95d2a7a-0390-414e-92bd-26fb5b745acf',
};

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
    'section1', 'section2', 'section3', 'section4', 'section5'
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
  NURSE: ['section1', 'section2', 'section3', 'section4', 'section5'],
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
export const ROLE_DISPLAY_NAMES = {
  IT_ADMIN: 'IT Administrator',
  LEVEL1: 'Level 1 Staff',
  CASE_MANAGER: 'Case Manager',
  NURSE: 'Nurse',
  AUDITOR: 'Auditor',
  READONLY: 'Read Only User',
};