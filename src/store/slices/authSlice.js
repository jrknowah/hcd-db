// ============================================================================
// Updated Auth Slice with Azure AD Integration (src/store/slices/authSlice.js)
// ============================================================================
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { createSelector } from '@reduxjs/toolkit';
// ✅ FIXED: Changed 'groupConfig' to 'groupsConfig' (added 's')
import { GROUP_TO_ROLE, ROLE_PERMISSIONS, hasAccessToSection } from '../../config/groupConfig';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

// ============================================================================
// Azure AD Integration Helper Functions
// ============================================================================

// Helper to extract groups from Azure account
const extractAzureGroups = (account) => {
  if (account?.idTokenClaims?.groups) {
    return account.idTokenClaims.groups.map(groupId => ({ id: groupId }));
  }
  return [];
};

// Helper to map Azure groups to app roles
const mapGroupsToRoles = (groups) => {
  return groups
    .map(group => GROUP_TO_ROLE[group.id])
    .filter(Boolean); // Remove undefined values
};

// Helper to get permissions from roles
const getPermissionsFromRoles = (roles) => {
  return roles
    .flatMap(role => ROLE_PERMISSIONS[role] || [])
    .filter((permission, index, array) => array.indexOf(permission) === index); // Remove duplicates
};

// ============================================================================
// API Axios Instance with Azure Token
// ============================================================================

// Create axios instance that automatically adds Azure token
const createAuthenticatedAxios = (azureToken) => {
  const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(azureToken && { 'Authorization': `Bearer ${azureToken}` }),
    },
  });

  // Add request interceptor to include token
  axiosInstance.interceptors.request.use(
    (config) => {
      if (azureToken) {
        config.headers.Authorization = `Bearer ${azureToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return axiosInstance;
};

// ============================================================================
// Async Thunks
// ============================================================================

// ✅ Fetch user data from your API using Azure token
export const fetchUserData = createAsyncThunk(
  'auth/fetchUserData',
  async (azureToken, { rejectWithValue }) => {
    try {
      const axiosInstance = createAuthenticatedAxios(azureToken);
      const response = await axiosInstance.get('/me');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch user data');
    }
  }
);

// ✅ Login with Azure token and sync with your backend
export const loginWithAzure = createAsyncThunk(
  'auth/loginWithAzure',
  async ({ azureAccount, azureToken, msalInstance }, { rejectWithValue }) => {
    try {
      // Extract Azure user info and groups
      const azureGroups = extractAzureGroups(azureAccount);
      const userRoles = mapGroupsToRoles(azureGroups);
      const permissions = getPermissionsFromRoles(userRoles);

      // Prepare user data for your backend
      const azureUserData = {
        azureId: azureAccount.localAccountId,
        name: azureAccount.name,
        email: azureAccount.username,
        groups: azureGroups.map(g => g.id),
        roles: userRoles,
        permissions: permissions,
      };

      // Send Azure token and user info to your backend for validation/sync
      const axiosInstance = createAuthenticatedAxios(azureToken);
      const response = await axiosInstance.post('/azure-login', {
        user: azureUserData,
        token: azureToken,
      });

      // Return combined data
      return {
        user: {
          ...azureUserData,
          ...response.data.user, // Merge with any additional data from your backend
        },
        token: azureToken,
        azureGroups,
        userRoles,
        permissions,
        msalInstance, // Store for token refresh
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Azure login failed');
    }
  }
);

// ✅ Refresh Azure token and sync with backend
export const refreshAzureToken = createAsyncThunk(
  'auth/refreshAzureToken',
  async ({ msalInstance, account }, { rejectWithValue }) => {
    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read', 'GroupMember.Read.All'],
        account: account,
      });

      return {
        token: response.accessToken,
        expiresOn: response.expiresOn,
      };
    } catch (error) {
      return rejectWithValue('Token refresh failed');
    }
  }
);

// ✅ Traditional login (fallback if needed)
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/login`, credentials);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Login failed');
    }
  }
);

// ✅ Logout user and clear Azure session
export const logoutUser = createAsyncThunk(
  'auth/logoutUser', 
  async (msalInstance, { rejectWithValue }) => {
    try {
      if (msalInstance) {
        await msalInstance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
        });
      }
      
      // Optional: Call your backend logout endpoint
      try {
        await axios.post(`${API_URL}/logout`);
      } catch (error) {
        // Backend logout failed, but continue with frontend logout
        console.warn('Backend logout failed:', error);
      }
      
      return null;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

// ============================================================================
// Auth Slice
// ============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    // User data
    user: null,
    token: null,
    isAuthenticated: false,
    
    // Azure-specific data
    azureGroups: [],
    userRoles: [],
    permissions: [],
    msalInstance: null,
    
    // Loading states
    loading: false,
    isLoadingGroups: false,
    
    // Error states
    error: null,
    groupsError: null,
    
    // Token management
    tokenExpiresOn: null,
  },
  reducers: {
    // ✅ Set user from Azure login
    setAzureUser: (state, action) => {
      const { user, token, azureGroups, userRoles, permissions, msalInstance } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.azureGroups = azureGroups;
      state.userRoles = userRoles;
      state.permissions = permissions;
      state.msalInstance = msalInstance;
      state.error = null;
    },
    
    // ✅ Traditional user setter (backwards compatibility)
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    
    // ✅ Update groups and permissions
    updateGroups: (state, action) => {
      const { azureGroups, userRoles, permissions } = action.payload;
      state.azureGroups = azureGroups;
      state.userRoles = userRoles;
      state.permissions = permissions;
    },
    
    // ✅ Update token
    updateToken: (state, action) => {
      state.token = action.payload.token;
      state.tokenExpiresOn = action.payload.expiresOn;
    },
    
    // ✅ Clear all auth data
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.azureGroups = [];
      state.userRoles = [];
      state.permissions = [];
      state.msalInstance = null;
      state.error = null;
      state.groupsError = null;
      state.tokenExpiresOn = null;
    },
    
    // ✅ Set loading states
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    setLoadingGroups: (state, action) => {
      state.isLoadingGroups = action.payload;
    },
    
    // ✅ Set errors
    setError: (state, action) => {
      state.error = action.payload;
    },
    
    setGroupsError: (state, action) => {
      state.groupsError = action.payload;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Azure login
      .addCase(loginWithAzure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithAzure.fulfilled, (state, action) => {
        state.loading = false;
        const { user, token, azureGroups, userRoles, permissions, msalInstance } = action.payload;
        state.user = user;
        state.token = token;
        state.isAuthenticated = true;
        state.azureGroups = azureGroups;
        state.userRoles = userRoles;
        state.permissions = permissions;
        state.msalInstance = msalInstance;
      })
      .addCase(loginWithAzure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Traditional login (backwards compatibility)
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch user data
      .addCase(fetchUserData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Token refresh
      .addCase(refreshAzureToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.tokenExpiresOn = action.payload.expiresOn;
      })
      .addCase(refreshAzureToken.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.azureGroups = [];
        state.userRoles = [];
        state.permissions = [];
        state.msalInstance = null;
        state.tokenExpiresOn = null;
      });
  },
});

// ============================================================================
// Actions Export (Updated)
// ============================================================================

export const { 
  setAzureUser,
  setUser, 
  clearAuth, 
  updateGroups,
  updateToken,
  setLoading,
  setLoadingGroups,
  setError,
  setGroupsError,
} = authSlice.actions;

// ============================================================================
// Selectors (Complete Set)
// ============================================================================

// ✅ Original selectors (backwards compatible)
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

// ✅ New Azure/Groups selectors
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAzureGroups = (state) => state.auth.azureGroups;
export const selectUserRoles = (state) => state.auth.userRoles;
export const selectPermissions = (state) => state.auth.permissions;
export const selectIsLoadingGroups = (state) => state.auth.isLoadingGroups;
export const selectGroupsError = (state) => state.auth.groupsError;
export const selectMsalInstance = (state) => state.auth.msalInstance;
export const selectTokenExpiresOn = (state) => state.auth.tokenExpiresOn;

// ✅ Helper selectors for role/permission checking
export const selectHasRole = (role) => (state) => 
  state.auth.userRoles?.includes(role) || false;

export const selectHasAnyRole = (roles) => (state) => 
  roles?.some(role => state.auth.userRoles?.includes(role)) || false;

export const selectHasPermission = (permission) => (state) => 
  state.auth.permissions?.includes(permission) || false;

export const selectHasAnyPermission = (permissions) => (state) => 
  permissions?.some(perm => state.auth.permissions?.includes(perm)) || false;

export const selectHasAccessToSection = (sectionName) => (state) => {
  const { userRoles } = state.auth;
  if (!userRoles) return false;
  return hasAccessToSection(userRoles, sectionName);
};

// ✅ Combined user info selector
export const selectUserProfile = (state) => ({
  user: state.auth.user,
  roles: state.auth.userRoles || [],
  permissions: state.auth.permissions || [],
  groups: state.auth.azureGroups || [],
  isAuthenticated: state.auth.isAuthenticated,
  loading: state.auth.loading,
  error: state.auth.error,
});

// ✅ Auth status selector
export const selectAuthStatus = (state) => ({
  isAuthenticated: state.auth.isAuthenticated,
  loading: state.auth.loading,
  isLoadingGroups: state.auth.isLoadingGroups,
  error: state.auth.error,
  groupsError: state.auth.groupsError,
});

export default authSlice.reducer;