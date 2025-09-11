// src/config/authConfig.js

// ============================================================================
// Microsoft Azure AD Configuration for HOPE
// ============================================================================

import { PublicClientApplication } from '@azure/msal-browser';

// ✅ STEP 1: Define the configuration FIRST
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage", // or "localStorage"
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        switch (level) {
          case 0: // Error
            console.error('MSAL Error:', message);
            break;
          case 1: // Warning  
            console.warn('MSAL Warning:', message);
            break;
          case 2: // Info
            console.info('MSAL Info:', message);
            break;
          case 3: // Verbose
            if (import.meta.env.DEV) {
              console.debug('MSAL Debug:', message);
            }
            break;
        }
      },
      piiLoggingEnabled: false,
    },
  },
};

// ✅ STEP 2: Updated login request to include groups claim
export const loginRequest = {
  scopes: [
    "User.Read", 
    "openid", 
    "profile",
    "GroupMember.Read.All", // Permission to read group memberships
  ],
  // Request groups to be included in tokens (works for up to 150 groups)
  extraQueryParameters: {
    claims: JSON.stringify({
      "id_token": {
        "groups": null
      }
    })
  }
};

// ✅ STEP 3: Microsoft Graph API scopes for getting detailed group info
export const graphRequest = {
  scopes: ["User.Read", "GroupMember.Read.All", "Directory.Read.All"],
};

// ✅ STEP 4: Configuration validation
export const validateConfig = () => {
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || process.env.REACT_APP_AZURE_CLIENT_ID;
  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || process.env.REACT_APP_AZURE_TENANT_ID;

  if (!clientId) {
    console.error('❌ VITE_AZURE_CLIENT_ID or REACT_APP_AZURE_CLIENT_ID is not set in environment variables');
    return false;
  }

  if (!tenantId) {
    console.error('❌ VITE_AZURE_TENANT_ID or REACT_APP_AZURE_TENANT_ID is not set in environment variables');
    return false;
  }

  console.log('✅ Azure AD configuration loaded successfully');
  console.log('🏢 Tenant ID:', tenantId);
  console.log('🔑 Client ID:', clientId.substring(0, 8) + '...');
  
  return true;
};

// ✅ STEP 5: Create MSAL instance AFTER config is defined
export const msalInstance = new PublicClientApplication(msalConfig);

// ✅ STEP 6: Initialization function with proper error handling
let initializationPromise = null;

export const initializeMsal = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Validate config first
      if (!validateConfig()) {
        throw new Error('Invalid Azure AD configuration');
      }

      console.log('🔄 Starting MSAL initialization...');
      await msalInstance.initialize();
      console.log('✅ MSAL initialized successfully');
      
      // Handle redirect promise AFTER initialization
      try {
        console.log('🔄 Handling redirect promise...');
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
          console.log('✅ Redirect handled successfully:', response.account?.username);
        } else {
          console.log('ℹ️ No redirect to handle');
        }
      } catch (redirectError) {
        console.error('❌ Redirect handling error:', redirectError);
      }
      
      return true;
    } catch (error) {
      console.error('❌ MSAL initialization failed:', error);
      throw error;
    }
  })();

  return initializationPromise;
};