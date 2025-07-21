// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Spinner from './views/spinner/Spinner';
import './utils/i18n';
import { BrowserRouter } from 'react-router-dom';
import { CustomizerContextProvider } from './context/CustomizerContext';
import { Provider } from 'react-redux';
import store from './store/store'

ReactDOM.createRoot(document.getElementById('root')).render(
  <CustomizerContextProvider>
    <Suspense fallback={<Spinner />}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </Suspense>
  </CustomizerContextProvider>,
);
