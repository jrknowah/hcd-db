// src/hooks/useMenuItems.js
//
// Returns the sidebar menu filtered for the current user's role.
// Drop-in replacement in the sidebar component:
//
//   - import Menuitems from './MenuItems';
//   + import useMenuItems from 'src/hooks/useMenuItems';
//     ...
//   + const Menuitems = useMenuItems();
//
// Everything downstream (.map, navlabel handling, children) is unchanged.

import { useMemo } from 'react';
import { useMsal } from '@azure/msal-react';
import Menuitems, { filterMenuItems } from 'src/layouts/full/vertical/sidebar/MenuItems';

// ⚠️ Must match the requiredRoles value used on the /admin route in App.jsx
// (<ProtectedRoute requiredRoles={['ITAdmin']}>) and the backend requireAdmin.
const ADMIN_ROLE = 'ITAdmin';

export function useIsAdmin() {
  const { accounts } = useMsal();
  const account = accounts[0];
  const roles = account?.idTokenClaims?.roles || [];
  return roles.includes(ADMIN_ROLE);
}

export default function useMenuItems() {
  const isAdmin = useIsAdmin();

  return useMemo(
    () => filterMenuItems(Menuitems, { isAdmin }),
    [isAdmin]
  );
}
