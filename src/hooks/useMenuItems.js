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
import { isAdminAccount } from 'src/backend/config/groupConfig';

// Same check as the /admin route guard (<ProtectedRoute adminOnly>) in App.jsx.
export function useIsAdmin() {
  const { accounts } = useMsal();
  return isAdminAccount(accounts[0]);
}

export default function useMenuItems() {
  const isAdmin = useIsAdmin();

  return useMemo(
    () => filterMenuItems(Menuitems, { isAdmin }),
    [isAdmin]
  );
}
