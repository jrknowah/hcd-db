import React from 'react';
import { useSearchParams } from 'react-router-dom';

const SimpleTestComponent = () => {
  console.log('🟢 SimpleTestComponent is rendering!');
  
  const [searchParams] = useSearchParams();
  const clientID = searchParams.get('clientID');
  
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#4CAF50',
      color: 'white',
      margin: '20px',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: 'bold'
    }}>
      <h1>🎉 SUCCESS! Section1 is working!</h1>
      <p>Client ID from URL: {clientID}</p>
      <p>Current URL: {window.location.href}</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};

export default SimpleTestComponent;