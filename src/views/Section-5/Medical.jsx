import React, { useState } from 'react';
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
  LocalHospital as MedicalIcon,
  Assignment as FaceSheetIcon,
  HealthAndSafety as ScreeningIcon,
  PersonalInjury as AssessmentIcon,
  Notes as NotesIcon,
  Groups as IDTIcon,
  Archive as ArchiveIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { section5List } from "../../data/arrayList";
import MedFaceSheet from "./MedFaceSheet";
import MedScreening from "./MedScreening";
import NursingAdmission from "./NursingAdmission";
import ProgressNote from "./ProgressNote";
import IDTNoteNursing from './IDTNoteNursing';
import IDTNoteProvider from './IDTNoteProvider';
import NursingArchive from './NursingArchive';

const Medical = () => {
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Mock section5List if not available
  const timelineItems = section5List || [
    { section5Title: 'Medical Face Sheet', section5Date: '2024-03-01' },
    { section5Title: 'Initial Nursing Screening', section5Date: '2024-03-02' },
    { section5Title: 'Nursing Assessment', section5Date: '2024-03-05' },
    { section5Title: 'First Progress Note', section5Date: '' },
    { section5Title: 'IDT Meeting - Nursing', section5Date: '' },
    { section5Title: 'IDT Meeting - Provider', section5Date: '' },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* ✅ Development indicator */}
      {shouldUseMockData && currentClient && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock medical data for {currentClient.clientFirstName} {currentClient.clientLastName}
        </Alert>
      )}

      {/* Medical Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MedicalIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1">
                Medical Dashboard
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
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<TimelineIcon />} 
              label="Main" 
              iconPosition="start"
            />
            <Tab 
              icon={<FaceSheetIcon />} 
              label="Face Sheet" 
              iconPosition="start"
            />
            <Tab 
              icon={<ScreeningIcon />} 
              label="Nursing Screening" 
              iconPosition="start"
            />
            <Tab 
              icon={<AssessmentIcon />} 
              label="Nursing Assessment" 
              iconPosition="start"
            />
            <Tab 
              icon={<NotesIcon />} 
              label="Progress Notes" 
              iconPosition="start"
            />
            <Tab 
              icon={<IDTIcon />} 
              label="Nursing IDT" 
              iconPosition="start"
            />
            <Tab 
              icon={<IDTIcon />} 
              label="Provider IDT" 
              iconPosition="start"
            />
            <Tab 
              icon={<ArchiveIcon />} 
              label="Nursing Archive" 
              iconPosition="start"
            />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Main/Timeline Tab */}
            <Box role="tabpanel" hidden={activeTab !== 0}>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimelineIcon color="primary" />
                    Medical Progress Timeline
                  </Typography>
                  
                  <Paper sx={{ p: 3, mt: 2 }}>
                    <List>
                      {timelineItems.map((item, index) => (
                        <ListItem key={index} sx={{ mb: 2 }}>
                          <ListItemIcon>
                            {item.section5Date ? (
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
                                  color: item.section5Date ? 'success.main' : 'text.secondary' 
                                }}
                              >
                                {item.section5Title}
                              </Typography>
                            }
                            secondary={
                              item.section5Date ? (
                                <Chip
                                  label={`Completed: ${new Date(item.section5Date).toLocaleDateString()}`}
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
                          {timelineItems.filter(item => item.section5Date).length}
                        </Typography>
                        <Typography variant="body2" color="success.contrastText">
                          Completed Medical Tasks
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                        <Typography variant="h4" color="warning.contrastText">
                          {timelineItems.filter(item => !item.section5Date).length}
                        </Typography>
                        <Typography variant="body2" color="warning.contrastText">
                          Pending Medical Tasks
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>

            {/* Face Sheet Tab */}
            <Box role="tabpanel" hidden={activeTab !== 1}>
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FaceSheetIcon color="primary" />
                    Medical Face Sheet
                  </Typography>
                  <MedFaceSheet />
                </Box>
              )}
            </Box>

            {/* Nursing Screening Tab */}
            <Box role="tabpanel" hidden={activeTab !== 2}>
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScreeningIcon color="primary" />
                    Nursing Screening
                  </Typography>
                  <MedScreening />
                </Box>
              )}
            </Box>

            {/* Nursing Assessment Tab */}
            <Box role="tabpanel" hidden={activeTab !== 3}>
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssessmentIcon color="primary" />
                    Nursing Assessment
                  </Typography>
                  <NursingAdmission />
                </Box>
              )}
            </Box>

            {/* Progress Notes Tab */}
            <Box role="tabpanel" hidden={activeTab !== 4}>
              {activeTab === 4 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotesIcon color="primary" />
                    Progress Notes
                  </Typography>
                  <ProgressNote />
                </Box>
              )}
            </Box>

            {/* Nursing IDT Tab */}
            <Box role="tabpanel" hidden={activeTab !== 5}>
              {activeTab === 5 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IDTIcon color="primary" />
                    Nursing IDT Notes
                  </Typography>
                  <IDTNoteNursing />
                </Box>
              )}
            </Box>

            {/* Provider IDT Tab */}
            <Box role="tabpanel" hidden={activeTab !== 6}>
              {activeTab === 6 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IDTIcon color="primary" />
                    Provider IDT Notes
                  </Typography>
                  <IDTNoteProvider /> 
                </Box>
              )}
            </Box>

            {/* Nursing Archive Tab */}
            <Box role="tabpanel" hidden={activeTab !== 7}>
              {activeTab === 7 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArchiveIcon color="primary" />
                    Nursing Archive
                  </Typography>
                  <NursingArchive />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Medical;