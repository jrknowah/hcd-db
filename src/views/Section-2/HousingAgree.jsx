import React, { useCallback, useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { useSelector } from "react-redux";
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
    LinearProgress,
    Chip,
    Snackbar,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import {
    Home as HomeIcon,
    Save as SaveIcon,
    CheckCircle as CheckCircleIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    Gavel as GavelIcon,
    Info as InfoIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';

// Import custom hooks and utilities
import { 
    useFormManager,
    createFormValidator,
    calculateFormCompletion,
    useFormAccordion
} from '../../hooks/useFormManager';

// Form validation rules
const validationRules = createFormValidator({
    required: ['housingAgreeeSign', 'acknowledgmentConfirmed'],
    custom: {
        housingAgreeeSign: (value) => {
            if (!value || value.trim().length < 2) return "Electronic signature must be at least 2 characters";
            return true;
        },
        acknowledgmentConfirmed: (value) => {
            if (!value) return "You must confirm that you have read and understood the agreement";
            return true;
        }
    }
});

// Agreement terms data
const agreementTerms = [
    {
        id: 1,
        title: "No Cost Service",
        content: "There is no cost to me for this interim housing service."
    },
    {
        id: 2,
        title: "No Housing Contract",
        content: "I have no housing contract with the owner of the house."
    },
    {
        id: 3,
        title: "No Lease Agreement",
        content: "I have no lease or rental agreement."
    },
    {
        id: 4,
        title: "No Tenant Rights",
        content: "Since I am not a tenant, I have no tenant rights."
    },
    {
        id: 5,
        title: "No Eviction Process Required",
        content: "Holliday's Helping Hands does not have to process eviction papers to remove me from the premises."
    },
    {
        id: 6,
        title: "Service Denial Rights",
        content: "Holliday's Helping Hands has the right to deny me services if I do not comply with the rules of interim housing (Shelter housing)."
    },
    {
        id: 7,
        title: "Day-to-Day Basis",
        content: "My right to live at Holliday's Helping Hands is day to day and does not fall under landlord/tenant rights."
    },
    {
        id: 8,
        title: "No Legal Recourse",
        content: "If I am asked to leave, I do not have the right to file a court case under landlord/tenant rules and regulations."
    }
];

// ✅ UPDATED: Wrapped with forwardRef to work with FormModal
const HousingAgree = forwardRef(({ clientID: propClientID, title, formType = 'housingAgreement' }, ref) => {
    const selectedClient = useSelector((state) => state.clients?.selectedClient);
    const clientID = propClientID || selectedClient?.clientID;

    // Use the custom form manager hook
    const {
        formData,
        formLoading,
        saving,
        localErrors,
        validationErrors,
        isValid,
        showSuccessSnackbar,
        updateField,
        submitForm,
        saveDraft,
        clearFormErrors,
        clearSuccessState
    } = useFormManager(
        formType, // Use the formType prop (defaults to 'housingAgreement')
        clientID,
        { version: '2.0' },
        validationRules
    );

    // Use accordion hook for better UX
    const {
        expandedSection,
        handleAccordionChange,
        completionPercentage: accordionProgress
    } = useFormAccordion(agreementTerms);

    // Local state
    const [termsAcknowledged, setTermsAcknowledged] = useState({});

    // ✅ FIXED: Calculate allTermsAcknowledged with useMemo to prevent unnecessary recalculations
    const allTermsAcknowledged = useMemo(() => {
        return agreementTerms.every(term => termsAcknowledged[term.id] === true);
    }, [termsAcknowledged]);

    // ✅ FIXED: Use useEffect with proper dependency tracking and prevent infinite loops
    useEffect(() => {
        // Only update if the value actually changed to prevent loops
        if (formData.acknowledgmentConfirmed !== allTermsAcknowledged) {
            updateField('acknowledgmentConfirmed', allTermsAcknowledged);
        }
    }, [allTermsAcknowledged]); // ✅ Only depend on allTermsAcknowledged, not updateField or formData

    // Calculate completion percentage
    const requiredFields = ['housingAgreeeSign', 'acknowledgmentConfirmed'];
    const completionPercentage = calculateFormCompletion(formData, requiredFields, [
        ...requiredFields,
        'clientUnderstanding',
        'dateAcknowledged'
    ]);

    // ✅ ADDED: Expose getFormData method to parent FormModal
    useImperativeHandle(ref, () => ({
        getFormData: () => ({
            housingAgreeeSign: formData.housingAgreeeSign || '',
            acknowledgmentConfirmed: formData.acknowledgmentConfirmed || false,
            clientUnderstanding: formData.clientUnderstanding || false,
            dateAcknowledged: formData.dateAcknowledged || '',
            termsAcknowledged: termsAcknowledged,
            completionPercentage,
            lastModified: new Date().toISOString(),
            status: completionPercentage === 100 ? 'completed' : 'in_progress',
            formData: {
                formVersion: '2.0',
                totalTerms: agreementTerms.length,
                acknowledgedTerms: Object.values(termsAcknowledged).filter(Boolean).length
            }
        })
    }));

    // Field change handlers
    const handleFieldChange = useCallback((fieldName) => (event) => {
        const { value, checked, type } = event.target;
        updateField(fieldName, type === 'checkbox' ? checked : value);
    }, [updateField]);

    const handleTermAcknowledgment = useCallback((termId) => (event) => {
        const { checked } = event.target;
        setTermsAcknowledged(prev => ({
            ...prev,
            [termId]: checked
        }));
    }, []);

    // Form submission
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        const result = await submitForm({
            formVersion: '2.0',
            submissionType: 'final',
            termsAcknowledged,
            dateAcknowledged: new Date().toISOString()
        });
        
        if (result.success) {
            console.log('✅ Housing agreement submitted successfully');
        } else {
            console.error('❌ Housing agreement submission failed:', result.error);
        }
    }, [submitForm, termsAcknowledged]);

    const handleAutoFillDate = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        updateField('dateAcknowledged', today);
    }, [updateField]);

    // Loading state
    if (formLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    // Client ID check
    if (!clientID) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                No client selected. Please select a client to view their housing agreement.
            </Alert>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Card elevation={3} sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <HomeIcon sx={{ fontSize: 40, mr: 2 }} />
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                            Interim Housing Agreement
                        </Typography>
                    </Box>
                    <Typography variant="subtitle1">
                        Holliday's Helping Hands - Temporary Housing Services
                    </Typography>
                </CardContent>
            </Card>

            {/* Progress Indicator */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Form Completion
                        </Typography>
                        <Chip 
                            label={`${completionPercentage}%`}
                            color={completionPercentage === 100 ? "success" : "warning"}
                            size="small"
                        />
                    </Box>
                    <LinearProgress 
                        variant="determinate" 
                        value={completionPercentage} 
                        sx={{ height: 8, borderRadius: 5 }}
                    />
                </CardContent>
            </Card>

            {/* Error Display */}
            {(localErrors.length > 0 || Object.keys(validationErrors).length > 0) && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={clearFormErrors}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Please correct the following errors:
                    </Typography>
                    <List dense>
                        {localErrors.map((error, index) => (
                            <ListItem key={`local-${index}`}>
                                <ListItemText primary={error} />
                            </ListItem>
                        ))}
                        {Object.entries(validationErrors).map(([field, error]) => (
                            <ListItem key={`validation-${field}`}>
                                <ListItemText primary={`${field}: ${error}`} />
                            </ListItem>
                        ))}
                    </List>
                </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                {/* Introduction */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            I understand and agree that <strong>Holliday's Helping Hands</strong> is temporary interim housing for me. 
                            It is a shelter and I am not protected by landlord/tenant rights.
                        </Typography>
                    </Alert>

                    <Typography variant="body1" sx={{ mb: 2 }}>
                        I understand and agree that:
                    </Typography>
                </Paper>

                {/* Agreement Terms Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <GavelIcon sx={{ mr: 2, color: 'warning.main' }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Terms and Conditions
                        </Typography>
                    </Box>

                    {agreementTerms.map((term, index) => (
                        <Accordion 
                            key={term.id}
                            expanded={expandedSection === term.id}
                            onChange={handleAccordionChange(term.id)}
                            sx={{ mb: 1 }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <Typography sx={{ fontWeight: 600, mr: 2 }}>
                                        {index + 1}. {term.title}
                                    </Typography>
                                    {termsAcknowledged[term.id] && (
                                        <CheckCircleIcon sx={{ color: 'success.main', ml: 'auto' }} />
                                    )}
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    {term.content}
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={termsAcknowledged[term.id] || false}
                                            onChange={handleTermAcknowledgment(term.id)}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            I acknowledge and agree to this term
                                        </Typography>
                                    }
                                />
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Paper>

                {/* Welcome Message */}
                <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'success.50' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main', mb: 2, textAlign: 'center' }}>
                        🏡 Welcome to Holliday's Helping Hands!
                    </Typography>
                    <Typography variant="body1" sx={{ textAlign: 'center', color: 'success.dark' }}>
                        Please enjoy your stay! We look forward to helping you obtain Permanent Supportive Housing.
                    </Typography>
                </Paper>

                {/* Understanding Confirmation */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Confirmation of Understanding
                    </Typography>
                    
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="clientUnderstanding"
                                checked={formData.clientUnderstanding || false}
                                onChange={handleFieldChange('clientUnderstanding')}
                                color="primary"
                            />
                        }
                        label={
                            <Typography variant="body2">
                                I confirm that I have read, understood, and agree to all the terms and conditions 
                                outlined in this interim housing agreement.
                            </Typography>
                        }
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        label="Date of Acknowledgment"
                        name="dateAcknowledged"
                        type="date"
                        value={formData.dateAcknowledged || ''}
                        onChange={handleFieldChange('dateAcknowledged')}
                        InputLabelProps={{ shrink: true }}
                        sx={{ mb: 2 }}
                        helperText="The date you are signing this agreement"
                        InputProps={{
                            endAdornment: (
                                <Button size="small" onClick={handleAutoFillDate}>
                                    Today
                                </Button>
                            )
                        }}
                    />
                </Paper>

                {/* Signature Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Electronic Signature
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        By typing your name below, you acknowledge that you have read, understood, and agree to 
                        the terms of this interim housing agreement.
                    </Typography>
                    
                    <TextField
                        fullWidth
                        label="Type your full name as electronic signature"
                        name="housingAgreeeSign"
                        value={formData.housingAgreeeSign || ''}
                        onChange={handleFieldChange('housingAgreeeSign')}
                        required
                        variant="outlined"
                        placeholder="Enter your full legal name"
                        helperText="This serves as your electronic signature for this agreement"
                        sx={{ mb: 2 }}
                    />

                    {formData.housingAgreeeSign && (
                        <Box sx={{ 
                            p: 2, 
                            bgcolor: 'success.50', 
                            border: '1px solid',
                            borderColor: 'success.200',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                            <Typography variant="body2" color="success.main">
                                Signature captured: <strong>{formData.housingAgreeeSign}</strong>
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
                    
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        disabled={saving || !clientID || !isValid}
                        sx={{ px: 4, py: 1.5, fontWeight: 600 }}
                    >
                        {saving ? 'Saving...' : 'Save Agreement'}
                    </Button>
                </Box>

                {/* Completion Status */}
                {completionPercentage < 100 && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Alert severity="warning" sx={{ display: 'inline-flex' }}>
                            <Typography variant="body2">
                                Please complete all required fields and acknowledge all terms before submitting.
                            </Typography>
                        </Alert>
                    </Box>
                )}
            </form>

            {/* Success Snackbar */}
            <Snackbar
                open={showSuccessSnackbar}
                autoHideDuration={6000}
                onClose={clearSuccessState}
            >
                <Alert onClose={clearSuccessState} severity="success" sx={{ width: '100%' }}>
                    ✅ Housing agreement saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
});

// ✅ ADDED: Set display name for debugging
HousingAgree.displayName = 'HousingAgree';

export default HousingAgree;