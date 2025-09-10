// Router.jsx - Updated to use App as root layout
import React, { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import NavigationDebugger from '../components/debug/NavigationDebugger';

// Import App as the root layout
import App from '../App';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const SamplePage = Loadable(lazy(() => import('../views/sample-page/SamplePage')))
const Dashboard = Loadable(lazy(() => import('../views/Dashboard/DashboardClient')));
const Identification = Loadable(lazy(() => import('../views/Section-1/Identification.jsx')));
const Section2 = Loadable(lazy(() => import('../views/Section-2/AuthSig.jsx')));
const Section3 = Loadable(lazy(() => import('../views/Section-3/AssessCarePlans.jsx')));
const Section4 = Loadable(lazy(() => import('../views/Section-4/ClientProgress.js')));
const Section5 = Loadable(lazy(() => import('../views/Section-5/Medical.jsx')));
const Section6 = Loadable(lazy(() => import('../views/Section-6/Section6.jsx')));

const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(
  lazy(() => import('../views/authentication/auth2/ForgotPassword2')),
);
const Maintenance = Loadable(lazy(() => import('../views/authentication/Maintenance')));

// Define the routes configuration
const routesConfig = [
  {
    path: '/',
    element: <App />, // ✅ App is now the root layout with theme/auth
    children: [
      {
        path: '/',
        element: <FullLayout />, // ✅ FullLayout is a child of App
        children: [
          { path: '/', element: <Navigate to="/dashboard" /> },
          { path: '/debug', element: <NavigationDebugger /> },
          { path: '/sample-page', exact: true, element: <SamplePage /> },
          { path: '/dashboard', exact: true, element: <Dashboard /> },
          { path: '/Section1', name: 'Section 1', exact: true, element: <Identification /> },
          { path: '/Section2', name: 'Section 2', exact: true, element: <Section2 /> },
          { path: '/Section3', name: 'Section 3', exact: true, element: <Section3 /> },
          { path: '/Section4', name: 'Section 4', exact: true, element: <Section4 /> },
          { path: '/Section5', name: 'Section 5', exact: true, element: <Section5 /> },
          { path: '/Section6', name: 'Section 6', exact: true, element: <Section6 /> },
          { path: '*', element: <Navigate to="/auth/404" /> },
        ],
      },
      {
        path: '/auth',
        element: <BlankLayout />,
        children: [
          { path: '404', element: <Error /> },
          { path: '*', element: <Navigate to="/auth/404" /> },
          { path: '/auth/auth1/login', element: <Login /> },
          { path: '/auth/auth2/login', element: <Login2 /> },
          { path: '/auth/auth1/register', element: <Register /> },
          { path: '/auth/auth2/register', element: <Register2 /> },
          { path: '/auth/auth1/forgot-password', element: <ForgotPassword /> },
          { path: '/auth/auth2/forgot-password', element: <ForgotPassword2 /> },
          { path: '/auth/maintenance', element: <Maintenance /> },
        ],
      },
    ],
  },
];

// Create the router
const router = createBrowserRouter(routesConfig);

export default router;