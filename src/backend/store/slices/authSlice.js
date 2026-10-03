// backend/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GROUP_TO_ROLE, ROLE_PERMISSIONS } from '../../config/groupConfig';
import { clearSensitiveStorage } from '../../../utils/secureSession';

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

      // FAIL CLOSED. A user whose Azure AD groups do not map to a known role
      // gets NO roles and NO permissions — not IT_ADMIN.
      //
      // The previous default granted full administrative access (including
      // audit_logs and all_sections) to anyone who authenticated but whose
      // group membership did not resolve. Controlled by an explicit env flag so
      // local development can opt in deliberately; it is never on in a build
      // unless VITE_AUTH_DEV_BYPASS is literally 'true'.
      const devBypass = import.meta.env.VITE_AUTH_DEV_BYPASS === 'true';

      let finalRoles = userRoles;
      let finalPermissions = permissions;

      if (userRoles.length === 0) {
        if (devBypass) {
          console.warn('⚠️ AuthSlice: DEV BYPASS ACTIVE — granting IT_ADMIN. Never enable in production.');
          finalRoles = ['IT_ADMIN'];
          finalPermissions = ROLE_PERMISSIONS['IT_ADMIN'];
        } else {
          console.warn('🔒 AuthSlice: No mapped roles for this account. Access denied (fail-closed).');
          finalRoles = [];
          finalPermissions = [];
        }
      }

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

      // Auth state is kept in memory only. MSAL owns the session and the app
      // re-derives this from the MSAL account on every load, so nothing here is
      // written to web storage where it could outlive the session.

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
    // Resetting the rest of the store on logout is handled by the root
    // reducer (see store/clientScope.js).
    logout: (state) => {
      Object.assign(state, initialState);
      clearSensitiveStorage();
      console.log('🚪 AuthSlice: User logged out');
    },
    clearAuth: (state) => {
      // Alias for logout - same functionality
      Object.assign(state, initialState);
      clearSensitiveStorage();
    },
    updateUserRoles: (state, action) => {
      state.userRoles = action.payload;
      
      // Update permissions based on new roles
      const permissions = action.payload
        .flatMap(role => ROLE_PERMISSIONS[role] || [])
        .filter((permission, index, array) => array.indexOf(permission) === index);
      
      state.permissions = permissions;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    // In authSlice.js, add to reducers:

    updateToken: (state, action) => {
      state.azureToken = action.payload;
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
  updateUserRoles,
  updateUser, 
  updateToken
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