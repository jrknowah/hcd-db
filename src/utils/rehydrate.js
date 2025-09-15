// ============================================
// STEP 2: Create rehydration function
// File: src/utils/rehydrate.js
// ============================================

export const rehydrateState = () => {
  // Priority: URL params > sessionStorage > empty state
  const urlParams = new URLSearchParams(window.location.search);
  const urlClientID = urlParams.get('clientID');
  
  // Get persisted state from sessionStorage
  let persistedState = {};
  try {
    const stored = sessionStorage.getItem('redux_cache');
    if (stored) {
      persistedState = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse persisted state:', error);
  }
  
  // Build initial state with URL taking priority
  const preloadedState = {
    clients: {
      selectedClient: urlClientID 
        ? { clientID: urlClientID }
        : persistedState.clientData || null,
      clientsList: [],
      loading: false,
      error: null,
    },
    carePlans: {
      data: persistedState.carePlans || [],
      status: 'idle',
      error: null,
      lastUpdated: null,
    },
    encounterNote: {
      data: persistedState.encounterNotes || [],
      status: 'idle',
      error: null,
    },
    assessCarePlans: {
      assessmentData: persistedState.assessmentData || {},
      assessmentLoading: false,
      assessmentError: null,
      assessmentStatus: {},
      statusLoading: false,
      statusError: null,
      assessmentMetrics: {},
      metricsLoading: false,
      metricsError: null,
      milestones: [],
      milestonesLoading: false,
      milestonesError: null,
      assessmentReport: {},
      reportLoading: false,
      reportError: null,
      saving: false,
      saveError: null,
      saveSuccess: false,
      updating: false,
      updateError: null,
      updateSuccess: false,
      useMockData: process.env.NODE_ENV === 'development',
      lastFetched: null,
      cacheValid: false,
      cacheExpiryMinutes: 15
    },
    noteArchive: {
      loading: false,
      error: null,
      successMessage: null,
      fileUrl: null,
      uploadProgress: 0,
      uploadedFiles: [],
      filesLoading: false,
      filesError: null,
    },
    // Add other slices as needed
  };
  
  // If URL has clientID but no persisted data, just use the ID
  if (urlClientID && !preloadedState.clients.selectedClient) {
    preloadedState.clients.selectedClient = { clientID: urlClientID };
  }
  
  return preloadedState;
};