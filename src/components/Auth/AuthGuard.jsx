// src/components/auth/AuthGuard.jsx
import React, { useEffect, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { 
  setAzureUser,
  setLoading,
  setLoadingGroups,
  setError,
  selectAuthLoading,
  selectIsLoadingGroups,
  selectAuthError,
  selectIsAuthenticated,
} from '../../store/slices/authSlice';
import { GROUP_TO_ROLE, ROLE_PERMISSIONS } from '../../config/groupConfig';
import Login from '../../views/authentication/auth1/Login';

// Helper functions
const extractAzureGroups = (account) => {
  if (account?.idTokenClaims?.groups) {
    return account.idTokenClaims.groups.map(groupId => ({ id: groupId }));
  }
  return [];
};

const mapGroupsToRoles = (groups) => {
  return groups
    .map(group => GROUP_TO_ROLE[group.id])
    .filter(Boolean);
};

const getPermissionsFromRoles = (roles) => {
  return roles
    .flatMap(role => ROLE_PERMISSIONS[role] || [])
    .filter((permission, index, array) => array.indexOf(permission) === index);
};

const AuthGuard = ({ children }) => {
  const { instance, accounts } = useMsal();
  const isAuthenticatedMsal = useIsAuthenticated();
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Get loading states from Redux
  const loading = useSelector(selectAuthLoading);
  const isLoadingGroups = useSelector(selectIsLoadingGroups);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    const initializeAuth = async () => {
      dispatch(setLoading(true));
      
      try {
        // Handle redirect promise (important for redirect flow)
        await instance.handleRedirectPromise();
        
        // Get current accounts
        const currentAccounts = instance.getAllAccounts();
        
        if (currentAccounts.length > 0) {
          const account = currentAccounts[0];
          instance.setActiveAccount(account);
          
          // Load user groups and permissions
          await loadUserGroupsAndPermissions(account);
        } else {
          // No accounts found - user needs to login
          console.log('No accounts found, user needs to login');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch(setError(error.message || 'Authentication initialization failed'));
      } finally {
        dispatch(setLoading(false));
        setIsInitializing(false);
      }
    };

    const loadUserGroupsAndPermissions = async (account) => {
      dispatch(setLoadingGroups(true));
      
      try {
        // Extract Azure user info and groups
        const azureGroups = extractAzureGroups(account);
        const userRoles = mapGroupsToRoles(azureGroups);
        const permissions = getPermissionsFromRoles(userRoles);

        console.log('Azure Groups:', azureGroups);
        console.log('User Roles:', userRoles);
        console.log('Permissions:', permissions);

        // Check if user has any valid roles
        if (userRoles.length === 0) {
          throw new Error('Your account is not assigned to any HOPE groups. Please contact your administrator.');
        }

        // Prepare user data
        const userData = {
          azureId: account.localAccountId,
          name: account.name,
          email: account.username,
          displayName: account.name,
          groups: azureGroups.map(g => g.id),
          roles: userRoles,
          permissions: permissions,
        };

        // Update Redux state using setAzureUser
        dispatch(setAzureUser({
          user: userData,
          token: null, // Will be set when we get access token
          azureGroups,
          userRoles,
          permissions,
          msalInstance: instance,
        }));

        console.log('User authenticated successfully:', userData);

      } catch (error) {
        console.error('Error loading groups:', error);
        dispatch(setError(error.message || 'Failed to load user permissions'));
      } finally {
        dispatch(setLoadingGroups(false));
      }
    };

    // Only initialize if we haven't already
    if (isInitializing) {
      initializeAuth();
    }
  }, [instance, dispatch, isInitializing]);

  // Show loading spinner during initialization
  if (isInitializing || loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Initializing HOPE...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Checking authentication status
        </Typography>
      </Box>
    );
  }

  // Show loading while groups are being fetched
  if ((isAuthenticated || isAuthenticatedMsal) && isLoadingGroups) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading permissions...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Verifying your access to HOPE
        </Typography>
      </Box>
    );
  }

  // Show error if authentication failed
  if (error && !isAuthenticated && !isAuthenticatedMsal) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="background.default"
        px={3}
      >
        <Alert severity="error" sx={{ mb: 3, maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>
            Authentication Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Please contact your IT administrator if this problem persists.
        </Typography>
      </Box>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated && !isAuthenticatedMsal) {
    return <Login />;
  }

  // User is authenticated and permissions are loaded - show the app
  return children;
};

export default AuthGuard;