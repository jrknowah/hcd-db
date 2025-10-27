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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Zoom,
  useTheme,
  alpha
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
} from '../../backend/store/slices/authSigSlice';

// Import custom hooks
import { useFormAccordion } from '../../hooks/useFormManager';

// Grievance policy sections
const GRIEVANCE_SECTIONS = [
  {
    id: 'policy',
    title: 'Grievance Policy & Client Rights',
    icon: PolicyIcon,
    content: {
      overview: "Holliday's Helping Hands Clients have the right to express their dissatisfaction relating to perceived:",
      rights: [
        'Unfair or inequitable administration of program policies',
        "Unfair or inequitable treatment or services from Holliday's Helping Hands",
        'Inadequate program services and/or building conditions',
        'Denial of services',
        "Inappropriate behavior on the part of Holliday's Helping Hands staff or Clients",
        'Discrimination related to race, disability, ethnicity, sex, age, religion, sexual orientation or family status',
        'Termination of services (if applicable)'
      ],
      commitment: "Every reasonable effort will be made by Holliday's Helping Hands staff and management to resolve any questions or concerns at the time they arise by initiating discussion. If the problem cannot be resolved to the Client's satisfaction, she/he may initiate a grievance.",
      protection: "An individual will not be faulted, nor will any retaliatory action be taken, for the filing of a grievance. Grievance information will be treated discreetly and confidentially."
    }
  },
  {
    id: 'process',
    title: 'Grievance Review & Investigation Process',
    icon: ProcessIcon,
    content: {
      overview: "Holliday's staff are responsible for ensuring that Holliday's Helping Hands Clients know and understand agency grievance procedures.",
      steps: [
        {
          title: 'Posted Procedures',
          description: "A copy of the grievance procedure will be posted at all Holliday's Helping Hands sites."
        },
        {
          title: 'Initial Resolution',
          description: "If a Client has a grievance that cannot be resolved directly with the program or staff Client involved, the Client should report it to the staff Client's manager. It is the responsibility of the manager to speak to all parties involved and try to settle the matter to the satisfaction of all parties."
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
      overview: "If the client is not satisfied with the decision of the investigating Department Head and feels that the grievance is unresolved, additional options are available.",
      process: [
        'The client may request in writing a review of the grievance with an outside dispute resolution service (mediator).',
        "Such mediator shall be selected and agreed upon by the complainant and Holliday's Helping Hands.",
        'Mediation shall take place within 48 hours of the meeting between the complainant and the investigating Department Head.',
        'An impartial mediator shall be selected and the mediation governed according to the rules of dispute resolution.',
        "The decision of the mediator shall be final and binding, and there shall be no further appeal avenues available to the complainant or Holliday's Helping Hands."
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
      overview: "In the event a client grievance or complaint becomes a legal or insurance issue, specific procedures will be followed.",
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
        "Employees submitting a grievance and/or complaint unrelated to clients or customers should follow the policies set forth within the Holliday's Helping Hands Handbook."
      ],
      documentation: [
        'The Assistant to the CEO will update the log noting the determination; date completed and if any follow up is needed.',
        "Copies of the determination will be forwarded to: 1) the Manager deemed responsible for the area or subject being grieved, 2) the Associate Director of the client's residential program, 3) the Advocate who will notify the client if available, 4) the Department Head/Director, and 5) the Director of Administrative Services.",
        "For any grievances alleging misconduct, inappropriate behavior by Holliday's staff, a copy of the determination will be forwarded to the Director of Human Resources and Chief Operating Officer.",
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
        'The Director of Administrative Services will review grievance determinations on a quarterly basis.',
        'If patterns or trends emerge requiring policy changes or corrective action, appropriate measures will be recommended.',
        'All staff will be notified of policy updates resulting from grievance reviews.'
      ],
      commitment: [
        "Holliday's Helping Hands is committed to continuous improvement of services and policies.",
        'Client feedback through the grievance process helps us serve you better.',
        'We value your input and take all concerns seriously.'
      ]
    }
  }
];

// Grievance Section Component
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
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, mt: 2 }}>
            Mediation Process:
          </Typography>
          <List dense>
            {content.process.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <JusticeIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, mt: 2 }}>
            Responsibilities:
          </Typography>
          <List dense>
            {content.responsibilities.map((item, index) => (
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
          <List dense>
            {content.clientGrievances.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <PersonIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, mt: 2 }}>
            Employee Grievances:
          </Typography>
          <List dense>
            {content.employeeGrievances.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <BusinessIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1, mt: 2 }}>
            Documentation & Records:
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
            Quarterly Review Process:
          </Typography>
          <List dense>
            {content.review.map((item, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ProcessIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
          
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Our Commitment to You:
            </Typography>
            {content.commitment.map((item, index) => (
              <Typography key={index} variant="body2" paragraph={index < content.commitment.length - 1}>
                • {item}
              </Typography>
            ))}
          </Alert>
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

// ✅ MAIN COMPONENT WITH FORWARDREF
const ClientGrievances = forwardRef(({ 
  clientID, 
  title = "Client Grievances Policy & Procedure", 
  formType = "clientGrievances" 
}, ref) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors - using the formType parameter
  const existingData = useSelector((state) => selectFormByType(state, formType));
  const loading = useSelector(selectFormLoading);
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  
  // ✅ FIX: Add local loading state to prevent infinite loops
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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
  
  // ✅ EXPOSE getFormData VIA REF
  useImperativeHandle(ref, () => ({
    getFormData: () => ({
      ...formData,
      sectionsRead: Array.from(visitedSections),
      readingProgress,
      clientID,
      formType
    })
  }));
  
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
  
  // ✅ FIX: Load form data with error handling
  useEffect(() => {
    if (clientID && formType) {
      dispatch(fetchFormData({ clientID, formType }))
        .unwrap()
        .then((data) => {
          console.log('Form data loaded:', data);
        })
        .catch((error) => {
          console.warn('Failed to load form data (form will work with empty data):', error);
        })
        .finally(() => {
          setTimeout(() => setIsInitialLoad(false), 1000);
        });
    } else {
      setIsInitialLoad(false);
    }
  }, [dispatch, clientID, formType]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (existingData && Object.keys(existingData).length > 0) {
      setFormData({
        clientGrievanceSign: existingData.clientGrievanceSign || ""
      });
    }
  }, [existingData]);
  
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
      formType,
      formData: newFormData
    }));
  }, [dispatch, formData, formType]);

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
      validationErrors.push("Please review at least 80% of the policy sections before signing.");
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
      clientID,
      formType,
      acknowledgedAt: new Date().toISOString()
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType, 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save grievances policy acknowledgment']);
    }
  }, [dispatch, clientID, formData, visitedSections, readingProgress, formType]);

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

  // ✅ FIX: Improved loading state
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
            Loading grievances policy...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <GrievanceIcon sx={{ fontSize: 48, mr: 2 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Your Rights and the Grievance Process
        </Typography>
      </Paper>

      {/* Progress Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Policy Review Progress
              </Typography>
              <Chip 
                label={`${completionPercentage}% Complete`}
                color={completionPercentage === 100 ? "success" : "default"}
                size="small"
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completionPercentage} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Sections Read
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {visitedSections.size} / {GRIEVANCE_SECTIONS.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Signature
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formData.clientGrievanceSign ? 'Provided' : 'Required'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Error Alerts */}
      {localErrors.length > 0 && (
        <Fade in>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={handleClearErrors}
          >
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
});

// ✅ ADD DISPLAY NAME
ClientGrievances.displayName = 'ClientGrievances';

export default ClientGrievances;