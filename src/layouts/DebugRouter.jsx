// DebugRouter.jsx - Simplified router for testing
import React from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';

// Simple test components
const SimpleTestComponent = () => {
  console.log('🎯 SimpleTestComponent rendering');
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '50px', 
      fontSize: '24px',
      textAlign: 'center'
    }}>
      <h1>🎯 SECTION 1 TEST COMPONENT WORKING!</h1>
      <p>URL: {window.location.pathname}</p>
      <p>Search: {window.location.search}</p>
      <p>Client ID: {new URLSearchParams(window.location.search).get('clientID')}</p>
    </div>
  );
};

const DebugDashboard = () => {
  console.log('🏠 DebugDashboard rendering');
  return (
    <div style={{ 
      backgroundColor: 'green', 
      color: 'white', 
      padding: '50px',
      textAlign: 'center'
    }}>
      <h1>🏠 DEBUG DASHBOARD</h1>
      <button 
        onClick={() => window.location.href = '/Section1?clientID=123'}
        style={{ 
          padding: '10px 20px', 
          fontSize: '18px',
          backgroundColor: 'white',
          color: 'green',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Test Navigate to Section1
      </button>
    </div>
  );
};

const DebugFullLayout = () => {
  console.log('🏗️ DebugFullLayout rendering');
  return (
    <div style={{ 
      backgroundColor: 'blue', 
      color: 'white', 
      padding: '20px',
      minHeight: '100vh'
    }}>
      <h1>🏗️ DEBUG FULL LAYOUT</h1>
      <p>Current Path: {window.location.pathname}</p>
      <p>Search: {window.location.search}</p>
      
      <div style={{ 
        backgroundColor: 'white', 
        color: 'black', 
        padding: '20px', 
        margin: '20px 0',
        minHeight: '200px'
      }}>
        <h2>Child Component Area:</h2>
        {/* Manually render based on path for testing */}
        {window.location.pathname === '/dashboard' && <DebugDashboard />}
        {window.location.pathname === '/Section1' && <SimpleTestComponent />}
        {window.location.pathname === '/' && <DebugDashboard />}
      </div>
    </div>
  );
};

// Define the debug routes configuration
const debugRoutesConfig = [
  {
    path: '/',
    element: <DebugFullLayout />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" /> },
      { path: '/dashboard', element: <DebugDashboard /> },
      { path: '/Section1', element: <SimpleTestComponent /> },
    ],
  },
];

// Create the debug router
const debugRouter = createBrowserRouter(debugRoutesConfig);

export default debugRouter;