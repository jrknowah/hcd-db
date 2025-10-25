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
  Archive as ArchiveIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import { section4List } from "../../data/arrayList";
import EncounterNote from "./EncounterNote";
import CarePlan from "./CarePlan";
import CmNoteArchive from "./CmNoteArchive";
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { fetchCarePlans } from '../../backend/store/slices/carePlanSlice';
import { fetchEncounterNotes } from '../../backend/store/slices/encounterNoteSlice';
import { fetchAssessmentData, fetchAssessmentMilestones } from '../../backend/store/slices/assessCarePlansSlice';

const ClientProgress = () => {
  const dispatch = useDispatch();
  const { clientID, client: selectedClient, hasClient } = useClientPersistence();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Get Redux state - safely handle undefined/null
  const carePlanState = useSelector(state => state.carePlan || {});
  const encounterNoteState = useSelector(state => state.encounterNote || {});
  const assessmentState = useSelector(state => state.assessCarePlans || {});

  // ✅ Extract data safely
  const carePlans = Array.isArray(carePlanState.carePlans) ? carePlanState.carePlans : [];
  const encounterNotes = Array.isArray(encounterNoteState.encounterNotes) ? encounterNoteState.encounterNotes : [];
  const assessmentData = assessmentState.assessmentData || null;
  
  // ✅ Check for actual errors (not just empty data)
  const carePlanError = carePlanState.error;
  const encounterNoteError = encounterNoteState.error;
  const assessmentError = assessmentState.error;

  const effectiveClientID = clientID || selectedClient?.clientID;

  // ✅ Load data when client changes
  useEffect(() => {
    if (effectiveClientID) {
      console.log('Loading Section 4 data for client:', effectiveClientID);
      
      setIsLoading(true);
      
      // Dispatch all actions - use Promise.allSettled to handle failures gracefully
      Promise.allSettled([
        dispatch(fetchCarePlans(effectiveClientID)),
        dispatch(fetchEncounterNotes(effectiveClientID)),
        dispatch(fetchAssessmentData(effectiveClientID)),
        dispatch(fetchAssessmentMilestones(effectiveClientID))
      ]).then(results => {
        console.log('Section 4 data loading complete:', {
          carePlans: results[0].status,
          encounterNotes: results[1].status,
          assessmentData: results[2].status,
          milestones: results[3].status
        });
        
        setIsLoading(false);
      }).catch(error => {
        console.error('Unexpected error loading Section 4 data:', error);
        setIsLoading(false);
      });
    }
  }, [effectiveClientID, dispatch]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // ✅ Helper function to safely render errors - NEVER renders objects
  const renderError = (error) => {
    if (!error) return null;
    
    // Handle string errors
    if (typeof error === 'string') {
      return error;
    }
    
    // Handle error objects with message
    if (error?.message) {
      return error.message;
    }
    
    // Handle backend routing errors
    if (error?.error) {
      return `${error.error}${error.path ? ` (${error.method || 'GET'} ${error.path})` : ''}`;
    }
    
    // If error is an object, try to stringify it safely
    try {
      return JSON.stringify(error);
    } catch {
      return 'An error occurred';
    }
  };

  // ✅ Check if we have any real errors (not just empty data)
  const hasRealErrors = Boolean(carePlanError || encounterNoteError || assessmentError);

  // ✅ Check if data is truly empty (not loading and no data)
  const hasNoData = !isLoading && 
                    carePlans.length === 0 && 
                    encounterNotes.length === 0 && 
                    !assessmentData;

  // ✅ Show message if no client selected
  if (!hasClient) {
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
      {/* ✅ Loading indicator */}
      {isLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <InfoIcon sx={{ mr: 1 }} />
          Loading Section 4 data...
        </Alert>
      )}

      {/* ✅ Error display - ONLY for actual errors, never render objects */}
      {hasRealErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Error Loading Section 4 Data:
          </Typography>
          {carePlanError && (
            <Typography variant="body2">
              • Care Plans: {renderError(carePlanError)}
            </Typography>
          )}
          {encounterNoteError && (
            <Typography variant="body2">
              • Encounter Notes: {renderError(encounterNoteError)}
            </Typography>
          )}
          {assessmentError && (
            <Typography variant="body2">
              • Assessments: {renderError(assessmentError)}
            </Typography>
          )}
        </Alert>
      )}

      {/* ✅ Empty data notice - ONLY if no errors and data loaded */}
      {!hasRealErrors && !isLoading && hasNoData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <InfoIcon sx={{ mr: 1 }} />
          No Section 4 data found for this client. Start by creating an encounter note or care plan.
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
                selectedClient
                  ? `${selectedClient.clientFirstName} ${selectedClient.clientLastName} (${selectedClient.clientID})`
                  : "No Client Selected"
              }
              color={selectedClient ? "primary" : "default"}
              variant={selectedClient ? "filled" : "outlined"}
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
                  
                  {section4List && section4List.length > 0 ? (
                    <>
                      <Paper sx={{ p: 3, mt: 2 }}>
                        <List>
                          {section4List.map((item, index) => (
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
                              {section4List.filter(item => item.section4Date).length}
                            </Typography>
                            <Typography variant="body2" color="success.contrastText">
                              Completed Tasks
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                            <Typography variant="h4" color="warning.contrastText">
                              {section4List.filter(item => !item.section4Date).length}
                            </Typography>
                            <Typography variant="body2" color="warning.contrastText">
                              Pending Tasks
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No timeline data available for this client.
                    </Alert>
                  )}
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