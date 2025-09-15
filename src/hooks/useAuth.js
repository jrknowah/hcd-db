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
      
      // Trigger MSAL login
      const loginResponse = await instance.loginPopup({
        scopes: ['User.Read', 'openid', 'profile', 'email'],
        prompt: 'select_account'
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

  // Logout function (local function, not imported)
  const logoutUser = async () => {
    try {
      // Clear Redux state
      dispatch(logout()); // ✅ Using the 'logout' action from authSlice
      
      // Clear MSAL session
      await instance.logoutPopup();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if MSAL logout fails, clear local state
      dispatch(logout());
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