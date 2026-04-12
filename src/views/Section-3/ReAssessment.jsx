// ====================================================================
// PRODUCTION-READY ReAssessment Component
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
    Warning as WarningIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from "react-redux";
import { useClientPersistence } from "../../hooks/useClientPersistence";
import logUserAction from "../../backend/config/logAction";
import {
    cmOb1, cmOb2, cmOb3, cmOb4, cmOb5, cmOb6, cmOb7, cmOb8, cmOb9, cmOb10, cmOb11, cmObNone
} from "../../data/arrayList";

// ✅ Import your reassessment actions
import {
    fetchReassessmentData, 
    saveReassessmentData,
    updateFormField,
    updateArrayField,
    calculateCompletionPercentage,
    loadDataIntoForm,
    selectReassessmentData,
    selectFormData,
    selectCompletionStatus,
    selectIsLoading,
    selectIsSaving
} from "../../backend/store/slices/reassessmentSlice";

const ReAssessment = () => {
    const dispatch = useDispatch();
    
    // ✅ PRODUCTION: Use real client persistence hook
    const { clientID, client, hasClient, loading } = useClientPersistence();
    
    const user = useSelector((state) => state.auth?.user || {});
    
    // ✅ Use reassessment selectors
    const reassessmentData = useSelector(selectReassessmentData) || {};
    const formData = useSelector(selectFormData) || {};
    const completionStatus = useSelector(selectCompletionStatus) || { 
        percentage: 0, 
        status: 'Not Started', 
        isCompleted: false 
    };
    const isLoading = useSelector(selectIsLoading) || false;
    const isSaving = useSelector(selectIsSaving) || false;
    
    const [saveStatus, setSaveStatus] = useState(null);

    // ✅ Fetch reassessment data when client is available
    useEffect(() => {
        if (clientID) {
            console.log('🔄 Fetching reassessment data for:', clientID);
            dispatch(fetchReassessmentData(clientID));
        }
    }, [clientID, dispatch]);

    // ✅ Load fetched data into form fields when data changes
    useEffect(() => {
        if (reassessmentData && Object.keys(reassessmentData).length > 0) {
            console.log('📝 Loading data into form:', reassessmentData);
            
            // Format dates for date inputs (YYYY-MM-DD)
            const formattedData = {
                ...reassessmentData,
                dateFullAssess: reassessmentData.dateFullAssess 
                    ? new Date(reassessmentData.dateFullAssess).toISOString().split('T')[0] 
                    : '',
                dateLastReAssess: reassessmentData.dateLastReAssess 
                    ? new Date(reassessmentData.dateLastReAssess).toISOString().split('T')[0] 
                    : '',
                subAbuseReAssessDate: reassessmentData.subAbuseReAssessDate 
                    ? new Date(reassessmentData.subAbuseReAssessDate).toISOString().split('T')[0] 
                    : '',
                medHistReAssessDate: reassessmentData.medHistReAssessDate 
                    ? new Date(reassessmentData.medHistReAssessDate).toISOString().split('T')[0] 
                    : '',
                homelessReAssessDate: reassessmentData.homelessReAssessDate 
                    ? new Date(reassessmentData.homelessReAssessDate).toISOString().split('T')[0] 
                    : '',
            };
            
            dispatch(loadDataIntoForm(formattedData));
        }
    }, [reassessmentData, dispatch]);

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
        
        if (!clientID) {
            setSaveStatus({ 
                type: 'error', 
                message: "❌ No client selected. Please select a client from the dashboard." 
            });
            return;
        }

        // ✅ Fields that might have CHECK constraints - exclude if empty
        const constraintFields = [
            'diagDescriptCodeChoice',
            'columbiaSRComp', 
            'reasonForRef',
            'suicHomiThou',
            'homelessReAssess'
        ];

        // ✅ Remove null/empty fields entirely from payload
        const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
            // Skip constraint fields if empty (to avoid CHECK constraint errors)
            if (constraintFields.includes(key) && (!value || value === '')) {
                return acc;
            }
            
            // Only include fields that have actual values
            if (value !== '' && value !== null && value !== undefined) {
                // For arrays, only include if they have items
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        // Serialize { value, label } objects to JSON string for DB storage
                        acc[key] = JSON.stringify(value.map(item =>
                            typeof item === 'object' && item !== null ? item.value : item
                        ));
                    }
                } else {
                    acc[key] = value;
                }
            }
            return acc;
        }, {});

        try {
            await dispatch(saveReassessmentData({
                clientID: clientID,
                reassessmentData: {
                    ...cleanedData,
                    updatedBy: user?.email || "system",
                    updatedAt: new Date().toISOString(),
                }
            })).unwrap();
            
            setSaveStatus({ 
                type: 'success', 
                message: "✅ ReAssessment data saved successfully." 
            });

            // Optional: log to your logging service
            if (user) {
                await logUserAction(user, "SAVE_REASSESSMENT_DATA", {
                    clientId: clientID,
                    section: "ReAssessment",
                    updatedAt: new Date().toISOString(),
                });
            }

        } catch (error) {
            console.error("❌ Error saving ReAssessment data:", error);
            
            // Better error messaging
            let errorMessage = "⚠️ Failed to save data. ";
            if (error?.message?.includes('FOREIGN KEY')) {
                errorMessage += "Client not found in database. Please ensure the client exists.";
            } else if (error?.message) {
                errorMessage += error.message;
            } else {
                errorMessage += "Please try again.";
            }
            
            setSaveStatus({ type: 'error', message: errorMessage });
        }
    };

    // ✅ Show loading state while checking for client
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading client data...</Typography>
            </Box>
        );
    }

    // ✅ Show clear message when no client is selected
    if (!hasClient || !clientID) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="h6">No Client Selected</Typography>
                    <Typography>
                        Please select a client from the dashboard to view the Mental Health Re-Assessment.
                    </Typography>
                </Alert>
                
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>How to Get Started</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            1. Go to the Dashboard
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            2. Select a client from your client list
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            3. Return to this section to complete the reassessment
                        </Typography>
                        
                        <Button 
                            variant="contained" 
                            startIcon={<PersonIcon />}
                            onClick={() => window.location.href = '/dashboard'}
                            sx={{ mt: 2 }}
                        >
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    // ✅ Show loading state while fetching reassessment data
    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading reassessment data...</Typography>
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

    // Mental Status Exam options
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
                    Comprehensive mental health re-evaluation for {client?.clientName || 'Selected Client'} ({clientID})
                </Typography>
                
                {/* Progress Overview */}
                <Card elevation={1} sx={{ mt: 2 }}>
                    <CardContent>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Assessment Progress</Typography>
                                    <Typography variant="h6" color={
                                        completionStatus.percentage >= 80 ? 'success.main' : 
                                        completionStatus.percentage >= 60 ? 'warning.main' : 'error.main'
                                    }>
                                        {completionStatus.percentage}%
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={completionStatus.percentage}
                                        color={
                                            completionStatus.percentage >= 80 ? 'success' : 
                                            completionStatus.percentage >= 60 ? 'warning' : 'error'
                                        }
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Client</Typography>
                                    <Chip 
                                        label={client?.clientName || clientID} 
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
                                        label="Sources for Re-Assessment"
                                        name="reassessmentSources"
                                        value={formData.reassessmentSources || ''}
                                        onChange={handleInputChange}
                                        multiline
                                        rows={4}
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
                                            displayEmpty
                                        >
                                            <MenuItem value="" disabled>
                                                <em>Select an option...</em>
                                            </MenuItem>
                                            <MenuItem value="Annual – same as Full Assessment">Annual – same as Full Assessment</MenuItem>
                                            <MenuItem value="Returning to Treatment – updates include the following: (describe below)">Returning to Treatment – updates include the following: (describe below)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Current Symptoms/Behaviors and Impairments"
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
                                            displayEmpty
                                        >
                                            <MenuItem value="" disabled>
                                                <em>Select an option...</em>
                                            </MenuItem>
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
                                            displayEmpty
                                        >
                                            <MenuItem value="" disabled>
                                                <em>Select an option...</em>
                                            </MenuItem>
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
                                        label="Other Observations"
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
                                        label="Client Strengths"
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
                                            displayEmpty
                                        >
                                            <MenuItem value="">
                                                <em>Not specified</em>
                                            </MenuItem>
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
                            disabled={isSaving || !clientID}
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