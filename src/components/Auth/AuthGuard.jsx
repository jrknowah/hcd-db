// src/components/auth/AuthGuard.jsx
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
} from '../../backend/store/slices/authSlice';
import { GROUP_TO_ROLE, ROLE_PERMISSIONS } from '../../backend/config/groupConfig';
import Login from '../../views/authentication/auth1/Login';

const extractAzureGroups = (account) => {
  if (account?.idTokenClaims?.groups) {
    return account.idTokenClaims.groups.map(groupId => ({ id: groupId }));
  }
  return [];
};

const mapGroupsToRoles = (groups) => {
  return groups.map(group => GROUP_TO_ROLE[group.id]).filter(Boolean);
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
  
  const [msalInitialized, setMsalInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthGuard: Starting MSAL initialization...');
        dispatch(setLoading(true));
        
        await instance.initialize();
        console.log('✅ AuthGuard: MSAL initialized successfully');
        
        await instance.handleRedirectPromise();
        console.log('✅ AuthGuard: Redirect promise handled');
        
        setMsalInitialized(true);
        
        const currentAccounts = instance.getAllAccounts();
        console.log('🔍 AuthGuard: Found accounts:', currentAccounts.length);
        
        if (currentAccounts.length > 0) {
          const account = currentAccounts[0];
          instance.setActiveAccount(account);
          console.log('✅ AuthGuard: Active account set');
          await processExistingAuth(account);
        } else {
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
        
        const azureGroups = extractAzureGroups(account);
        const userRoles = mapGroupsToRoles(azureGroups);
        const permissions = getPermissionsFromRoles(userRoles);

        console.log('📋 AuthGuard: Azure Groups:', azureGroups);
        console.log('👤 AuthGuard: User Roles:', userRoles);
        console.log('🔑 AuthGuard: Permissions:', permissions);

        // FAIL CLOSED — see the matching change in authSlice.js.
        // These values are computed for logging only (loginWithAzure recomputes
        // them from the account), but they must not imply a permissive default.
        const devBypass = import.meta.env.VITE_AUTH_DEV_BYPASS === 'true';

        let finalRoles = userRoles;
        let finalPermissions = permissions;

        if (userRoles.length === 0) {
          if (devBypass) {
            console.warn('⚠️ AuthGuard: DEV BYPASS ACTIVE — granting IT_ADMIN. Never enable in production.');
            finalRoles = ['IT_ADMIN'];
            finalPermissions = ROLE_PERMISSIONS['IT_ADMIN'] || [];
          } else {
            console.warn('🔒 AuthGuard: No mapped roles for this account (fail-closed).');
            finalRoles = [];
            finalPermissions = [];
          }
        }

        // Graph token (User.Read scope) — backend auth.js now accepts both
        // Graph audience (00000003-...) and app audience (0b3e6463-...).
        let accessToken = null;
        try {
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: ['User.Read'],
            account: account,
          });
          accessToken = tokenResponse.idToken;  // ID token is verifiable server-side; access tokens for Graph use nonce which breaks jwks-rsa
          console.log('✅ AuthGuard: Access token acquired');
        } catch (tokenError) {
          console.warn('⚠️ AuthGuard: Could not get access token silently:', tokenError.message);
        }

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

    if (!msalInitialized && !initError) {
      initializeAuth();
    }
  }, [instance, dispatch, msalInitialized, initError]);

  if (!msalInitialized || loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
      >
        <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>
          Loading HOPE Application
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {!msalInitialized ? 'Initializing authentication system...' : 'Verifying your access...'}
        </Typography>
        {initError && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 400 }}>
            <Typography variant="body2">{initError}</Typography>
          </Alert>
        )}
      </Box>
    );
  }

  if (initError) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" px={3}>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>Authentication System Error</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>{initError}</Typography>
          <Typography variant="caption" color="text.secondary">
            Please contact your IT administrator if this problem persists.
          </Typography>
        </Alert>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Retry Authentication
        </button>
      </Box>
    );
  }

  if (error && !isAuthenticated && !isAuthenticatedMsal) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" px={3}>
        <Alert severity="error" sx={{ mb: 3, maxWidth: 400 }}>
          <Typography variant="h6" gutterBottom>Authentication Error</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Please try logging in again or contact support.
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated && !isAuthenticatedMsal) {
    console.log('🔓 AuthGuard: User not authenticated, showing login page');
    return <Login />;
  }

  console.log('✅ AuthGuard: User authenticated, rendering app');
  return children;
};

export default AuthGuard;