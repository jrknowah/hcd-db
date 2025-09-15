// ============================================
// STEP 1: Create the persistence middleware
// File: src/backend/middleware/persistenceMiddleware.js
// ============================================

export const persistenceMiddleware = store => next => action => {
  const result = next(action);
  const state = store.getState();
  
  // List of state slices to persist
  const toPersist = {
    clientID: state.clients?.selectedClient?.clientID,
    clientData: state.clients?.selectedClient,
    carePlans: state.carePlans?.data,
    encounterNotes: state.encounterNote?.data,
    assessmentData: state.assessCarePlans?.assessmentData,
    // Add other fields you want to persist
  };
  
  // Save to sessionStorage
  sessionStorage.setItem('redux_cache', JSON.stringify(toPersist));
  
  // Sync clientID with URL when it changes
  if (action.type.includes('client') || action.type.includes('SELECT')) {
    const clientID = state.clients?.selectedClient?.clientID;
    const url = new URL(window.location.href);
    
    if (clientID) {
      url.searchParams.set('clientID', clientID);
    } else {
      url.searchParams.delete('clientID');
    }
    
    // Only update if URL actually changed
    if (window.location.href !== url.href) {
      window.history.replaceState({}, '', url);
    }
  }
  
  return result;
};