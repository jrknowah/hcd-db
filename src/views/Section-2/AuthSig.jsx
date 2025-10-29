import React, { useState, useCallback, useRef } from 'react';
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
  Container,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Badge
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
  FilterList as FilterIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  FolderOpen as ArchiveIcon
} from '@mui/icons-material';

// ✅ Redux imports
import { useDispatch, useSelector } from 'react-redux';
import { 
  saveFormData, 
  autoSaveFormData,
  selectSaving,
  selectAutoSaving,
  selectSaveError,
  clearErrors
} from '../../backend/store/slices/authSigSlice';

// ✅ Client persistence hook
import { useClientPersistence } from '../../hooks/useClientPersistence';

// Form component imports
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
import AuthSigArchive from './AuthSigArchive';

// Mock component for forms not yet implemented
const MockComponent = ({ title, clientID }) => (
  <Box sx={{ p: 4, textAlign: 'center' }}>
    <DocumentIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
    <Typography variant="h5" gutterBottom color="primary">
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Client ID: {clientID}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      This form is not yet implemented. Replace MockComponent with the actual form component.
    </Typography>
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Form fields, signature areas, and other interactive elements would appear here.
      </Typography>
    </Box>
  </Box>
);

// Form configuration data - IDs match backend
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
    id: 'termination',
    title: 'Termination Policy & Procedure',
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

// ============================================================================
// FORM CARD COMPONENT
// ============================================================================
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

// ============================================================================
// FORM MODAL COMPONENT - PRODUCTION READY WITH ALL TODOS COMPLETED
// ============================================================================
const FormModal = ({ form, open, onClose, clientID }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  
  // ✅ Redux state
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveError = useSelector(selectSaveError);
  
  // ✅ Local UI state
  const [saveType, setSaveType] = useState(null);
  const [showFormContent, setShowFormContent] = useState(false);
  
  // ✅ Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // ✅ CRITICAL: Ref to access child form component's data
  const formRef = useRef(null);
  
  if (!form) return null;
  
  const FormComponent = form.component;
  const IconComponent = form.icon;
  
  // ✅ Helper to show notifications
  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  // ✅ Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // ✅ Reset state when modal closes
  const handleClose = () => {
    setShowFormContent(false);
    setSaveType(null);
    dispatch(clearErrors());
    onClose();
  };
  
  // ✅ COMPLETE - Save progress (autosave) with actual form data
  const handleSaveProgress = async () => {
    setSaveType('progress');
    
    try {
      // ✅ Get actual form data from child component via ref
      const formData = formRef.current?.getFormData?.();
      
      if (!formData) {
        throw new Error('Unable to get form data. Make sure the form component exposes getFormData()');
      }
      
      console.log('📝 Autosaving form:', form.id, 'Client:', clientID);
      console.log('📦 Form data:', formData);
      
      // ✅ Dispatch Redux action with actual form data
      await dispatch(autoSaveFormData({
        clientID: clientID,
        formType: form.id,
        formData: formData
      })).unwrap();
      
      console.log('✅ Progress saved successfully');
      
      // ✅ Show success notification
      showNotification('Progress saved successfully', 'success');
      
      setSaveType(null);
      
    } catch (error) {
      console.error('❌ Failed to save progress:', error);
      
      // ✅ Show error notification
      showNotification(
        error.message || 'Failed to save progress. Please try again.',
        'error'
      );
      
      setSaveType(null);
    }
  };
  
  // ✅ COMPLETE - Submit complete form with validation
  const handleSubmitForm = async () => {
    setSaveType('submit');
    
    try {
      // ✅ Get actual form data from child component via ref
      const formData = formRef.current?.getFormData?.();
      
      if (!formData) {
        throw new Error('Unable to get form data. Make sure the form component exposes getFormData()');
      }
      
      console.log('🚀 Submitting form:', form.id, 'Client:', clientID);
      console.log('📦 Form data:', formData);
      
      // ✅ Validate completion before submitting
      if (formData.completionPercentage !== 100) {
        throw new Error('Please complete all required fields before submitting');
      }
      
      // ✅ Dispatch Redux action with actual form data
      await dispatch(saveFormData({
        clientID: clientID,
        formType: form.id,
        formData: formData
      })).unwrap();
      
      console.log('✅ Form submitted successfully');
      
      // ✅ Show success notification
      showNotification('Form submitted successfully', 'success');
      
      setSaveType(null);
      
      // ✅ Close modal after successful submission
      setTimeout(() => {
        handleClose();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to submit form:', error);
      
      // ✅ Show error notification with detailed message
      const errorMessage = error.message || error || 'Failed to submit form. Please check all required fields.';
      showNotification(errorMessage, 'error');
      
      setSaveType(null);
    }
  };
  
  const handleViewForm = () => {
    setShowFormContent(true);
  };
  
  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
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
                Estimated time: {form.estimatedTime} | Client ID: {clientID}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small" aria-label="Close dialog">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {!showFormContent ? (
            // ========== FORM PREVIEW VIEW ==========
            <Box sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                <IconComponent sx={{ fontSize: 60, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {form.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {form.description}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Category
                    </Typography>
                    <Chip 
                      label={form.category}
                      size="small"
                      color={CATEGORY_COLORS[form.category] || 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Priority Level
                    </Typography>
                    <Chip 
                      label={`${form.priority} priority`}
                      size="small"
                      color={PRIORITY_COLORS[form.priority]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Estimated Time
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {form.estimatedTime}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      LAHSA Required
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {form.hasLogo ? 'Yes' : 'No'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {form.priority === 'high' && (
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`
                  }}
                >
                  <Typography variant="body2" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>🔴</span>
                    <strong>High Priority:</strong> This form should be completed as soon as possible.
                  </Typography>
                </Paper>
              )}
            </Box>
          ) : (
            // ========== ACTUAL FORM CONTENT VIEW ==========
            <Box sx={{ p: 3 }}>
              {/* ✅ CRITICAL: Pass ref to form component to access its data */}
              <FormComponent 
                ref={formRef}
                clientID={clientID}
                title={form.title}
                formType={form.id}
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          gap: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
          background: alpha(theme.palette.grey[50], 0.5)
        }}>
          {!showFormContent ? (
            // ========== PREVIEW MODE BUTTONS ==========
            <>
              <Button 
                onClick={handleClose} 
                variant="outlined" 
                color="inherit"
              >
                Close
              </Button>
              
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleViewForm}
                startIcon={<DocumentIcon />}
                sx={{ fontWeight: 600 }}
              >
                View Form
              </Button>
            </>
          ) : (
            // ========== FORM EDITING MODE BUTTONS ==========
            <>
              <Button 
                onClick={() => setShowFormContent(false)} 
                variant="outlined" 
                color="inherit"
                disabled={saving || autoSaving}
              >
                Back to Preview
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary"
                onClick={handleSaveProgress}
                disabled={saving || autoSaving}
                startIcon={
                  autoSaving && saveType === 'progress' ? (
                    <CircularProgress size={16} />
                  ) : (
                    <SaveIcon />
                  )
                }
              >
                {autoSaving && saveType === 'progress' ? 'Saving...' : 'Save Progress'}
              </Button>
              
              <Button 
                variant="contained" 
                color="success" 
                onClick={handleSubmitForm}
                disabled={saving || autoSaving}
                startIcon={
                  saving && saveType === 'submit' ? (
                    <CircularProgress size={16} />
                  ) : (
                    <CheckCircleIcon />
                  )
                }
                sx={{ fontWeight: 600 }}
              >
                {saving && saveType === 'submit' ? 'Submitting...' : 'Submit Form'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      
      {/* ✅ COMPLETE - Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ============================================================================
// CATEGORY FILTER COMPONENT
// ============================================================================
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

// ============================================================================
// PRIORITY SECTION COMPONENT
// ============================================================================
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

// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================
const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} role="tabpanel">
    {value === index && <Box>{children}</Box>}
  </div>
);

// ============================================================================
// MAIN AUTHSIG COMPONENT
// ============================================================================
const AuthSig = () => {
  const theme = useTheme();
  const [activeModal, setActiveModal] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0); // ✅ NEW: Tab state
  
  // ✅ Get client from URL/persistence
  const { clientID, client, loading: clientLoading } = useClientPersistence();
  
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
  
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);
  
  // ✅ Handle loading state
  if (clientLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }
  
  // ✅ Handle no client selected
  if (!clientID) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper 
          sx={{ 
            p: 6, 
            textAlign: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
            border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`
          }}
        >
          <AssignmentIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="warning.main" sx={{ fontWeight: 600 }}>
            No Client Selected
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Please select a client from Section 1 (Identification) to view and complete authorization forms.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Once a client is selected, you'll be able to access all {FORM_CONFIGS.length} authorization and signature forms.
          </Typography>
        </Paper>
      </Container>
    );
  }

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
            Complete all required documentation for {client?.clientFirstName || 'Client'} {client?.clientLastName || clientID}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`Client: ${clientID}`}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            />
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

      {/* ✅ NEW: Tabs for Forms and Archive */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            px: 2
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocumentIcon />
                <Typography>Authorization Forms</Typography>
                <Badge badgeContent={FORM_CONFIGS.length} color="primary" />
              </Box>
            }
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArchiveIcon />
                <Typography>Archive</Typography>
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* ✅ Tab Panel: Forms View */}
      <TabPanel value={activeTab} index={0}>
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
      </TabPanel>

      {/* ✅ Tab Panel: Archive View */}
      <TabPanel value={activeTab} index={1}>
        <AuthSigArchive clientID={clientID} />
      </TabPanel>

      {/* ✅ Enhanced Modal with clientID prop and all TODOs completed */}
      <FormModal 
        form={activeModal}
        open={Boolean(activeModal)}
        onClose={handleCloseModal}
        clientID={clientID}
      />
    </Container>
  );
};

export default AuthSig;