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
  Paper,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Notes as NotesIcon,
  Assignment as CarePlanIcon,
  Archive as ArchiveIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import { section4List } from "../../data/arrayList";
import EncounterNote from "./EncounterNote";
import CarePlan from "./CarePlan";
import CmNoteArchive from "./CmNoteArchive";
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { getWeeklyNoteCompliance, NOTES_PER_WEEK } from '../../utils/noteCompliance';
import {
  fetchCarePlans,
  setCurrentClient as setCarePlanClient
} from '../../backend/store/slices/carePlanSlice';
import {
  fetchEncounterNotes,
  setCurrentClient as setEncounterNoteClient
} from '../../backend/store/slices/encounterNoteSlice';
import {
  fetchAssessmentData,
  fetchAssessmentMilestones,
  setCurrentClient as setAssessmentClient
} from '../../backend/store/slices/assessCarePlansSlice';

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

  // ✅ Weekly note compliance (notes are required twice a week)
  const noteCompliance = getWeeklyNoteCompliance(encounterNotes, {
    startDate: selectedClient?.clientAdmitDate
  });

  const NOTE_STATUS = {
    'on-track': { label: 'On Track', color: 'success' },
    behind: { label: 'Behind Schedule', color: 'error' },
    none: { label: 'No Notes Yet', color: 'default' }
  };
  const WEEK_STATUS = {
    complete: { color: 'success', variant: 'filled' },
    'in-progress': { color: 'info', variant: 'outlined' },
    partial: { color: 'warning', variant: 'filled' },
    missed: { color: 'error', variant: 'filled' }
  };

  // Timeline items: "Notes" reflects real note compliance, others use section4List
  const timelineItems = (section4List || []).map(item =>
    item.section4Title === 'Notes'
      ? { ...item, isNotes: true, isComplete: noteCompliance.overallStatus === 'on-track' }
      : { ...item, isComplete: Boolean(item.section4Date) }
  );

  const formatWeek = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const renderNoteStatus = () => {
    const status = NOTE_STATUS[noteCompliance.overallStatus];
    const { currentWeek, lastNoteDate, daysSinceLastNote, complianceRate,
            compliantWeeks, totalPastWeeks, notesNeededThisWeek } = noteCompliance;

    return (
      <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Chip label={status.label} color={status.color} size="small" />
          {currentWeek && (
            <Chip
              label={`This week: ${currentWeek.count} of ${NOTES_PER_WEEK}`}
              color={currentWeek.count >= NOTES_PER_WEEK ? 'success' : 'info'}
              variant="outlined"
              size="small"
            />
          )}
          {complianceRate !== null && (
            <Chip
              label={`${compliantWeeks}/${totalPastWeeks} weeks compliant (${complianceRate}%)`}
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Requirement: {NOTES_PER_WEEK} notes per week (Mon–Sun).{' '}
          {lastNoteDate
            ? `Last note: ${lastNoteDate.toLocaleDateString()} (${daysSinceLastNote === 0 ? 'today' : `${daysSinceLastNote} day${daysSinceLastNote === 1 ? '' : 's'} ago`}).`
            : 'No notes recorded.'}{' '}
          {notesNeededThisWeek > 0 &&
            `${notesNeededThisWeek} more note${notesNeededThisWeek === 1 ? '' : 's'} due by Sunday.`}
        </Typography>

        {currentWeek && (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (currentWeek.count / NOTES_PER_WEEK) * 100)}
            color={currentWeek.count >= NOTES_PER_WEEK ? 'success' : 'info'}
            sx={{ mt: 1, height: 6, borderRadius: 3, maxWidth: 320 }}
          />
        )}

        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          {noteCompliance.weeks.map(week => {
            const style = WEEK_STATUS[week.status];
            return (
              <Tooltip
                key={week.weekStart.toISOString()}
                title={`Week of ${formatWeek(week.weekStart)} – ${formatWeek(week.weekEnd)}: ${week.count} of ${week.required} notes${week.isCurrent ? ' (current week)' : ''}`}
              >
                <Chip
                  label={`${formatWeek(week.weekStart)}: ${week.count}/${week.required}`}
                  color={style.color}
                  variant={style.variant}
                  size="small"
                />
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    );
  };

  // ✅ Load data when client changes
  useEffect(() => {
    if (effectiveClientID) {
      console.log('Loading Section 4 data for client:', effectiveClientID);

      // ✅ CLIENT-SWITCH GUARD: wipe each slice's prior-client data the moment
      //    the selected client changes, BEFORE kicking off the new fetches.
      //    This prevents the previous client's plans/notes/assessment data
      //    from lingering in the UI while the new requests are in flight.
      dispatch(setCarePlanClient(effectiveClientID));
      dispatch(setEncounterNoteClient(effectiveClientID));
      dispatch(setAssessmentClient(effectiveClientID));

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
                  
                  {timelineItems.length > 0 ? (
                    <>
                      <Paper sx={{ p: 3, mt: 2 }}>
                        <List>
                          {timelineItems.map((item, index) => (
                            <ListItem key={index} sx={{ mb: 2, alignItems: 'flex-start' }}>
                              <ListItemIcon sx={{ mt: 0.5 }}>
                                {item.isComplete ? (
                                  <CheckCircleIcon color="success" fontSize="large" />
                                ) : item.isNotes && noteCompliance.overallStatus === 'behind' ? (
                                  <WarningIcon color="error" fontSize="large" />
                                ) : (
                                  <UncheckedIcon color="disabled" fontSize="large" />
                                )}
                              </ListItemIcon>
                              <ListItemText
                                secondaryTypographyProps={{ component: 'div' }}
                                primary={
                                  <Typography 
                                    variant="subtitle1" 
                                    sx={{ 
                                      fontWeight: 'medium',
                                      color: item.isComplete ? 'success.main' : 'text.secondary' 
                                    }}
                                  >
                                    {item.section4Title}
                                  </Typography>
                                }
                                secondary={
                                  item.isNotes ? (
                                    renderNoteStatus()
                                  ) : item.section4Date ? (
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
                              {timelineItems.filter(item => item.isComplete).length}
                            </Typography>
                            <Typography variant="body2" color="success.contrastText">
                              Completed Tasks
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                            <Typography variant="h4" color="warning.contrastText">
                              {timelineItems.filter(item => !item.isComplete).length}
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