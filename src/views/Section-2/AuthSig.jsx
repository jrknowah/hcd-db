import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  IconButton,
  Chip,
  Paper,
  useTheme,
  useMediaQuery,
  alpha,
  Divider,
  Container
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as DocumentIcon,
  Security as SecurityIcon,
  LocalHospital as MedicalIcon,
  Home as HomeIcon,
  Camera as CameraIcon,
  Policy as PolicyIcon,
  Assignment as AssignmentIcon,
  VerifiedUser as VerifiedIcon,
  BusinessCenter as BusinessIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import ClientOrientation from './ClientOrientation';
import ClientRights from './ClientRights';
import ConsentForTreatment from './ConsentForTreatment';

import PrivacyPractice from './PrivacyPractice';
import LAHMIS from './LAHMIS';
import ReleasePHI from './ReleasePHI';
import ResidencePolicy from './ResidencePolicy';
import ClientGrievances from './ClientGrievances';
import AuthForDisclosure from './AuthForDisclosure';
import InterimHousingAgreement from './InterimHousingAgreement';
import AdvCareAck from './AdvCareAck';
import HousingAgree from './HousingAgree';
import ConsentPhoto from './ConsentPhoto';
import AuthUseDiscHMHInfo from './AuthUseDiscHMHInfo';

// Mock components - replace with your actual component imports
const MockComponent = ({ title }) => (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <DocumentIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
    <Typography variant="h5" gutterBottom color="primary">
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      This is where the actual form content would be displayed. Replace this MockComponent 
      with your real form components (ClientOrientation, ClientRights, etc.)
    </Typography>
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Form fields, signature areas, and other interactive elements would appear here.
      </Typography>
    </Box>
  </Box>
);

// Form configuration data - this replaces all the repetitive state management
const FORM_CONFIGS = [
  {
    id: 'orientation',
    title: 'Patient Orientation Information Sheet',
    description: 'Essential orientation information for new patients',
    icon: AssignmentIcon,
    component: ClientOrientation,
    hasLogo: false,
    category: 'intake',
    priority: 'high',
    estimatedTime: '5 min'
  },
  {
    id: 'clientRights', 
    title: 'Client Rights',
    description: 'Understanding your rights as a client',
    icon: VerifiedIcon,
    component: ClientRights,
    hasLogo: true,
    category: 'legal',
    priority: 'high',
    estimatedTime: '3 min'
  },
  {
    id: 'consentTreatment',
    title: 'Consent for Treatment and Services',
    description: 'Authorization for medical treatment',
    icon: MedicalIcon,
    component: ConsentForTreatment,
    hasLogo: false,
    category: 'medical',
    priority: 'high',
    estimatedTime: '7 min'
  },
  {
    id: 'preScreen',
    title: 'Housing Pre-Screen Form', 
    description: 'Initial housing assessment questionnaire',
    icon: HomeIcon,
    component: MockComponent,
    hasLogo: false,
    category: 'housing',
    priority: 'medium',
    estimatedTime: '10 min'
  },
  {
    id: 'privacyPractice',
    title: 'LA County Notice Of Private Practices',
    description: 'Privacy practices and procedures notice',
    icon: SecurityIcon,
    component: PrivacyPractice,
    hasLogo: false,
    category: 'legal',
    priority: 'medium',
    estimatedTime: '4 min'
  },
  {
    id: 'lahmis',
    title: 'LA HMIS Consent',
    description: 'Homeless Management Information System consent',
    icon: BusinessIcon,
    component: LAHMIS,
    hasLogo: false,
    category: 'data',
    priority: 'medium',
    estimatedTime: '6 min'
  },
  {
    id: 'phiRelease',
    title: 'Client PHI Release',
    description: 'Protected Health Information release form',
    icon: SecurityIcon,
    component: ReleasePHI,
    hasLogo: true,
    category: 'medical',
    priority: 'high',
    estimatedTime: '5 min'
  },
  {
    id: 'residencePolicy',
    title: 'Rules of Residence & Security Policy',
    description: 'Facility rules and security procedures',
    icon: PolicyIcon,
    component: ResidencePolicy,
    hasLogo: true,
    category: 'housing',
    priority: 'high',
    estimatedTime: '8 min'
  },
  {
    id: 'authDisclosure',
    title: 'Authorization To Share Information',
    description: 'Permission to share information with third parties',
    icon: SecurityIcon,
    component: AuthForDisclosure,
    hasLogo: false,
    category: 'legal',
    priority: 'medium',
    estimatedTime: '4 min'
  },
  {
    id: 'interimHousingAgreement',
    title: 'Interim Housing Agreement',
    description: 'Understanding termination policies',
    icon: PolicyIcon,
    component: InterimHousingAgreement,
    hasLogo: true,
    category: 'legal',
    priority: 'low',
    estimatedTime: '6 min'
  },
  {
    id: 'advDirective',
    title: 'Advance Healthcare Directive Form',
    description: 'Advanced healthcare decisions and directives',
    icon: MedicalIcon,
    component: AdvCareAck,
    hasLogo: true,
    category: 'medical',
    priority: 'medium',
    estimatedTime: '12 min'
  },
  {
    id: 'grievances',
    title: 'Client Grievances',
    description: 'Process for filing complaints and grievances',
    icon: AssignmentIcon,
    component: ClientGrievances,
    hasLogo: true,
    category: 'support',
    priority: 'low',
    estimatedTime: '3 min'
  },
  {
    id: 'healthDisclosure',
    title: 'Authorization For Use and/or Disclosure of Health/Mental Health Information',
    description: 'Mental health information sharing authorization',
    icon: MedicalIcon,
    component: AuthUseDiscHMHInfo,
    hasLogo: true,
    category: 'medical',
    priority: 'high',
    estimatedTime: '8 min'
  },
  {
    id: 'consentPhoto',
    title: 'Consent to Taking / Sharing Photograph',
    description: 'Photography and media sharing consent',
    icon: CameraIcon,
    component: ConsentPhoto,
    hasLogo: true,
    category: 'media',
    priority: 'low',
    estimatedTime: '2 min'
  },
  {
    id: 'housingAgreement',
    title: 'Interim Housing (Shelter) Agreement',
    description: 'Temporary housing terms and agreement',
    icon: HomeIcon,
    component: HousingAgree,
    hasLogo: true,
    category: 'housing',
    priority: 'high',
    estimatedTime: '15 min'
  }
];

// Category and priority color configurations
const CATEGORY_COLORS = {
  intake: 'primary',
  legal: 'secondary', 
  medical: 'error',
  housing: 'warning',
  data: 'info',
  support: 'success',
  media: 'default'
};

const PRIORITY_COLORS = {
  high: 'error',
  medium: 'warning', 
  low: 'success'
};

// Reusable Form Card Component
const FormCard = ({ form, onOpen }) => {
  const theme = useTheme();
  const IconComponent = form.icon;
  
  return (
    <Card 
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          elevation: 8,
          transform: 'translateY(-4px)',
          '& .card-content': {
            backgroundColor: alpha(theme.palette.primary.main, 0.02)
          },
          '& .card-icon': {
            transform: 'scale(1.1)',
            color: theme.palette.primary.main
          }
        }
      }}
      onClick={() => onOpen(form)}
    >
      {/* LAHSA Logo indicator for applicable forms */}
      {form.hasLogo && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            zIndex: 1
          }}
        >
          <Typography variant="caption" fontWeight="bold" color="primary" fontSize="10px">
            LAHSA
          </Typography>
        </Box>
      )}
      
      <CardContent 
        className="card-content"
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          p: 3,
          transition: 'background-color 0.3s ease'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <IconComponent 
            className="card-icon"
            sx={{ 
              fontSize: 36, 
              color: 'text.secondary', 
              mr: 2,
              mt: 0.5,
              flexShrink: 0,
              transition: 'all 0.3s ease'
            }} 
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="h6" 
              component="h3"
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 600,
                lineHeight: 1.3,
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {form.title}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {form.description}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto', mb: 2 }}>
          <Chip 
            label={form.category}
            size="small"
            color={CATEGORY_COLORS[form.category] || 'default'}
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
          <Chip 
            label={`${form.priority} priority`}
            size="small" 
            color={PRIORITY_COLORS[form.priority]}
            variant="filled"
            sx={{ textTransform: 'capitalize' }}
          />
          <Chip 
            label={form.estimatedTime}
            size="small"
            variant="outlined"
            color="default"
          />
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          fullWidth
          variant="contained"
          startIcon={<DocumentIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(form);
          }}
          sx={{
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none'
          }}
        >
          Open Form
        </Button>
      </CardActions>
    </Card>
  );
};

// Reusable Modal Component with MUI Dialog
const FormModal = ({ form, open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  if (!form) return null;
  
  const FormComponent = form.component;
  const IconComponent = form.icon;
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          minHeight: fullScreen ? '100vh' : '70vh',
          borderRadius: fullScreen ? 0 : 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconComponent color="primary" />
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {form.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Estimated time: {form.estimatedTime}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <FormComponent title={form.title} />
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        gap: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        background: alpha(theme.palette.grey[50], 0.5)
      }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Close
        </Button>
        <Button variant="outlined" color="primary">
          Save Progress
        </Button>
        <Button variant="contained" color="success" sx={{ fontWeight: 600 }}>
          Submit Form
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Category Filter Component with MUI styling
const CategoryFilter = ({ categories, activeCategory, onChange }) => {
  return (
    <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterIcon sx={{ mr: 1, color: 'text.secondary' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Filter by Category
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="All Forms"
          color={activeCategory === 'all' ? 'primary' : 'default'}
          onClick={() => onChange('all')}
          variant={activeCategory === 'all' ? 'filled' : 'outlined'}
          sx={{ fontWeight: activeCategory === 'all' ? 600 : 400 }}
        />
        {categories.map(category => (
          <Chip
            key={category}
            label={`${category.charAt(0).toUpperCase() + category.slice(1)} Forms`}
            color={activeCategory === category ? CATEGORY_COLORS[category] : 'default'}
            onClick={() => onChange(category)}
            variant={activeCategory === category ? 'filled' : 'outlined'}
            sx={{ 
              fontWeight: activeCategory === category ? 600 : 400,
              textTransform: 'capitalize'
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

// Priority Section Header Component
const PrioritySection = ({ priority, count, children }) => {
  const priorityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };

  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            textTransform: 'capitalize',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <span>{priorityIcons[priority]}</span>
          {priority} Priority Forms
        </Typography>
        <Chip 
          label={`${count} form${count !== 1 ? 's' : ''}`}
          color={PRIORITY_COLORS[priority]}
          variant="filled"
          sx={{ fontWeight: 600 }}
        />
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  );
};

// Main Component - Clean and maintainable with MUI!
const AuthSig = () => {
  const theme = useTheme();
  const [activeModal, setActiveModal] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Get unique categories from the configuration
  const categories = [...new Set(FORM_CONFIGS.map(form => form.category))];
  
  // Filter forms based on category
  const filteredForms = categoryFilter === 'all' 
    ? FORM_CONFIGS 
    : FORM_CONFIGS.filter(form => form.category === categoryFilter);
  
  // Group forms by priority for better organization
  const formsByPriority = filteredForms.reduce((acc, form) => {
    if (!acc[form.priority]) acc[form.priority] = [];
    acc[form.priority].push(form);
    return acc;
  }, {});
  
  // Calculate total estimated time
  const totalTime = filteredForms.reduce((acc, form) => {
    const minutes = parseInt(form.estimatedTime);
    return acc + minutes;
  }, 0);
  
  // Clean event handlers using useCallback for performance
  const handleOpenModal = useCallback((form) => {
    setActiveModal(form);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);
  
  const handleCategoryChange = useCallback((category) => {
    setCategoryFilter(category);
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Header with gradient background */}
      <Paper 
        elevation={4}
        sx={{ 
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              mb: 2,
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            Authorization & Signature Forms
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 3,
              opacity: 0.95,
              fontWeight: 400
            }}
          >
            Complete all required documentation for your intake process
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`${FORM_CONFIGS.length} Total Forms`}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            />
            <Chip 
              label={`${filteredForms.length} Currently Shown`}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            />
            <Chip 
              label={`~${totalTime} minutes total`}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Category Filter */}
      <CategoryFilter 
        categories={categories}
        activeCategory={categoryFilter}
        onChange={handleCategoryChange}
      />

      {/* Forms Grid organized by priority with better visual hierarchy */}
      {['high', 'medium', 'low'].map(priority => {
        const priorityForms = formsByPriority[priority];
        if (!priorityForms || priorityForms.length === 0) return null;
        
        return (
          <PrioritySection 
            key={priority} 
            priority={priority} 
            count={priorityForms.length}
          >
            <Grid container spacing={3}>
              {priorityForms.map((form) => (
                <Grid item xs={12} sm={6} lg={4} key={form.id}>
                  <FormCard 
                    form={form}
                    onOpen={handleOpenModal}
                  />
                </Grid>
              ))}
            </Grid>
          </PrioritySection>
        );
      })}

      {/* No forms message */}
      {filteredForms.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <DocumentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            No forms found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Try selecting a different category to see available forms.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => setCategoryFilter('all')}
            startIcon={<FilterIcon />}
          >
            Show All Forms
          </Button>
        </Paper>
      )}

      {/* Enhanced Modal with better UX */}
      <FormModal 
        form={activeModal}
        open={Boolean(activeModal)}
        onClose={handleCloseModal}
      />
    </Container>
  );
};

export default AuthSig;