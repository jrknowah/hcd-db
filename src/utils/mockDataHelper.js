// src/utils/mockDataHelper.js
/**
 * Shared utility for consistent mock data handling across Section 5 components
 * This ensures all medical components use the same logic for determining when to use mock data
 */

/**
 * Determines if mock data should be used based on environment and client ID
 * @param {string} clientID - The client ID to check
 * @returns {boolean} - Whether to use mock data
 */
export const shouldUseMockData = (clientID) => {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isMockClient = clientID === 'mock-123' || clientID?.toString().startsWith('mock-');
  const forceRealData = import.meta.env.VITE_USE_REAL_DATA === 'true';
  
  return isDevelopment && isMockClient && !forceRealData;
};

/**
 * Get the standard mock client ID for development
 * @returns {string} - The mock client ID
 */
export const getMockClientID = () => 'mock-123';

/**
 * Check if we're in development mode
 * @returns {boolean} - Whether we're in development
 */
export const isDevelopmentMode = () => {
  return import.meta.env.MODE === 'development';
};

/**
 * Get API base URL with fallback
 * @returns {string} - The API base URL
 */
export const getAPIBaseURL = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

/**
 * Get a mock client object for development
 * @returns {object} - Mock client data
 */
export const getMockClient = () => ({
  clientID: getMockClientID(),
  clientFirstName: 'John',
  clientLastName: 'Doe',
  clientEmail: 'john.doe@mock.com',
  clientSite: 'Mock Site',
  clientGender: 'Male',
  clientDOB: '1990-01-15'
});

/**
 * Create standardized mock response structure
 * @param {any} data - The mock data to return
 * @param {string} message - Optional success message
 * @returns {object} - Standardized mock response
 */
export const createMockResponse = (data, message = 'Mock operation successful') => ({
  success: true,
  data,
  message,
  timestamp: new Date().toISOString(),
  isMock: true
});

/**
 * Create standardized error response for mocks
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {object} - Standardized error response
 */
export const createMockError = (message = 'Mock operation failed', status = 500) => ({
  success: false,
  error: message,
  status,
  timestamp: new Date().toISOString(),
  isMock: true
});

/**
 * Delay function for simulating API calls
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after delay
 */
export const mockDelay = (ms = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Log mock operations for debugging
 * @param {string} operation - The operation being performed
 * @param {string} component - The component performing the operation
 * @param {any} data - Additional data to log
 */
export const logMockOperation = (operation, component, data = {}) => {
  console.log(`🔧 Mock ${operation} in ${component}:`, data);
};

/**
 * Check if a value exists and is not empty
 * @param {any} value - Value to check
 * @returns {boolean} - Whether value exists and is not empty
 */
export const isValidValue = (value) => {
  return value !== null && value !== undefined && value !== '';
};

/**
 * Generate a mock ID
 * @param {string} prefix - Prefix for the ID
 * @returns {string} - Generated mock ID
 */
export const generateMockId = (prefix = 'mock') => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format date for consistent display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatMockDate = (date = new Date()) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Create a mock user object
 * @param {string} email - User email
 * @param {string} name - User name
 * @returns {object} - Mock user object
 */
export const createMockUser = (email = 'mock@user.com', name = 'Mock User') => ({
  id: generateMockId('user'),
  email,
  name,
  role: 'mock_user',
  permissions: ['read', 'write'],
  createdAt: new Date().toISOString()
});

/**
 * Environment configuration for mock data
 */
export const mockConfig = {
  // How long to delay mock API calls (ms)
  apiDelay: isDevelopmentMode() ? 500 : 0,
  
  // Whether to log mock operations
  enableLogging: isDevelopmentMode(),
  
  // Default client ID for mocks
  defaultClientID: getMockClientID(),
  
  // API endpoints
  apiBaseURL: getAPIBaseURL(),
  
  // File size limits for mock uploads
  maxFileSize: 50 * 1024 * 1024, // 50MB
  
  // Allowed file types for mock uploads
  allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt']
};

/**
 * Validate client ID format
 * @param {string} clientID - Client ID to validate
 * @returns {boolean} - Whether client ID is valid
 */
export const isValidClientID = (clientID) => {
  if (!clientID) return false;
  // Allow mock IDs or real IDs (adjust pattern as needed)
  return /^(mock-|[0-9]+)/.test(clientID.toString());
};

/**
 * Get environment info for debugging
 * @returns {object} - Environment information
 */
export const getEnvironmentInfo = () => ({
  mode: import.meta.env.MODE,
  isDevelopment: isDevelopmentMode(),
  apiUrl: getAPIBaseURL(),
  useRealData: import.meta.env.VITE_USE_REAL_DATA === 'true',
  mockClientID: getMockClientID()
});

export default {
  shouldUseMockData,
  getMockClientID,
  isDevelopmentMode,
  getAPIBaseURL,
  getMockClient,
  createMockResponse,
  createMockError,
  mockDelay,
  logMockOperation,
  isValidValue,
  generateMockId,
  formatMockDate,
  createMockUser,
  mockConfig,
  isValidClientID,
  getEnvironmentInfo
};