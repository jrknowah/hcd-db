import React from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Navigate } from 'react-router-dom';
import { isAdminAccount } from '../../backend/config/groupConfig';

const ProtectedRoute = ({ children, requiredRoles = [], adminOnly = false }) => {
  const isAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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