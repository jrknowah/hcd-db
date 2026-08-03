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
  // Administration — hidden entirely for non-admins.
  // These entries carry adminOnly: true and are stripped by filterMenuItems()
  // before render. The route guard (ProtectedAdminRoute) is the real boundary;
  // this only keeps a dead link out of the case manager's sidebar.
  // ---------------------------------------------------------------------------
  {
    navlabel: true,
    subheader: 'Administration',
    adminOnly: true,
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
    adminOnly: true,
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
 * is not an admin. Returns the array unchanged when isAdmin is true, so the
 * common path allocates nothing.
 */
export const filterMenuItems = (items, { isAdmin } = {}) => {
  if (isAdmin) return items;

  return items
    .filter((item) => !item.adminOnly)
    .map((item) =>
      item.children
        ? { ...item, children: item.children.filter((child) => !child.adminOnly) }
        : item
    );
};

export default Menuitems;
