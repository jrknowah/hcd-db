// src/hooks/useAuth.js
import { useSelector, useDispatch } from 'react-redux';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { 
  loginWithAzure, 
  logoutUser, 
  refreshAzureToken,
  clearAuth,
  setError,
  selectAuthUser,
  selectAuthToken,
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
  selectAzureGroups,
  selectUserRoles,
  selectPermissions,
  selectIsLoadingGroups,
} from '../store/slices/authSlice';
import { hasAccessToSection } from '../config/groupConfig';
import { loginRequest } from '../config/authConfig';

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticatedMsal = useIsAuthenticated();
  const dispatch = useDispatch();
  
  // Get state from Redux
  const user = useSelector(selectAuthUser);
  const token = useSelector(selectAuthToken);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const azureGroups = useSelector(selectAzureGroups);
  const userRoles = useSelector(selectUserRoles);
  const permissions = useSelector(selectPermissions);
  const isLoadingGroups = useSelector(selectIsLoadingGroups);

  // Update your login function in useAuth.js with debugging
const login = async () => {
  try {
    console.log('🔄 useAuth: Starting Azure login...');
    
    const response = await instance.loginPopup(loginRequest);
    console.log('✅ useAuth: Azure login response:', response);
    
    instance.setActiveAccount(response.account);
    
    console.log('🔄 useAuth: Dispatching loginWithAzure action...');
    console.log('📤 useAuth: Azure account data:', response.account);
    console.log('📤 useAuth: Azure token:', response.accessToken ? 'Present' : 'Missing');
    
    // Dispatch Azure login to Redux
    const result = await dispatch(loginWithAzure({
      azureAccount: response.account,
      azureToken: response.accessToken,
      msalInstance: instance,
    })).unwrap();
    
    console.log('✅ useAuth: loginWithAzure completed successfully:', result);
    console.log('🔍 useAuth: Checking localStorage after login...');
    console.log('📦 authToken:', localStorage.getItem('authToken'));
    console.log('📦 userSession:', localStorage.getItem('userSession'));
    
    return response;
  } catch (error) {
    console.error('❌ useAuth: Login error:', error);
    console.error('❌ useAuth: Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    dispatch(setError(error.message || 'Login failed'));
    throw error;
  }
};

  const logout = async () => {
    try {
      await dispatch(logoutUser(instance)).unwrap();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the async logout fails, clear the local state
      dispatch(clearAuth());
      throw error;
    }
  };

  const getAccessToken = async (scopes = loginRequest.scopes) => {
    if (!accounts[0]) return null;

    try {
      const response = await instance.acquireTokenSilent({
        scopes,
        account: accounts[0],
      });
      
      // Update token in Redux if it changed
      dispatch(refreshAzureToken({
        msalInstance: instance,
        account: accounts[0],
      }));
      
      return response.accessToken;
    } catch (error) {
      try {
        const response = await instance.acquireTokenPopup({
          scopes,
          account: accounts[0],
        });
        return response.accessToken;
      } catch (interactiveError) {
        console.error('Token acquisition failed:', interactiveError);
        return null;
      }
    }
  };

  // Helper functions for checking permissions
  const hasRole = (role) => {
    return userRoles?.includes(role) || false;
  };
  
  const hasAnyRole = (roles) => {
    if (!userRoles || !Array.isArray(roles)) return false;
    return roles.some(role => userRoles.includes(role));
  };
  
  const hasPermission = (permission) => {
    return permissions?.includes(permission) || false;
  };
  
  const hasAnyPermission = (perms) => {
    if (!permissions || !Array.isArray(perms)) return false;
    return perms.some(perm => permissions.includes(perm));
  };

  const hasAccessToSectionHelper = (sectionName) => {
    if (!userRoles) return false;
    return hasAccessToSection(userRoles, sectionName);
  };

  return {
    // Authentication state
    isAuthenticated: isAuthenticated || isAuthenticatedMsal,
    user: user || accounts[0],
    userRoles: userRoles || [],
    permissions: permissions || [],
    userGroups: azureGroups || [],
    token,
    
    // Loading states
    loading,
    error,
    isLoadingGroups,
    
    // Auth functions
    login,
    logout,
    getAccessToken,
    
    // Permission helpers
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    hasAccessToSection: hasAccessToSectionHelper,
  };
};