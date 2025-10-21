import React, { useState } from 'react';
import { useClientPersistence } from '../../hooks/useClientPersistence';
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
import { section5List } from "../../data/arrayList";
import MedFaceSheet from "./MedFaceSheet";
import MedScreening from "./MedScreening";
import NursingAdmission from "./NursingAdmission";
import ProgressNote from "./ProgressNote";
import IDTNoteNursing from './IDTNoteNursing';
import IDTNoteProvider from './IDTNoteProvider';
import NursingArchive from './NursingArchive';

const Medical = () => {
  // ✅ ALIGNED: Match Identification.jsx pattern exactly
  const { clientID, client, hasClient, user, shouldUseMockData, isDevelopment } = useClientPersistence();
  
  const [activeTab, setActiveTab] = useState(0);

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

  // ✅ ALIGNED: Same client check pattern as Identification.jsx
  if (!hasClient && !shouldUseMockData) {
    return (
      <Card sx={{ padding: 2 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {isDevelopment 
            ? "Development Mode: No Client Selected" 
            : "Please select a client to view medical information."}
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* ✅ ALIGNED: Development indicator like Identification.jsx */}
      {shouldUseMockData && client && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock medical data for {client.clientFirstName} {client.clientLastName}
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
                client
                  ? `${client.clientFirstName} ${client.clientLastName} (${client.clientID})`
                  : "No Client Selected"
              }
              color={client ? "primary" : "default"}
              variant={client ? "filled" : "outlined"}
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
            <Tab icon={<TimelineIcon />} label="Main" iconPosition="start" />
            <Tab icon={<FaceSheetIcon />} label="Face Sheet" iconPosition="start" />
            <Tab icon={<ScreeningIcon />} label="Nursing Screening" iconPosition="start" />
            <Tab icon={<AssessmentIcon />} label="Nursing Assessment" iconPosition="start" />
            <Tab icon={<NotesIcon />} label="Progress Notes" iconPosition="start" />
            <Tab icon={<IDTIcon />} label="Nursing IDT" iconPosition="start" />
            <Tab icon={<IDTIcon />} label="Provider IDT" iconPosition="start" />
            <Tab icon={<ArchiveIcon />} label="Nursing Archive" iconPosition="start" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            {/* Main/Timeline Tab */}
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

            {/* Face Sheet Tab - ✅ FIXED: Pass clientID prop */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaceSheetIcon color="primary" />
                  Medical Face Sheet
                </Typography>
                <MedFaceSheet clientID={clientID} />
              </Box>
            )}

            {/* Nursing Screening Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScreeningIcon color="primary" />
                  Nursing Screening
                </Typography>
                <MedScreening />
              </Box>
            )}

            {/* Nursing Assessment Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon color="primary" />
                  Nursing Assessment
                </Typography>
                <NursingAdmission />
              </Box>
            )}

            {/* Progress Notes Tab */}
            {activeTab === 4 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotesIcon color="primary" />
                  Progress Notes
                </Typography>
                <ProgressNote />
              </Box>
            )}

            {/* Nursing IDT Tab */}
            {activeTab === 5 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IDTIcon color="primary" />
                  Nursing IDT Notes
                </Typography>
                <IDTNoteNursing />
              </Box>
            )}

            {/* Provider IDT Tab */}
            {activeTab === 6 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IDTIcon color="primary" />
                  Provider IDT Notes
                </Typography>
                <IDTNoteProvider /> 
              </Box>
            )}

            {/* Nursing Archive Tab */}
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
        </CardContent>
      </Card>
    </Box>
  );
};

export default Medical;