// services/azureProfileService.js - Updated for your auth setup
class AzureProfileService {
  constructor() {
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get access token from your Redux store
   */
  // In azureProfileService.js, update the getAccessToken method:
// In azureProfileService.js
// Update the getAccessToken method to handle token refresh:
// In azureProfileService.js, replace the getAccessToken method:
// In azureProfileService.js

async getAccessToken() {
  try {
    // Always prioritize MSAL for fresh tokens
    if (window.msalInstance) {
      const accounts = window.msalInstance.getAllAccounts();
      
      if (accounts && accounts.length > 0) {
        try {
          // Try silent token acquisition with fresh token
          const tokenResponse = await window.msalInstance.acquireTokenSilent({
            scopes: ['User.Read', 'User.ReadBasic.All'],
            account: accounts[0],
            forceRefresh: false
          });
          
          console.log('🔑 Fresh token acquired from MSAL');
          
          // Store in Redux for other components
          const store = window.__REDUX_STORE__;
          if (store) {
            store.dispatch({
              type: 'auth/updateToken',
              payload: tokenResponse.accessToken
            });
          }
          
          return tokenResponse.accessToken;
          
        } catch (silentError) {
          console.warn('⚠️ Silent token failed:', silentError.errorCode);
          
          // Handle specific error codes
          if (silentError.errorCode === 'consent_required' || 
              silentError.errorCode === 'interaction_required' ||
              silentError.errorCode === 'login_required') {
            
            console.log('🔄 Attempting interactive token acquisition...');
            
            try {
              const tokenResponse = await window.msalInstance.acquireTokenPopup({
                scopes: ['User.Read', 'User.ReadBasic.All'],
                prompt: 'none'
              });
              
              // Store new token
              const store = window.__REDUX_STORE__;
              if (store) {
                store.dispatch({
                  type: 'auth/updateToken',
                  payload: tokenResponse.accessToken
                });
              }
              
              return tokenResponse.accessToken;
              
            } catch (popupError) {
              console.error('❌ Interactive token failed:', popupError);
              throw new Error('Authentication required. Please log in again.');
            }
          }
          
          throw silentError;
        }
      }
    }
    
    throw new Error('No MSAL instance or accounts available');
    
  } catch (error) {
    console.error('❌ Token acquisition failed:', error);
    
    // Clear expired data and force re-login
    this.clearCache();
    
    // Notify user they need to log in again
    const store = window.__REDUX_STORE__;
    if (store) {
      store.dispatch({ type: 'auth/clearAuth' });
    }
    
    throw new Error('Session expired. Please log in again.');
  }
}

async makeGraphRequest(endpoint, options = {}) {
  try {
    // Always get fresh token before making request
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    // Handle 401 specifically
    if (response.status === 401) {
      console.warn('⚠️ Got 401, clearing cache and throwing error');
      this.clearCache();
      throw new Error('Authentication failed. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
    }

    return response;
    
  } catch (error) {
    console.error('❌ Microsoft Graph request failed:', error);
    
    // If it's an auth error, clear everything
    if (error.message.includes('Authentication') || error.message.includes('401')) {
      this.clearCache();
      const store = window.__REDUX_STORE__;
      if (store) {
        store.dispatch({ type: 'auth/clearAuth' });
      }
    }
    
    throw error;
  }
}

  /**
   * Get current user's profile information
   */
  async getUserProfile() {
    const cacheKey = 'userProfile';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached user profile');
      return cached;
    }

    try {
      console.log('🔍 Fetching user profile from Microsoft Graph...');
      
      const response = await this.makeGraphRequest('/me');
      const profileData = await response.json();
      
      const profile = {
        // ✅ Basic Info
        id: profileData.id,
        displayName: profileData.displayName,
        givenName: profileData.givenName,
        surname: profileData.surname,
        mail: profileData.mail || profileData.userPrincipalName,
        userPrincipalName: profileData.userPrincipalName,
        
        // ✅ Work Info (this is what you want to display)
        jobTitle: profileData.jobTitle,
        department: profileData.department,
        officeLocation: profileData.officeLocation,
        companyName: profileData.companyName,
        
        // ✅ Contact Info
        businessPhones: profileData.businessPhones || [],
        mobilePhone: profileData.mobilePhone,
        
        // ✅ Other Info
        preferredLanguage: profileData.preferredLanguage,
        employeeId: profileData.employeeId,
        
        // ✅ Computed fields for display
        initials: this.getInitials(profileData.displayName),
        shortName: this.getShortName(profileData.displayName),
        fullLocation: this.getFullLocation(profileData),
        
        // ✅ Metadata
        lastFetched: new Date().toISOString()
      };
      
      this.setCached(cacheKey, profile);
      console.log('✅ User profile loaded from Microsoft Graph:', {
        name: profile.displayName,
        jobTitle: profile.jobTitle,
        department: profile.department,
        office: profile.officeLocation
      });
      
      return profile;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Get user's profile photo from Microsoft Graph
   */
  async getUserPhoto() {
    const cacheKey = 'userPhoto';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      console.log('📋 Using cached user photo');
      return cached;
    }

    try {
      console.log('🖼️ Fetching user photo from Microsoft Graph...');
      
      const response = await this.makeGraphRequest('/me/photo/$value');
      const photoBlob = await response.blob();
      const photoUrl = URL.createObjectURL(photoBlob);
      
      this.setCached(cacheKey, photoUrl);
      console.log('✅ User photo loaded from Microsoft Graph');
      
      return photoUrl;
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('ImageNotFound')) {
        console.log('ℹ️ No profile photo available in Microsoft Graph');
        return null;
      }
      console.error('❌ Error fetching user photo:', error);
      return null; // Return null instead of throwing for photos
    }
  }

  /**
   * Get user's manager information
   */
  async getUserManager() {
    const cacheKey = 'userManager';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      console.log('👔 Fetching user manager from Microsoft Graph...');
      
      const response = await this.makeGraphRequest('/me/manager');
      const managerData = await response.json();
      
      const manager = {
        id: managerData.id,
        displayName: managerData.displayName,
        mail: managerData.mail,
        jobTitle: managerData.jobTitle,
        department: managerData.department,
        officeLocation: managerData.officeLocation
      };
      
      this.setCached(cacheKey, manager);
      console.log('✅ User manager loaded:', manager.displayName);
      
      return manager;
    } catch (error) {
      if (error.message.includes('404')) {
        console.log('ℹ️ No manager information available');
        return null;
      }
      console.error('❌ Error fetching user manager:', error);
      return null;
    }
  }

  /**
   * Get user's Azure AD groups (your auth slice already has this, but this gets detailed info)
   */
  async getUserGroups() {
    const cacheKey = 'userGroupsDetailed';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      console.log('👥 Fetching detailed user groups from Microsoft Graph...');
      
      const response = await this.makeGraphRequest('/me/memberOf?$select=id,displayName,description,mail');
      const groupsData = await response.json();
      
      const groups = groupsData.value
        .filter(group => group['@odata.type'] === '#microsoft.graph.group')
        .map(group => ({
          id: group.id,
          displayName: group.displayName,
          description: group.description,
          mail: group.mail
        }));
      
      this.setCached(cacheKey, groups);
      console.log('✅ Detailed user groups loaded:', groups.length, 'groups');
      
      return groups;
    } catch (error) {
      console.error('❌ Error fetching detailed user groups:', error);
      return [];
    }
  }

  /**
   * Get complete user context for profile display
   */
  async getCompleteUserContext() {
    try {
      console.log('🔄 Loading complete user context for profile...');
      
      // ✅ Load profile and photo in parallel for better performance
      const [profileResult, photoResult] = await Promise.allSettled([
        this.getUserProfile(),
        this.getUserPhoto()
      ]);

      const context = {
        profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
        photo: photoResult.status === 'fulfilled' ? photoResult.value : null,
        loadedAt: new Date().toISOString(),
        errors: []
      };

      // ✅ Collect any errors
      if (profileResult.status === 'rejected') {
        context.errors.push(`Profile: ${profileResult.reason.message}`);
      }
      if (photoResult.status === 'rejected') {
        context.errors.push(`Photo: ${photoResult.reason.message}`);
      }

      console.log('✅ Complete user context loaded:', {
        hasProfile: !!context.profile,
        hasPhoto: !!context.photo,
        errors: context.errors.length
      });
      
      return context;
    } catch (error) {
      console.error('❌ Error loading complete user context:', error);
      throw error;
    }
  }

  /**
   * Helper methods for display formatting
   */
  getInitials(displayName) {
    if (!displayName) return '??';
    return displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getShortName(displayName) {
    if (!displayName) return 'User';
    const parts = displayName.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  getFullLocation(profileData) {
    const parts = [];
    if (profileData.officeLocation) parts.push(profileData.officeLocation);
    if (profileData.department && !parts.includes(profileData.department)) {
      parts.push(profileData.department);
    }
    if (profileData.companyName && !parts.some(p => p.includes(profileData.companyName))) {
      parts.push(profileData.companyName);
    }
    return parts.join(' • ') || null;
  }

  /**
   * Cache management
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    console.log('🧹 Azure profile cache cleared');
  }

  /**
   * Integration with your auth slice
   */
  async refreshUserProfileInRedux() {
    try {
      const context = await this.getCompleteUserContext();
      
      // ✅ You can dispatch to your auth slice if needed
      const store = window.store || window.__REDUX_STORE__;
      if (store && context.profile) {
        // Dispatch an action to update user profile in Redux
        store.dispatch({
          type: 'auth/updateUserProfile',
          payload: {
            azureProfile: context.profile,
            azurePhoto: context.photo
          }
        });
      }
      
      return context;
    } catch (error) {
      console.error('❌ Error refreshing user profile in Redux:', error);
      throw error;
    }
  }
}

// ============================================================================
// React Hook for easy component integration
// ============================================================================

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

export const useAzureProfile = () => {
  const [profile, setProfile] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Fix: Use correct Redux state paths
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const authToken = useSelector(state => state.auth.azureToken); // Changed from state.auth.token
  const authUser = useSelector(state => state.auth.user);

  // In azureProfileService.js, update useAzureProfile:

  const loadProfile = async () => {
    if (!isAuthenticated || !authToken) {
      console.log('⚠️ User not authenticated, skipping profile load');
      setProfile(null);
      setPhoto(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading Azure profile for authenticated user...');
      const context = await azureProfileService.getCompleteUserContext();
      
      setProfile(context.profile);
      setPhoto(context.photo);
      
      if (context.errors.length > 0) {
        console.warn('⚠️ Some profile data failed to load:', context.errors);
        
        // If errors include auth failures, show message to user
        const hasAuthError = context.errors.some(e => 
          e.includes('token') || e.includes('Authentication') || e.includes('401')
        );
        
        if (hasAuthError) {
          setError('Your session has expired. Please refresh the page to log in again.');
        }
      }
    } catch (err) {
      console.error('❌ Error in useAzureProfile:', err);
      
      // Check if it's an auth error
      if (err.message.includes('token') || err.message.includes('Authentication')) {
        setError('Session expired. Please refresh the page to log in again.');
      } else {
        setError(err.message);
      }
      
      // ✅ Fallback to auth slice user data
      if (authUser) {
        console.log('📋 Using fallback user data from auth slice');
        setProfile({
          displayName: authUser.name,
          mail: authUser.email,
          jobTitle: authUser.jobTitle,
          officeLocation: authUser.officeLocation,
          department: authUser.department,
          initials: azureProfileService.getInitials(authUser.name),
          shortName: azureProfileService.getShortName(authUser.name)
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load profile when authentication changes
  useEffect(() => {
    loadProfile();
  }, [isAuthenticated, authToken]);

  return {
    profile,
    photo,
    loading,
    error,
    reload: loadProfile,
    clearCache: () => azureProfileService.clearCache(),
    // Helper methods for display
    getDisplayName: () => profile?.displayName || authUser?.name || 'User',
    getJobTitle: () => profile?.jobTitle || authUser?.jobTitle || null,
    getOfficeLocation: () => profile?.officeLocation || authUser?.officeLocation || null,
    getInitials: () => profile?.initials || azureProfileService.getInitials(authUser?.name) || '??'
  };
};

// Export singleton instance
export const azureProfileService = new AzureProfileService();

export default azureProfileService;