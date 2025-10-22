// src/hooks/useClientPersistence.js
import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClientById, setSelectedClient } from '../backend/store/slices/clientSlice';

/**
 * Centralized hook for managing client selection and persistence across all sections
 * 
 * This hook handles:
 * - Reading clientID from URL parameters
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
  const [searchParams] = useSearchParams();

  // Get clientID from URL
  const urlClientID = searchParams.get('clientID');

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

  // Restore client from URL if needed
  useEffect(() => {
    if (urlClientID && !reduxSelectedClient) {
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

  // Debug logging for persistence
  useEffect(() => {
    if (isDevelopment) {
      console.log('Client Persistence State:');
      console.log('- URL clientID:', urlClientID);
      console.log('- Redux client:', reduxSelectedClient);
      console.log('- Effective clientID:', effectiveClientID);
      console.log('- Using mock data:', shouldUseMockData);
    }
  }, [urlClientID, reduxSelectedClient, effectiveClientID, shouldUseMockData, isDevelopment]);

  /**
   * Navigate to a section with clientID preserved in URL
   * @param {string} path - Path to navigate to (e.g., '/Section2')
   */
  const navigateWithClient = (path) => {
    if (effectiveClientID) {
      navigate(`${path}?clientID=${effectiveClientID}`);
    } else {
      navigate(path);
    }
  };

  /**
   * Get URL for a section with clientID parameter
   * @param {string} path - Path to get URL for
   * @returns {string} URL with clientID parameter
   */
  const getUrlWithClient = (path) => {
    if (effectiveClientID) {
      return `${path}?clientID=${effectiveClientID}`;
    }
    return path;
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
    
    // Raw values for debugging
    urlClientID,
    reduxClient: reduxSelectedClient,
  };
};

export default useClientPersistence;