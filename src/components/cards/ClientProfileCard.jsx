// Updated ClientProfileCard.jsx with working edit functionality

import React, { useEffect, useState, useMemo } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { fetchClientById } from 'src/store/slices/clientSlice';

const ClientProfileCard = ({ 
  clientID, 
  onClose, 
  onEditClient,    // ✅ Add this prop for edit functionality
  onViewForms      // ✅ Add this prop for view forms functionality
}) => {
  const dispatch = useDispatch();
  const selectedClient = useSelector((state) => state.clients.selectedClient);
  const loading = useSelector((state) => state.clients.loading);
  
  const [expandedSection, setExpandedSection] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (clientID && (!selectedClient || selectedClient.clientID !== clientID)) {
      setLocalLoading(true);
      dispatch(fetchClientById(clientID))
        .finally(() => setLocalLoading(false));
    }
  }, [clientID, selectedClient, dispatch]);

  // Calculate age
  const age = useMemo(() => {
    if (!selectedClient?.clientDOB) return null;
    const today = new Date();
    const birthDate = new Date(selectedClient.clientDOB);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }, [selectedClient?.clientDOB]);

  // Generate avatar initials
  const avatarInitials = useMemo(() => {
    if (!selectedClient) return '';
    const firstName = selectedClient.clientFirstName || '';
    const lastName = selectedClient.clientLastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }, [selectedClient]);

  // Calculate days since admission
  const daysSinceAdmission = useMemo(() => {
    if (!selectedClient?.clientAdmitDate) return null;
    const admitDate = new Date(selectedClient.clientAdmitDate);
    const today = new Date();
    const diffTime = Math.abs(today - admitDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [selectedClient?.clientAdmitDate]);

  // Handle accordion expand
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : null);
  };

  // ✅ Fixed event handlers to use prop functions with debugging
  const handleEditClient = () => {
    console.log('🔧 ClientProfileCard handleEditClient called');
    console.log('🔧 clientID:', clientID);
    console.log('🔧 onEditClient function exists:', typeof onEditClient);
    
    if (onEditClient && clientID) {
      console.log('🔧 Calling onEditClient with:', clientID);
      onEditClient(clientID);
    } else {
      console.warn('❌ onEditClient prop not provided or clientID missing');
      console.log('🔧 onEditClient:', onEditClient);
      console.log('🔧 clientID:', clientID);
    }
  };

  const handleViewForms = () => {
    console.log('📋 ClientProfileCard handleViewForms called');
    console.log('🔧 clientID:', clientID);
    console.log('🔧 onViewForms function exists:', typeof onViewForms);
    
    if (onViewForms && clientID) {
      console.log('📋 Calling onViewForms with:', clientID);
      onViewForms(clientID);
    } else {
      console.warn('❌ onViewForms prop not provided or clientID missing');
      console.log('🔧 onViewForms:', onViewForms);
      console.log('🔧 clientID:', clientID);
    }
  };

  if (loading || localLoading) {
    return (
      <Card elevation={2}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading client profile...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!selectedClient) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Alert severity="info">
            Select a client to view their profile
          </Alert>
        </CardContent>
      </Card>
    );
  }

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
                  bgcolor: 'success.main',
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
              {selectedClient.clientFirstName} {selectedClient.clientLastName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              ID: {selectedClient.clientID}
            </Typography>
            <Chip 
              label="ACTIVE"
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
              --
            </Typography>
            <Typography variant="caption">Forms</Typography>
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: 0 }}>
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
                  secondary={selectedClient.clientDOB ? new Date(selectedClient.clientDOB).toLocaleDateString() : 'Not provided'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Gender" 
                  secondary={selectedClient.clientGender || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Pronouns" 
                  secondary={selectedClient.clientPronouns || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><LocationIcon fontSize="small" /></ListItemIcon>
                <ListItemText 
                  primary="Site" 
                  secondary={selectedClient.clientSite || 'Not assigned'} 
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
                  secondary={selectedClient.clientEthnicity || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Race" 
                  secondary={selectedClient.clientRace || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Veteran Status" 
                  secondary={selectedClient.clientVetStatus || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Citizenship" 
                  secondary={selectedClient.clientCitizenship || 'Not specified'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Primary Language" 
                  secondary={selectedClient.clientPrimaryLang || 'Not specified'} 
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
                  secondary={selectedClient.clientAdmitDate ? new Date(selectedClient.clientAdmitDate).toLocaleDateString() : 'Not provided'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Created Date" 
                  secondary={selectedClient.createdAt ? new Date(selectedClient.createdAt).toLocaleDateString() : 'Not available'} 
                />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>
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
            disabled={!onEditClient} // ✅ Disable if no handler provided
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={handleViewForms}
            size="small"
            fullWidth
            disabled={!onViewForms} // ✅ Disable if no handler provided
          >
            Forms
          </Button>
        </Stack>
      </CardActions>
    </Card>
  );
};

export default ClientProfileCard;