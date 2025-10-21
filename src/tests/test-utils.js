// test-utils.js - Updated to properly handle authSigSlice mock

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';

// Import reducers - the mock will intercept authSigSlice
import clientsReducer from '../backend/store/slices/clientSlice';
import clientFaceReducer from '../backend/store/slices/clientFaceSlice';
import authReducer from '../backend/store/slices/authSlice';
import authSigReducer from '../backend/store/slices/authSigSlice'; // This will use the mock in tests

// Helper function to create a test store
export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      clients: clientsReducer,
      clientFace: clientFaceReducer,
      auth: authReducer,
      authSig: authSigReducer, // ✅ Now properly using the mock in test environment
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable for testing
      }),
  });
}

// Custom render function that wraps components with providers
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Automatically create a store instance if no store is passed in
    store = createTestStore(preloadedState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }

  return { 
    store, 
    ...render(ui, { wrapper: Wrapper, ...renderOptions }) 
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Export the custom render function as default
export { renderWithProviders as default };