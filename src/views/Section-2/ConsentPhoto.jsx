// ✅ Updated ConsentPhoto.jsx - Complete with Enhanced Form Management + forwardRef

import React, { useCallback, useState, forwardRef, useImperativeHandle } from "react";
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
    StepContent
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

// Import hooks and utilities
import { 
    useFormManager,
    useFormStepper,
    createFormValidator,
    calculateFormCompletion
} from '../../hooks/useFormManager';

// Import data
import {
    clientReleaseList,
    clientReleasePurposeList,
    clientReleasePHTList
} from "../../data/arrayList";

// ✅ Enhanced form validation rules
const validationRules = createFormValidator({
    required: ['clientReleaseItems', 'clientReleasePurposes', 'consentPhotoSign1', 'consentPhotoEffectiveDate', 'consentPhotoExpireDate'],
    custom: {
        clientReleaseItems: (value) => {
            if (!value || !Array.isArray(value) || value.length === 0) {
                return "Please select at least one type of content to authorize";
            }
            return true;
        },
        clientReleasePurposes: (value) => {
            if (!value || !Array.isArray(value) || value.length === 0) {
                return "Please select at least one purpose for the release";
            }
            return true;
        },
        consentPhotoSign1: (value) => {
            if (!value || value.trim().length < 2) {
                return "Electronic signature must be at least 2 characters";
            }
            return true;
        },
        consentPhotoEffectiveDate: (value) => {
            if (!value) return "Effective date is required";
            const date = new Date(value);
            if (isNaN(date.getTime())) return "Invalid effective date";
            return true;
        },
        consentPhotoExpireDate: (value, formData) => {
            if (!value) return "Expiration date is required";
            const expDate = new Date(value);
            if (isNaN(expDate.getTime())) return "Invalid expiration date";
            
            if (formData.consentPhotoEffectiveDate) {
                const effDate = new Date(formData.consentPhotoEffectiveDate);
                if (expDate <= effDate) {
                    return "Expiration date must be after effective date";
                }
            }
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

const ConsentPhoto = forwardRef(({ clientID: propClientID }, ref) => {
    const selectedClient = useSelector((state) => state.clients?.selectedClient);
    const clientID = propClientID || selectedClient?.clientID;

    // ✅ Use the enhanced form manager hook
    const {
        formData,
        formLoading,
        saving,
        localErrors,
        validationErrors,
        isValid,
        showSuccessSnackbar,
        updateField,
        updateFields,
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

    // ✅ Enhanced stepper with proper validation
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
                return formData.consentPhotoSign1 && formData.consentPhotoEffectiveDate && formData.consentPhotoExpireDate;
            default:
                return true;
        }
    });

    // Local state
    const [showRevocationSection, setShowRevocationSection] = useState(false);

    // ✅ Calculate completion percentage with all required fields (MUST be before useImperativeHandle)
    const requiredFields = [
        'clientReleaseItems', 'clientReleasePurposes', 'consentPhotoSign1',
        'consentPhotoEffectiveDate', 'consentPhotoExpireDate'
    ];
    
    const allFields = [
        ...requiredFields,
        'clientReleasePHTItems',
        'consentPhotoSign1Revoke'
    ];
    
    const completionPercentage = calculateFormCompletion(formData, requiredFields, allFields);

    // ✅ Expose getFormData method for AuthSig modal integration (AFTER completionPercentage is calculated)
    useImperativeHandle(ref, () => ({
        getFormData: () => ({
            ...formData,
            clientID,
            formType: 'consentPhoto',
            formVersion: '2.0',
            stepperProgress,
            completedSteps: activeStep + 1,
            completionPercentage
        })
    }), [formData, clientID, stepperProgress, activeStep, completionPercentage]);

    // ✅ Enhanced field change handlers with proper data structure
    const handleMultiSelectChange = useCallback((fieldName, selectedValues) => {
        // Ensure we're storing the full object structure, not just values
        const formattedValues = selectedValues ? selectedValues.map(item => {
            if (typeof item === 'string') {
                // Convert string back to object format
                const foundItem = [...clientReleaseList, ...clientReleasePurposeList, ...clientReleasePHTList]
                    .find(listItem => listItem.value === item);
                return foundItem || { value: item };
            }
            return item;
        }) : [];
        
        updateField(fieldName, formattedValues);
    }, [updateField]);

    const handleFieldChange = useCallback((fieldName) => (event) => {
        const { value } = event.target;
        updateField(fieldName, value);
    }, [updateField]);

    // ✅ Auto-fill dates with proper validation
    const handleAutoFillEffectiveDate = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const expDate = oneYearLater.toISOString().split('T')[0];
        
        updateFields({
            consentPhotoEffectiveDate: today,
            consentPhotoExpireDate: expDate
        });
    }, [updateFields]);

    // ✅ Enhanced form submission with proper data structure
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        
        // Ensure all data is properly formatted before submission
        const submissionData = {
            ...formData,
            formVersion: '2.0',
            submissionType: 'final',
            stepperProgress,
            completedSteps: activeStep + 1,
            completionPercentage
        };
        
        const result = await submitForm(submissionData);
        
        if (!result.success) {
            console.error('Form submission failed:', result.errors);
        }
    }, [submitForm, formData, stepperProgress, activeStep, completionPercentage]);

    // Save as draft
    const handleSaveDraft = useCallback(async () => {
        const draftData = {
            ...formData,
            status: 'draft',
            stepperProgress,
            completionPercentage
        };
        await saveDraft(draftData);
    }, [saveDraft, formData, stepperProgress, completionPercentage]);

    // ✅ Loading state
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
                                                key={option.value || index}
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
                                                key={option.value || index}
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
                                                key={option.value || index}
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
                                        />
                                        <Button 
                                            size="small" 
                                            onClick={handleAutoFillEffectiveDate}
                                            sx={{ mt: 1 }}
                                        >
                                            Use Today's Date
                                        </Button>
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
});

ConsentPhoto.displayName = 'ConsentPhoto';

export default ConsentPhoto;