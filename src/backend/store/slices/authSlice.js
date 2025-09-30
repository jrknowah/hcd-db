// backend/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GROUP_TO_ROLE, ROLE_PERMISSIONS } from '../../config/groupConfig';

// Initial state
const initialState = {
  user: null,
  azureToken: null,
  userRoles: [],
  permissions: [],
  azureGroups: [],
  isAuthenticated: false,
  loading: false,
  error: null,
  isLoadingGroups: false,
};

// Helper function to safely parse JSON
const safeJSONParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

// ✅ Login with Azure (no API call needed)
export const loginWithAzure = createAsyncThunk(
  'auth/loginWithAzure',
  async ({ azureAccount, azureToken, msalInstance }, { rejectWithValue }) => {
    try {
      console.log('🔐 AuthSlice: Processing Azure login for:', azureAccount.name);
      
      // Extract groups from Azure account
      const azureGroups = azureAccount?.idTokenClaims?.groups || [];
      
      // Map groups to roles
      const userRoles = azureGroups
        .map(groupId => GROUP_TO_ROLE[groupId])
        .filter(Boolean);
      
      // Get permissions from roles
      const permissions = userRoles
        .flatMap(role => ROLE_PERMISSIONS[role] || [])
        .filter((permission, index, array) => array.indexOf(permission) === index);

      // If no roles, use default for development
      const finalRoles = userRoles.length > 0 ? userRoles : ['IT_ADMIN'];
      const finalPermissions = permissions.length > 0 ? permissions : ROLE_PERMISSIONS['IT_ADMIN'];

      // Create user object from Azure account
      const user = {
        id: azureAccount.homeAccountId,
        email: azureAccount.username,
        name: azureAccount.name,
        firstName: azureAccount.idTokenClaims?.given_name || '',
        lastName: azureAccount.idTokenClaims?.family_name || '',
        jobTitle: azureAccount.idTokenClaims?.jobTitle || '',
        officeLocation: azureAccount.idTokenClaims?.officeLocation || '',
        department: azureAccount.idTokenClaims?.department || '',
      };

      // Prepare auth data
      const authData = {
        user,
        azureToken: azureToken || 'no-token',
        userRoles: finalRoles,
        permissions: finalPermissions,
        azureGroups: azureGroups.map(id => ({ id })),
        isAuthenticated: true,
      };

      // Store in localStorage
      localStorage.setItem('authData', JSON.stringify(authData));
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userRoles', JSON.stringify(finalRoles));
      localStorage.setItem('permissions', JSON.stringify(finalPermissions));
      if (azureToken) {
        localStorage.setItem('azureToken', azureToken);
      }

      console.log('✅ AuthSlice: Login successful, user:', user);
      return authData;
      
    } catch (error) {
      console.error('❌ AuthSlice: Login error:', error);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// Create the slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setIsLoadingGroups: (state, action) => {
      state.isLoadingGroups = action.payload;
    },
    logout: (state) => {
      // Clear state
      Object.assign(state, initialState);
      
      // Clear all auth-related items from localStorage
      localStorage.removeItem('authData');
      localStorage.removeItem('azureToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRoles');
      localStorage.removeItem('permissions');
      localStorage.removeItem('azureGroups');
      
      console.log('🚪 AuthSlice: User logged out');
    },
    clearAuth: (state) => {
      // Alias for logout - same functionality
      Object.assign(state, initialState);
      localStorage.removeItem('authData');
      localStorage.removeItem('azureToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRoles');
      localStorage.removeItem('permissions');
      localStorage.removeItem('azureGroups');
    },
    restoreAuthFromLocalStorage: (state) => {
      try {
        // Try to restore from authData first (contains everything)
        const authData = localStorage.getItem('authData');
        if (authData) {
          const parsed = safeJSONParse(authData);
          if (parsed && parsed.user) {
            Object.assign(state, parsed);
            console.log('✅ AuthSlice: Restored from authData');
            return;
          }
        }

        // Fallback: Try to restore from individual items
        const user = safeJSONParse(localStorage.getItem('user'));
        const azureToken = localStorage.getItem('azureToken');
        const userRoles = safeJSONParse(localStorage.getItem('userRoles'), []);
        const permissions = safeJSONParse(localStorage.getItem('permissions'), []);
        const azureGroups = safeJSONParse(localStorage.getItem('azureGroups'), []);

        if (user && user.email) {
          state.user = user;
          state.azureToken = azureToken;
          state.userRoles = userRoles;
          state.permissions = permissions;
          state.azureGroups = azureGroups;
          state.isAuthenticated = true;
          state.error = null;
          console.log('✅ AuthSlice: Restored from individual localStorage items');
        } else {
          console.log('ℹ️ AuthSlice: No valid auth data in localStorage');
        }
      } catch (error) {
        console.error('❌ AuthSlice: Failed to restore from localStorage:', error);
        state.error = 'Failed to restore authentication';
      }
    },
    updateUserRoles: (state, action) => {
      state.userRoles = action.payload;
      localStorage.setItem('userRoles', JSON.stringify(action.payload));
      
      // Update permissions based on new roles
      const permissions = action.payload
        .flatMap(role => ROLE_PERMISSIONS[role] || [])
        .filter((permission, index, array) => array.indexOf(permission) === index);
      
      state.permissions = permissions;
      localStorage.setItem('permissions', JSON.stringify(permissions));
      
      // Update authData in localStorage
      const authData = {
        ...state,
        userRoles: action.payload,
        permissions
      };
      localStorage.setItem('authData', JSON.stringify(authData));
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
      
      // Update authData in localStorage
      const authData = { ...state };
      localStorage.setItem('authData', JSON.stringify(authData));
    },
    updateToken: (state, action) => {
      state.azureToken = action.payload;
      localStorage.setItem('azureToken', action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle loginWithAzure
      .addCase(loginWithAzure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithAzure.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.azureToken = action.payload.azureToken;
        state.userRoles = action.payload.userRoles;
        state.permissions = action.payload.permissions;
        state.azureGroups = action.payload.azureGroups;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginWithAzure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
        state.isAuthenticated = false;
      });
  },
});

// Export actions
export const { 
  setLoading, 
  setError, 
  setIsLoadingGroups,
  logout, 
  clearAuth,
  restoreAuthFromLocalStorage,
  updateUserRoles,
  updateUser 
} = authSlice.actions;

// Export selectors
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectUserRoles = (state) => state.auth.userRoles;
export const selectPermissions = (state) => state.auth.permissions;
export const selectAzureGroups = (state) => state.auth.azureGroups;
export const selectIsLoadingGroups = (state) => state.auth.isLoadingGroups;

// Export reducer
export default authSlice.reducer;