// components/ProtectedAdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';

export function ProtectedAdminRoute({ children }) {
  const { accounts } = useMsal();
  const account = accounts[0];

  const roles = account?.idTokenClaims?.roles || [];
  const isAdmin = roles.includes('ITAdmin');

  if (!account) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
}