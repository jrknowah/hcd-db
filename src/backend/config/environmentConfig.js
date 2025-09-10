// src/config/environmentConfig.js
export const getEnvironmentConfig = () => {
  return {
    // Environment info
    isDevelopment: import.meta.env.MODE === 'development',
    isProduction: import.meta.env.MODE === 'production',
    
    // Authentication and data
    enableMockAuth: import.meta.env.VITE_USE_MOCK_AUTH === 'true',
    useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
    
    // Azure AD
    azureClientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    azureAuthority: import.meta.env.VITE_AZURE_AUTHORITY,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI || window.location.origin,
    
    // API and features
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugLogging: import.meta.env.VITE_DEBUG_LOGGING === 'true',
    showDevTools: import.meta.env.VITE_SHOW_DEV_TOOLS === 'true',
  };
};

export const envConfig = getEnvironmentConfig();