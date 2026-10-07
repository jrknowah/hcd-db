// ====================================================================
// PRODUCTION-READY ReAssessment Component
// Lists every re-assessment for the client; each one is created/edited in a modal.
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
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Assessment as AssessmentIcon,
    Psychology as PsychologyIcon,
    Warning as WarningIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { useSelector, useDispatch } from "react-redux";
import { useClientPersistence } from "../../hooks/useClientPersistence";
import logUserAction from "../../backend/config/logAction";
import {
    cmOb1, cmOb2, cmOb3, cmOb4, cmOb5, cmOb6, cmOb7, cmOb8, cmOb9, cmOb10, cmOb11, cmObNone
} from "../../data/arrayList";

// ✅ Import your reassessment actions
import {
    fetchReassessmentList,
    createReassessment,
    updateReassessmentData,
    deleteReassessment,
    resetForm,
    updateFormField,
    updateArrayField,
    loadDataIntoForm,
    selectReassessmentRecords,
    selectRecordsLoading,
    selectRecordsError,
    selectFormData,
    selectCompletionStatus,
    selectIsSaving
} from "../../backend/store/slices/reassessmentSlice";

// SQL DATE columns arrive as ISO strings; keep the calendar date (UTC) for inputs and display
const toDateInput = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d) ? '' : d.toISOString().split('T')[0];
};

const formatDate = (value) => {
    const d = toDateInput(value);
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
};

const DATE_FIELDS = [
    'dateFullAssess', 'dateLastReAssess', 'subAbuseReAssessDate', 'medHistReAssessDate', 'homelessReAssessDate'
];

const ReAssessment = () => {
    const dispatch = useDispatch();
    
    // ✅ PRODUCTION: Use real client persistence hook
    const { clientID, client, hasClient, loading } = useClientPersistence();
    
    const user = useSelector((state) => state.auth?.user || {});
    
    // ✅ Use reassessment selectors
    const records = useSelector(selectReassessmentRecords);
    const recordsLoading = useSelector(selectRecordsLoading);
    const recordsError = useSelector(selectRecordsError);
    const formData = useSelector(selectFormData) || {};
    const completionStatus = useSelector(selectCompletionStatus) || { 
        percentage: 0, 
        status: 'Not Started', 
        isCompleted: false 
    };
    const isSaving = useSelector(selectIsSaving) || false;
    
    const [saveStatus, setSaveStatus] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingID, setEditingID] = useState(null);   // null = creating a new re-assessment
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ✅ Fetch the client's re-assessments when client is available
    useEffect(() => {
        if (clientID) {
            dispatch(fetchReassessmentList(clientID));
        }
    }, [clientID, dispatch]);

    // Close any open modal when the client changes
    useEffect(() => {
        setModalOpen(false);
        setEditingID(null);
        setPendingDelete(null);
    }, [clientID]);

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

    const openNewModal = () => {
        dispatch(resetForm());
        // Baseline assessment date carries over from the most recent re-assessment
        const baseline = records.find(r => r.dateFullAssess)?.dateFullAssess;
        if (baseline) {
            dispatch(updateFormField({ field: 'dateFullAssess', value: toDateInput(baseline) }));
        }
        setEditingID(null);
        setModalOpen(true);
    };

    const openEditModal = (record) => {
        const formatted = { ...record };
        DATE_FIELDS.forEach(field => { formatted[field] = toDateInput(record[field]); });
        dispatch(resetForm());
        dispatch(loadDataIntoForm(formatted));
        setEditingID(record.reassessmentID);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (isSaving) return;
        setModalOpen(false);
        setEditingID(null);
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

        const payload = {
            ...cleanedData,
            completionStatus: completionStatus.status,
            completionPercentage: completionStatus.percentage,
            updatedBy: user?.email || "system",
            updatedAt: new Date().toISOString(),
        };

        try {
            if (editingID) {
                await dispatch(updateReassessmentData({
                    reassessmentID: editingID,
                    reassessmentData: payload
                })).unwrap();
            } else {
                await dispatch(createReassessment({
                    clientID: clientID,
                    reassessmentData: { ...payload, createdBy: user?.email || "system" }
                })).unwrap();
            }
            
            setSaveStatus({ 
                type: 'success', 
                message: editingID ? "✅ Re-assessment updated successfully." : "✅ Re-assessment added successfully."
            });
            setModalOpen(false);
            setEditingID(null);
            dispatch(fetchReassessmentList(clientID));

            // Optional: log to your logging service
            if (user) {
                await logUserAction(user, "SAVE_REASSESSMENT_DATA", {
                    clientId: clientID,
                    reassessmentID: editingID || undefined,
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

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await dispatch(deleteReassessment(pendingDelete.reassessmentID)).unwrap();
            setSaveStatus({ type: 'success', message: "✅ Re-assessment deleted." });
            if (user) {
                await logUserAction(user, "DELETE_REASSESSMENT", {
                    clientId: clientID,
                    reassessmentID: pendingDelete.reassessmentID,
                    section: "ReAssessment",
                });
            }
        } catch (error) {
            console.error("❌ Error deleting ReAssessment:", error);
            setSaveStatus({ type: 'error', message: `⚠️ Failed to delete re-assessment. ${error?.message || ''}` });
        } finally {
            setDeleting(false);
            setPendingDelete(null);
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

    const progressColor = completionStatus.percentage >= 80 ? 'success'
        : completionStatus.percentage >= 60 ? 'warning' : 'error';

    const statusChipColor = (status) =>
        status === 'Complete' ? 'success' : status === 'In Progress' ? 'warning' : 'default';

    return (
        <Paper elevation={3} sx={{ maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ p: 3, pb: 0 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" gutterBottom color="primary">
                            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Mental Health Re-Assessment
                        </Typography>
                        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                            Re-assessments for {client?.clientName || 'Selected Client'} ({clientID})
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openNewModal}
                    >
                        New Re-Assessment
                    </Button>
                </Box>
            </Box>

            {/* Save Status Alert */}
            {saveStatus && (
                <Box sx={{ px: 3, pt: 2 }}>
                    <Alert severity={saveStatus.type} onClose={() => setSaveStatus(null)}>
                        {saveStatus.message}
                    </Alert>
                </Box>
            )}

            {/* Re-Assessment List */}
            <Box sx={{ p: 3 }}>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Re-Assessment Date</TableCell>
                                <TableCell>Baseline Date</TableCell>
                                <TableCell>Reason for Referral</TableCell>
                                <TableCell>Diagnosis</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Last Updated</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recordsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : recordsError ? (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <Alert severity="error">
                                            Failed to load re-assessments. {recordsError?.message || ''}
                                        </Alert>
                                    </TableCell>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            No re-assessments yet. Click "New Re-Assessment" to add one.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((record) => (
                                    <TableRow
                                        key={record.reassessmentID}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => openEditModal(record)}
                                    >
                                        <TableCell>{formatDate(record.dateLastReAssess || record.createdAt)}</TableCell>
                                        <TableCell>{formatDate(record.dateFullAssess)}</TableCell>
                                        <TableCell sx={{ maxWidth: 280 }}>
                                            <Typography variant="body2" noWrap title={record.reasonForRef || ''}>
                                                {record.reasonForRef || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 220 }}>
                                            <Typography variant="body2" noWrap title={record.diagDescript || ''}>
                                                {[record.diagDescriptCode, record.diagDescript].filter(Boolean).join(' – ') || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={record.completionStatus || 'In Progress'}
                                                color={statusChipColor(record.completionStatus || 'In Progress')}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{formatDate(record.updatedAt || record.createdAt)}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {record.updatedBy || record.createdBy || ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                            <Tooltip title="View / Edit">
                                                <IconButton size="small" color="primary" onClick={() => openEditModal(record)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" color="error" onClick={() => setPendingDelete(record)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* Re-Assessment Modal */}
            <Dialog
                open={modalOpen}
                onClose={closeModal}
                maxWidth="lg"
                fullWidth
                scroll="paper"
            >
                <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                    <DialogTitle sx={{ pr: 6 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <AssessmentIcon color="primary" />
                            {editingID ? 'Edit Re-Assessment' : 'New Re-Assessment'}
                        </Box>
                        <IconButton
                            onClick={closeModal}
                            disabled={isSaving}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <CloseIcon />
                        </IconButton>
                        <Box display="flex" alignItems="center" gap={2} sx={{ mt: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={completionStatus.percentage}
                                color={progressColor}
                                sx={{ flexGrow: 1 }}
                            />
                            <Typography variant="body2" color={`${progressColor}.main`}>
                                {completionStatus.percentage}%
                            </Typography>
                            <Chip
                                size="small"
                                label={completionStatus.status}
                                color={statusChipColor(completionStatus.status)}
                            />
                        </Box>
                    </DialogTitle>
                    <DialogContent dividers>
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
                                                    getOptionLabel={(option) => {
                                                        if (typeof option === 'string') return option;
                                                        if (!option) return '';
                                                        const l = option.label;
                                                        if (typeof l === 'string') return l;
                                                        if (l && typeof l === 'object') return String(l.label ?? l.value ?? '');
                                                        const v = option.value;
                                                        if (typeof v === 'string') return v;
                                                        return '';
                                                    }}
                                                    isOptionEqualToValue={(option, val) => {
                                                        const ov = typeof option === 'string' ? option : String(typeof option?.value === 'object' ? (option.value?.value ?? '') : (option?.value ?? ''));
                                                        const vv = typeof val === 'string' ? val : String(typeof val?.value === 'object' ? (val.value?.value ?? '') : (val?.value ?? ''));
                                                        return ov === vv;
                                                    }}
                                                    value={(formData[field] || []).map(item => {
                                                        if (typeof item === 'string') return { value: item, label: item };
                                                        if (!item) return { value: '', label: '' };
                                                        const v = typeof item.value === 'string' ? item.value : typeof item.value === 'object' ? String(item.value?.value ?? '') : String(item.value ?? '');
                                                        const l = typeof item.label === 'string' ? item.label : typeof item.label === 'object' ? String(item.label?.label ?? item.label?.value ?? '') : v;
                                                        return { value: v, label: l };
                                                    })}
                                                    onChange={(event, newValue) => handleMultiSelectChange(field, newValue)}
                                                    renderInput={(params) => (
                                                        <TextField {...params} label={labels[field]} />
                                                    )}
                                                    renderTags={(tagValue, getTagProps) =>
                                                        tagValue.map((option, index) => {
                                                            const l = typeof option === 'string' ? option : typeof option?.label === 'string' ? option.label : typeof option?.label === 'object' ? String(option.label?.label ?? option.label?.value ?? '') : String(option?.value ?? '');
                                                            const k = typeof option === 'string' ? option : typeof option?.value === 'string' ? option.value : index;
                                                            return (
                                                                <Chip
                                                                    key={k}
                                                                    label={l}
                                                                    {...getTagProps({ index })}
                                                                    size="small"
                                                                    color="primary"
                                                                    variant="outlined"
                                                                />
                                                            );
                                                        })
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
                                            inputProps={{ maxLength: 255 }}
                                            helperText="Separate multiple codes with spaces or commas"
                                        />
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, py: 2 }}>
                        <Button onClick={closeModal} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            disabled={isSaving || !clientID}
                        >
                            {isSaving ? 'Saving...' : editingID ? 'Save Changes' : 'Save Re-Assessment'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!pendingDelete} onClose={() => !deleting && setPendingDelete(null)}>
                <DialogTitle>Delete Re-Assessment?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will permanently delete the re-assessment dated{' '}
                        {formatDate(pendingDelete?.dateLastReAssess || pendingDelete?.createdAt)}. This cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleConfirmDelete}
                        disabled={deleting}
                        startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default ReAssessment;
