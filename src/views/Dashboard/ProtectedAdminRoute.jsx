// components/ProtectedAdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { isAdminAccount } from '../../backend/config/groupConfig';

export function ProtectedAdminRoute({ children }) {
  const { accounts } = useMsal();
  const account = accounts[0];
  const isAdmin = isAdminAccount(account);

  if (!account) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}