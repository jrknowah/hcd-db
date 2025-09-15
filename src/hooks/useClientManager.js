// ============================================
// STEP 4: Create a custom hook for client management
// File: src/hooks/useClientManager.js
// ============================================

import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';

export const useClientManager = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClient = useSelector(state => state.clients?.selectedClient);
  
  // Get clientID from URL
  const urlClientID = searchParams.get('clientID');
  
  // Sync on mount and when URL changes
  useEffect(() => {
    if (urlClientID && urlClientID !== selectedClient?.clientID) {
      // URL has a different clientID, update Redux
      dispatch({
        type: 'clients/setSelectedClient',
        payload: { clientID: urlClientID }
      });
    } else if (!urlClientID && selectedClient?.clientID) {
      // No URL param but Redux has client, update URL
      setSearchParams({ clientID: selectedClient.clientID });
    }
  }, [urlClientID, selectedClient?.clientID, dispatch, setSearchParams]);
  
  // Function to set client ID everywhere
  const setClientID = useCallback((newClientID) => {
    dispatch({
      type: 'clients/setSelectedClient',
      payload: { clientID: newClientID }
    });
    setSearchParams({ clientID: newClientID });
  }, [dispatch, setSearchParams]);
  
  // Function to clear client
  const clearClient = useCallback(() => {
    dispatch({ type: 'clients/clearSelectedClient' });
    setSearchParams({});
    sessionStorage.removeItem('redux_cache');
  }, [dispatch, setSearchParams]);
  
  return {
    clientID: selectedClient?.clientID || urlClientID,
    selectedClient,
    setClientID,
    clearClient,
    hasClient: !!(selectedClient?.clientID || urlClientID)
  };
};
