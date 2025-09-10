import React, { useState, useCallback } from "react";
import { useSelector } from 'react-redux';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    FormGroup,
    FormControlLabel,
    Checkbox,
    MenuItem,
    Chip,
    Alert,
    CircularProgress,
    Divider,
    Card,
    CardContent,
    LinearProgress,
    Snackbar
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Save as SaveIcon,
    CheckCircle as CheckCircleIcon,
    Security as SecurityIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { Autocomplete } from '@mui/material';

// Import custom hooks and utilities
import { 
    useFormManager,
    createFormValidator,
    calculateFormCompletion
} from '../../hooks/useFormManager';

// Import data
import { authClientAuthCheckInfo } from "../../data/arrayList";

// Form validation rules
const validationRules = createFormValidator({
    required: ['authClientName', 'authClientDOB', 'authClientAuth', 'atrClientSign'],
    custom: {
        authClientAuth: (value) => {
            if (!value) return "Authorization action is required";
            return true;
        },
        atrClientSign: (value) => {
            if (!value || value.trim().length < 2) return "Electronic signature must be at least 2 characters";
            return true;
        }
    }
});

const AuthUseDiscHMHInfo = ({ clientID: propClientID }) => {
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
        updateFields,
        submitForm,
        saveDraft,
        clearFormErrors,
        clearSuccessState
    } = useFormManager(
        'authUseDiscHMHInfo',
        clientID,
        { version: '2.0' },
        validationRules
    );

    // Local UI state
    const [showAllSections, setShowAllSections] = useState(false);

    // Calculate completion percentage
    const requiredFields = [
        'authClientName', 'authClientCID', 'authClientDOB', 'authClientSSN',
        'authClientContact', 'authClientOrg', 'authClientAuth', 'atrClientSign'
    ];
    
    const completionPercentage = calculateFormCompletion(formData, requiredFields);

    // Field change handlers
    const handleFieldChange = useCallback((fieldName) => (event) => {
        const { value, checked, type } = event.target;
        updateField(fieldName, type === 'checkbox' ? checked : value);
    }, [updateField]);

    const handleMultiSelectChange = useCallback((fieldName, selectedValues) => {
        updateField(fieldName, selectedValues || []);
    }, [updateField]);

    // Form submission
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        const result = await submitForm({
            formVersion: '2.0',
            submissionType: 'final'
        });
        
        if (!result.success) {
            console.error('Form submission failed:', result.errors);
        }
    }, [submitForm]);

    // Save as draft
    const handleSaveDraft = useCallback(async () => {
        await saveDraft();
    }, [saveDraft]);

    // Auto-fill client info
    const handleAutoFillClient = useCallback(() => {
        if (selectedClient) {
            updateFields({
                authClientName: `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim(),
                authClientCID: selectedClient.clientID || '',
                authClientDOB: selectedClient.dateOfBirth || '',
                authClientSSN: selectedClient.ssn || ''
            });
        }
    }, [selectedClient, updateFields]);

    if (formLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading authorization form...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
            {/* Header Section */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SecurityIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                                Authorization For Use & Disclosure Of Health/Mental Information
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Complete this form to authorize the use and/or disclosure of your individually 
                                identifiable health or mental health information (PHI) as described below, 
                                consistent with California and Federal Laws (HIPAA).
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
                            <Button 
                                size="small" 
                                sx={{ ml: 2 }} 
                                onClick={handleAutoFillClient}
                                variant="outlined"
                            >
                                Auto-fill Client Info
                            </Button>
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
                        Please fix the following issues:
                    </Typography>
                    {[...localErrors, ...validationErrors].map((error, index) => (
                        <Typography key={index} variant="body2">
                            • {error}
                        </Typography>
                    ))}
                </Alert>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit}>
                {/* Client Information Section */}

                {/* Authorization Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        This company is authorized to:
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Contact Person Name/Title"
                                name="authClientContact"
                                value={formData.authClientContact || ''}
                                onChange={handleFieldChange('authClientContact')}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Organization"
                                name="authClientOrg"
                                value={formData.authClientOrg || ''}
                                onChange={handleFieldChange('authClientOrg')}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Street Address"
                                name="authClientStreet"
                                value={formData.authClientStreet || ''}
                                onChange={handleFieldChange('authClientStreet')}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="City"
                                name="authClientCity"
                                value={formData.authClientCity || ''}
                                onChange={handleFieldChange('authClientCity')}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Phone"
                                name="authClientPhone"
                                value={formData.authClientPhone || ''}
                                onChange={handleFieldChange('authClientPhone')}
                                variant="outlined"
                                placeholder="(XXX) XXX-XXXX"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                select
                                label="Authorized to"
                                name="authClientAuth"
                                value={formData.authClientAuth || ''}
                                onChange={handleFieldChange('authClientAuth')}
                                required
                                variant="outlined"
                                helperText="Select the type of authorization"
                            >
                                <MenuItem value="">Select an option</MenuItem>
                                <MenuItem value="Receive/Obtain information from">
                                    Receive/Obtain information from
                                </MenuItem>
                                <MenuItem value="Release information to">
                                    Release information to
                                </MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Program Address"
                                name="authProgAddress"
                                value={formData.authProgAddress || ''}
                                onChange={handleFieldChange('authProgAddress')}
                                multiline
                                rows={3}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Purpose for Use of Information"
                                name="authUseOfInfo"
                                value={formData.authUseOfInfo || ''}
                                onChange={handleFieldChange('authUseOfInfo')}
                                variant="outlined"
                                placeholder="Describe the purpose for this authorization"
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Information Type Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Type of Information
                    </Typography>
                    
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="authUseOfCheckBoxI"
                                    checked={formData.authUseOfCheckBoxI || false}
                                    onChange={handleFieldChange('authUseOfCheckBoxI')}
                                    color="primary"
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    All health information pertaining to any history, mental, or physical 
                                    condition and treatment received (except HIV test status or HIV specific program information)
                                </Typography>
                            }
                        />
                        
                        <Box sx={{ mt: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="authUseOfCheckBoxII"
                                        checked={formData.authUseOfCheckBoxII || false}
                                        onChange={handleFieldChange('authUseOfCheckBoxII')}
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        Only the following records or types of health information:
                                    </Typography>
                                }
                            />
                            
                            {formData.authUseOfCheckBoxII && (
                                <Box sx={{ mt: 2, ml: 4 }}>
                                    <Autocomplete
                                        multiple
                                        options={authClientAuthCheckInfo}
                                        getOptionLabel={(option) => option.label}
                                        value={formData.authClientAuthCheckInfo || []}
                                        onChange={(event, newValue) => 
                                            handleMultiSelectChange('authClientAuthCheckInfo', newValue)
                                        }
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    variant="outlined"
                                                    label={option.label}
                                                    size="small"
                                                    {...getTagProps({ index })}
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Select Information Types"
                                                placeholder="Choose specific information types"
                                                variant="outlined"
                                            />
                                        )}
                                    />
                                </Box>
                            )}
                        </Box>
                    </FormGroup>
                </Paper>

                {/* Dates Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Authorization Period
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Effective Date"
                                name="authClientEffDate"
                                type="date"
                                value={formData.authClientEffDate || ''}
                                onChange={handleFieldChange('authClientEffDate')}
                                InputLabelProps={{ shrink: true }}
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Expiration Date"
                                name="authClientExpDate"
                                type="date"
                                value={formData.authClientExpDate || ''}
                                onChange={handleFieldChange('authClientExpDate')}
                                InputLabelProps={{ shrink: true }}
                                variant="outlined"
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {/* Legal Information Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.main' }}>
                        Important Legal Information
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            RESTRICTIONS
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            California law prohibits further disclosures without additional authorization unless required by law.
                        </Typography>
                    </Box>
                    
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                            YOUR RIGHTS
                        </Typography>
                        <Typography variant="body2" color="text.secondary" component="div">
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                <li>Refuse to sign this Authorization.</li>
                                <li>Revoke this Authorization at any time by written notice.</li>
                                <li>Receive a copy of this Authorization.</li>
                                <li>Inspect or obtain a copy of your health/mental health information.</li>
                                <li>Treatment, payment, enrollment, or eligibility for benefits is not contingent upon signing.</li>
                            </Box>
                        </Typography>
                    </Box>
                </Paper>

                {/* Signature Section */}
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Electronic Signature
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        By typing your name below, you acknowledge that you have read, understood, and agree to the terms of this authorization.
                    </Typography>
                    
                    <TextField
                        fullWidth
                        label="Type your full name as electronic signature"
                        name="atrClientSign"
                        value={formData.atrClientSign || ''}
                        onChange={handleFieldChange('atrClientSign')}
                        required
                        variant="outlined"
                        placeholder="Enter your full legal name"
                        helperText="This serves as your electronic signature for this authorization"
                        sx={{ mb: 2 }}
                    />

                    {formData.atrClientSign && (
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
                                Signature captured: <strong>{formData.atrClientSign}</strong>
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
                        {saving ? 'Saving...' : 'Save Authorization'}
                    </Button>
                </Box>
            </form>

            {/* Success Snackbar */}
            <Snackbar
                open={showSuccessSnackbar}
                autoHideDuration={6000}
                onClose={clearSuccessState}
            >
                <Alert onClose={clearSuccessState} severity="success" sx={{ width: '100%' }}>
                    ✅ Authorization form saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AuthUseDiscHMHInfo;