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
  Feedback as GrievanceIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Policy as PolicyIcon,
  Gavel as LegalIcon,
  Business as BusinessIcon,
  AutoMode as AutoSaveIcon,
  CloudDone as CloudDoneIcon,
  ContactSupport as SupportIcon,
  Assignment as ProcessIcon,
  Security as SecurityIcon,
  Balance as JusticeIcon
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
import { useFormAccordion } from '../../hooks/useFormManager';

// Grievance policy sections
const GRIEVANCE_SECTIONS = [
  {
    id: 'policy',
    title: 'Grievance Policy & Client Rights',
    icon: PolicyIcon,
    content: {
      overview: `Holliday's Helping Hands Clients have the right to express their dissatisfaction relating to perceived:`,
      rights: [
        'Unfair or inequitable administration of program policies',
        'Unfair or inequitable treatment or services from Holliday\'s Helping Hands',
        'Inadequate program services and/or building conditions',
        'Denial of services',
        'Inappropriate behavior on the part of Holliday\'s Helping Hands staff or Clients',
        'Discrimination related to race, disability, ethnicity, sex, age, religion, sexual orientation or family status',
        'Termination of services (if applicable)'
      ],
      commitment: `Every reasonable effort will be made by Holliday's Helping Hands staff and management to resolve any questions or concerns at the time they arise by initiating discussion. If the problem cannot be resolved to the Client's satisfaction, she/he may initiate a grievance.`,
      protection: `An individual will not be faulted, nor will any retaliatory action be taken, for the filing of a grievance. Grievance information will be treated discreetly and confidentially.`
    }
  },
  {
    id: 'process',
    title: 'Grievance Review & Investigation Process',
    icon: ProcessIcon,
    content: {
      overview: `Holliday's staff are responsible for ensuring that Holliday's Helping Hands Clients know and understand agency grievance procedures.`,
      steps: [
        {
          title: 'Posted Procedures',
          description: 'A copy of the grievance procedure will be posted at all Holliday\'s Helping Hands sites.'
        },
        {
          title: 'Initial Resolution',
          description: 'If a Client has a grievance that cannot be resolved directly with the program or staff Client involved, the Client should report it to the staff Client\'s manager. It is the responsibility of the manager to speak to all parties involved and try to settle the matter to the satisfaction of all parties.'
        },
        {
          title: 'Urgent Grievances',
          description: 'For discharge grievances and grievances that require immediate attention, reasonable efforts will be made to review, investigate and issue a determination within one (1) business day. A copy of the determination will be distributed to the appropriate departments.'
        },
        {
          title: 'Formal Grievance Process',
          description: 'In the event that the matter is not resolved to the satisfaction of the Client, the Client may ask for a Grievance Form. The Grievance Form will be completed by the Client with detailed information and requested outcome and given to any staff Client.'
        },
        {
          title: 'Investigation Timeline',
          description: 'The investigating Lead will use reasonable effort to review the client grievance, conduct the appropriate investigation and issue a determination within 72 hours. The determination will then be forwarded to the responsible Department Head and the Director of Administrative Services.'
        },
        {
          title: 'Administrative Review',
          description: 'The Director of Administrative Services will meet with the Client and the supervisor (if appropriate) within ten (10) business days of the initial grievance date.'
        },
        {
          title: 'Final Appeal',
          description: 'If the Client does not feel the grievance is resolved by the Director, a meeting will be set up within 3 days with the Director of Administrative Services. The decision of the Director of Administrative Services is final.'
        }
      ]
    }
  },
  {
    id: 'mediation',
    title: 'External Dispute Resolution & Mediation',
    icon: JusticeIcon,
    content: {
      overview: `If the client is not satisfied with the decision of the investigating Department Head and feels that the grievance is unresolved, additional options are available.`,
      process: [
        'The client may request in writing a review of the grievance with an outside dispute resolution service (mediator).',
        'Such mediator shall be selected and agreed upon by the complainant and Holliday\'s Helping Hands.',
        'Mediation shall take place within 48 hours of the meeting between the complainant and the investigating Department Head.',
        'An impartial mediator shall be selected and the mediation governed according to the rules of dispute resolution.',
        'The decision of the mediator shall be final and binding, and there shall be no further appeal avenues available to the complainant or Holliday\'s Helping Hands.'
      ],
      responsibilities: [
        'When a grievance has not been resolved internally and request for outside dispute resolution is made, the Department Head shall contact the agreed upon dispute resolution service.',
        'The Department Head shall notify the Director of Administrative Services of the external mediation process.'
      ]
    }
  },
  {
    id: 'legal',
    title: 'Insurance & Legal Issues',
    icon: LegalIcon,
    content: {
      overview: `In the event a client grievance or complaint becomes a legal or insurance issue, specific procedures will be followed.`,
      procedures: [
        'The Chief Compliance Officer will handle all insurance proceedings.',
        'The Chief Compliance Officer will assign any court appearances or collecting of evidence to the appropriate Department Head.',
        'The nature and extent of the investigation will be under the direction of the Director of Administrative Services.',
        'The Director of Administrative Services will update and advise the CEO when appropriate.',
        'The CEO will take the lead and responsibility with respect to all critical incidents.'
      ]
    }
  },
  {
    id: 'determination',
    title: 'Investigation Determination & Follow-up',
    icon: BusinessIcon,
    content: {
      clientGrievances: [
        'The Director of Administrative Services will review the facts and the determination of all client/customer-based grievances and complaints.',
        'The Director of Administrative Services may request additional information or consultation.',
        'When the Director of Administrative Services is satisfied and agrees with the outcome, he/she will notify the investigating Department Head who will prepare the final determination and forward this to the Office of the CEO.'
      ],
      employeeGrievances: [
        'The Director of Administrative Services will review the facts, investigation report and the determination of all grievance complaints relating to clients versus employee involvement.',
        'Employees submitting a grievance and/or complaint unrelated to clients or customers should follow the policies set forth within the Holliday\'s Helping Hands Handbook.'
      ],
      documentation: [
        'The Assistant to the CEO will update the log noting the determination; date completed and if any follow up is needed.',
        'Copies of the determination will be forwarded to: 1) the Manager deemed responsible for the area or subject being grieved, 2) the Associate Director of the client\'s residential program, 3) the Advocate who will notify the client if available, 4) the Department Head/Director, and 5) the Director of Administrative Services.',
        'For any grievances alleging misconduct, inappropriate behavior by Holliday\'s staff, a copy of the determination will be forwarded to the Director of Human Resources and Chief Operating Officer.',
        'Grievance complaint forms and subsequent determinations shall be maintained in a confidential locked file cabinet located in the area of the executive offices.',
        'These files shall be made accessible to LAHSA upon request.'
      ]
    }
  },
  {
    id: 'resolution',
    title: 'Final Resolution & Policy Correction',
    icon: SecurityIcon,
    content: {
      review: [
        'Grievance determinations may be reviewed at the sole discretion of the CEO or any other Department Director associated with the grievance or complaint.',
        'In the event a Holliday\'s policy or procedure was not followed or an employee is found to be at fault, the Staff deemed responsible for the area or subject being grieved shall submit in writing actions to correct the policy or procedure or if appropriate employee correction or disciplinary actions to be taken.'
      ],
      understanding: `It should be understood that not every problem can be resolved to everyone's total satisfaction, but only through understanding and discussion of mutual problems can our clients and Holliday's Helping Hands develop confidence in each other. This confidence is important to the operation of an efficient, harmonious, and profitable business relationship.`
    }
  }
];

// Enhanced accordion section component
const GrievanceSection = ({ section, expanded, onChange, completed }) => {
  const theme = useTheme();
  const IconComponent = section.icon;
  
  const renderContent = () => {
    const { content } = section;
    
    if (section.id === 'policy') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          <List dense>
            {content.rights.map((right, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={right} />
              </ListItem>
            ))}
          </List>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            {content.commitment}
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {content.protection}
            </Typography>
          </Alert>
        </Box>
      );
    }
    
    if (section.id === 'process') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          {content.steps.map((step, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                {step.title}
              </Typography>
              <Typography variant="body2" paragraph>
                {step.description}
              </Typography>
              {index < content.steps.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      );
    }
    
    if (section.id === 'mediation') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Mediation Process:
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.process.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <JusticeIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Department Head Responsibilities:
          </Typography>
          <List dense>
            {content.responsibilities.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <BusinessIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'legal') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          <List dense>
            {content.procedures.map((procedure, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LegalIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={procedure} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'determination') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Client Grievances:
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.clientGrievances.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <PersonIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Employee Grievances:
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.employeeGrievances.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <BusinessIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Documentation Requirements:
          </Typography>
          <List dense>
            {content.documentation.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SecurityIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'resolution') {
      return (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Review Process:
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.review.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {content.understanding}
            </Typography>
          </Alert>
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

const ClientGrievances = ({ clientID: propClientID, formConfig }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const grievancesForm = useSelector(selectFormByType('grievances'));
  const formLoading = useSelector(selectFormLoading('grievances'));
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  const formErrors = useSelector((state) => state.authSig.formErrors.grievances);
  
  // Local state
  const [formData, setFormData] = useState({
    clientGrievanceSign: ""
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
  } = useFormAccordion(GRIEVANCE_SECTIONS);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate overall completion percentage
  const completionPercentage = useMemo(() => {
    const readingComplete = readingProgress > 90 ? 50 : (readingProgress * 0.5);
    const signatureComplete = formData.clientGrievanceSign.trim() ? 50 : 0;
    return Math.round(readingComplete + signatureComplete);
  }, [readingProgress, formData.clientGrievanceSign]);
  
  // Form validation
  const isValid = useMemo(() => {
    return clientID && 
           formData.clientGrievanceSign.trim() && 
           visitedSections.size >= GRIEVANCE_SECTIONS.length * 0.8;
  }, [clientID, formData.clientGrievanceSign, visitedSections.size]);
  
  // Auto-save form data
  const autoSaveData = useMemo(() => ({
    ...formData,
    sectionsRead: Array.from(visitedSections),
    readingProgress,
    completionPercentage,
    lastModified: new Date().toISOString()
  }), [formData, visitedSections, readingProgress, completionPercentage]);
  
  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'grievances' }));
    }
  }, [dispatch, clientID]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (grievancesForm && Object.keys(grievancesForm).length > 0) {
      setFormData({
        clientGrievanceSign: grievancesForm.clientGrievanceSign || ""
      });
    }
  }, [grievancesForm]);
  
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

  // Handle signature change
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    
    setFormData(newFormData);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'grievances',
      formData: newFormData
    }));
  }, [dispatch, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    
    const validationErrors = [];
    
    if (!clientID) {
      validationErrors.push("No client selected. Please select a client first.");
    }

    if (!formData.clientGrievanceSign.trim()) {
      validationErrors.push("Electronic signature is required to complete the acknowledgment.");
    }
    
    if (visitedSections.size < GRIEVANCE_SECTIONS.length * 0.8) {
      validationErrors.push("Please review at least 80% of the grievance policy sections before signing.");
    }
    
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const submitData = {
      ...formData,
      sectionsRead: Array.from(visitedSections),
      readingProgress,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        policyVersion: formConfig?.version || '2024-v1',
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'grievances', 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save grievances acknowledgment']);
    }
  }, [dispatch, clientID, formData, visitedSections, readingProgress, formConfig]);

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
            Loading grievances data...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we retrieve the grievance policy information
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
            background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
            color: 'white',
            p: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <GrievanceIcon sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                  Client Grievances
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                  Policy & Procedures for Filing Complaints
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
                Policy Review Progress
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
                {visitedSections.size} of {GRIEVANCE_SECTIONS.length} sections reviewed ({readingProgress}%)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formData.clientGrievanceSign ? 'Signature provided' : 'Signature required'}
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
          YOUR RIGHT TO FILE GRIEVANCES
        </Typography>
        <Typography variant="body2">
          This policy outlines your rights and the procedures for filing complaints or grievances. 
          Please review all sections carefully to understand the process and your protections.
        </Typography>
      </Alert>

      {/* Grievance Policy Content - Organized in Accordions */}
      <Box sx={{ mb: 4 }}>
        {GRIEVANCE_SECTIONS.map((section) => (
          <GrievanceSection
            key={section.id}
            section={section}
            expanded={expandedSection === section.id}
            onChange={handleAccordionChange(section.id)}
            completed={isSectionVisited(section.id)}
          />
        ))}
      </Box>

      {/* Acknowledgment Section */}
      <Paper elevation={2} sx={{ p: 4, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Policy Acknowledgment & Electronic Signature
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          I have read the above grievance procedure/policy and I have been given a copy of this form.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Electronic Signature"
            variant="outlined"
            id="clientGrievanceSign"
            name="clientGrievanceSign"
            value={formData.clientGrievanceSign}
            onChange={handleInputChange}
            placeholder="Enter your full legal name"
            required
            sx={{ mb: 2 }}
            helperText="Type your name to provide your electronic signature for this acknowledgment"
          />

          {formData.clientGrievanceSign && (
            <Zoom in={!!formData.clientGrievanceSign}>
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />}
                sx={{ mb: 3 }}
              >
                <Typography variant="body2">
                  Signature captured: <strong>{formData.clientGrievanceSign}</strong>
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
              {saving ? 'Saving...' : 'Save Acknowledgment'}
            </Button>

            {!isValid && (
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningIcon sx={{ color: 'warning.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="warning.main">
                  Please review the policy and provide your signature before saving
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Contact Information */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Need Help Filing a Grievance?
        </Typography>
        <Typography variant="body2">
          If you need assistance understanding this policy or filing a grievance, 
          please speak with any Holliday's Helping Hands staff member. We are here to help ensure your concerns are addressed appropriately.
        </Typography>
      </Alert>

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
            ✅ Grievances policy acknowledgment saved successfully!
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

export default ClientGrievances;