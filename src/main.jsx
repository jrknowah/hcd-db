import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import { BrowserRouter } from 'react-router-dom';
import { CustomizerContextProvider } from './context/CustomizerContext';
import { Provider } from 'react-redux';
import store from './store/store';

// Azure AD / MSAL imports
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig, validateConfig } from './config/authConfig';

// Validate Azure configuration before starting
if (!validateConfig()) {
  console.error('❌ Azure AD configuration is invalid. Please check your environment variables.');
}

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

ReactDOM.createRoot(document.getElementById('root')).render(
  <MsalProvider instance={msalInstance}>
    <CustomizerContextProvider>
      <Suspense fallback={<Spinner />}>
        <Provider store={store}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </Provider>
      </Suspense>
    </CustomizerContextProvider>
  </MsalProvider>
);