// main.jsx - FIXED VERSION
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// Add Buffer polyfill for Azure Blob Storage SDK
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import { BrowserRouter } from 'react-router-dom';
import { CustomizerContextProvider } from './context/CustomizerContext';
import { Provider } from 'react-redux';
import store from './backend/store/store';
import { installApiAuth } from './utils/installApiAuth';

// Every backend call carries the user's ID token (site access is checked per client)
installApiAuth();

// ✅ CRITICAL: Make store globally accessible for Azure Profile Service
window.__REDUX_STORE__ = store;

// DON'T create MSAL instance here - let App.jsx handle it
ReactDOM.createRoot(document.getElementById('root')).render(
  <CustomizerContextProvider>
    <Suspense fallback={<Spinner />}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </Suspense>
  </CustomizerContextProvider>
);