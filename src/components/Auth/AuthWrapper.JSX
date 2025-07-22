import React, { useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import Login from '../views/authentication/Login';

const AuthWrapper = ({ children }) => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // Handle redirect promise (for redirect flow)
        await instance.handleRedirectPromise();
        
        // Check if we have accounts
        const currentAccounts = instance.getAllAccounts();
        if (currentAccounts.length > 0) {
          instance.setActiveAccount(currentAccounts[0]);
        }
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, [instance]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Checking authentication...
        </Typography>
      </Box>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show main app if authenticated
  return children;
};

export default AuthWrapper;