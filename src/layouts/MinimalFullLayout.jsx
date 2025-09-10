import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

// Minimal FullLayout for testing - removes all potential interfering components
const MinimalFullLayout = () => {
  console.log('🔍 MinimalFullLayout is rendering');
  
  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        padding: '10px',
        backgroundColor: '#2196F3',
        color: 'white',
        marginBottom: '20px',
        borderRadius: '4px'
      }}>
        🔧 MinimalFullLayout is active - Outlet should render below
      </div>
      
      <Box sx={{ 
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        minHeight: '80vh'
      }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MinimalFullLayout;