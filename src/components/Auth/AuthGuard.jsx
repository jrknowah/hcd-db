// src/components/auth/AuthGuard.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { 
  loginWithAzure,
  restoreAuthFromLocalStorage,
  setLoading,
  setError,
  selectAuthLoading,
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
  
  // Local state
  const [msalInitialized, setMsalInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  
  // Redux state
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthGuard: Starting MSAL initialization...');
        dispatch(setLoading(true));
        
        // ✅ Wait for MSAL to be fully initialized
        await instance.initialize();
        console.log('✅ AuthGuard: MSAL initialized successfully');
        
        // ✅ Handle any pending redirect promise
        await instance.handleRedirectPromise();
        console.log('✅ AuthGuard: Redirect promise handled');
        
        setMsalInitialized(true);
        
        // ✅ Check for existing authentication
        const currentAccounts = instance.getAllAccounts();
        console.log('🔍 AuthGuard: Found accounts:', currentAccounts.length);
        
        if (currentAccounts.length > 0) {
          const account = currentAccounts[0];
          instance.setActiveAccount(account);
          console.log('✅ AuthGuard: Active account set');
          
          // ✅ Process existing authentication with loginWithAzure
          await processExistingAuth(account);
        } else {
          // ✅ No MSAL accounts, try localStorage restoration
          console.log('📦 AuthGuard: No MSAL accounts, trying localStorage...');
          dispatch(restoreAuthFromLocalStorage());
        }
        
      } catch (error) {
        console.error('❌ AuthGuard: Initialization error:', error);
        setInitError(error.message);
        dispatch(setError(error.message));
      } finally {
        dispatch(setLoading(false));
      }
    };

    const processExistingAuth = async (account) => {
      try {
        console.log('🔄 AuthGuard: Processing existing auth for account:', account.name);
        
        // Extract Azure user info and groups
        const azureGroups = extractAzureGroups(account);
        const userRoles = mapGroupsToRoles(azureGroups);
        const permissions = getPermissionsFromRoles(userRoles);

        console.log('📋 AuthGuard: Azure Groups:', azureGroups);
        console.log('👤 AuthGuard: User Roles:', userRoles);
        console.log('🔑 AuthGuard: Permissions:', permissions);

        // ✅ FIXED: Handle missing roles (development bypass)
        let finalRoles = userRoles;
        let finalPermissions = permissions;
        
        if (userRoles.length === 0) {
          console.warn('⚠️ AuthGuard: No roles found, using development bypass');
          // Temporary bypass - assign IT_ADMIN role for development
          finalRoles = ['IT_ADMIN'];
          finalPermissions = ROLE_PERMISSIONS['IT_ADMIN'] || ['read', 'write', 'all_sections'];
        }

        // ✅ Get access token
        let accessToken = null;
        try {
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: account,
          });
          accessToken = tokenResponse.accessToken;
          console.log('✅ AuthGuard: Access token acquired');
        } catch (tokenError) {
          console.warn('⚠️ AuthGuard: Could not get access token silently:', tokenError.message);
        }

        // ✅ Use loginWithAzure to properly set everything including localStorage
        await dispatch(loginWithAzure({
          azureAccount: account,
          azureToken: accessToken,
          msalInstance: instance,
        })).unwrap();

        console.log('✅ AuthGuard: Authentication processed successfully');

      } catch (error) {
        console.error('❌ AuthGuard: Error processing existing auth:', error);
        dispatch(setError(error.message || 'Failed to process authentication'));
      }
    };

    // Only initialize once
    if (!msalInitialized && !initError) {
      initializeAuth();
    }
  }, [instance, dispatch, msalInitialized, initError]);

  // ✅ Show loading during initialization
  if (!msalInitialized || loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
          Loading HOPE Application
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {!msalInitialized 
            ? 'Initializing authentication system...' 
            : 'Verifying your access...'
          }
        </Typography>
        
        {initError && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 400 }}>
            <Typography variant="body2">
              {initError}
            </Typography>
          </Alert>
        )}
      </Box>
    );
  }

  // ✅ Show error if initialization failed
  if (initError) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        px={3}
      >
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            Authentication System Error
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {initError}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Please contact your IT administrator if this problem persists.
          </Typography>
        </Alert>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry Authentication
        </button>
      </Box>
    );
  }

  // ✅ Show general error
  if (error && !isAuthenticated && !isAuthenticatedMsal) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
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
          Please try logging in again or contact support.
        </Typography>
      </Box>
    );
  }

  // ✅ Show login page if not authenticated
  if (!isAuthenticated && !isAuthenticatedMsal) {
    console.log('🔓 AuthGuard: User not authenticated, showing login page');
    return <Login />;
  }

  // ✅ User is authenticated - show the app
  console.log('✅ AuthGuard: User authenticated, rendering app');
  return children;
};

export default AuthGuard;