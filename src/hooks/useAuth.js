// hooks/useAuth.js
import { useDispatch, useSelector } from 'react-redux';
import { useMsal } from '@azure/msal-react';
import { 
  loginWithAzure,
  logout, // ✅ Correct: just 'logout', not 'logoutUser'
  setLoading,
  setError,
  selectIsAuthenticated,
  selectUser,
  selectUserRoles,
  selectPermissions,
  selectAuthLoading,
  selectAuthError,
  selectIsLoadingGroups
} from '../backend/store/slices/authSlice';
import { msalConfig } from '../backend/config/authConfig';
import { broadcastLogout } from '../utils/secureSession';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { instance, accounts } = useMsal();
  
  // Get auth state from Redux
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const userRoles = useSelector(selectUserRoles);
  const permissions = useSelector(selectPermissions);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isLoadingGroups = useSelector(selectIsLoadingGroups);

  // Login function
  const login = async () => {
  try {
    dispatch(setLoading(true));
    
    // ✅ Request Graph API consent during login
    const loginResponse = await instance.loginPopup({
      scopes: [
        'User.Read',           // Read user profile
        'User.ReadBasic.All',  // Read other users (optional)
        'openid',
        'profile', 
        'email'
      ],
      prompt: 'select_account'  // This ensures consent screen shows
    });

    if (loginResponse.account) {
      instance.setActiveAccount(loginResponse.account);
      
      // Process with Redux
      await dispatch(loginWithAzure({
        azureAccount: loginResponse.account,
        azureToken: loginResponse.accessToken,
        msalInstance: instance
      })).unwrap();
      
      return loginResponse.account;
    }
  } catch (error) {
    console.error('Login failed:', error);
    dispatch(setError(error.message));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

  // Logout: wipe all client data and auth state from memory and web storage,
  // tell other open tabs to do the same, then end the Microsoft session.
  const logoutUser = async () => {
    const account = instance.getActiveAccount() || accounts[0] || null;

    // Root reducer resets the whole store on this action (see clientScope.js).
    dispatch(logout());
    broadcastLogout();

    try {
      await instance.logoutRedirect({
        account,
        logoutHint: account?.idTokenClaims?.login_hint,
        postLogoutRedirectUri: msalConfig.auth.redirectUri,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Microsoft sign-out failed (e.g. offline): still drop the local MSAL
      // session so this browser cannot re-enter without signing in.
      try {
        await instance.clearCache({ account });
      } finally {
        window.location.assign('/');
      }
    }
  };

  return {
    // State
    isAuthenticated,
    user,
    userRoles,
    permissions,
    loading,
    error,
    isLoadingGroups,
    
    // Actions
    login,
    logout: logoutUser, // ✅ logoutUser is a local function, not imported
    
    // MSAL data
    msalAccounts: accounts,
    msalInstance: instance
  };
};