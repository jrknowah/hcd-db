// src/config/authConfig.js
import { PublicClientApplication } from '@azure/msal-browser';

// MSAL configuration
export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        
        switch (level) {
          case 0:
            console.error('MSAL Error:', message);
            break;
          case 1:
            console.warn('MSAL Warning:', message);
            break;
          case 2:
            console.info('MSAL Info:', message);
            break;
          case 3:
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

// Login request configuration — Graph scopes for id_token + group claims
export const loginRequest = {
  scopes: [
    "User.Read",
    "openid",
    "profile",
    "GroupMember.Read.All",
  ],
  extraQueryParameters: {
    claims: JSON.stringify({
      "id_token": {
        "groups": null
      }
    })
  }
};

// Graph API request configuration
export const graphRequest = {
  scopes: ["User.Read", "GroupMember.Read.All", "Directory.Read.All"],
};

// API request configuration — token for YOUR backend (validated by auth.js middleware)
// The audience in this token will match AZURE_CLIENT_ID on the backend.
export const apiRequest = {
  scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`],
};

// Validation function
export const validateConfig = () => {
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;

  if (!clientId) {
    console.error('❌ VITE_AZURE_CLIENT_ID is not set in environment variables');
    return false;
  }

  if (!tenantId) {
    console.error('❌ VITE_AZURE_TENANT_ID is not set in environment variables');
    return false;
  }

  console.log('✅ Azure AD configuration loaded successfully');
  console.log('🏢 Tenant ID:', tenantId);
  console.log('🔑 Client ID:', clientId.substring(0, 8) + '...');
  
  return true;
};

// MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
let initializationPromise = null;

export const initializeMsal = async () => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      if (!validateConfig()) {
        throw new Error('Invalid Azure AD configuration');
      }

      console.log('🔄 Starting MSAL initialization...');
      await msalInstance.initialize();
      console.log('✅ MSAL initialized successfully');
      
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