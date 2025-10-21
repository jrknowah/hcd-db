import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Grid,
  Chip,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';

// Complete form configurations for all 15 authorization forms
const formConfigurations = [
  // HIGH PRIORITY FORMS
  {
    id: 'orientation',
    title: 'Patient Orientation Information Sheet',
    displayTitle: 'Client Orientation',
    description: 'Initial client orientation and program overview',
    category: 'intake',
    priority: 'high',
    estimatedTime: 5,
    lahsaRequired: true,
  },
  {
    id: 'clientRights',
    title: 'Client Rights',
    description: 'Understanding your rights as a client',
    category: 'legal',
    priority: 'high',
    estimatedTime: 3,
    lahsaRequired: true,
  },
  {
    id: 'consentTreatment',
    title: 'Consent for Treatment and Services',
    displayTitle: 'Consent for Treatment',
    description: 'Authorization for treatment and services',
    category: 'legal',
    priority: 'high',
    estimatedTime: 5,
    lahsaRequired: true,
  },
  {
    id: 'releasePHI',
    title: 'Client PHI Release',
    displayTitle: 'Release of Protected Health Information',
    description: 'Authorization to release protected health information',
    category: 'legal',
    priority: 'high',
    estimatedTime: 7,
    lahsaRequired: true,
  },
  {
    id: 'residencePolicy',
    title: 'Rules of Residence & Security Policy',
    displayTitle: 'Rules of Residence',
    description: 'Facility rules and security policies',
    category: 'housing',
    priority: 'high',
    estimatedTime: 10,
    lahsaRequired: false,
  },
  {
    id: 'authDisclosure',
    title: 'Authorization For Use and/or Disclosure of Health/Mental Health Information',
    displayTitle: 'Authorization for Disclosure',
    description: 'Authorization for sharing health and mental health information',
    category: 'legal',
    priority: 'high',
    estimatedTime: 8,
    lahsaRequired: false,
  },
  {
    id: 'interimHousing',
    title: 'Interim Housing (Shelter) Agreement',
    displayTitle: 'Interim Housing Agreement',
    description: 'Temporary housing agreement and terms',
    category: 'housing',
    priority: 'high',
    estimatedTime: 10,
    lahsaRequired: false,
  },

  // MEDIUM PRIORITY FORMS
  {
    id: 'housingPrescreen',
    title: 'Housing Pre-Screen Form',
    displayTitle: 'Housing Agreement',
    description: 'Housing eligibility and preferences assessment',
    category: 'housing',
    priority: 'medium',
    estimatedTime: 15,
    lahsaRequired: false,
  },
  {
    id: 'privacyPractice',
    title: 'LA County Notice Of Private Practices',
    displayTitle: 'Notice of Privacy Practices',
    description: 'Notice of privacy practices and HIPAA compliance',
    category: 'legal',
    priority: 'medium',
    estimatedTime: 5,
    lahsaRequired: false,
  },
  {
    id: 'lahmis',
    title: 'LA HMIS Consent',
    displayTitle: 'LAHSA HMIS Consent',
    description: 'Consent for LAHSA Homeless Management Information System',
    category: 'data',
    priority: 'medium',
    estimatedTime: 5,
    lahsaRequired: true,
  },
  {
    id: 'authShareInfo',
    title: 'Authorization To Share Information',
    description: 'Authorization to share information with specified parties',
    category: 'legal',
    priority: 'medium',
    estimatedTime: 5,
    lahsaRequired: false,
  },
  {
    id: 'advCareAck',
    title: 'Advance Healthcare Directive Form',
    displayTitle: 'Advance Care Acknowledgment',
    description: 'Acknowledgment of advance healthcare directive information',
    category: 'medical',
    priority: 'medium',
    estimatedTime: 5,
    lahsaRequired: false,
  },

  // LOW PRIORITY FORMS
  {
    id: 'terminationPolicy',
    title: 'Termination Policy & Procedure',
    displayTitle: 'Acknowledgment',
    description: 'Understanding of termination policies and procedures',
    category: 'support',
    priority: 'low',
    estimatedTime: 5,
    lahsaRequired: false,
  },
  {
    id: 'clientGrievances',
    title: 'Client Grievances',
    description: 'Client grievance process and procedures',
    category: 'support',
    priority: 'low',
    estimatedTime: 3,
    lahsaRequired: false,
  },
  {
    id: 'consentPhoto',
    title: 'Consent to Taking / Sharing Photograph',
    displayTitle: 'Consent for Photography',
    description: 'Consent for taking and sharing photographs',
    category: 'media',
    priority: 'low',
    estimatedTime: 3,
    lahsaRequired: false,
  },
];

const AuthSig = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openModal, setOpenModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);

  // Filter forms by category
  const filteredForms = selectedCategory === 'all' 
    ? formConfigurations 
    : formConfigurations.filter(form => form.category === selectedCategory);

  // Calculate total time
  const totalMinutes = formConfigurations.reduce((sum, form) => sum + form.estimatedTime, 0);

  // Handle form card click
  const handleFormClick = (form) => {
    setSelectedForm(form);
    setOpenModal(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedForm(null);
  };

  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && openModal) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openModal]);

  // Handle keyboard events on cards
  const handleCardKeyDown = (event, form) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFormClick(form);
    }
  };

  // Categorize forms by priority
  const highPriorityForms = filteredForms.filter(f => f.priority === 'high');
  const mediumPriorityForms = filteredForms.filter(f => f.priority === 'medium');
  const lowPriorityForms = filteredForms.filter(f => f.priority === 'low');

  // Get unique categories
  const categories = [
    { id: 'all', label: 'All Forms' },
    { id: 'intake', label: 'Intake Forms' },
    { id: 'legal', label: 'Legal Forms' },
    { id: 'medical', label: 'Medical Forms' },
    { id: 'housing', label: 'Housing Forms' },
    { id: 'data', label: 'Data Forms' },
    { id: 'support', label: 'Support Forms' },
    { id: 'media', label: 'Media Forms' },
  ];

  // Render a form card
  const renderFormCard = (form) => (
    <Grid item xs={12} sm={6} lg={4} key={form.id}>
      <Card 
        sx={{ 
          height: '100%', 
          cursor: 'pointer',
          '&:hover': {
            boxShadow: 6,
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease-in-out',
          },
        }}
        onClick={() => handleFormClick(form)}
        onKeyDown={(e) => handleCardKeyDown(e, form)}
        tabIndex={0}
        role="button"
        aria-label={`Open ${form.displayTitle || form.title} form`}
      >
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            {form.displayTitle || form.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {form.description}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label={form.category} size="small" />
            <Chip label={`${form.estimatedTime} min`} size="small" />
            {form.priority === 'high' && (
              <Chip label="High Priority" size="small" color="error" />
            )}
            {form.priority === 'medium' && (
              <Chip label="Required" size="small" color="warning" />
            )}
            {form.lahsaRequired && (
              <Chip label="LAHSA Required" size="small" color="warning" />
            )}
          </Box>
        </CardContent>
        <CardActions>
          <Button 
            fullWidth 
            variant="contained" 
            color="primary"
            aria-label="Open Form"
          >
            Open Form
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Container maxWidth="xl">
      {/* Header Section */}
      <Paper elevation={4} sx={{ p: 4, mb: 3 }}>
        <Box>
          <Typography variant="h2" component="h1" gutterBottom>
            Authorization & Signature Forms
          </Typography>
          <Typography variant="h5" component="h2">
            Complete all required documentation for your intake process
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <Chip label={`${formConfigurations.length} Total Forms`} />
            <Chip label={`${filteredForms.length} Currently Shown`} />
            <Chip label={`~${totalMinutes} minutes total`} />
          </Box>
        </Box>
      </Paper>

      {/* Filter Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterListIcon />
          <Typography variant="h6">Filter by Category</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              onClick={() => setSelectedCategory(category.id)}
              color={selectedCategory === category.id ? 'primary' : 'default'}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
              clickable
            />
          ))}
        </Box>
      </Paper>

      {/* High Priority Forms */}
      {highPriorityForms.length > 0 && (
        <>
          <Typography variant="h4" component="h2" gutterBottom>
            🔴 High Priority Forms
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {highPriorityForms.map(renderFormCard)}
          </Grid>
          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Medium Priority Forms */}
      {mediumPriorityForms.length > 0 && (
        <>
          <Typography variant="h4" component="h2" gutterBottom>
            🟡 Medium Priority Forms
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {mediumPriorityForms.map(renderFormCard)}
          </Grid>
          <Divider sx={{ my: 3 }} />
        </>
      )}

      {/* Low Priority Forms */}
      {lowPriorityForms.length > 0 && (
        <>
          <Typography variant="h4" component="h2" gutterBottom>
            🟢 Low Priority Forms
          </Typography>
          <Grid container spacing={3}>
            {lowPriorityForms.map(renderFormCard)}
          </Grid>
        </>
      )}

      {/* Modal Dialog */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        role="dialog"
        aria-labelledby="form-dialog-title"
        aria-describedby="form-dialog-description"
      >
        {selectedForm && (
          <>
            <DialogTitle id="form-dialog-title">
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, pr: 2 }}>
                  <Typography variant="h6" component="h3">
                    {selectedForm.displayTitle || selectedForm.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<AccessTimeIcon />} 
                      label={`${selectedForm.estimatedTime} min`} 
                      size="small" 
                    />
                    <Chip 
                      label={selectedForm.category} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                    {selectedForm.lahsaRequired && (
                      <Chip label="LAHSA Required" size="small" color="warning" />
                    )}
                  </Box>
                </Box>
                <IconButton
                  aria-label="close"
                  onClick={handleCloseModal}
                  sx={{ 
                    color: (theme) => theme.palette.grey[500],
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers id="form-dialog-description">
              <Typography variant="body1" paragraph>
                {selectedForm.description}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This form is part of the <strong>{selectedForm.category}</strong> category 
                and should take approximately <strong>{selectedForm.estimatedTime} minutes</strong> to complete.
              </Typography>
              {selectedForm.lahsaRequired && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
                  ⚠️ This form is required by LAHSA and must be completed.
                </Typography>
              )}
              {selectedForm.priority === 'high' && (
                <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
                  🔴 This is a high priority form and should be completed as soon as possible.
                </Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseModal} size="large">
                Close
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                onClick={() => {
                  // TODO: Navigate to actual form
                  console.log('Opening form:', selectedForm.id);
                }}
              >
                View Form
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AuthSig;