// Temporary debug version of FullLayout to see what's happening
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const DebugFullLayout = () => {
  const location = useLocation();
  
  console.log('🏗️ FullLayout rendering with location:', location);
  
  return (
    <div style={{ 
      backgroundColor: 'blue', 
      color: 'white', 
      padding: '20px',
      minHeight: '100vh'
    }}>
      <h1>🏗️ DEBUG FULL LAYOUT</h1>
      <p><strong>Current Path:</strong> {location.pathname}</p>
      <p><strong>Search:</strong> {location.search}</p>
      <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
      
      <div style={{ 
        backgroundColor: 'white', 
        color: 'black', 
        padding: '20px', 
        margin: '20px 0',
        minHeight: '200px'
      }}>
        <h2>Child Component Area (Outlet):</h2>
        <Outlet />
      </div>
    </div>
  );
};

export default DebugFullLayout;