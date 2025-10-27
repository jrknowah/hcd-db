import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Container,
  FormGroup,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Grid
} from '@mui/material';
import {
  Share as ShareIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Psychology as MentalHealthIcon,
  Coronavirus as HIVIcon,
  LocalPharmacy as SubstanceIcon,
  CloudDone as CloudDoneIcon,
  Info as InfoIcon,
  Business as OrganizationIcon,
  Assignment as ServicesIcon
} from '@mui/icons-material';

// Import Redux actions and selectors
import {
  fetchFormData,
  saveFormData,
  clearSuccessFlags,
  setUnsavedChanges,
  selectFormByType,
  selectFormLoading,
  selectSaving,
  selectSaveSuccess,
  selectUnsavedChanges
} from '../../backend/store/slices/authSigSlice';

// Authorization content sections
const AUTHORIZATION_SECTIONS = [
  {
    id: 'overview',
    title: 'Program Overview & Purpose',
    icon: InfoIcon,
    content: {
      introduction: `The County of Los Angeles (County) Department of Health Services (DHS) operates a social services and health information exchange (SSHIE) to allow my information to be shared among and between partners in the County's Community Health and Integrated Programs (CHIP).`,
      purpose: `CHIP helps people get resources and social services that can improve their health. It coordinates health-care related assistance and social services support.`,
      programs: [
        'Whole Person Care Los Angeles',
        'Housing For Health',
        'Office of Diversion and Re-entry',
        'Countywide Benefits Entitlement Services Team (CBEST)',
        'Correctional Health Services – Care Transitions Unit'
      ]
    }
  },
  {
    id: 'organizations',
    title: 'Partner Organizations & Providers',
    icon: OrganizationIcon,
    content: {
      overview: 'Many types of organizations work with CHIP, some as subcontractors, including:',
      organizations: [
        'Health care providers',
        'Behavioral health providers',
        'Social services providers',
        'Health plans',
        'Housing providers',
        'Organizations involved with the justice system',
        'Legal providers',
        'Community organizations'
      ]
    }
  },
  {
    id: 'purposes',
    title: 'Information Sharing Purposes',
    icon: ServicesIcon,
    content: {
      overview: 'These organizations provide services to participants in CHIP and need to share my health and social services information to:',
      purposes: [
        'See if I am eligible for County programs',
        'See if I am eligible for other resources',
        'Coordinate my care',
        'Communicate with my treating providers and organizations',
        'Connect me to social service providers',
        'Provide me with services',
        'Receive payment for services',
        'Program improvement and evaluation activities',
        'For other County program activities'
      ]
    }
  },
  {
    id: 'authorization',
    title: 'Authorization & Information Sharing',
    icon: ShareIcon,
    content: {
      consent: `By signing my name below, I agree that my current, past, and future treating providers and organizations, and California Department of Public Social Services may disclose my health information, records, social services information, and other data to DHS SSHIE for CHIP and that such data may be shared among and between the programs within CHIP.`,
      disclosure: `I also agree that the DHS SSHIE for CHIP may disclose this information to my current, past, and future treating providers, including CHIP partners and subcontractors, and other organizations that work with CHIP, which are listed in Attachment A for the purposes described above.`,
      details: [
        'I authorize my health and social service information to be shared through any health information exchange operated by or with participation from the County. A health information exchange is an electronic system that allows organizations to share information.',
        'Information that may be shared will include information about my personal characteristics, medical history, mental or physical condition, social service information (including CalFresh, General Relief, CalWorks, Cash Assistance Program for Immigrants, Medi-Cal, and other public benefits that I may apply for), and treatment and services I receive.',
        'I understand that this Authorization will apply to data from all services I receive from CHIP providers and partners and any data received by the DHS SSHIE.'
      ]
    }
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    icon: SecurityIcon,
    content: {
      validity: 'This Authorization will be valid for five years, except that this Authorization will expire for Whole Person Care on December 31, 2021 or upon the end date of the program, if extended.',
      rights: [
        'I have the right to cancel or change this Authorization at any time. I can start this process by talking to Care Team Member or calling 844-804-5200.',
        'State and Federal laws already allow health care organizations to share my health information to treat me, obtain payment, and run their operations.',
        'When my information is shared, there is a chance it will be re-shared with others. Federal law or California privacy law may not protect the re-sharing of my information.',
        'My ability to receive medical services, treatment, or public social services does not depend upon whether I sign this Authorization.'
      ],
      understanding: [
        'I understand that I can refuse to sign this Authorization.',
        'I understand that I can inspect or obtain a copy of my health information and social services information that is shared by this Authorization.',
        'I understand that I can receive a copy of this Authorization.'
      ]
    }
  }
];

// Enhanced accordion section component
const AuthorizationSection = ({ section, expanded, onChange, completed }) => {
  const theme = useTheme();
  const IconComponent = section.icon;
  
  const renderContent = () => {
    const { content } = section;
    
    if (section.id === 'overview') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.introduction}
          </Typography>
          <Typography variant="body1" paragraph>
            {content.purpose}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            CHIP includes:
          </Typography>
          <List dense>
            {content.programs.map((program, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={program} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'organizations') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          <List dense>
            {content.organizations.map((org, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <OrganizationIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={org} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'purposes') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          <List dense>
            {content.purposes.map((purpose, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ServicesIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={purpose} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'authorization') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.consent}
          </Typography>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.disclosure}
          </Typography>
          <List dense>
            {content.details.map((detail, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ShareIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={detail} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'terms') {
      return (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {content.validity}
            </Typography>
          </Alert>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Your Rights:
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.rights.map((right, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SecurityIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={right} />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            I Understand:
          </Typography>
          <List dense>
            {content.understanding.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
  };
  
  return (
    <Accordion 
      expanded={expanded}
      onChange={onChange}
      elevation={3}
      sx={{
        mb: 2,
        '&:before': { display: 'none' },
        '&.Mui-expanded': {
          margin: '0 0 16px 0',
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          },
          '&.Mui-expanded': {
            bgcolor: alpha(theme.palette.primary.main, 0.15),
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <IconComponent sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            {section.title}
          </Typography>
          {completed && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Reviewed"
              color="success"
              size="small"
              sx={{ mr: 2 }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ p: 2 }}>
          {renderContent()}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

// Main component with forwardRef
const AuthForDisclosure = forwardRef(({ 
  clientID, 
  title = "Authorization for Use or Disclosure of Health/Mental Health Information", 
  formType = "authForDisclosure" // ✅ CRITICAL: Correct formType
}, ref) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  // Redux selectors
  const existingData = useSelector((state) => selectFormByType(state, formType));
  const loading = useSelector(selectFormLoading);
  const saving = useSelector(selectSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);

  // ✅ FIX: Local loading state to prevent infinite loops
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Local state for form data
  const [formState, setFormState] = useState({
    atrClientSign: '',
    mentalHealthAuth: false,
    hivAidsAuth: false,
    substanceUseAuth: false
  });

  // State for UI interactions
  const [expandedSection, setExpandedSection] = useState('overview');
  const [completedSections, setCompletedSections] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [hasReviewedAll, setHasReviewedAll] = useState(false);

  // Expose getFormData method via ref
  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      ...formState,
      clientID,
      formType
    })
  }));

  // ✅ FIX: Load existing form data with proper error handling
  useEffect(() => {
    if (clientID && formType) {
      dispatch(fetchFormData({ clientID, formType }))
        .unwrap()
        .then((data) => {
          console.log('Form data loaded successfully:', data);
        })
        .catch((error) => {
          console.warn('Failed to load existing form data (form will work with empty data):', error);
        })
        .finally(() => {
          // Always clear initial load state after 1 second max
          setTimeout(() => setIsInitialLoad(false), 1000);
        });
    } else {
      // No clientID, just show the form
      setIsInitialLoad(false);
    }
  }, [dispatch, clientID, formType]);

  // Populate form when data is loaded
  useEffect(() => {
    if (existingData) {
      setFormState({
        atrClientSign: existingData.atrClientSign || '',
        mentalHealthAuth: existingData.mentalHealthAuth || false,
        hivAidsAuth: existingData.hivAidsAuth || false,
        substanceUseAuth: existingData.substanceUseAuth || false
      });
    }
  }, [existingData]);

  // Handle accordion section changes
  const handleSectionChange = useCallback((sectionId) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? sectionId : false);
    
    // Mark section as completed when collapsed after being expanded
    if (!isExpanded && !completedSections.includes(sectionId)) {
      setCompletedSections(prev => [...prev, sectionId]);
    }
  }, [completedSections]);

  // Check if all sections have been reviewed
  useEffect(() => {
    const allSectionsReviewed = AUTHORIZATION_SECTIONS.every(
      section => completedSections.includes(section.id)
    );
    setHasReviewedAll(allSectionsReviewed);
  }, [completedSections]);

  // Handle form field changes
  const handleChange = useCallback((e) => {
    const { name, value, checked, type } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormState(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    dispatch(setUnsavedChanges(true));
  }, [dispatch]);

  // Validate form
  const isValid = useMemo(() => {
    return (
      formState.atrClientSign.trim() !== '' &&
      hasReviewedAll &&
      (formState.mentalHealthAuth || formState.hivAidsAuth || formState.substanceUseAuth)
    );
  }, [formState, hasReviewedAll]);

  // Handle form save
  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isValid || !clientID) {
      return;
    }

    const formData = {
      ...formState,
      clientID,
      formType
    };

    try {
      await dispatch(saveFormData(formData)).unwrap();
      setShowSuccessSnackbar(true);
      dispatch(setUnsavedChanges(false));
    } catch (error) {
      console.error('Failed to save authorization:', error);
    }
  }, [dispatch, formState, clientID, formType, isValid]);

  // Handle success snackbar close
  const handleCloseSuccessSnackbar = useCallback(() => {
    setShowSuccessSnackbar(false);
    dispatch(clearSuccessFlags());
  }, [dispatch]);

  // Calculate progress
  const progress = useMemo(() => {
    const totalSections = AUTHORIZATION_SECTIONS.length;
    const completed = completedSections.length;
    return (completed / totalSections) * 100;
  }, [completedSections]);

  // ✅ FIX: Improved loading state - only show briefly
  if (isInitialLoad && loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400 
        }}>
          <CircularProgress size={60} />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading authorization form...
          </Typography>
        </Box>
      </Container>
    );
  }

  // ✅ Show form even if loading fails
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ShareIcon sx={{ fontSize: 48, mr: 2 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Community Health and Integrated Programs (CHIP)
        </Typography>
      </Paper>

      {/* Progress Indicator */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Review Progress
            </Typography>
            <Chip 
              label={`${completedSections.length} / ${AUTHORIZATION_SECTIONS.length} Sections`}
              color={hasReviewedAll ? "success" : "default"}
              size="small"
            />
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Authorization Sections */}
      <Box sx={{ mb: 4 }}>
        {AUTHORIZATION_SECTIONS.map((section) => (
          <AuthorizationSection
            key={section.id}
            section={section}
            expanded={expandedSection === section.id}
            onChange={handleSectionChange(section.id)}
            completed={completedSections.includes(section.id)}
          />
        ))}
      </Box>

      {/* Information Types Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Specific Authorization for Sensitive Information
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          I specifically authorize my current, past, and future treating providers and organizations 
          and CHIP to share the following information (check as appropriate):
        </Typography>

        <FormGroup>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="mentalHealthAuth"
                    checked={formState.mentalHealthAuth}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MentalHealthIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Information from health care providers about my mental health diagnosis or treatment
                    </Typography>
                  </Box>
                }
                sx={{ 
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="hivAidsAuth"
                    checked={formState.hivAidsAuth}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <HIVIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Information about my HIV/AIDS test results
                    </Typography>
                  </Box>
                }
                sx={{ 
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="substanceUseAuth"
                    checked={formState.substanceUseAuth}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SubstanceIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Information from substance use disorder treatment programs
                    </Typography>
                  </Box>
                }
                sx={{ 
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                  }
                }}
              />
            </Grid>
          </Grid>
        </FormGroup>
      </Paper>

      {/* Signature Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Electronic Signature & Final Authorization
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          I have read this authorization or a CHIP Representative or Care Team Member has read it to me. 
          I authorize the use and sharing of my health and social services information as described above.
        </Typography>

        <Box component="form" onSubmit={handleSave}>
          <TextField
            fullWidth
            label="Electronic Signature"
            variant="outlined"
            name="atrClientSign"
            value={formState.atrClientSign}
            onChange={handleChange}
            placeholder="Enter your full legal name"
            required
            sx={{ mb: 2 }}
            helperText="Type your name to provide your electronic signature for this authorization"
          />

          {formState.atrClientSign && (
            <Zoom in={!!formState.atrClientSign}>
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />}
                sx={{ mb: 3 }}
              >
                <Typography variant="body2">
                  Signature captured: <strong>{formState.atrClientSign}</strong>
                </Typography>
              </Alert>
            </Zoom>
          )}

          {/* Submit Button */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={saving || !clientID || !isValid}
              sx={{ 
                px: 4, 
                py: 1.5,
                fontWeight: 600,
                fontSize: '1.1rem'
              }}
            >
              {saving ? 'Saving...' : 'Save Authorization'}
            </Button>

            {!isValid && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="warning.main">
                  Please review the authorization, select information types, and provide your signature
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar || saveSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccessSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSuccessSnackbar} 
          severity="success" 
          sx={{ width: '100%' }}
          icon={<CloudDoneIcon />}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ✅ Authorization data saved successfully!
          </Typography>
        </Alert>
      </Snackbar>

      {/* Unsaved Changes Warning */}
      {unsavedChanges && (
        <Paper 
          elevation={3}
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            p: 2,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            zIndex: 1000
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              You have unsaved changes
            </Typography>
          </Box>
        </Paper>
      )}
    </Container>
  );
});

AuthForDisclosure.displayName = 'AuthForDisclosure';

export default AuthForDisclosure;