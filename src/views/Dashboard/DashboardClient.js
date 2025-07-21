import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Divider,
  Tooltip,
  CircularProgress,
  Stack,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
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
  Schedule as ScheduleIcon
} from '@mui/icons-material';

import ClientProfileCard from 'src/components/cards/ClientProfileCard';
import ClientTable from 'src/components/tables/ClientTable';
import NewClient from './NewClient';

// Import Redux actions if available
// import { fetchClients, selectAllClients, selectClientsLoading } from 'src/store/slices/clientSlice';

const DashboardClient = () => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const user = useSelector((state) => state.auth?.user);
  const clients = useSelector((state) => state.clients?.clients || []);
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const loading = useSelector((state) => state.clients?.loading || false);
  
  // Local state
  const [newClientModal, setNewClientModal] = useState(false);
  const [selectedClientID, setSelectedClientID] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [activeTab, setActiveTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch clients on component mount
  useEffect(() => {
    // Uncomment when Redux action is available
    // if (dispatch && !clients.length) {
    //   dispatch(fetchClients());
    // }
  }, [dispatch]);

  // Filter and search logic
  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.clientFirstName?.toLowerCase().includes(query) ||
        client.clientLastName?.toLowerCase().includes(query) ||
        client.clientID?.toLowerCase().includes(query) ||
        client.clientSite?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'new':
          // Clients added in last 7 days
          filtered = filtered.filter(client => {
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
    const totalClients = clients.length;
    const newThisWeek = clients.filter(client => {
      const createdDate = new Date(client.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length;
    
    const veterans = clients.filter(client => 
      client.clientVetStatus === 'Protected Veteran' || 
      client.clientVetStatus === 'I am a veteran, but I am not a protected veteran'
    ).length;

    const activeClients = clients.filter(client => client.status === 'active').length;

    return {
      total: totalClients,
      newThisWeek,
      veterans,
      active: activeClients,
      formsComplete: Math.floor(totalClients * 0.7) // Mock percentage
    };
  }, [clients]);

  // Event handlers
  const handleClientCreated = useCallback((clientID) => {
    setSelectedClientID(clientID);
    setNewClientModal(false);
    
    // Refresh clients list if needed
    // dispatch(fetchClients());
  }, []);

  const handleSelectClient = useCallback((clientID) => {
    setSelectedClientID(clientID);
  }, []);

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
    // dispatch(fetchClients());
  }, []);

  const handleCloseModal = useCallback(() => {
    setNewClientModal(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    setNewClientModal(true);
  }, []);

  // Render dashboard statistics
  const renderDashboardStats = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
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

      {/* Results summary */}
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredClients.length} of {clients.length} clients
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
          Manage clients, track progress, and access client information
        </Typography>
      </Box>

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
    </Box>
  );
};

export default DashboardClient;