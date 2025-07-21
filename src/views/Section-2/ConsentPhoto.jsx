import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    LinearProgress,
    Chip,
    Snackbar,
    Divider,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import {
    Camera as CameraIcon,
    Save as SaveIcon,
    CheckCircle as CheckCircleIcon,
    Person as PersonIcon,
    ExpandMore as ExpandMoreIcon,
    Security as SecurityIcon,
    Info as InfoIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

// Import custom hooks and utilities
import { 
    useFormManager,
    createFormValidator,
    calculateFormCompletion,
    useFormStepper
} from '../../hooks/useFormManager';

// Import data
import {
    clientReleaseList,
    clientReleasePurposeList,
    clientReleasePHTList
} from "../../data/arrayList";

// Form validation rules
const validationRules = createFormValidator({
    required: ['clientReleaseItems', 'clientReleasePurposes', 'consentPhotoSign1'],
    custom: {
        clientReleaseItems: (value) => {
            if (!value || value.length === 0) return "Please select at least one type of content to authorize";
            return true;
        },
        clientReleasePurposes: (value) => {
            if (!value || value.length === 0) return "Please select at least one purpose for the release";
            return true;
        },
        consentPhotoSign1: (value) => {
            if (!value || value.trim().length < 2) return "Electronic signature must be at least 2 characters";
            return true;
        },
        consentPhotoEffectiveDate: (value) => {
            if (!value) return "Effective date is required";
            return true;
        }
    }
});

// Stepper configuration
const stepperSteps = [
    {
        id: 'content-selection',
        label: 'Content Authorization',
        description: 'Select what content can be used'
    },
    {
        id: 'purpose-selection',
        label: 'Purpose Selection',
        description: 'Choose the purposes for use'
    },
    {
        id: 'phi-information',
        label: 'Health Information',
        description: 'Specify health information if needed'
    },
    {
        id: 'dates-signature',
        label: 'Dates & Signature',
        description: 'Set dates and provide signature'
    }
];

const ConsentPhoto = ({ clientID: propClientID }) => {
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
        'consentPhoto',
        clientID,
        { version: '2.0' },
        validationRules
    );

    // Use stepper hook for better UX
    const {
        activeStep,
        nextStep,
        previousStep,
        goToStep,
        progress: stepperProgress
    } = useFormStepper(stepperSteps, (step) => {
        // Validation for each step
        switch (step) {
            case 0:
                return formData.clientReleaseItems && formData.clientReleaseItems.length > 0;
            case 1:
                return formData.clientReleasePurposes && formData.clientReleasePurposes.length > 0;
            case 2:
                return true; // Optional step
            case 3:
                return formData.consentPhotoSign1 && formData.consentPhotoEffectiveDate;
            default:
                return true;
        }
    });

    // Local state
    const [showRevocationSection, setShowRevocationSection] = useState(false);
    const [showRightsSection, setShowRightsSection] = useState(false);

    // Calculate completion percentage
    const requiredFields = [
        'clientReleaseItems', 'clientReleasePurposes', 'consentPhotoSign1',
        'consentPhotoEffectiveDate', 'consentPhotoExpireDate'
    ];
    
    const completionPercentage = calculateFormCompletion(formData, requiredFields, [
        ...requiredFields,
        'clientReleasePHTItems',
        'consentPhotoSignRights'
    ]);

    // Field change handlers
    const handleFieldChange = useCallback((fieldName) => (event) => {
        const { value } = event.target;
        updateField(fieldName, value);
    }, [updateField]);

    const handleMultiSelectChange = useCallback((fieldName, selectedValues) => {
        updateField(fieldName, selectedValues || []);
    }, [updateField]);

    // Form submission
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        const result = await submitForm({
            formVersion: '2.0',
            submissionType: 'final',
            stepperProgress,
            completedSteps: activeStep + 1
        });
        
        if (!result.success) {
            console.error('Form submission failed:', result.errors);
        }
    }, [submitForm, stepperProgress, activeStep]);

    // Save as draft
    const handleSaveDraft = useCallback(async () => {
        await saveDraft();
    }, [saveDraft]);

    // Auto-fill dates
    const handleAutoFillEffectiveDate = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        updateField('consentPhotoEffectiveDate', today);
        
        // Auto-calculate expiration date (1 year from effective date)
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + 1);
        updateField('consentPhotoExpireDate', expDate.toISOString().split('T')[0]);
    }, [updateField]);

    if (formLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading consent form...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
            {/* Header Section */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CameraIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                                Authorization For Release and Publication
                            </Typography>
                            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                Photographs, Art Work and/or Personal Information
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Please complete this form to authorize the release and publication of your content.
                            </Typography>
                        </Box>
                    </Box>

                    {/* Client Info */}
                    {selectedClient && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                Client: <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                                {selectedClient.clientID && ` (ID: ${selectedClient.clientID})`}
                            </Typography>
                        </Box>
                    )}

                    {/* Progress Indicator */}
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Form Completion
                            </Typography>
                            <Chip 
                                label={`${completionPercentage}% Complete`}
                                color={completionPercentage === 100 ? 'success' : 'primary'}
                                size="small"
                            />
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={completionPercentage} 
                            sx={{ height: 8, borderRadius: 4 }}
                            color={completionPercentage === 100 ? 'success' : 'primary'}
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* Error Alerts */}
            {(localErrors.length > 0 || validationErrors.length > 0) && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 3 }}
                    onClose={clearFormErrors}
                >
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Please address the following issues:
                    </Typography>
                    {[...localErrors, ...validationErrors].map((error, index) => (
                        <Typography key={index} variant="body2">
                            • {error}
                        </Typography>
                    ))}
                </Alert>
            )}

            {/* Main Form with Stepper */}
            <form onSubmit={handleSubmit}>
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        {/* Step 1: Content Selection */}
                        <Step>
                            <StepLabel>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Content Authorization
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    I hereby authorize <strong>Holliday's Helping Hands</strong> to release and publish my:
                                </Typography>
                                
                                <Autocomplete
                                    multiple
                                    options={clientReleaseList}
                                    getOptionLabel={(option) => option.value}
                                    value={formData.clientReleaseItems || []}
                                    onChange={(event, newValue) => 
                                        handleMultiSelectChange('clientReleaseItems', newValue)
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                variant="outlined"
                                                label={option.value}
                                                size="small"
                                                color="primary"
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Content Types"
                                            placeholder="Choose what content can be used"
                                            variant="outlined"
                                            required
                                            helperText="Select all types of content you authorize for use"
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                {formData.clientReleaseItems && formData.clientReleaseItems.length > 0 && (
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            You have authorized the use of: {' '}
                                            <strong>
                                                {formData.clientReleaseItems.map(item => item.value).join(', ')}
                                            </strong>
                                        </Typography>
                                    </Alert>
                                )}

                                <Box sx={{ mb: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={nextStep}
                                        disabled={!formData.clientReleaseItems || formData.clientReleaseItems.length === 0}
                                    >
                                        Continue
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>

                        {/* Step 2: Purpose Selection */}
                        <Step>
                            <StepLabel>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Purpose Selection
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    For the following purpose or purposes:
                                </Typography>
                                
                                <Autocomplete
                                    multiple
                                    options={clientReleasePurposeList}
                                    getOptionLabel={(option) => option.value}
                                    value={formData.clientReleasePurposes || []}
                                    onChange={(event, newValue) => 
                                        handleMultiSelectChange('clientReleasePurposes', newValue)
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                variant="outlined"
                                                label={option.value}
                                                size="small"
                                                color="secondary"
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Purposes"
                                            placeholder="Choose the purposes for use"
                                            variant="outlined"
                                            required
                                            helperText="Select all applicable purposes for the use of your content"
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        This information will only be used by Holliday's Helping Hands as an agency 
                                        for the selected purposes above.
                                    </Typography>
                                </Alert>

                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <Button variant="outlined" onClick={previousStep}>
                                        Back
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={nextStep}
                                        disabled={!formData.clientReleasePurposes || formData.clientReleasePurposes.length === 0}
                                    >
                                        Continue
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>

                        {/* Step 3: Health Information (Optional) */}
                        <Step>
                            <StepLabel>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Health Information (Optional)
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    If applicable, check any health information needed:
                                </Typography>
                                
                                <Autocomplete
                                    multiple
                                    options={clientReleasePHTList}
                                    getOptionLabel={(option) => option.value}
                                    value={formData.clientReleasePHTItems || []}
                                    onChange={(event, newValue) => 
                                        handleMultiSelectChange('clientReleasePHTItems', newValue)
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip
                                                variant="outlined"
                                                label={option.value}
                                                size="small"
                                                color="warning"
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Health Information Types (Optional)"
                                            placeholder="Select if health information will be included"
                                            variant="outlined"
                                            helperText="This step is optional - only complete if health information will be shared"
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <Button variant="outlined" onClick={previousStep}>
                                        Back
                                    </Button>
                                    <Button variant="contained" onClick={nextStep}>
                                        Continue
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>

                        {/* Step 4: Dates and Signature */}
                        <Step>
                            <StepLabel>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Authorization Period & Signature
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Effective Date"
                                            name="consentPhotoEffectiveDate"
                                            type="date"
                                            value={formData.consentPhotoEffectiveDate || ''}
                                            onChange={handleFieldChange('consentPhotoEffectiveDate')}
                                            required
                                            InputLabelProps={{ shrink: true }}
                                            helperText="When this authorization becomes effective"
                                            InputProps={{
                                                endAdornment: (
                                                    <Button size="small" onClick={handleAutoFillEffectiveDate}>
                                                        Today
                                                    </Button>
                                                )
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Expiration Date"
                                            name="consentPhotoExpireDate"
                                            type="date"
                                            value={formData.consentPhotoExpireDate || ''}
                                            onChange={handleFieldChange('consentPhotoExpireDate')}
                                            required
                                            InputLabelProps={{ shrink: true }}
                                            helperText="Authorization expires one year from effective date or end of treatment"
                                        />
                                    </Grid>
                                </Grid>

                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                    Electronic Signature
                                </Typography>
                                
                                <TextField
                                    fullWidth
                                    label="Type your full name as electronic signature"
                                    name="consentPhotoSign1"
                                    value={formData.consentPhotoSign1 || ''}
                                    onChange={handleFieldChange('consentPhotoSign1')}
                                    required
                                    variant="outlined"
                                    placeholder="Enter your full legal name"
                                    helperText="This serves as your electronic signature for this authorization"
                                    sx={{ mb: 2 }}
                                />

                                {formData.consentPhotoSign1 && (
                                    <Box sx={{ 
                                        p: 2, 
                                        bgcolor: 'success.50', 
                                        border: '1px solid',
                                        borderColor: 'success.200',
                                        borderRadius: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 2
                                    }}>
                                        <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                                        <Typography variant="body2" color="success.main">
                                            Signature captured: <strong>{formData.consentPhotoSign1}</strong>
                                        </Typography>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                    <Button variant="outlined" onClick={previousStep}>
                                        Back
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>
                    </Stepper>
                </Paper>

                {/* Legal Information Sections */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.main' }}>
                        Important Legal Information
                    </Typography>

                    {/* Restrictions */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <SecurityIcon sx={{ mr: 1, color: 'warning.main' }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    RESTRICTIONS
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                California law prohibits Holliday's Helping Hands from making further disclosures 
                                of this information without additional authorization from you unless required by law.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    {/* Your Rights */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    YOUR RIGHTS
                                </Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary" component="div">
                                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                    <li>I may refuse to sign this Authorization.</li>
                                    <li>I may revoke this Authorization at any time by written notice to Holliday's Helping Hands.</li>
                                    <li>I have a right to receive a copy of this Authorization.</li>
                                    <li>I may inspect or obtain a copy of any information that is disclosed under this Authorization.</li>
                                    <li>Neither treatment, payment, enrollment, nor eligibility for benefits is contingent upon signing this Authorization.</li>
                                </Box>
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </Paper>

                {/* Revocation Section */}
                <Accordion sx={{ mb: 3 }}>
                    <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        onClick={() => setShowRevocationSection(!showRevocationSection)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Authorization Revocation (Optional)
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            If you wish to revoke this authorization in the future, you can sign below:
                        </Typography>
                        
                        <TextField
                            fullWidth
                            label="Revocation Signature (Optional)"
                            name="consentPhotoSign1Revoke"
                            value={formData.consentPhotoSign1Revoke || ''}
                            onChange={handleFieldChange('consentPhotoSign1Revoke')}
                            variant="outlined"
                            placeholder="Sign here to revoke authorization"
                            helperText="This field can be completed later if you wish to revoke this authorization"
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={handleSaveDraft}
                        disabled={saving}
                        sx={{ px: 4 }}
                    >
                        Save Draft
                    </Button>
                    
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        disabled={saving || !clientID || !isValid}
                        sx={{ px: 4, py: 1.5, fontWeight: 600 }}
                    >
                        {saving ? 'Saving...' : 'Save Consent'}
                    </Button>
                </Box>

                {/* Completion Status */}
                {completionPercentage < 100 && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Alert severity="info" sx={{ display: 'inline-flex' }}>
                            <Typography variant="body2">
                                Complete all required steps in the form above before submitting.
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
                    ✅ Consent form saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ConsentPhoto;