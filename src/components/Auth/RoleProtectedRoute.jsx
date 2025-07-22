import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Button } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

const RoleProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [],
  fallback = null 
}) => {
  const { userRoles, permissions, isLoadingGroups } = useSelector(state => state.azureAuth);

  // Show loading while groups are being fetched
  if (isLoadingGroups) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading permissions...</Typography>
      </Box>
    );
  }

  // Check if user has required roles
  const hasRequiredRole = requiredRoles.length === 0 || 
    requiredRoles.some(role => userRoles.includes(role));

  // Check if user has required permissions
  const hasRequiredPermission = requiredPermissions.length === 0 ||
    requiredPermissions.some(permission => permissions.includes(permission));

  // If user doesn't have access, show fallback or default message
  if (!hasRequiredRole || !hasRequiredPermission) {
    return fallback || (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="400px"
        textAlign="center"
      >
        <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          You don't have permission to access this section.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Required roles: {requiredRoles.join(', ') || 'None'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Required permissions: {requiredPermissions.join(', ') || 'None'}
        </Typography>
      </Box>
    );
  }

  return children;
};

export default RoleProtectedRoute;