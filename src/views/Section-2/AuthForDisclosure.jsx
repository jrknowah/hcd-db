import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  LocalHospital as MedicalIcon,
  Psychology as MentalHealthIcon,
  Coronavirus as HIVIcon,
  LocalPharmacy as SubstanceIcon,
  AutoMode as AutoSaveIcon,
  CloudDone as CloudDoneIcon,
  Info as InfoIcon,
  Business as OrganizationIcon,
  Groups as PartnersIcon,
  Assignment as ServicesIcon
} from '@mui/icons-material';

// Import Redux actions and selectors
import {
  fetchFormData,
  saveFormData,
  autoSaveFormData,
  updateFormLocal,
  clearErrors,
  clearSuccessFlags,
  setUnsavedChanges,
  selectFormByType,
  selectFormLoading,
  selectSaving,
  selectAutoSaving,
  selectSaveSuccess,
  selectUnsavedChanges
} from '../../store/slices/authSigSlice';

// Import custom hooks
import { useFormManager, useFormAccordion } from '../../hooks/useFormManager';

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
          <Typography variant="body1" paragraph>
            {content.disclosure}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
            Authorization Details:
          </Typography>
          <List dense>
            {content.details.map((detail, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
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
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Validity Period: {content.validity}
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
            Important Understanding:
          </Typography>
          <List dense>
            {content.understanding.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="success" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    return null;
  };
  
  return (
    <Accordion 
      expanded={expanded} 
      onChange={onChange}
      elevation={expanded ? 3 : 1}
      sx={{
        mb: 2,
        border: expanded ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
        '&:before': { display: 'none' },
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: expanded ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.08)
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <IconComponent 
            sx={{ 
              mr: 2, 
              color: expanded ? 'primary.main' : 'text.secondary',
              transition: 'color 0.3s ease'
            }} 
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {section.title}
            </Typography>
          </Box>
          {completed && (
            <CheckCircleIcon sx={{ color: 'success.main', ml: 1 }} />
          )}
        </Box>
      </AccordionSummary>
      
      <AccordionDetails sx={{ p: 3 }}>
        {renderContent()}
      </AccordionDetails>
    </Accordion>
  );
};

const AuthForDisclosure = ({ clientID: propClientID, formConfig }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const authDisclosureForm = useSelector(selectFormByType('authDisclosure'));
  const formLoading = useSelector(selectFormLoading('authDisclosure'));
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  const formErrors = useSelector((state) => state.authSig.formErrors.authDisclosure);
  
  // Local state
  const [formState, setFormState] = useState({
    atrClientSign: "",
    mentalHealthAuth: false,
    hivAidsAuth: false,
    substanceUseAuth: false,
  });
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  
  // Accordion management
  const {
    expandedSection,
    visitedSections,
    completionPercentage: readingProgress,
    handleAccordionChange,
    isSectionVisited
  } = useFormAccordion(AUTHORIZATION_SECTIONS);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate overall completion percentage
  const completionPercentage = useMemo(() => {
    const readingComplete = readingProgress > 90 ? 40 : (readingProgress * 0.4);
    const checkboxComplete = (Object.values(formState).filter(val => val === true).length / 3) * 30;
    const signatureComplete = formState.atrClientSign.trim() ? 30 : 0;
    return Math.round(readingComplete + checkboxComplete + signatureComplete);
  }, [readingProgress, formState]);
  
  // Form validation
  const isValid = useMemo(() => {
    return clientID && 
           formState.atrClientSign.trim() && 
           visitedSections.size >= AUTHORIZATION_SECTIONS.length * 0.8 &&
           (formState.mentalHealthAuth || formState.hivAidsAuth || formState.substanceUseAuth);
  }, [clientID, formState, visitedSections.size]);
  
  // Auto-save form data
  const formData = useMemo(() => ({
    ...formState,
    sectionsRead: Array.from(visitedSections),
    readingProgress,
    completionPercentage,
    lastModified: new Date().toISOString()
  }), [formState, visitedSections, readingProgress, completionPercentage]);
  
  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'authDisclosure' }));
    }
  }, [dispatch, clientID]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (authDisclosureForm && Object.keys(authDisclosureForm).length > 0) {
      setFormState({
        atrClientSign: authDisclosureForm.atrClientSign || "",
        mentalHealthAuth: authDisclosureForm.mentalHealthAuth === "true" || authDisclosureForm.mentalHealthAuth === true,
        hivAidsAuth: authDisclosureForm.hivAidsAuth === "true" || authDisclosureForm.hivAidsAuth === true,
        substanceUseAuth: authDisclosureForm.substanceUseAuth === "true" || authDisclosureForm.substanceUseAuth === true,
      });
    }
  }, [authDisclosureForm]);
  
  // Update unsaved changes in Redux
  useEffect(() => {
    dispatch(setUnsavedChanges(completionPercentage > 0 && !saveSuccess));
  }, [dispatch, completionPercentage, saveSuccess]);
  
  // Handle success notifications
  useEffect(() => {
    if (saveSuccess) {
      setShowSuccessSnackbar(true);
    }
  }, [saveSuccess]);

  // Handle form changes
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newFormState = {
      ...formState,
      [name]: type === "checkbox" ? checked : value,
    };
    
    setFormState(newFormState);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'authDisclosure',
      formData: newFormState
    }));
  }, [dispatch, formState]);

  // Handle form submission
  const handleSave = useCallback(async (e) => {
    e?.preventDefault();
    
    const validationErrors = [];
    
    if (!clientID) {
      validationErrors.push("No client selected. Please select a client first.");
    }

    if (!formState.atrClientSign.trim()) {
      validationErrors.push("Electronic signature is required to complete the authorization.");
    }
    
    if (!formState.mentalHealthAuth && !formState.hivAidsAuth && !formState.substanceUseAuth) {
      validationErrors.push("Please select at least one type of information to authorize for sharing.");
    }
    
    if (visitedSections.size < AUTHORIZATION_SECTIONS.length * 0.8) {
      validationErrors.push("Please review at least 80% of the authorization sections before signing.");
    }
    
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const submitData = {
      ...formState,
      mentalHealthAuth: formState.mentalHealthAuth.toString(),
      hivAidsAuth: formState.hivAidsAuth.toString(),
      substanceUseAuth: formState.substanceUseAuth.toString(),
      sectionsRead: Array.from(visitedSections),
      readingProgress,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        authorizationVersion: formConfig?.version || '2024-v1',
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'authDisclosure', 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save authorization data']);
    }
  }, [dispatch, clientID, formState, visitedSections, readingProgress, formConfig]);

  // Clear success messages
  const handleCloseSuccessSnackbar = useCallback(() => {
    setShowSuccessSnackbar(false);
    dispatch(clearSuccessFlags());
  }, [dispatch]);

  // Clear errors
  const handleClearErrors = useCallback(() => {
    setLocalErrors([]);
    dispatch(clearErrors());
  }, [dispatch]);

  if (formLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, minHeight: 400 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading authorization data...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we retrieve your authorization information
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header Section */}
      <Card elevation={3} sx={{ mb: 4, overflow: 'hidden' }}>
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
            color: 'white',
            p: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ShareIcon sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                  Authorization For Information Disclosure
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                  Health & Social Service Information Sharing
                </Typography>
              </Box>
            </Box>
            
            {/* Auto-save indicator */}
            {autoSaving && (
              <Zoom in={autoSaving}>
                <Chip 
                  label="Auto-saving..." 
                  icon={<AutoSaveIcon />}
                  color="default"
                  variant="filled"
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
              </Zoom>
            )}
          </Box>

          {/* Client Info */}
          {selectedClient && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonIcon sx={{ mr: 1, opacity: 0.9 }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Client: {selectedClient.firstName} {selectedClient.lastName}
                {selectedClient.clientID && ` (ID: ${selectedClient.clientID})`}
              </Typography>
            </Box>
          )}
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* Progress Indicator */}
          <Box sx={{ p: 4, pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Authorization Progress
              </Typography>
              <Chip 
                label={`${completionPercentage}% Complete`}
                color={completionPercentage === 100 ? 'success' : 'primary'}
                variant="filled"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={completionPercentage} 
              sx={{ 
                height: 12, 
                borderRadius: 6,
                bgcolor: alpha(theme.palette.grey[300], 0.3),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: completionPercentage === 100 
                    ? `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
                    : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                }
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {visitedSections.size} of {AUTHORIZATION_SECTIONS.length} sections reviewed
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Object.values(formState).filter(val => val === true).length} authorization(s) selected
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {(localErrors.length > 0 || formErrors) && (
        <Fade in>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={handleClearErrors}
            action={
              <Button color="inherit" size="small" onClick={handleClearErrors}>
                Dismiss
              </Button>
            }
          >
            {localErrors.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Please correct the following issues:
                </Typography>
                {localErrors.map((error, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                    • {error}
                  </Typography>
                ))}
              </Box>
            ) : (
              formErrors
            )}
          </Alert>
        </Fade>
      )}

      {/* Important Notice Banner */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          IMPORTANT AUTHORIZATION NOTICE
        </Typography>
        <Typography variant="body2">
          This authorization allows your health and social service information to be shared 
          among County programs and partners to improve your care coordination and access to services.
        </Typography>
      </Alert>

      {/* Authorization Content - Organized in Accordions */}
      <Box sx={{ mb: 4 }}>
        {AUTHORIZATION_SECTIONS.map((section) => (
          <AuthorizationSection
            key={section.id}
            section={section}
            expanded={expandedSection === section.id}
            onChange={handleAccordionChange(section.id)}
            completed={isSectionVisited(section.id)}
          />
        ))}
      </Box>

      {/* Specific Authorizations Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 3 }}>
          Specific Information Authorizations
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
                    icon={<MentalHealthIcon />}
                    checkedIcon={<MentalHealthIcon />}
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
                    icon={<HIVIcon />}
                    checkedIcon={<HIVIcon />}
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
                    icon={<SubstanceIcon />}
                    checkedIcon={<SubstanceIcon />}
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
};

export default AuthForDisclosure;