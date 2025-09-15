import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Box,
  Typography,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Notes as NotesIcon,
  Assignment as CarePlanIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import { section4List } from "../../data/arrayList";
import EncounterNote from "./EncounterNote";
import CarePlan from "./CarePlan";
import CmNoteArchive from "./CmNoteArchive";
import { useClientManager } from '../../hooks/useClientManager';
import { fetchCarePlans } from '../../backend/store/slices/carePlanSlice';
import { fetchEncounterNotes } from '../../backend/store/slices/encounterNoteSlice';
import { fetchAssessmentData, fetchAssessmentMilestones } from '../../backend/store/slices/assessCarePlansSlice';

const ClientProgress = () => {
  const dispatch = useDispatch();
  const { clientID, selectedClient, hasClient } = useClientManager();
  const [activeTab, setActiveTab] = useState(0);

  // ✅ Environment detection for mock data
  const isDevelopment = import.meta.env.MODE === 'development';
  const shouldUseMockData = isDevelopment && !import.meta.env.VITE_USE_REAL_DATA;
  
  // Mock client for development
  const MOCK_CLIENT = {
    clientID: 'mock-123',
    clientFirstName: 'John',
    clientLastName: 'Doe',
  };
  
  const currentClient = shouldUseMockData && !selectedClient ? MOCK_CLIENT : selectedClient;
  const effectiveClientID = clientID || currentClient?.clientID;

  // ✅ ADD THIS: Load data when client changes
  useEffect(() => {
    if (effectiveClientID) {
      console.log('Loading data for client:', effectiveClientID);
      
      // Dispatch actions to load data
      dispatch(fetchCarePlans(effectiveClientID));
      dispatch(fetchEncounterNotes(effectiveClientID));
      dispatch(fetchAssessmentData(effectiveClientID));
      dispatch(fetchAssessmentMilestones(effectiveClientID));
    }
  }, [effectiveClientID, dispatch]);

  // ✅ ADD THIS: Debug logging for persistence
  useEffect(() => {
    console.log('Client Persistence Check:');
    console.log('- URL clientID:', clientID);
    console.log('- Redux selectedClient:', selectedClient);
    console.log('- Has client:', hasClient);
    console.log('- Effective clientID:', effectiveClientID);
    console.log('- SessionStorage:', sessionStorage.getItem('redux_cache'));
  }, [clientID, selectedClient, hasClient, effectiveClientID]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Mock section4List if not available
  const timelineItems = section4List || [
    { section4Title: 'Initial Assessment', section4Date: '2024-03-01' },
    { section4Title: 'Housing Application', section4Date: '2024-03-10' },
    { section4Title: 'Mental Health Evaluation', section4Date: '' },
    { section4Title: 'Employment Screening', section4Date: '' },
  ];

  // ✅ ADD THIS: Show message if no client selected
  if (!hasClient && !shouldUseMockData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          No client selected. Please select a client to view progress information.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && currentClient && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock data for {currentClient.clientFirstName} {currentClient.clientLastName}
        </Alert>
      )}

      {/* Client Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1">
                Client Progress Dashboard
              </Typography>
            </Box>
            <Chip
              icon={<PersonIcon />}
              label={
                currentClient
                  ? `${currentClient.clientFirstName} ${currentClient.clientLastName} (${currentClient.clientID})`
                  : "No Client Selected"
              }
              color={currentClient ? "primary" : "default"}
              variant={currentClient ? "filled" : "outlined"}
              size="medium"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Main Content Card */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Tabs Navigation */}
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<TimelineIcon />} 
              label="Timeline" 
              iconPosition="start"
            />
            <Tab 
              icon={<NotesIcon />} 
              label="Notes" 
              iconPosition="start"
            />
            <Tab 
              icon={<CarePlanIcon />} 
              label="Care Plan" 
              iconPosition="start"
            />
            <Tab 
              icon={<ArchiveIcon />} 
              label="Archive" 
              iconPosition="start"
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Timeline Tab */}
            <Box role="tabpanel" hidden={activeTab !== 0}>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon color="primary" />
                    Client Progress Timeline
                  </Typography>
                  
                  <Paper sx={{ p: 3, mt: 2 }}>
                    <List>
                      {timelineItems.map((item, index) => (
                        <ListItem key={index} sx={{ mb: 2 }}>
                          <ListItemIcon>
                            {item.section4Date ? (
                              <CheckCircleIcon color="success" fontSize="large" />
                            ) : (
                              <UncheckedIcon color="disabled" fontSize="large" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: 'medium',
                                  color: item.section4Date ? 'success.main' : 'text.secondary' 
                                }}
                              >
                                {item.section4Title}
                              </Typography>
                            }
                            secondary={
                              item.section4Date ? (
                                <Chip
                                  label={`Completed: ${new Date(item.section4Date).toLocaleDateString()}`}
                                  color="success"
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              ) : (
                                <Chip
                                  label="Pending"
                                  color="default"
                                  variant="outlined"
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              )
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  
                  {/* Progress Summary */}
                  <Grid container spacing={2} sx={{ mt: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                        <Typography variant="h4" color="success.contrastText">
                          {timelineItems.filter(item => item.section4Date).length}
                        </Typography>
                        <Typography variant="body2" color="success.contrastText">
                          Completed Tasks
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                        <Typography variant="h4" color="warning.contrastText">
                          {timelineItems.filter(item => !item.section4Date).length}
                        </Typography>
                        <Typography variant="body2" color="warning.contrastText">
                          Pending Tasks
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>

            {/* Notes Tab */}
            <Box role="tabpanel" hidden={activeTab !== 1}>
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotesIcon color="primary" />
                    Encounter Notes
                  </Typography>
                  <EncounterNote />
                </Box>
              )}
            </Box>

            {/* Care Plan Tab */}
            <Box role="tabpanel" hidden={activeTab !== 2}>
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CarePlanIcon color="primary" />
                    Care Plan Management
                  </Typography>
                  <CarePlan />
                </Box>
              )}
            </Box>

            {/* Archive Tab */}
            <Box role="tabpanel" hidden={activeTab !== 3}>
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArchiveIcon color="primary" />
                    Document Archive
                  </Typography>
                  <CmNoteArchive />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ClientProgress;