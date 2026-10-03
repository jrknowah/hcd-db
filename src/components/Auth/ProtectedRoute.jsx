import React from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Navigate } from 'react-router-dom';
import { isAdminAccount } from '../../backend/config/groupConfig';
import Login from '../../views/authentication/auth1/Login';

const ProtectedRoute = ({ children, requiredRoles = [], adminOnly = false }) => {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();

  // There is no /login route — AuthGuard can let a user through on a session
  // restored from localStorage while MSAL has no account. Admin pages need an
  // MSAL account to get tokens, so show the Microsoft sign-in in place.
  if (!isAuthenticated) {
    return <Login />;
  }

  if (adminOnly && !isAdminAccount(accounts[0])) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Optional: Check user roles/permissions
  if (requiredRoles.length > 0) {
    const currentAccount = accounts[0];
    const userRoles = currentAccount?.idTokenClaims?.roles || [];
    
    const hasRequiredRole = requiredRoles.some(role => 
      userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;