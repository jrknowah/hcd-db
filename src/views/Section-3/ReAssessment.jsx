// ====================================================================
// FIXED ReAssessment Component - Safe Client Selection
// ====================================================================

import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    Grid,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    LinearProgress,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Autocomplete,
    CircularProgress
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Assessment as AssessmentIcon,
    Psychology as PsychologyIcon,
    MedicalServices as MedicalIcon,
    School as EducationIcon,
    Work as WorkIcon,
    Gavel as LegalIcon,
    Home as HomeIcon,
    FamilyRestroom as FamilyIcon,
    Save as SaveIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    BugReport as BugIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from "react-redux";
import logUserAction from "../../config/logAction";
import {
    cmOb1, cmOb2, cmOb3, cmOb4, cmOb5, cmOb6, cmOb7, cmOb8, cmOb9, cmOb10, cmOb11, cmObNone
} from "../../data/arrayList";

// ✅ Import your reassessment actions (adjust path as needed)
import {
    fetchReassessmentData, 
    saveReassessmentData,
    updateFormField,
    updateArrayField,
    calculateCompletionPercentage,
    selectFormData,
    selectCompletionStatus,
    selectIsLoading,
    selectIsSaving
} from "../../store/slices/reassessmentSlice";

const ReAssessment = () => {
    const dispatch = useDispatch();
    
    // 🔍 DEBUG: Let's see what's in the Redux state
    const entireState = useSelector((state) => state);
    const [debugMode, setDebugMode] = useState(false);
    
    // ✅ SAFE SELECTORS - Try multiple possible locations for selectedClient
    const selectedClient = useSelector((state) => {
        return state.clients?.selectedClient || 
               state.auth?.selectedClient || 
               state.user?.selectedClient || 
               state.app?.selectedClient ||
               null;
    });
    
    const user = useSelector((state) => state.auth?.user || {});
    
    // ✅ Local state for mock client as backup
    const [localMockClient, setLocalMockClient] = useState(null);
    
    // ✅ Use selectedClient or local mock client
    const currentClient = selectedClient || localMockClient;
    
    // ✅ Use reassessment selectors with fallbacks
    const formData = useSelector(selectFormData) || {};
    const completionStatus = useSelector(selectCompletionStatus) || { percentage: 0, status: 'Not Started', isCompleted: false };
    const isLoading = useSelector(selectIsLoading) || false;
    const isSaving = useSelector(selectIsSaving) || false;
    
    const [saveStatus, setSaveStatus] = useState(null);

    // 🔍 Console log for debugging
    console.log('🔍 ReAssessment Debug Info:', {
        entireState: Object.keys(entireState),
        selectedClient,
        localMockClient,
        currentClient,
        hasClientsSlice: !!entireState.clients,
        hasReassessmentSlice: !!entireState.reassessment,
        formDataKeys: Object.keys(formData)
    });

    // ✅ Load mock client function
    const loadMockClient = () => {
        const mockClient = {
            clientID: "CLIENT-123",
            clientName: "John Doe (Mock)",
            clientEmail: "john.doe@example.com",
            dateOfBirth: "1985-03-15",
            phoneNumber: "(555) 123-4567",
            caseManager: "Sarah Wilson",
            status: "Active"
        };
        
        console.log('🎯 Loading mock client for ReAssessment:', mockClient);
        setLocalMockClient(mockClient);
        setSaveStatus({ 
            type: 'info', 
            message: `Mock client "${mockClient.clientName}" loaded successfully!` 
        });
    };

    // ✅ Fetch reassessment data when client is available
    useEffect(() => {
        if (currentClient?.clientID) {
            console.log('🔄 Fetching reassessment data for:', currentClient.clientID);
            dispatch(fetchReassessmentData(currentClient.clientID));
        }
    }, [currentClient, dispatch]);

    // ✅ Update completion percentage when form data changes
    useEffect(() => {
        if (Object.keys(formData).length > 0) {
            dispatch(calculateCompletionPercentage());
        }
    }, [formData, dispatch]);

    // ✅ Handle input changes using Redux actions
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        dispatch(updateFormField({ field: name, value }));
    };

    const handleSelectChange = (fieldName, value) => {
        dispatch(updateFormField({ field: fieldName, value }));
    };

    const handleMultiSelectChange = (fieldName, values) => {
        dispatch(updateArrayField({ field: fieldName, values }));
    };

    // ✅ Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentClient?.clientID) {
            setSaveStatus({ type: 'error', message: "Please select a client before saving." });
            return;
        }

        try {
            await dispatch(saveReassessmentData({
                clientID: currentClient.clientID,
                reassessmentData: {
                    ...formData,
                    updatedBy: user?.email || "unknown",
                    updatedAt: new Date().toISOString(),
                }
            })).unwrap();
            
            setSaveStatus({ type: 'success', message: "✅ ReAssessment data saved successfully." });

            // Optional: log to your logging service
            if (user) {
                await logUserAction(user, "SAVE_REASSESSMENT_DATA", {
                    clientId: currentClient.clientID,
                    section: "ReAssessment",
                    updatedAt: new Date().toISOString(),
                });
            }

        } catch (error) {
            console.error("❌ Error saving ReAssessment data:", error);
            setSaveStatus({ type: 'error', message: "⚠️ Failed to save data. Please try again." });
        }
    };

    // ✅ Show loading state
    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading reassessment data...</Typography>
            </Box>
        );
    }

    // ✅ Show enhanced no client screen
    if (!currentClient) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="h6">No Client Selected</Typography>
                    <Typography>
                        Please select a client to view the Mental Health Re-Assessment.
                    </Typography>
                </Alert>
                
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Quick Start Options</Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item>
                                <Button 
                                    variant="contained" 
                                    startIcon={<PersonIcon />}
                                    onClick={loadMockClient}
                                    color="primary"
                                >
                                    Load Mock Client
                                </Button>
                            </Grid>
                            <Grid item>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<BugIcon />}
                                    onClick={() => setDebugMode(!debugMode)}
                                >
                                    {debugMode ? 'Hide Debug' : 'Show Debug Info'}
                                </Button>
                            </Grid>
                        </Grid>

                        {/* ✅ Debug Information */}
                        {debugMode && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>Debug Information:</Typography>
                                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                                    {JSON.stringify({
                                        'Redux Slices Available': Object.keys(entireState),
                                        'Has clients slice': !!entireState.clients,
                                        'Has reassessment slice': !!entireState.reassessment,
                                        'Current selectedClient': selectedClient,
                                        'Local mock client': localMockClient,
                                        'Form data keys': Object.keys(formData),
                                        'Environment': import.meta.env.DEV ? 'development' : 'production'
                                    }, null, 2)}
                                </pre>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        );
    }

    // Convert data arrays to MUI format
    const convertToMUIOptions = (array) => {
        if (!array) return [];
        return array.map(item => ({
            label: typeof item === 'string' ? item : item.label || item.value || item,
            value: typeof item === 'string' ? item : item.value || item
        }));
    };

    // Mental Status Exam options (adjust based on your data structure)
    const mentalStatusOptions = {
        cmOb1: convertToMUIOptions(cmOb1),
        cmOb2: convertToMUIOptions(cmOb2),
        cmOb3: convertToMUIOptions(cmOb3),
        cmOb4: convertToMUIOptions(cmOb4),
        cmOb5: convertToMUIOptions(cmOb5),
        cmOb6: convertToMUIOptions(cmOb6),
        cmOb7: convertToMUIOptions(cmOb7),
        cmOb8: convertToMUIOptions(cmOb8),
        cmOb9: convertToMUIOptions(cmOb9),
        cmOb10: convertToMUIOptions(cmOb10),
        cmOb11: convertToMUIOptions(cmOb11),
        cmObNone: convertToMUIOptions(cmObNone)
    };

    return (
        <Paper elevation={3} sx={{ maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Mental Health Re-Assessment
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                    Comprehensive mental health re-evaluation for {currentClient.clientName} ({currentClient.clientID})
                </Typography>
                
                {/* Progress Overview */}
                <Card elevation={1} sx={{ mt: 2 }}>
                    <CardContent>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Assessment Progress</Typography>
                                    <Typography variant="h6" color={completionStatus.percentage >= 80 ? 'success.main' : completionStatus.percentage >= 60 ? 'warning.main' : 'error.main'}>
                                        {completionStatus.percentage}%
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={completionStatus.percentage}
                                        color={completionStatus.percentage >= 80 ? 'success' : completionStatus.percentage >= 60 ? 'warning' : 'error'}
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Client</Typography>
                                    <Chip 
                                        label={currentClient.clientName} 
                                        color="success"
                                        icon={<PersonIcon />}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Status</Typography>
                                    <Chip 
                                        label={completionStatus.status} 
                                        color={completionStatus.isCompleted ? 'success' : 'warning'}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Box>

            {/* Save Status Alert */}
            {saveStatus && (
                <Box sx={{ px: 3, pt: 2 }}>
                    <Alert severity={saveStatus.type} onClose={() => setSaveStatus(null)}>
                        {saveStatus.message}
                    </Alert>
                </Box>
            )}

            {/* Form Content */}
            <Box sx={{ p: 3 }}>
                <form onSubmit={handleSubmit}>
                    
                    {/* Assessment Timeline & Sources Section */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <ScheduleIcon color="primary" />
                                <Typography variant="h6">Assessment Timeline & Sources</Typography>
                                <Chip 
                                    label={formData.dateFullAssess && formData.dateLastReAssess ? "Complete" : "Incomplete"} 
                                    size="small" 
                                    color={formData.dateFullAssess && formData.dateLastReAssess ? "success" : "warning"} 
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Date of Baseline Assessment"
                                        type="date"
                                        name="dateFullAssess"
                                        value={formData.dateFullAssess || ''}
                                        onChange={handleInputChange}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Date of Last Re-Assessment"
                                        type="date"
                                        name="dateLastReAssess"
                                        value={formData.dateLastReAssess || ''}
                                        onChange={handleInputChange}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Other Sources for Re-Assessment Information"
                                        name="reassessmentSources"
                                        value={formData.reassessmentSources || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={2}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Cultural Considerations"
                                        name="culturalCons"
                                        value={formData.culturalCons || ''}
                                        onChange={handleInputChange}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Physical Challenges"
                                        name="physicalChall"
                                        value={formData.physicalChall || ''}
                                        onChange={handleInputChange}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Access Issues"
                                        name="accessIssues"
                                        value={formData.accessIssues || ''}
                                        onChange={handleInputChange}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Reason for Referral Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <WarningIcon color="primary" />
                                <Typography variant="h6">Reason for Referral / Chief Complaint</Typography>
                                <Chip 
                                    label={formData.reasonForRef && formData.currentSymp ? "Complete" : "Incomplete"} 
                                    size="small" 
                                    color={formData.reasonForRef && formData.currentSymp ? "success" : "warning"} 
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Precipitating Event/Reason for Referral</InputLabel>
                                        <Select
                                            name="reasonForRef"
                                            value={formData.reasonForRef || ''}
                                            onChange={(e) => handleSelectChange('reasonForRef', e.target.value)}
                                            label="Precipitating Event/Reason for Referral"
                                        >
                                            <MenuItem value="">Select...</MenuItem>
                                            <MenuItem value="Annual – same as Full Assessment">Annual – same as Full Assessment</MenuItem>
                                            <MenuItem value="Returning to Treatment – updates include the following: (describe below)">Returning to Treatment – updates include the following: (describe below)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Current symptoms/behaviors and impairments"
                                        name="currentSymp"
                                        value={formData.currentSymp || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={4}
                                        helperText="Include intensity, duration, frequency, and perspective of client and others"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Suicidal/Homicidal Thoughts/Attempts</InputLabel>
                                        <Select
                                            name="suicHomiThou"
                                            value={formData.suicHomiThou || ''}
                                            onChange={(e) => handleSelectChange('suicHomiThou', e.target.value)}
                                            label="Suicidal/Homicidal Thoughts/Attempts"
                                        >
                                            <MenuItem value="">Select...</MenuItem>
                                            <MenuItem value="No Updates">No Updates</MenuItem>
                                            <MenuItem value="Updates include the following: (describe below)">Updates include the following: (describe below)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Columbia Suicide Risk Scale Completed?</InputLabel>
                                        <Select
                                            name="columbiaSRComp"
                                            value={formData.columbiaSRComp || ''}
                                            onChange={(e) => handleSelectChange('columbiaSRComp', e.target.value)}
                                            label="Columbia Suicide Risk Scale Completed?"
                                        >
                                            <MenuItem value="">Select...</MenuItem>
                                            <MenuItem value="Yes">Yes</MenuItem>
                                            <MenuItem value="No">No</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="If Columbia Scale NOT completed, describe details"
                                        name="columbiaSR"
                                        value={formData.columbiaSR || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={3}
                                        helperText="Include dates, threat, intent, plan, target(s), access to lethal means, method used"
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Mental Status Exam Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <PsychologyIcon color="primary" />
                                <Typography variant="h6">Mental Status Exam</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                {Object.entries(mentalStatusOptions).map(([field, options]) => {
                                    const labels = {
                                        cmOb1: 'Grooming & Hygiene',
                                        cmOb2: 'Eye Contact',
                                        cmOb3: 'Motor Activity',
                                        cmOb4: 'Speech',
                                        cmOb5: 'Interaction Style',
                                        cmOb6: 'Mood',
                                        cmOb7: 'Affect',
                                        cmOb8: 'Associations',
                                        cmOb9: 'Concentration',
                                        cmOb10: 'Behavioral Disturbances',
                                        cmOb11: 'Passive',
                                        cmObNone: 'None Apparent'
                                    };

                                    return (
                                        <Grid item xs={12} md={4} key={field}>
                                            <Autocomplete
                                                multiple
                                                options={options}
                                                getOptionLabel={(option) => option.label}
                                                value={formData[field] || []}
                                                onChange={(event, newValue) => handleMultiSelectChange(field, newValue)}
                                                renderInput={(params) => (
                                                    <TextField {...params} label={labels[field]} />
                                                )}
                                                renderTags={(value, getTagProps) =>
                                                    value.map((option, index) => (
                                                        <Chip
                                                            key={option.value}
                                                            label={option.label}
                                                            {...getTagProps({ index })}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    ))
                                                }
                                                limitTags={2}
                                                disableCloseOnSelect
                                                filterSelectedOptions
                                            />
                                        </Grid>
                                    );
                                })}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Summary and Any Other Observations"
                                        name="cmObvSum"
                                        value={formData.cmObvSum || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={4}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Clinical Summary Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <CheckCircleIcon color="primary" />
                                <Typography variant="h6">Clinical Summary & Diagnosis</Typography>
                                <Chip 
                                    label={formData.clientStrengthReAssessSummary && formData.clientFormReAssessSummary ? "Complete" : "Incomplete"} 
                                    size="small" 
                                    color={formData.clientStrengthReAssessSummary && formData.clientFormReAssessSummary ? "success" : "warning"} 
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Client Strengths (to assist in achieving treatment goals)"
                                        name="clientStrengthReAssessSummary"
                                        value={formData.clientStrengthReAssessSummary || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={4}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Clinical Formulation and Diagnostic Justification"
                                        name="clientFormReAssessSummary"
                                        value={formData.clientFormReAssessSummary || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={6}
                                        helperText="Summarize clinical information to determine diagnosis and treatment proposals. Include impairments in life functioning, risk factors, and strengths."
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Diagnostic Descriptor"
                                        name="diagDescript"
                                        value={formData.diagDescript || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>ICD Diagnosis Code Type</InputLabel>
                                        <Select
                                            name="diagDescriptCodeChoice"
                                            value={formData.diagDescriptCodeChoice || ''}
                                            onChange={(e) => handleSelectChange('diagDescriptCodeChoice', e.target.value)}
                                            label="ICD Diagnosis Code Type"
                                        >
                                            <MenuItem value="">Select...</MenuItem>
                                            <MenuItem value="Primary">Primary</MenuItem>
                                            <MenuItem value="Sec">Secondary</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="ICD Code"
                                        name="diagDescriptCode"
                                        value={formData.diagDescriptCode || ''}
                                        onChange={handleInputChange}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Save Button */}
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            disabled={isSaving || !currentClient}
                            sx={{ minWidth: 200, py: 1.5 }}
                        >
                            {isSaving ? 'Saving...' : 'Save Assessment'}
                        </Button>
                    </Box>
                </form>
            </Box>
        </Paper>
    );
};

export default ReAssessment;