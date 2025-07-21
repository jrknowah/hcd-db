import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Avatar,
  Chip,
  Button,
  IconButton,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  MedicalServices as MedicalIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  Share as ShareIcon
} from '@mui/icons-material';

// Mock data for demonstration - replace with actual Redux selectors
const getMockClient = (clientID) => ({
  clientID: clientID,
  clientFirstName: 'John',
  clientLastName: 'Doe',
  clientDOB: '1980-05-15',
  clientSite: '104th',
  clientGender: 'Male',
  clientPronouns: 'He/him/his',
  clientEthnicity: 'Non-Hispanic/Non-Latino',
  clientRace: 'White',
  clientVetStatus: 'Protected Veteran',
  clientCitizenship: 'US Citizen',
  clientPrimaryLang: 'English',
  clientMaritalStatus: 'Single',
  clientAdmitDate: '2025-01-15',
  status: 'active',
  avatar: null,
  lastActivity: '2025-01-20T10:30:00Z',
  caseworker: 'Sarah Johnson',
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Sister',
    phone: '(555) 123-4567'
  }
});

// Mock form completion data
const getMockFormCompletion = (clientID) => ({
  orientation: { completed: true, completedAt: '2025-01-16T09:00:00Z' },
  clientRights: { completed: true, completedAt: '2025-01-16T09:30:00Z' },
  consentTreatment: { completed: false, completedAt: null },
  privacyPractice: { completed: true, completedAt: '2025-01-16T10:00:00Z' },
  lahmis: { completed: false, completedAt: null },
  phiRelease: { completed: true, completedAt: '2025-01-17T14:00:00Z' },
  housingAgreement: { completed: true, completedAt: '2025-01-17T15:00:00Z' },
  overallCompletion: 71
});

const ClientProfileCard = ({ clientID, onClose }) => {
  const dispatch = useDispatch();
  
  // Redux selectors - replace with actual selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const loading = useSelector((state) => state.clients?.loading || false);
  const authForms = useSelector((state) => state.authSig?.forms || {});
  
  // Local state
  const [expandedSection, setExpandedSection] = useState(null);
  const [showAllForms, setShowAllForms] = useState(false);

  // Get client data - use mock for now, replace with actual data
  const client = useMemo(() => {
    if (selectedClient && selectedClient.clientID === clientID) {
      return selectedClient;
    }
    return getMockClient(clientID);
  }, [clientID, selectedClient]);

  // Get form completion data
  const formCompletion = useMemo(() => {
    return getMockFormCompletion(clientID);
  }, [clientID, authForms]);

  // Calculate age
  const age = useMemo(() => {
    if (!client?.clientDOB) return null;
    const today = new Date();
    const birthDate = new Date(client.clientDOB);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }, [client?.clientDOB]);

  // Generate avatar initials
  const avatarInitials = useMemo(() => {
    if (!client) return '';
    const firstName = client.clientFirstName || '';
    const lastName = client.clientLastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }, [client]);

  // Calculate days since admission
  const daysSinceAdmission = useMemo(() => {
    if (!client?.clientAdmitDate) return null;
    const admitDate = new Date(client.clientAdmitDate);
    const today = new Date();
    const diffTime = Math.abs(today - admitDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [client?.clientAdmitDate]);

  // Handle accordion expand
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : null);
  };

  // Handle edit client
  const handleEditClient = () => {
    // Navigate to edit client form or open edit modal
    console.log('Edit client:', clientID);
  };

  // Handle view forms
  const handleViewForms = () => {
    // Navigate to authorization forms
    console.log('View forms for client:', clientID);
  };

  // Handle print profile
  const handlePrintProfile = () => {
    window.print();
  };

  if (loading) {
    return (
      <Card elevation={2}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading client profile...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Alert severity="error">
            Client not found
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const completedForms = Object.values(formCompletion).filter(form => 
    typeof form === 'object' && form.completed
  ).length;
  const totalForms = Object.keys(formCompletion).length - 1; // Exclude overallCompletion

  return (
    <Card elevation={3} sx={{ position: 'sticky', top: 20 }}>
      {/* Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        p: 2,
        position: 'relative'
      }}>
        {onClose && (
          <IconButton
            onClick={onClose}
            sx={{ 
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white'
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: client.status === 'active' ? 'success.main' : 'grey.500',
                  border: '2px solid white'
                }}
              />
            }
          >
            <Avatar
              sx={{ 
                width: 60, 
                height: 60, 
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}
            >
              {avatarInitials}
            </Avatar>
          </Badge>
          
          <Box sx={{ ml: 2, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {client.clientFirstName} {client.clientLastName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              ID: {client.clientID}
            </Typography>
            <Chip 
              label={client.status?.toUpperCase() || 'ACTIVE'}
              size="small"
              sx={{ 
                mt: 1,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white'
              }}
            />
          </Box>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {age || 'N/A'}
            </Typography>
            <Typography variant="caption">Age</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {daysSinceAdmission || 'N/A'}
            </Typography>
            <Typography variant="caption">Days Here</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {formCompletion.overallCompletion}%
            </Typography>
            <Typography variant="caption">Forms</Typography>
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 0 }}>
        {/* Form Completion Status */}
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Authorization Forms
            </Typography>
            <Chip 
              label={`${completedForms}/${totalForms} Complete`}
              size="small"
              color={completedForms === totalForms ? 'success' : 'warning'}
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={formCompletion.overallCompletion} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              mb: 2
            }}
            color={formCompletion.overallCompletion === 100 ? 'success' : 'primary'}
          />

          <Button
            fullWidth
            variant="outlined"
            startIcon={<AssignmentIcon />}
            onClick={handleViewForms}
            size="small"
          >
            View Authorization Forms
          </Button>
        </Box>

        <Divider />

        {/* Basic Information */}
        <Accordion 
          expanded={expandedSection === 'basic'} 
          onChange={handleAccordionChange('basic')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 600 }}>Basic Information</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              <ListItem>
                <ListItemIcon><CalendarIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Date of Birth" 
                  secondary={client.clientDOB ? new Date(client.clientDOB).toLocaleDateString() : 'Not provided'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Gender" 
                  secondary={client.clientGender || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Pronouns" 
                  secondary={client.clientPronouns || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><LocationIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Site" 
                  secondary={client.clientSite || 'Not assigned'} 
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Demographics */}
        <Accordion 
          expanded={expandedSection === 'demographics'} 
          onChange={handleAccordionChange('demographics')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SecurityIcon sx={{ mr: 1, color: 'info.main' }} />
              <Typography sx={{ fontWeight: 600 }}>Demographics</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Ethnicity" 
                  secondary={client.clientEthnicity || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Race" 
                  secondary={client.clientRace || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Veteran Status" 
                  secondary={client.clientVetStatus || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Citizenship" 
                  secondary={client.clientCitizenship || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Primary Language" 
                  secondary={client.clientPrimaryLang || 'Not specified'} 
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Case Information */}
        <Accordion 
          expanded={expandedSection === 'case'} 
          onChange={handleAccordionChange('case')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HomeIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography sx={{ fontWeight: 600 }}>Case Information</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Admit Date" 
                  secondary={client.clientAdmitDate ? new Date(client.clientAdmitDate).toLocaleDateString() : 'Not provided'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Caseworker" 
                  secondary={client.caseworker || 'Not assigned'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Last Activity" 
                  secondary={client.lastActivity ? new Date(client.lastActivity).toLocaleDateString() : 'No recent activity'} 
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Emergency Contact */}
        {client.emergencyContact && (
          <Accordion 
            expanded={expandedSection === 'emergency'} 
            onChange={handleAccordionChange('emergency')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PhoneIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography sx={{ fontWeight: 600 }}>Emergency Contact</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Name" 
                    secondary={client.emergencyContact.name} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Relationship" 
                    secondary={client.emergencyContact.relationship} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><PhoneIcon fontSize="small" /></ListItemIcon>
                  <ListItemText 
                    primary="Phone" 
                    secondary={client.emergencyContact.phone} 
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Recent Forms Activity */}
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Recent Form Activity
          </Typography>
          
          <Stack spacing={1}>
            {Object.entries(formCompletion)
              .filter(([key, value]) => key !== 'overallCompletion' && value.completed)
              .slice(0, showAllForms ? undefined : 3)
              .map(([formType, data]) => (
                <Paper key={formType} variant="outlined" sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {data.completedAt ? new Date(data.completedAt).toLocaleDateString() : ''}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            
            {Object.keys(formCompletion).length > 4 && (
              <Button
                size="small"
                onClick={() => setShowAllForms(!showAllForms)}
              >
                {showAllForms ? 'Show Less' : 'Show More'}
              </Button>
            )}
          </Stack>
        </Box>
      </CardContent>

      {/* Action Buttons */}
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEditClient}
            size="small"
            fullWidth
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={handleViewForms}
            size="small"
            fullWidth
          >
            Forms
          </Button>
          <Tooltip title="Print Profile">
            <IconButton onClick={handlePrintProfile} size="small">
              <PrintIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardActions>
    </Card>
  );
};

export default ClientProfileCard;