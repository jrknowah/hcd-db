import { uniqueId } from 'lodash';


const Menuitems = [
  {
    navlabel: true,
    subheader: 'Home',
  },

  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: 'solar:home-smile-linear',
    href: '/dashboard',
  },

  {
    navlabel: true,
    subheader: 'Intake',
  },
  {
    id: uniqueId(),
    title: 'Charts',
    icon: 'solar:align-left-linear',
    href: '/menulevel/',
    
    children: [
      {
        id: uniqueId(),
        title: 'Section 1',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section1',
      },
      {
        id: uniqueId(),
        title: 'Section 2',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section2',
      },
      {
        id: uniqueId(),
        title: 'Section 3',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section3',
      },
      {
        id: uniqueId(),
        title: 'Section 4',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section4',
      },
      {
        id: uniqueId(),
        title: 'Section 5',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section5',
      },
      {
        id: uniqueId(),
        title: 'Section 6',
        icon: 'solar:stop-circle-line-duotone',
        href: '/Section6',  
      },
      
    
    ],
  },

  // ---------------------------------------------------------------------------
  // Administration — hidden entirely for staff without access.
  // adminOnly entries are IT Admin only; auditAccess entries are also shown to
  // Level 1; reportArea entries to that area's admin group (HOPE_nursing_admin /
  // HOPE_behavioral_admin). filterMenuItems() strips them before render. The /admin route
  // guards in App.jsx are the real boundary; this only keeps dead links out
  // of the case manager's sidebar.
  // ---------------------------------------------------------------------------
  {
    navlabel: true,
    subheader: 'Administration',
    anyAdminPage: true,
  },
  {
    id: uniqueId(),
    title: 'System Errors',
    icon: 'solar:bug-minimalistic-linear',
    href: '/admin/errors',
    adminOnly: true,
  },
  {
    id: uniqueId(),
    title: 'Audit Trail',
    icon: 'solar:history-linear',
    href: '/admin/audit',
    auditAccess: true,
  },
  {
    id: uniqueId(),
    title: 'Behavioral Health (S1–4)',
    icon: 'solar:clipboard-check-linear',
    href: '/admin/behavioral',
    reportArea: 'behavioral',
  },
  {
    id: uniqueId(),
    title: 'Nursing (S5)',
    icon: 'solar:health-linear',
    href: '/admin/nursing',
    reportArea: 'nursing',
  },
  {
    id: uniqueId(),
    title: 'Reports & Analytics',
    icon: 'solar:chart-square-linear',
    href: '/admin/analytics',
    adminOnly: true,
  },
];

/**
 * Strips adminOnly entries (and any adminOnly children) when the current user
 * is not an admin, auditAccess entries when they can't view the audit trail,
 * reportArea entries when they can't view that report, and the Administration
 * heading when none of those are left. Returns the array unchanged for
 * admins, so the common path allocates nothing.
 */
export const filterMenuItems = (items, {
  isAdmin, canViewAudit, canViewNursing, canViewBehavioral,
} = {}) => {
  if (isAdmin) return items;

  const reports = { nursing: !!canViewNursing, behavioral: !!canViewBehavioral };
  const anyAdminPage = !!canViewAudit || reports.nursing || reports.behavioral;
  const visible = (item) => !item.adminOnly
    && (!item.auditAccess || canViewAudit)
    && (!item.reportArea || reports[item.reportArea])
    && (!item.anyAdminPage || anyAdminPage);
  return items
    .filter(visible)
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter(visible) }
        : item
    );
};

export default Menuitems;
