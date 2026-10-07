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
  // Level 1. filterMenuItems() strips them before render. The /admin route
  // guards in App.jsx are the real boundary; this only keeps dead links out
  // of the case manager's sidebar.
  // ---------------------------------------------------------------------------
  {
    navlabel: true,
    subheader: 'Administration',
    auditAccess: true,
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
    title: 'Reports & Analytics',
    icon: 'solar:chart-square-linear',
    href: '/admin/analytics',
    adminOnly: true,
  },
];

/**
 * Strips adminOnly entries (and any adminOnly children) when the current user
 * is not an admin, and auditAccess entries when they can't view the audit
 * trail either. Returns the array unchanged for admins, so the common path
 * allocates nothing.
 */
export const filterMenuItems = (items, { isAdmin, canViewAudit } = {}) => {
  if (isAdmin) return items;

  const visible = (item) => !item.adminOnly && (!item.auditAccess || canViewAudit);
  return items
    .filter(visible)
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter(visible) }
        : item
    );
};

export default Menuitems;
