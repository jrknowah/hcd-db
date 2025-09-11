// Fixed DashboardClient.js with working navigation

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Alert,
  Fade,
  Zoom,
  Paper,
  Tooltip,
  CircularProgress,
  Stack,
  Badge,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon
} from '@mui/icons-material';

import ClientProfileCard from 'src/components/cards/ClientProfileCard';
import ClientTable from 'src/components/tables/ClientTable';
import NewClient from './NewClient';
import NavigationDebugger from '../../components/debug/NavigationDebugger';

// Import Redux actions
import { 
  fetchClients, 
  selectAllClients, 
  selectClientsLoading, 
  selectClientsError,
  fetchClientById,
  setSelectedClient
} from 'src/store/slices/clientSlice';

const DashboardClient = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  // ✅ FIXED: Move Redux selectors to the TOP, before any useEffect that uses them
  const user = useSelector((state) => state.auth?.user);
  const clients = useSelector(selectAllClients);
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const loading = useSelector(selectClientsLoading);
  const error = useSelector(selectClientsError);
  
  // ✅ FIXED: Local state comes AFTER Redux selectors
  const [newClientModal, setNewClientModal] = useState(false);
  const [editClientModal, setEditClientModal] = useState(false);
  const [editingClientID, setEditingClientID] = useState(null);
  const [editingClientData, setEditingClientData] = useState(null);
  const [selectedClientID, setSelectedClientID] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [activeTab, setActiveTab] = useState(0);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // ✅ FIXED: Debug logging AFTER variables are declared
  console.log('🔍 Current pathname:', location.pathname);
  console.log('🔍 URL Client ID from params:', searchParams.get('clientID'));

  // ✅ FIXED: useEffect now comes AFTER all variables are declared
  useEffect(() => {
    console.log('🔗 API URL:', import.meta.env.VITE_API_URL);
    console.log('📊 Redux clients state:', clients);
    console.log('📊 Redux loading state:', loading);
    console.log('📊 Redux error state:', error);
    
    // Test API call directly
    console.log('🧪 Testing API call...');
    fetch(`${import.meta.env.VITE_API_URL}/api/clients`)
      .then(response => {
        console.log('🌐 API Response status:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('📋 Real clients from API:', data);
        console.log('📋 Number of clients:', data?.length);
      })
      .catch(err => {
        console.error('❌ API call failed:', err);
      });
  }, [clients, loading, error]);

  // ✅ Load client from URL on page load/refresh (only for dashboard)
  useEffect(() => {
    const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
    
    if (isDashboard) {
      const clientIDFromParams = searchParams.get('clientID');
      if (clientIDFromParams) {
        console.log('🔄 Loading client from URL for dashboard:', clientIDFromParams);
        const existingClient = clients?.find(c => c.clientID === clientIDFromParams);
        if (existingClient) {
          dispatch(setSelectedClient(existingClient));
        } else {
          dispatch(fetchClientById(clientIDFromParams));
        }
      }
    }
  }, [location.pathname, searchParams, dispatch, clients]);

  // Restore client data on page load
  // Restore client from cache on page refresh
  useEffect(() => {
    const clientIDFromURL = searchParams.get('clientID');
    
    if (clientIDFromURL && !selectedClient && !loading) {
      console.log('🔄 Attempting to restore client:', clientIDFromURL);
      
      // Check sessionStorage first
      const cachedClient = sessionStorage.getItem(`client_${clientIDFromURL}`);
      
      if (cachedClient) {
        try {
          const clientData = JSON.parse(cachedClient);
          console.log('✅ Restoring from cache:', clientData);
          dispatch(setSelectedClient(clientData));
          setSelectedClientID(clientIDFromURL);
        } catch (e) {
          console.error('Failed to parse cached client:', e);
          dispatch(fetchClientById(clientIDFromURL));
        }
      } else {
        // No cache, fetch from server
        console.log('📡 No cache found, fetching from server');
        dispatch(fetchClientById(clientIDFromURL));
        setSelectedClientID(clientIDFromURL);
      }
    }
  }, [ searchParams, selectedClient, loading, dispatch]);

  // Fetch clients on component mount
  useEffect(() => {
    if (dispatch) {
      dispatch(fetchClients());
    }
  }, [dispatch]);

  // Filter and search logic
  const filteredClients = useMemo(() => {
    let filtered = clients || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.clientFirstName?.toLowerCase().includes(query) ||
        client.clientLastName?.toLowerCase().includes(query) ||
        client.clientID?.toLowerCase().includes(query) ||
        client.clientSite?.toLowerCase().includes(query)
      );
    }

    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'new':
          filtered = filtered.filter(client => {
            if (!client.createdAt) return false;
            const createdDate = new Date(client.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return createdDate > weekAgo;
          });
          break;
        case 'veteran':
          filtered = filtered.filter(client => 
            client.clientVetStatus === 'Protected Veteran' || 
            client.clientVetStatus === 'I am a veteran, but I am not a protected veteran'
          );
          break;
        case 'active':
          filtered = filtered.filter(client => client.status === 'active');
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [clients, searchQuery, filterBy]);

  // Dashboard statistics
  const dashboardStats = useMemo(() => {
    const totalClients = clients?.length || 0;
    const newThisWeek = clients?.filter(client => {
      if (!client.createdAt) return false;
      const createdDate = new Date(client.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length || 0;
    
    const veterans = clients?.filter(client => 
      client.clientVetStatus === 'Protected Veteran' || 
      client.clientVetStatus === 'I am a veteran, but I am not a protected veteran'
    ).length || 0;

    const activeClients = clients?.filter(client => client.status === 'active').length || 0;

    return {
      total: totalClients,
      newThisWeek,
      veterans,
      active: activeClients,
      formsComplete: Math.floor(totalClients * 0.7)
    };
  }, [clients]);

  // ✅ Clean React Router navigation (no page reload)
  const handleGoToSection = useCallback((sectionName, clientID) => {
    console.log('🔄 Navigating to section:', sectionName, 'with client:', clientID);
    
    if (clientID) {
      // Find and set the client data in Redux store before navigation
      const client = clients?.find(c => c.clientID === clientID);
      if (client) {
        dispatch(setSelectedClient(client));
        console.log('✅ Client set in Redux:', client);
        
        // ✅ Simple React Router navigation
        const routeName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
        const targetPath = `/${routeName}?clientID=${clientID}`;
        
        console.log('🔄 Using React Router navigate to:', targetPath);
        navigate(targetPath);
        
      } else {
        console.error('❌ Client not found:', clientID);
      }
    }
  }, [clients, dispatch, navigate]);

  const handleBackToDashboard = useCallback(() => {
    console.log('🔄 Navigating back to Dashboard');
    navigate('/dashboard');
  }, [navigate]);

  // ✅ View Chart handler (navigates to Section1 - capitalized to match routes)
  const handleViewChart = useCallback((clientID) => {
    console.log('📊 View chart for client:', clientID);
    handleGoToSection('section1', clientID); // lowercase input, will be converted to Section1
  }, [handleGoToSection]);

  const handleViewForms = useCallback((clientID) => {
    console.log('📋 View forms for client:', clientID);
    handleGoToSection('section2', clientID); // lowercase input, will be converted to Section2
  }, [handleGoToSection]);

  // Event handlers
  const handleClientCreated = useCallback((clientID) => {
    console.log('✅ Client created:', clientID);
    setNewClientModal(false);
    setSuccessMessage('Client created successfully!');
    setShowSuccess(true);
    
    // Refresh clients list
    dispatch(fetchClients());
  }, [dispatch]);

  const handleSelectClient = useCallback((clientID) => {
    console.log('👤 Client selected:', clientID);
    setSelectedClientID(clientID);
    
    // Update URL to include clientID
    setSearchParams({ clientID });
    
    // Also store in localStorage as backup
    localStorage.setItem('selectedClientID', clientID);
  }, [setSearchParams]);

  // Edit handler - opens modal only
  const handleEditClient = useCallback((clientID) => {
    console.log('🔧 Edit client clicked:', clientID);
    
    const clientToEdit = clients?.find(c => c.clientID === clientID);
    if (!clientToEdit) {
      console.error('❌ Client not found');
      return;
    }
    
    setEditingClientID(clientID);
    setEditingClientData(clientToEdit);
    dispatch(setSelectedClient(clientToEdit));
    setEditClientModal(true);
  }, [clients, dispatch]);

  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setFilterBy(filter);
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  const handleRefresh = useCallback(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  const handleCloseModal = useCallback(() => {
    setNewClientModal(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    setNewClientModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditClientModal(false);
    setEditingClientID(null);
    setEditingClientData(null);
  }, []);

  // Simple update handler - just show success message
  const handleClientUpdated = useCallback(() => {
    console.log('✅ Client updated successfully');
    setEditClientModal(false);
    setEditingClientID(null);
    setEditingClientData(null);
    
    // Show success message
    setSuccessMessage('Client updated successfully!');
    setShowSuccess(true);
    
    // Refresh clients list
    dispatch(fetchClients());
  }, [dispatch]);

  // Close success notification
  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // ✅ This component only renders the dashboard - sections are separate routes
  // Handle both root path and dashboard path
  const isDashboardRoute = location.pathname === '/dashboard' || location.pathname === '/';
  
  if (!isDashboardRoute) {
    console.log('🔍 Not on dashboard route, pathname:', location.pathname);
    return null;
  }

  // Render dashboard statistics
  const renderDashboardStats = () => (
  <Grid container spacing={3} sx={{ mb: 3 }}>
    {process.env.NODE_ENV === 'development' && (
      <Button
        variant="outlined"
        onClick={() => setShowDebugModal(true)}
        sx={{ ml: 2 }}
      >
        🐛 Debug
      </Button>
    )}
      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2} sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <GroupIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {dashboardStats.total}
            </Typography>
            <Typography variant="body2">Total Clients</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2} sx={{ 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {dashboardStats.newThisWeek}
            </Typography>
            <Typography variant="body2">New This Week</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2} sx={{ 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <AssessmentIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {dashboardStats.veterans}
            </Typography>
            <Typography variant="body2">Veterans</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2} sx={{ 
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          color: 'white'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <ScheduleIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {dashboardStats.active}
            </Typography>
            <Typography variant="body2">Active Cases</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={2.4}>
        <Card elevation={2} sx={{ 
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          color: 'white'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <AssignmentIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {dashboardStats.formsComplete}
            </Typography>
            <Typography variant="body2">Forms Complete</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render filters and search
  const renderFiltersAndSearch = () => (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search clients..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label="All Clients"
              onClick={() => handleFilterChange('all')}
              color={filterBy === 'all' ? 'primary' : 'default'}
              variant={filterBy === 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label="New This Week"
              onClick={() => handleFilterChange('new')}
              color={filterBy === 'new' ? 'secondary' : 'default'}
              variant={filterBy === 'new' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Veterans"
              onClick={() => handleFilterChange('veteran')}
              color={filterBy === 'veteran' ? 'info' : 'default'}
              variant={filterBy === 'veteran' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Active Cases"
              onClick={() => handleFilterChange('active')}
              color={filterBy === 'active' ? 'success' : 'default'}
              variant={filterBy === 'active' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Grid>

        <Grid item xs={12} md={2}>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Table View">
              <IconButton 
                onClick={() => setViewMode('table')}
                color={viewMode === 'table' ? 'primary' : 'default'}
              >
                <ViewListIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Grid View">
              <IconButton 
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <ViewModuleIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredClients.length} of {clients?.length || 0} clients
          {searchQuery && ` for "${searchQuery}"`}
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
          sx={{ minWidth: 160 }}
        >
          Add New Client
        </Button>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link underline="hover" color="inherit" href="/dashboard">
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Typography color="text.primary">Client Management</Typography>
        </Breadcrumbs>

        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Client Management Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select a client to begin working with their information
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Dashboard Statistics */}
      {renderDashboardStats()}

      {/* Filters and Search */}
      {renderFiltersAndSearch()}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading clients...</Typography>
        </Box>
      )}

      {/* Main Content */}
      {!loading && (
        <Fade in={!loading}>
          <Grid container spacing={3}>
            {/* Client List */}
            <Grid item xs={12} lg={selectedClientID ? 8 : 12}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tab 
                      label={
                        <Badge badgeContent={filteredClients.length} color="primary">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <GroupIcon sx={{ mr: 1 }} />
                            All Clients
                          </Box>
                        </Badge>
                      } 
                    />
                    <Tab 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AssignmentIcon sx={{ mr: 1 }} />
                          Recent Activity
                        </Box>
                      } 
                    />
                  </Tabs>
                </Box>

                {/* Tab Content */}
                {activeTab === 0 && (
                  <ClientTable 
                    clients={filteredClients}
                    onSelectClient={handleSelectClient}
                    selectedClientID={selectedClientID}
                    viewMode={viewMode}
                    loading={loading}
                    onEditClient={handleEditClient}
                    onViewForms={handleViewForms}
                    onViewChart={handleViewChart} // ✅ View Chart functionality
                  />
                )}

                {activeTab === 1 && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      Recent Activity
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent client activities and updates will appear here
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Client Profile Sidebar */}
            {selectedClientID && (
              <Grid item xs={12} lg={4}>
                <Zoom in={Boolean(selectedClientID)}>
                  <Box>
                    <ClientProfileCard 
                      clientID={selectedClientID}
                      onClose={() => setSelectedClientID(null)}
                      onEditClient={handleEditClient}
                      onViewForms={handleViewForms}
                    />
                  </Box>
                </Zoom>
              </Grid>
            )}
          </Grid>
        </Fade>
      )}

      {/* Empty State */}
      {!loading && filteredClients.length === 0 && (
        <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {searchQuery || filterBy !== 'all' ? 'No clients found' : 'No clients yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery || filterBy !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first client'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenModal}
            size="large"
          >
            Add New Client
          </Button>
        </Paper>
      )}

      {/* New Client Modal */}
      <Dialog 
        open={newClientModal} 
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1 }} />
            New Client Intake
          </Box>
          <IconButton 
            onClick={handleCloseModal}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <NewClient onClientCreated={handleClientCreated} />
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog 
        open={editClientModal} 
        onClose={handleCloseEditModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Client Information
            {editingClientID && (
              <Typography variant="caption" sx={{ ml: 1, opacity: 0.8 }}>
                (ID: {editingClientID})
              </Typography>
            )}
          </Box>
          <IconButton 
            onClick={handleCloseEditModal}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {editingClientData ? (
            <NewClient 
              editMode={true}
              clientData={editingClientData}
              onClientCreated={handleClientUpdated}
            />
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading client data...</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Notification */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSuccess} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Dialog 
  open={showDebugModal} 
  onClose={() => setShowDebugModal(false)}
  maxWidth="xl"
  fullWidth
>
  <NavigationDebugger />
</Dialog>
    </Box>
  );
};

export default DashboardClient;