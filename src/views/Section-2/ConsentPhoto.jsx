// ✅ FIXED ConsentPhoto.jsx - Corrected field names and validation

import React, { useCallback, useState, forwardRef, useImperativeHandle, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
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
    Person as PersonIcon
} from '@mui/icons-material';

// Import Redux actions
import {
    fetchFormData,
    saveFormData,
    updateFormLocal,
    clearErrors,
    clearSuccessFlags,
    setUnsavedChanges,
    selectFormByType,
    selectFormLoading,
    selectSaving,
    selectSaveSuccess
} from '../../backend/store/slices/authSigSlice';

// Import data
import {
    clientReleaseList,
    clientReleasePurposeList,
    clientReleasePHTList
} from "../../data/arrayList";

// Stepper steps
const stepperSteps = [
    { id: 'content-selection', label: 'Content Authorization' },
    { id: 'purpose-selection', label: 'Purpose Selection' },
    { id: 'phi-information', label: 'Health Information (Optional)' },
    { id: 'dates-signature', label: 'Dates & Signature' }
];

const ConsentPhoto = forwardRef(({ clientID: propClientID }, ref) => {
    const dispatch = useDispatch();
    const selectedClient = useSelector((state) => state.clients?.selectedClient);
    const clientID = propClientID || selectedClient?.clientID;

    // Redux selectors - ✅ FIXED: Correct selector usage
    const existingData = useSelector(selectFormByType('consentPhoto'));
    const formLoading = useSelector(selectFormLoading);
    const saving = useSelector(selectSaving);
    const saveSuccess = useSelector(selectSaveSuccess);

    // Local state
    const [activeStep, setActiveStep] = useState(0);
    const [clientReleaseItems, setClientReleaseItems] = useState([]);
    const [clientReleasePurposes, setClientReleasePurposes] = useState([]);
    const [clientReleasePHTItems, setClientReleasePHTItems] = useState([]);
    const [consentPhotoSign1, setConsentPhotoSign1] = useState("");
    const [consentPhotoEffectiveDate, setConsentPhotoEffectiveDate] = useState("");
    // ✅ FIXED: Changed from consentPhotoExpireDate to consentPhotoExpirationDate
    const [consentPhotoExpirationDate, setConsentPhotoExpirationDate] = useState("");
    const [localErrors, setLocalErrors] = useState([]);
    const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Calculate completion percentage
    const completionPercentage = useMemo(() => {
        const requiredFields = [
            clientReleaseItems.length > 0,
            clientReleasePurposes.length > 0,
            consentPhotoSign1.trim(),
            consentPhotoEffectiveDate,
            consentPhotoExpirationDate
        ];
        const completed = requiredFields.filter(Boolean).length;
        return Math.round((completed / requiredFields.length) * 100);
    }, [clientReleaseItems, clientReleasePurposes, consentPhotoSign1, consentPhotoEffectiveDate, consentPhotoExpirationDate]);

    // ✅ Expose getFormData method
    useImperativeHandle(ref, () => ({
        getFormData: () => ({
            // ✅ CRITICAL: Convert arrays to simple string arrays for backend
            clientReleaseItems: clientReleaseItems.map(item => 
                typeof item === 'string' ? item : item.value
            ),
            clientReleasePurposes: clientReleasePurposes.map(item => 
                typeof item === 'string' ? item : item.value
            ),
            clientReleasePHTItems: clientReleasePHTItems.map(item => 
                typeof item === 'string' ? item : item.value
            ),
            consentPhotoSign1,
            consentPhotoEffectiveDate,
            consentPhotoExpirationDate, // ✅ FIXED: Correct field name
            clientID,
            formType: 'consentPhoto',
            completionPercentage
        })
    }), [clientReleaseItems, clientReleasePurposes, clientReleasePHTItems, consentPhotoSign1, 
         consentPhotoEffectiveDate, consentPhotoExpirationDate, clientID, completionPercentage]);

    // Load form data
    useEffect(() => {
        if (clientID && !dataLoaded) {
            dispatch(fetchFormData({ clientID, formType: 'consentPhoto' }))
                .unwrap()
                .then(() => setDataLoaded(true))
                .catch(() => setDataLoaded(true));
        }
    }, [dispatch, clientID, dataLoaded]);

    // Populate fields from Redux
    useEffect(() => {
        if (existingData && Object.keys(existingData).length > 0 && dataLoaded) {
            // ✅ Convert backend string arrays back to object arrays for Autocomplete
            if (existingData.clientReleaseItems) {
                const items = Array.isArray(existingData.clientReleaseItems)
                    ? existingData.clientReleaseItems.map(item => 
                        typeof item === 'string' 
                            ? clientReleaseList.find(opt => opt.value === item) || { value: item }
                            : item
                    )
                    : [];
                setClientReleaseItems(items);
            }

            if (existingData.clientReleasePurposes) {
                const purposes = Array.isArray(existingData.clientReleasePurposes)
                    ? existingData.clientReleasePurposes.map(item => 
                        typeof item === 'string'
                            ? clientReleasePurposeList.find(opt => opt.value === item) || { value: item }
                            : item
                    )
                    : [];
                setClientReleasePurposes(purposes);
            }

            if (existingData.clientReleasePHTItems) {
                const phtItems = Array.isArray(existingData.clientReleasePHTItems)
                    ? existingData.clientReleasePHTItems.map(item =>
                        typeof item === 'string'
                            ? clientReleasePHTList.find(opt => opt.value === item) || { value: item }
                            : item
                    )
                    : [];
                setClientReleasePHTItems(phtItems);
            }

            setConsentPhotoSign1(existingData.consentPhotoSign1 || "");
            setConsentPhotoEffectiveDate(existingData.consentPhotoEffectiveDate || "");
            // ✅ FIXED: Handle both old and new field names for backwards compatibility
            setConsentPhotoExpirationDate(
                existingData.consentPhotoExpirationDate || 
                existingData.consentPhotoExpireDate || 
                ""
            );
        }
    }, [existingData, dataLoaded]);

    // Update Redux on changes
    useEffect(() => {
        if (dataLoaded && completionPercentage > 0) {
            dispatch(setUnsavedChanges(true));
        }
    }, [dispatch, dataLoaded, completionPercentage]);

    // Auto-fill today's date
    const handleAutoFillEffectiveDate = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const expDate = oneYearLater.toISOString().split('T')[0];
        
        setConsentPhotoEffectiveDate(today);
        setConsentPhotoExpirationDate(expDate);
    }, []);

    // Form submission
    const handleSubmit = useCallback(async (event) => {
        event?.preventDefault();
        
        const validationErrors = [];
        
        if (!clientID) {
            validationErrors.push("No client selected.");
        }
        if (clientReleaseItems.length === 0) {
            validationErrors.push("Please select at least one type of content to authorize.");
        }
        if (clientReleasePurposes.length === 0) {
            validationErrors.push("Please select at least one purpose for the release.");
        }
        if (!consentPhotoSign1.trim()) {
            validationErrors.push("Electronic signature is required.");
        }
        if (!consentPhotoEffectiveDate) {
            validationErrors.push("Effective date is required.");
        }
        if (!consentPhotoExpirationDate) {
            validationErrors.push("Expiration date is required.");
        }
        
        // Validate expiration after effective
        if (consentPhotoEffectiveDate && consentPhotoExpirationDate) {
            const effDate = new Date(consentPhotoEffectiveDate);
            const expDate = new Date(consentPhotoExpirationDate);
            if (expDate <= effDate) {
                validationErrors.push("Expiration date must be after effective date.");
            }
        }
        
        if (validationErrors.length > 0) {
            setLocalErrors(validationErrors);
            return;
        }

        const submitData = {
            // ✅ CRITICAL: Send as simple string arrays
            clientReleaseItems: clientReleaseItems.map(item => 
                typeof item === 'string' ? item : item.value
            ),
            clientReleasePurposes: clientReleasePurposes.map(item => 
                typeof item === 'string' ? item : item.value
            ),
            clientReleasePHTItems: clientReleasePHTItems.map(item => 
                typeof item === 'string' ? item : item.value
            ),
            consentPhotoSign1,
            consentPhotoEffectiveDate,
            consentPhotoExpirationDate, // ✅ FIXED: Correct field name
            completionPercentage: 100,
            status: 'completed',
            clientID,
            formType: 'consentPhoto'
        };

        console.log('📤 Submitting ConsentPhoto data:', submitData);

        try {
            await dispatch(saveFormData({ 
                clientID, 
                formType: 'consentPhoto', 
                formData: submitData 
            })).unwrap();
            
            setLocalErrors([]);
            setShowSuccessSnackbar(true);
            console.log('✅ ConsentPhoto saved successfully');
        } catch (error) {
            console.error('❌ Failed to save ConsentPhoto:', error);
            setLocalErrors([error.message || 'Failed to save consent form']);
        }
    }, [dispatch, clientID, clientReleaseItems, clientReleasePurposes, clientReleasePHTItems,
        consentPhotoSign1, consentPhotoEffectiveDate, consentPhotoExpirationDate]);

    const handleCloseSuccessSnackbar = useCallback(() => {
        setShowSuccessSnackbar(false);
        dispatch(clearSuccessFlags());
    }, [dispatch]);

    const handleClearErrors = useCallback(() => {
        setLocalErrors([]);
        dispatch(clearErrors());
    }, [dispatch]);

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
            {/* Header */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CameraIcon sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                                Authorization For Release and Publication
                            </Typography>
                            <Typography variant="h6" color="text.secondary">
                                Photographs, Art Work and/or Personal Information
                            </Typography>
                        </Box>
                    </Box>

                    {/* Client Info */}
                    {selectedClient && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                Client: <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
                            </Typography>
                        </Box>
                    )}

                    {/* Progress */}
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
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
                        />
                    </Box>
                </CardContent>
            </Card>

            {/* Errors */}
            {localErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={handleClearErrors}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Please address the following issues:
                    </Typography>
                    {localErrors.map((error, index) => (
                        <Typography key={index} variant="body2">• {error}</Typography>
                    ))}
                </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        {/* Step 1: Content */}
                        <Step>
                            <StepLabel>Content Authorization</StepLabel>
                            <StepContent>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    I authorize <strong>Holliday's Helping Hands</strong> to release and publish my:
                                </Typography>
                                
                                <Autocomplete
                                    multiple
                                    options={clientReleaseList}
                                    getOptionLabel={(option) => option.value}
                                    value={clientReleaseItems}
                                    onChange={(e, newValue) => setClientReleaseItems(newValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Content Types"
                                            required
                                            helperText="Select all types of content you authorize"
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                <Button
                                    variant="contained"
                                    onClick={() => setActiveStep(1)}
                                    disabled={clientReleaseItems.length === 0}
                                >
                                    Continue
                                </Button>
                            </StepContent>
                        </Step>

                        {/* Step 2: Purpose */}
                        <Step>
                            <StepLabel>Purpose Selection</StepLabel>
                            <StepContent>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    For the following purpose or purposes:
                                </Typography>
                                
                                <Autocomplete
                                    multiple
                                    options={clientReleasePurposeList}
                                    getOptionLabel={(option) => option.value}
                                    value={clientReleasePurposes}
                                    onChange={(e, newValue) => setClientReleasePurposes(newValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Select Purposes"
                                            required
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="outlined" onClick={() => setActiveStep(0)}>Back</Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => setActiveStep(2)}
                                        disabled={clientReleasePurposes.length === 0}
                                    >
                                        Continue
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>

                        {/* Step 3: PHI (Optional) */}
                        <Step>
                            <StepLabel>Health Information (Optional)</StepLabel>
                            <StepContent>
                                <Autocomplete
                                    multiple
                                    options={clientReleasePHTList}
                                    getOptionLabel={(option) => option.value}
                                    value={clientReleasePHTItems}
                                    onChange={(e, newValue) => setClientReleasePHTItems(newValue)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Health Information (Optional)" />
                                    )}
                                    sx={{ mb: 2 }}
                                />

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button variant="outlined" onClick={() => setActiveStep(1)}>Back</Button>
                                    <Button variant="contained" onClick={() => setActiveStep(3)}>Continue</Button>
                                </Box>
                            </StepContent>
                        </Step>

                        {/* Step 4: Dates & Signature */}
                        <Step>
                            <StepLabel>Dates & Signature</StepLabel>
                            <StepContent>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Effective Date"
                                            type="date"
                                            value={consentPhotoEffectiveDate}
                                            onChange={(e) => setConsentPhotoEffectiveDate(e.target.value)}
                                            required
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <Button size="small" onClick={handleAutoFillEffectiveDate} sx={{ mt: 1 }}>
                                            Use Today
                                        </Button>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Expiration Date"
                                            type="date"
                                            value={consentPhotoExpirationDate}
                                            onChange={(e) => setConsentPhotoExpirationDate(e.target.value)}
                                            required
                                            InputLabelProps={{ shrink: true }}
                                            helperText="One year from effective date or end of treatment"
                                        />
                                    </Grid>
                                </Grid>

                                <TextField
                                    fullWidth
                                    label="Electronic Signature"
                                    value={consentPhotoSign1}
                                    onChange={(e) => setConsentPhotoSign1(e.target.value)}
                                    required
                                    placeholder="Type your full legal name"
                                    helperText="This serves as your electronic signature"
                                    sx={{ mb: 2 }}
                                />

                                {consentPhotoSign1 && (
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
                                            Signature: <strong>{consentPhotoSign1}</strong>
                                        </Typography>
                                    </Box>
                                )}

                                <Button variant="outlined" onClick={() => setActiveStep(2)}>Back</Button>
                            </StepContent>
                        </Step>
                    </Stepper>
                </Paper>

                {/* Submit Button */}
                <Box sx={{ textAlign: 'center' }}>
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        disabled={saving || !clientID || completionPercentage < 100}
                        sx={{ px: 4, py: 1.5, fontWeight: 600 }}
                    >
                        {saving ? 'Saving...' : 'Save Consent Form'}
                    </Button>
                </Box>
            </form>

            {/* Success Snackbar */}
            <Snackbar open={showSuccessSnackbar} autoHideDuration={6000} onClose={handleCloseSuccessSnackbar}>
                <Alert onClose={handleCloseSuccessSnackbar} severity="success">
                    ✅ Consent form saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
});

ConsentPhoto.displayName = 'ConsentPhoto';

export default ConsentPhoto;