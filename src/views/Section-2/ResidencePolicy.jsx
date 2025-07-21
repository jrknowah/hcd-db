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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid
} from '@mui/material';
import {
  Home as HomeIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Restaurant as RestaurantIcon,
  CleaningServices as CleaningIcon,
  LocalHospital as MedicalIcon,
  Visibility as VisibilityIcon,
  SmokingRooms as SmokingIcon,
  AutoMode as AutoSaveIcon,
  CloudDone as CloudDoneIcon,
  Policy as PolicyIcon,
  PrintOutlined as PrintIcon,
  Close as CloseIcon,
  Groups as GroupsIcon,
  NightShelter as ShelterIcon
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

// Rules content organized by sections
const RESIDENCE_RULES_SECTIONS = [
  {
    id: 'introduction',
    title: 'Welcome & Program Overview',
    icon: HomeIcon,
    content: {
      introduction: `Welcome to Holliday's Helping Hands. The Holliday's Helping Hands program's focus is to provide a safe and nurturing environment where you can recuperate from illness or injury and where you can stabilize until you are able to transition into independent community living.`,
      mission: `The Holliday's Helping Hands staff is committed to assisting you in developing the daily living and social skills necessary to obtain and sustain permanent housing. The following rules were developed to assist you in developing these skills while you transition to permanent housing.`,
      commitment: `Holliday's Helping Hands is committed to making your stay as safe and comfortable as possible. In order to ensure the safety of all patients the following rules have been established.`,
      warning: `Please understand that any behavior or action that threatens the health, safety, security, and/or welfare of other patients or staff will not be accepted or tolerated.`,
      disclaimer: `The Program reserves the right to refuse services to anyone.`
    }
  },
  {
    id: 'safety',
    title: 'Safety & No Violence Policy',
    icon: SecurityIcon,
    content: {
      policy: 'To ensure the safety of all patients at Holliday\'s Helping Hands we have established a NO VIOLENCE POLICY.',
      rules: [
        'Violence is defined as any serious threats of violence, fighting, physical aggression towards staff or patients, intimidation, or destruction of property.',
        'If you feel that another patient has violated the No Violence Policy please inform any Holliday\'s Helping Hands staff to address the issue immediately.'
      ]
    }
  },
  {
    id: 'property',
    title: 'Personal Property Rules',
    icon: ShelterIcon,
    content: {
      overview: 'Due to very limited space at the facility, Patients are limited to one large bag during their entire length of stay.',
      rules: [
        'All personal property must fit within the dimensions of the locker or closet assigned.',
        'Personal belongings are to be kept in your locker at all times.',
        'Prior to admission your personal property will be screened.',
        'Staff may request to search your locker at any time.',
        'The Program will not be responsible for any personal items left after discharge.',
        'All items will be disposed of within 30 days after discharge.',
        'Once discharged, a client may not leave their personal items to be picked up at a later date.',
        'Holliday\'s Helping Hands is not responsible for any lost or stolen items.'
      ]
    }
  },
  {
    id: 'cleanliness',
    title: 'Cleanliness & Facility Maintenance',
    icon: CleaningIcon,
    content: {
      overview: 'It is everyone\'s responsibility to ensure the cleanliness of the facility.',
      rules: [
        'Sleeping areas need to be cleaned and organized daily.',
        'No accumulation of garbage, food, or stockpiling of items is allowed in your sleeping area or locker.',
        'Clean linen are provided as needed. All bedding should be changed on a weekly basis.',
        'Please do not write, pin, tape or nail anything to the walls or lockers.',
        'Food and drink products of any kind are to be eaten in the dining room only.'
      ]
    }
  },
  {
    id: 'visitation',
    title: 'Visitation Rules',
    icon: VisibilityIcon,
    content: {
      rules: [
        'Holliday\'s Helping Hands visiting hours are from 10:00 am - 7:00 pm.'
      ]
    }
  },
  {
    id: 'curfew',
    title: 'Curfew Rules',
    icon: ScheduleIcon,
    content: {
      rules: [
        'Patients are asked to return to Holliday\'s Helping Hands by 8:00 pm.',
        'Patients who will be out past 8:00 pm will not be allowed back in the facility until the next morning, and will need to meet with their Advocate to ensure the status of their bed.',
        'Patients can request a late pass for events, activities such as family reunification, recovery meetings and church activities. Patients must request an approved late pass by staff prior to leaving the facility with an expected time of return.'
      ]
    }
  },
  {
    id: 'medication',
    title: 'Medication Management',
    icon: MedicalIcon,
    content: {
      overview: 'Proper medication management ensures your safety and health.',
      rules: [
        'During office hours staff is available to provide access to medications.',
        'All medication is to be turned into staff for storage in a locked medication cabinet. You will have access to your medications as prescribed.',
        'Over the counter drugs, such as cough and cold medications, must also be turned in.',
        'Do not share medication with others.'
      ],
      schedule: [
        '8:00am Medication Call',
        '11:30am Medication Call',
        '5:00pm Medication Call',
        '9:00pm Medication Call'
      ]
    }
  },
  {
    id: 'security',
    title: 'Security Procedures',
    icon: SecurityIcon,
    content: {
      rules: [
        'From 7:00 pm till 7:00 am staff will be on-site.',
        'Security staff have no access to medications or to client records.',
        'Security staff are available to ensure your safety and to contact 911 in case of emergency.',
        'Security staff are not allowed to let you in and out of the property after 11:00 pm unless you have an approved pass from the staff.'
      ]
    }
  },
  {
    id: 'meals',
    title: 'Meal Times & Dining Rules',
    icon: RestaurantIcon,
    content: {
      overview: 'Meals include breakfast, lunch and dinner seven days a week.',
      schedule: [
        'Breakfast will be served at 8:00 am',
        'Lunch will be served at 12:00 pm',
        'Dinner at 5:00 pm',
        'Snack at 8:00 pm'
      ],
      rules: [
        'Staff are unable to save meals for clients who are not present during serving hours.',
        'There is no food storage (cabinets/refrigerator) or cooking of any kind in the dormitory area.',
        'There is to be no food consumption in the TV area, dormitory, or common areas.'
      ]
    }
  },
  {
    id: 'behavioral',
    title: 'Behavioral Rules & Conduct',
    icon: GroupsIcon,
    content: {
      quietHours: {
        overview: 'Quiet hours for the facility are between the hours of 10:00 pm and 7:00 am.',
        rules: [
          'Please use headphones to listen to your radio or computer during this time.',
          'Please do not have conversations in the dorm area.',
          'Please keep conversations on the patio and TV area to minimum.',
          'Please try to keep the traffic noise in the hallways and bathrooms to a minimum.'
        ]
      },
      respectRules: {
        overview: 'Please be respectful of all Patients living at the Holliday\'s Helping Hands',
        rules: [
          'No borrowing or loaning money to any patients.',
          'No illegal activities including theft, loan-sharking, prostitution/sex work, or selling drugs on premises or to other patients.',
          'No selling, distributing, or warehousing goods/products of any kind on the premises.',
          'Recycling storage is not permitted on the premises.',
          'No pornography, obscene pictures or sexually implicit books, pictures or items',
          'No language that might be offensive to others including cussing, racial slurs, racial jokes, OR inappropriate comments.',
          'No weapons on, in, or around Holliday\'s Helping Hands property.',
          'Nude sleeping is not allowed. Patients must be clothed (e.g. nightgown, T-shirt, shorts, pajamas, etc.) while sleeping.',
          'Please be fully clothed when in common areas. You should not walk around the facility with bare feet.',
          'All patients must use the restroom facilities to change clothes. Do not change clothes in sleeping areas.'
        ]
      },
      hygiene: {
        overview: 'You are responsible for your own personal hygiene.',
        rules: [
          'Please be considerate of others regarding your personal hygiene.',
          'Please do not use perfume or other heavily scented hygiene items which can negatively impact oxygen-dependent members',
          'If you are in need of personal items like shampoo, soap, deodorant, razors, toothbrush, tooth paste, or feminine hygiene items please inform the staff. Every effort will be made to provide you with the requested items when available.'
        ]
      }
    }
  },
  {
    id: 'smoking',
    title: 'Smoking Policy',
    icon: SmokingIcon,
    content: {
      overview: 'Smoking is prohibited inside any building at the facility.',
      rules: [
        'Smoking is only permitted in the designated patio area',
        'Smoking is not permitted near oxygen tanks or oxygen concentrators.',
        'Oxygen tanks and oxygen concentrators are not allowed in the designated smoking area while smoking or while others are smoking.',
        'All hand rolling of cigarettes must be done in the designated smoking area and NOT IN RESIDENTIAL or PATIO AREA.'
      ]
    }
  },
  {
    id: 'services',
    title: 'Required Services & Programs',
    icon: PolicyIcon,
    content: {
      housing: 'The Program offers supportive housing and advocacy services. You are required to use housing services. If you are determined to reside in the Program without utilizing available services, you may be linked to alternate housing and terminated from the Program.',
      meetings: 'All clients are required to meet with their assigned Advocate at least twice a week to discuss your housing transition plan and to monitor progress on goals and objectives.',
      groups: 'All clients are encouraged to attend groups available at Holliday\'s Helping Hands. A schedule of Life Skills, Health (Medication Management), exercise and other groups will be posted in the community room and offices every month.',
      housekeeping: 'Daily Housekeeping jobs are voluntary. If interested in volunteering for a daily housekeeping job, please see staff prior to ensure that no one else is already responsible for that job.',
      absence: 'Please notify staff if you will be absent over night before you leave. If you are gone over twenty-four (24) hours and fail to contact us you may lose your bed space.',
      discharge: 'After discharge, client will not be allowed to return to the Program without obtaining a new approval.'
    }
  },
  {
    id: 'violations',
    title: 'Rule Violations & Disciplinary Actions',
    icon: WarningIcon,
    content: {
      reporting: 'We ask that all Patients take a proactive approach in building a safe and healthy community. We ask that you report violations of the above rules: All reports will be treated with anonymity and confidentiality, unless a "duty to warn" is present.',
      consequences: 'Violations to the above rules may result in disciplinary action identified herein including but not limited to verbal warnings, probationary resident contract, and/or termination of residency.'
    }
  }
];

// Enhanced accordion section component
const RulesSection = ({ section, expanded, onChange, completed }) => {
  const theme = useTheme();
  const IconComponent = section.icon;
  
  const renderContent = () => {
    const { content } = section;
    
    if (section.id === 'introduction') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.introduction}
          </Typography>
          <Typography variant="body1" paragraph>
            {content.mission}
          </Typography>
          <Typography variant="body1" paragraph>
            {content.commitment}
          </Typography>
          <Alert severity="warning" sx={{ my: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {content.warning}
            </Typography>
          </Alert>
          <Alert severity="info">
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              {content.disclaimer}
            </Typography>
          </Alert>
        </Box>
      );
    }
    
    if (section.id === 'medication' && content.schedule) {
      return (
        <Box>
          {content.overview && (
            <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
              {content.overview}
            </Typography>
          )}
          <List dense>
            {content.rules.map((rule, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rule} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
            Medication Call Schedule:
          </Typography>
          <List dense>
            {content.schedule.map((time, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ScheduleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={time} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'meals') {
      return (
        <Box>
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Meal Schedule:
          </Typography>
          <List dense>
            {content.schedule.map((meal, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <RestaurantIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={meal} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
            Additional Rules:
          </Typography>
          <List dense>
            {content.rules.map((rule, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rule} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'behavioral') {
      return (
        <Box>
          {/* Quiet Hours */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Quiet Hours
          </Typography>
          <Typography variant="body2" paragraph>
            {content.quietHours.overview}
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.quietHours.rules.map((rule, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rule} />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Respect Rules */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Respectful Conduct
          </Typography>
          <Typography variant="body2" paragraph>
            {content.respectRules.overview}
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {content.respectRules.rules.map((rule, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rule} />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Hygiene */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Personal Hygiene
          </Typography>
          <Typography variant="body2" paragraph>
            {content.hygiene.overview}
          </Typography>
          <List dense>
            {content.hygiene.rules.map((rule, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rule} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    
    if (section.id === 'services') {
      return (
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                Housing Services
              </Typography>
              <Typography variant="body2" paragraph>
                {content.housing}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                Required Meetings
              </Typography>
              <Typography variant="body2" paragraph>
                {content.meetings}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                Group Activities
              </Typography>
              <Typography variant="body2" paragraph>
                {content.groups}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                Housekeeping Opportunities
              </Typography>
              <Typography variant="body2" paragraph>
                {content.housekeeping}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Absence Policy: {content.absence}
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Discharge Policy:</strong> {content.discharge}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Box>
      );
    }
    
    if (section.id === 'violations') {
      return (
        <Box>
          <Typography variant="body1" paragraph>
            {content.reporting}
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {content.consequences}
            </Typography>
          </Alert>
        </Box>
      );
    }
    
    // Default rule list rendering
    return (
      <Box>
        {content.overview && (
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.overview}
          </Typography>
        )}
        {content.policy && (
          <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
            {content.policy}
          </Typography>
        )}
        {content.rules && (
          <List dense>
            {content.rules.map((rule, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={rule} />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
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

// Print dialog component
const PrintDialog = ({ open, onClose }) => {
  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Print Residence Rules</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          You can print the complete residence rules and security policy for your records.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<PrintIcon />}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ResidencePolicy = ({ clientID: propClientID, formConfig }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  // Redux selectors
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const residencePolicyForm = useSelector(selectFormByType('residencePolicy'));
  const formLoading = useSelector(selectFormLoading('residencePolicy'));
  const saving = useSelector(selectSaving);
  const autoSaving = useSelector(selectAutoSaving);
  const saveSuccess = useSelector(selectSaveSuccess);
  const unsavedChanges = useSelector(selectUnsavedChanges);
  const formErrors = useSelector((state) => state.authSig.formErrors.residencePolicy);
  
  // Local state
  const [resPolicySignature, setResPolicySignature] = useState("");
  const [localErrors, setLocalErrors] = useState([]);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  // Accordion management
  const {
    expandedSection,
    visitedSections,
    completionPercentage: readingProgress,
    handleAccordionChange,
    isSectionVisited
  } = useFormAccordion(RESIDENCE_RULES_SECTIONS);
  
  // Get client ID from props or Redux
  const clientID = propClientID || selectedClient?.clientID;
  
  // Calculate overall completion percentage
  const completionPercentage = useMemo(() => {
    const readingComplete = readingProgress > 90 ? 50 : (readingProgress * 0.5);
    const signatureComplete = resPolicySignature.trim() ? 50 : 0;
    return Math.round(readingComplete + signatureComplete);
  }, [readingProgress, resPolicySignature]);
  
  // Form validation
  const isValid = useMemo(() => {
    return clientID && 
           resPolicySignature.trim() && 
           visitedSections.size >= RESIDENCE_RULES_SECTIONS.length * 0.8; // 80% of sections read
  }, [clientID, resPolicySignature, visitedSections.size]);
  
  // Auto-save form data
  const formData = useMemo(() => ({
    resPolicySignature,
    sectionsRead: Array.from(visitedSections),
    readingProgress,
    completionPercentage,
    lastModified: new Date().toISOString()
  }), [resPolicySignature, visitedSections, readingProgress, completionPercentage]);
  
  // Load form data when component mounts
  useEffect(() => {
    if (clientID) {
      dispatch(fetchFormData({ clientID, formType: 'residencePolicy' }));
    }
  }, [dispatch, clientID]);
  
  // Update local state when Redux form data changes
  useEffect(() => {
    if (residencePolicyForm && Object.keys(residencePolicyForm).length > 0) {
      setResPolicySignature(residencePolicyForm.resPolicySignature || "");
    }
  }, [residencePolicyForm]);
  
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

  // Handle signature changes
  const handleSigChange = useCallback((e) => {
    const signature = e.target.value;
    setResPolicySignature(signature);
    setLocalErrors([]);
    
    dispatch(updateFormLocal({
      formType: 'residencePolicy',
      formData: {
        resPolicySignature: signature,
        completionPercentage: visitedSections.size >= RESIDENCE_RULES_SECTIONS.length * 0.8 && signature.trim() ? 100 : 
                            (visitedSections.size / RESIDENCE_RULES_SECTIONS.length * 50) + (signature.trim() ? 50 : 0)
      }
    }));
  }, [dispatch, visitedSections.size]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    
    const validationErrors = [];
    
    if (!clientID) {
      validationErrors.push("No client selected. Please select a client first.");
    }

    if (!resPolicySignature.trim()) {
      validationErrors.push("Electronic signature is required to complete the acknowledgment.");
    }
    
    if (visitedSections.size < RESIDENCE_RULES_SECTIONS.length * 0.8) {
      validationErrors.push("Please review at least 80% of the residence rules sections before signing.");
    }
    
    if (validationErrors.length > 0) {
      setLocalErrors(validationErrors);
      return;
    }

    const submitData = {
      resPolicySignature,
      sectionsRead: Array.from(visitedSections),
      readingProgress,
      completionPercentage: 100,
      status: 'completed',
      formData: {
        acknowledgedAt: new Date().toISOString(),
        rulesVersion: formConfig?.version || '2024-v1',
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      }
    };

    try {
      await dispatch(saveFormData({ 
        clientID, 
        formType: 'residencePolicy', 
        formData: submitData 
      })).unwrap();
      
      setLocalErrors([]);
      setShowSuccessSnackbar(true);
    } catch (error) {
      setLocalErrors([error.message || 'Failed to save residence policy acknowledgment']);
    }
  }, [dispatch, clientID, resPolicySignature, visitedSections, readingProgress, formConfig]);

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
            Loading residence policy data...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we retrieve the residence rules
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
            background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
            color: 'white',
            p: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HomeIcon sx={{ mr: 2, fontSize: 40 }} />
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
                  Rules of Residence & Security Policy
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
                  Holliday's Helping Hands - Facility Guidelines & Procedures
                </Typography>
              </Box>
            </Box>
            
            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
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
              <Button
                startIcon={<PrintIcon />}
                onClick={() => setShowPrintDialog(true)}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
                variant="outlined"
                size="small"
              >
                Print
              </Button>
            </Box>
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
                Review Progress
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
                {visitedSections.size} of {RESIDENCE_RULES_SECTIONS.length} sections reviewed ({readingProgress}%)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {resPolicySignature ? 'Signature provided' : 'Signature required'}
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
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          IMPORTANT FACILITY RULES
        </Typography>
        <Typography variant="body2">
          Please carefully review all sections of the residence rules and security policy. 
          These rules are designed to ensure the safety and well-being of all residents.
        </Typography>
      </Alert>

      {/* Rules Content - Organized in Accordions */}
      <Box sx={{ mb: 4 }}>
        {RESIDENCE_RULES_SECTIONS.map((section) => (
          <RulesSection
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
          Acknowledgment & Electronic Signature
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          I have read and understand all points of the Rules of Residence and Security Policy provided to me by
          Holliday's Helping Hands. I acknowledge the receipt and review of such rules.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Patient Electronic Signature"
            variant="outlined"
            value={resPolicySignature}
            onChange={handleSigChange}
            placeholder="Enter your full legal name"
            required
            sx={{ mb: 2 }}
            helperText="Type your name to provide your electronic signature for this acknowledgment"
          />

          {resPolicySignature && (
            <Zoom in={!!resPolicySignature}>
              <Alert 
                severity="success" 
                icon={<CheckCircleIcon />}
                sx={{ mb: 3 }}
              >
                <Typography variant="body2">
                  Signature captured: <strong>{resPolicySignature}</strong>
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
                  Please review the rules and provide your signature before saving
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Print Dialog */}
      <PrintDialog 
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
      />

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
            ✅ Residence policy acknowledgment saved successfully!
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

export default ResidencePolicy;