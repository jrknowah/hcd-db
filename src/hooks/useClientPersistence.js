// src/hooks/useClientPersistence.js
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // ✅ Changed from useSearchParams
import { useSelector, useDispatch } from 'react-redux';
import { fetchClientById, setSelectedClient } from '../backend/store/slices/clientSlice';

/**
 * Centralized hook for managing client selection and persistence across all sections
 * 
 * ✅ UPDATED: Now uses URL path parameters instead of query parameters
 * - Before: /section?clientID=123
 * - After:  /section/123
 * 
 * This hook handles:
 * - Reading clientID from URL path parameters
 * - Falling back to Redux state
 * - Restoring client from sessionStorage cache
 * - Fetching client data from server if needed
 * - Mock data for development
 * 
 * @returns {Object} Client state and utilities
 */
export const useClientPersistence = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { clientID: urlClientID } = useParams(); // ✅ Changed from searchParams.get('clientID')

  // Get Redux state
  const reduxSelectedClient = useSelector((state) => state?.clients?.selectedClient);
  const reduxUser = useSelector((state) => state?.auth?.user);

  // Environment detection
  const isDevelopment = import.meta.env.VITE_USE_MOCK_DATA === 'true';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;

  // Mock data for development
  const MOCK_CLIENT = useMemo(() => ({
    clientID: 'mock-123',
    clientFirstName: 'John',
    clientLastName: 'Doe',
  }), []);

  const MOCK_USER = useMemo(() => ({
    id: 'mock-user-123',
    name: 'Test User',
  }), []);

  // Determine effective client and user
  const currentClient = shouldUseMockData && !reduxSelectedClient ? MOCK_CLIENT : reduxSelectedClient;
  const currentUser = shouldUseMockData && !reduxUser ? MOCK_USER : reduxUser;
  const effectiveClientID = urlClientID || currentClient?.clientID;

  /**
   * Get current section from pathname
   * ✅ Returns actual route names used in App.jsx
   */
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/Section1')) return 'Section1';
    if (path.includes('/Section2')) return 'Section2';
    if (path.includes('/Section3')) return 'Section3';
    if (path.includes('/Section4')) return 'Section4';
    if (path.includes('/Section5')) return 'Section5';
    if (path.includes('/Section6')) return 'Section6';
    return 'Section1'; // default
  };

  // Restore client from URL if needed
  useEffect(() => {
    if (urlClientID && urlClientID !== 'undefined' && !reduxSelectedClient) {
      console.log('🔄 Restoring client from URL:', urlClientID);

      // Try sessionStorage first for quick restoration
      const cacheKey = `client_${urlClientID}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const clientData = JSON.parse(cached);
          dispatch(setSelectedClient(clientData));
          console.log('✅ Restored from cache:', clientData);
        } catch (error) {
          console.log('📡 Cache invalid, fetching from server');
          dispatch(fetchClientById(urlClientID));
        }
      } else {
        console.log('📡 No cache, fetching from server');
        dispatch(fetchClientById(urlClientID));
      }
    }
  }, [urlClientID, reduxSelectedClient, dispatch]);

  // Cache client data to sessionStorage when it changes
  useEffect(() => {
    if (currentClient?.clientID && !shouldUseMockData) {
      const cacheKey = `client_${currentClient.clientID}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(currentClient));
      console.log('💾 Cached client data:', currentClient.clientID);
    }
  }, [currentClient, shouldUseMockData]);

  // ✅ NEW: If no URL clientID but we have Redux client, update URL
  useEffect(() => {
    if (!urlClientID && effectiveClientID && location.pathname !== '/') {
      const currentSection = getCurrentSection();
      const newPath = `/${currentSection}/${effectiveClientID}`;
      
      // Only navigate if we're not already on the correct path
      if (location.pathname !== newPath) {
        console.log('🔄 Updating URL with clientID:', effectiveClientID);
        navigate(newPath, { replace: true });
      }
    }
  }, [urlClientID, effectiveClientID, location.pathname, navigate]);

  // Debug logging for persistence
  useEffect(() => {
    if (isDevelopment) {
      console.log('Client Persistence State:');
      console.log('- URL clientID:', urlClientID);
      console.log('- Redux client:', reduxSelectedClient);
      console.log('- Effective clientID:', effectiveClientID);
      console.log('- Using mock data:', shouldUseMockData);
      console.log('- Current path:', location.pathname);
    }
  }, [urlClientID, reduxSelectedClient, effectiveClientID, shouldUseMockData, isDevelopment, location.pathname]);

  /**
   * ✅ UPDATED: Navigate to a section with clientID preserved in URL path
   * @param {string} path - Path to navigate to (e.g., '/authsig' or 'authsig')
   */
  const navigateWithClient = (path) => {
    // Remove leading slash if present for consistency
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (effectiveClientID) {
      navigate(`/${cleanPath}/${effectiveClientID}`);
    } else {
      navigate(`/${cleanPath}`);
    }
  };

  /**
   * ✅ UPDATED: Get URL for a section with clientID in path
   * @param {string} path - Path to get URL for
   * @returns {string} URL with clientID in path
   */
  const getUrlWithClient = (path) => {
    // Remove leading slash if present for consistency
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (effectiveClientID) {
      return `/${cleanPath}/${effectiveClientID}`;
    }
    return `/${cleanPath}`;
  };

  return {
    // Client data
    clientID: effectiveClientID,
    client: currentClient,
    hasClient: Boolean(effectiveClientID),
    
    // User data
    user: currentUser,
    
    // Environment info
    isDevelopment,
    shouldUseMockData,
    
    // Navigation utilities
    navigateWithClient,
    getUrlWithClient,
    getCurrentSection,
    
    // Raw values for debugging
    urlClientID,
    reduxClient: reduxSelectedClient,
  };
};

export default useClientPersistence;