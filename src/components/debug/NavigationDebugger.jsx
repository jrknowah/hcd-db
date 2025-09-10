import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Alert, 
  Button, 
  Grid,
  Chip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  BugReport as BugIcon,
  Person as PersonIcon,
  Route as RouteIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const NavigationDebugger = () => {
  const [debugInfo, setDebugInfo] = useState({
    currentPath: '',
    searchParams: '',
    clientData: null,
    authState: null,
    reduxState: null,
    localStorageData: null,
    sessionStorageData: null,
    timestamp: new Date().toISOString()
  });

  const [issues, setIssues] = useState([]);

  const collectDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      currentPath: window.location.pathname,
      searchParams: window.location.search,
      fullUrl: window.location.href,
      
      // Mock Redux state (in real app, you'd get from useSelector)
      reduxState: {
        selectedClient: {
          clientID: 'CL-123456',
          clientFirstName: 'John',
          clientLastName: 'Doe',
          status: 'active'
        },
        authUser: {
          id: 'user-123',
          name: 'Test User',
          isAuthenticated: true,
          token: 'mock-jwt-token'
        },
        loading: false,
        error: null
      },
      
      // Check browser storage
      localStorageData: {
        authToken: localStorage.getItem('authToken') || 'not found',
        userSession: localStorage.getItem('userSession') || 'not found',
        lastClientID: localStorage.getItem('lastClientID') || 'not found'
      },
      
      sessionStorageData: {
        currentSession: sessionStorage.getItem('currentSession') || 'not found',
        navigationState: sessionStorage.getItem('navigationState') || 'not found'
      }
    };

    setDebugInfo(info);
    analyzeIssues(info);
  };

  const analyzeIssues = (info) => {
    const foundIssues = [];

    // Check authentication issues
    if (!info.reduxState.authUser?.isAuthenticated) {
      foundIssues.push({
        type: 'error',
        category: 'Authentication',
        message: 'User is not authenticated in Redux state',
        solution: 'Check if login flow completed properly'
      });
    }

    if (info.localStorageData.authToken === 'not found') {
      foundIssues.push({
        type: 'warning',
        category: 'Authentication',
        message: 'No auth token found in localStorage',
        solution: 'Token may have expired or was never set'
      });
    }

    // Check client data issues
    if (!info.reduxState.selectedClient) {
      foundIssues.push({
        type: 'error',
        category: 'Client Data',
        message: 'No client selected in Redux state',
        solution: 'Ensure client is selected before navigation'
      });
    }

    // Check navigation issues
    if (info.currentPath.includes('Section1') && !info.searchParams.includes('clientID')) {
      foundIssues.push({
        type: 'warning',
        category: 'Navigation',
        message: 'Section1 route accessed without clientID parameter',
        solution: 'Add clientID to URL parameters'
      });
    }

    setIssues(foundIssues);
  };

  useEffect(() => {
    collectDebugInfo();
    
    // Listen for navigation changes
    const handlePopState = () => {
      setTimeout(collectDebugInfo, 100);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const simulateNavigation = (path, clientID) => {
    const newUrl = `${path}?clientID=${clientID}`;
    console.log(`🔄 Simulating navigation to: ${newUrl}`);
    
    // Simulate URL change
    window.history.pushState({}, '', newUrl);
    
    // Update debug info
    setTimeout(collectDebugInfo, 100);
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'success': return <CheckIcon color="success" />;
      default: return <BugIcon />;
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🐛 Navigation Debug Tool
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This tool helps diagnose navigation and authentication issues in your React app.
      </Typography>

      <Button 
        variant="contained" 
        startIcon={<RefreshIcon />}
        onClick={collectDebugInfo}
        sx={{ mb: 3 }}
      >
        Refresh Debug Info
      </Button>

      {/* Issues Summary */}
      {issues.length > 0 && (
        <Alert 
          severity={issues.some(i => i.type === 'error') ? 'error' : 'warning'}
          sx={{ mb: 3 }}
        >
          <Typography variant="h6" gutterBottom>
            {issues.length} Issue(s) Found
          </Typography>
          {issues.slice(0, 3).map((issue, idx) => (
            <Typography key={idx} variant="body2">
              • {issue.message}
            </Typography>
          ))}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Current State */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <RouteIcon color="primary" />
                <Typography variant="h6">Current Navigation State</Typography>
              </Box>
              
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Current Path" 
                    secondary={debugInfo.currentPath || '/'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Search Parameters" 
                    secondary={debugInfo.searchParams || 'none'} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Full URL" 
                    secondary={debugInfo.fullUrl} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Last Updated" 
                    secondary={new Date(debugInfo.timestamp).toLocaleTimeString()} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Redux State */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PersonIcon color="primary" />
                <Typography variant="h6">Redux State</Typography>
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>Selected Client:</Typography>
              <Box sx={{ mb: 2 }}>
                {debugInfo.reduxState?.selectedClient ? (
                  <Chip 
                    label={`${debugInfo.reduxState.selectedClient.clientFirstName} ${debugInfo.reduxState.selectedClient.clientLastName} (${debugInfo.reduxState.selectedClient.clientID})`}
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip label="No client selected" color="error" size="small" />
                )}
              </Box>

              <Typography variant="subtitle2" gutterBottom>Authentication:</Typography>
              <Box sx={{ mb: 2 }}>
                {debugInfo.reduxState?.authUser?.isAuthenticated ? (
                  <Chip 
                    label={`Authenticated: ${debugInfo.reduxState.authUser.name}`}
                    color="success"
                    size="small"
                  />
                ) : (
                  <Chip label="Not authenticated" color="error" size="small" />
                )}
              </Box>

              <Typography variant="subtitle2" gutterBottom>Loading State:</Typography>
              <Chip 
                label={debugInfo.reduxState?.loading ? 'Loading...' : 'Ready'}
                color={debugInfo.reduxState?.loading ? 'warning' : 'success'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Browser Storage */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Browser Storage</Typography>
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>localStorage:</Typography>
              <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(debugInfo.localStorageData, null, 2)}
                </Typography>
              </Paper>

              <Typography variant="subtitle2" gutterBottom>sessionStorage:</Typography>
              <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(debugInfo.sessionStorageData, null, 2)}
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Issues & Solutions */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <BugIcon color="primary" />
                <Typography variant="h6">Issues & Solutions</Typography>
              </Box>
              
              {issues.length === 0 ? (
                <Alert severity="success">
                  <Typography variant="body2">
                    ✅ No issues detected! Navigation should work properly.
                  </Typography>
                </Alert>
              ) : (
                <List>
                  {issues.map((issue, idx) => (
                    <ListItem key={idx} sx={{ px: 0 }}>
                      <ListItemIcon>
                        {getStatusIcon(issue.type)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={issue.category} 
                              size="small" 
                              color={getStatusColor(issue.type)}
                            />
                            <Typography variant="body2">
                              {issue.message}
                            </Typography>
                          </Box>
                        }
                        secondary={`Solution: ${issue.solution}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Test Navigation */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🧪 Test Navigation
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click these buttons to simulate navigation and see how the state changes:
              </Typography>

              <Box display="flex" gap={2} flexWrap="wrap">
                <Button 
                  variant="outlined"
                  onClick={() => simulateNavigation('/dashboard', '')}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outlined"
                  onClick={() => simulateNavigation('/Section1', 'CL-123456')}
                >
                  Section1 with Client
                </Button>
                <Button 
                  variant="outlined"
                  onClick={() => simulateNavigation('/Section1', '')}
                >
                  Section1 without Client
                </Button>
                <Button 
                  variant="outlined"
                  onClick={() => simulateNavigation('/Section2', 'CL-123456')}
                >
                  Section2 with Client
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Card elevation={1} sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔧 Recommended Fixes
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            Based on your description, here are the most likely solutions:
          </Typography>

          <List>
            <ListItem sx={{ color: 'inherit' }}>
              <ListItemText 
                primary="1. Authentication Persistence"
                secondary="Ensure auth token is stored in localStorage and Redux state is rehydrated on page load"
              />
            </ListItem>
            <ListItem sx={{ color: 'inherit' }}>
              <ListItemText 
                primary="2. Client State Management"
                secondary="Make sure selected client data persists across route changes using Redux"
              />
            </ListItem>
            <ListItem sx={{ color: 'inherit' }}>
              <ListItemText 
                primary="3. Route Protection"
                secondary="Add authentication guards to protected routes like Section1"
              />
            </ListItem>
            <ListItem sx={{ color: 'inherit' }}>
              <ListItemText 
                primary="4. URL Parameter Handling"
                secondary="Ensure Section1 component properly reads clientID from URL parameters"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NavigationDebugger;