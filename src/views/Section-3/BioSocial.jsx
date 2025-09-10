// ====================================================================
// COMPLETE BioSocial Component with ALL Fields - Material-UI Version
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
    InputAdornment
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Assessment as AssessmentIcon,
    AttachMoney as MoneyIcon,
    Home as HomeIcon,
    Accessibility as AccessibilityIcon,
    Work as WorkIcon,
    AccountBalance as DebtIcon,
    Chat as CommunicationIcon,
    Save as SaveIcon,
    Person as PersonIcon,
    BugReport as BugIcon,
    Label
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import axios from 'axios';
import logUserAction from "../../config/logAction";

// Import your existing data arrays
import {
    assistList, 
    finList, 
    gfp, 
    ynd, 
    housingList, 
    functionalCommunication, 
    ambulatoryStatus
} from "../../data/arrayList";

const HCD_API = `${import.meta.env.VITE_API_URL}`;

const BioSocial = () => {
    // ✅ Redux selectors - try multiple possible locations
    const selectedClient = useSelector((state) => 
        state.clients?.selectedClient || 
        state.auth?.selectedClient || 
        state.user?.selectedClient ||
        null
    );
    const user = useSelector((state) => state.auth?.user || {});
    
    // ✅ Local state for mock client as backup
    const [localMockClient, setLocalMockClient] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // ✅ Use selectedClient or local mock client
    const currentClient = selectedClient || localMockClient;
    
    // ✅ Complete form state with ALL fields from your original component
    const [bioSocialForm, setBioSocialForm] = useState({
        // Financial Information
        clientCalWorks: "",
        clientEmployment: "",
        clientFoodStamps: "",
        clientWidowBen: "",
        clientCS: "",
        clientGenRelief: "",
        clientSSI: "",
        clientSSDI: "",
        clientTANF: "",
        clientWorkComp: "",
        clientUnEmp: "",
        clientVetBen: "",
        clientStDis: "",
        clientInherit: "",
        clientOtherInc: "",
        
        // Payee Information
        payeeChoice: "",
        payeeName: "",
        payeePhone: "",
        
        // Employment History
        clientBeenEmployed: "",
        clientEmpIntr: "",
        clientEmployed: "",
        clientEmployer: "",
        
        // Debt Information
        clientDebt: "",
        clientBankrupt: "",
        
        // Housing Screening
        clientGovHousingApp: [],
        clientGovHousingLive: [],
        clientPastRenter: "",
        clientPastRenterLate: "",
        clientEvicted: "",
        clientLandlordProb: "",
        clientUtilityBill: "",
        clientCreditRating: "",
        clientHousingSummary: "",
        
        // Functional Screening
        clientAmbulatory: [],
        clientAmbulatorySummary: "",
        
        // Activities of Daily Living
        clientEating: "",
        clientBathing: "",
        clientBrushing: "",
        clientToileting: "",
        clientCooking: "",
        clientCleaning: "",
        clientLaundry: "",
        clientTakingMeds: "",
        clientFunctionalAssist: "",
        
        // Communication
        clientCommunication: [],
        clientBioSocialNotes: ""
    });

    // ✅ Load mock client function
    const loadMockClient = () => {
        const mockClient = {
            clientID: "CLIENT-123",
            clientName: "John Doe (Mock)",
            clientEmail: "john.doe@example.com"
        };
        setLocalMockClient(mockClient);
        setSaveStatus({ type: 'info', message: `Mock client "${mockClient.clientName}" loaded successfully!` });
    };

    // ✅ Fetch client's bio-social data when a client is selected
    useEffect(() => {
        if (currentClient?.clientID) {
            setLoading(true);
            axios.get(`${HCD_API}/bio-social/${currentClient.clientID}`)
                .then((res) => {
                    if (res.data) {
                        setBioSocialForm({
                            ...bioSocialForm,
                            ...res.data,
                            // Convert comma-separated strings back to arrays
                            clientGovHousingApp: res.data.clientGovHousingApp ? res.data.clientGovHousingApp.split(", ") : [],
                            clientGovHousingLive: res.data.clientGovHousingLive ? res.data.clientGovHousingLive.split(", ") : [],
                            clientAmbulatory: res.data.clientAmbulatory ? res.data.clientAmbulatory.split(", ") : [],
                            clientCommunication: res.data.clientCommunication ? res.data.clientCommunication.split(", ") : []
                        });
                    }
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("❌ Error fetching client bio-social data:", err);
                    setLoading(false);
                });
        }
    }, [currentClient]);

    // ✅ Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setBioSocialForm(prevState => ({ ...prevState, [name]: value }));
    };

    // ✅ Handle Multi-Select Change (convert to Material-UI format)
    const handleMultiSelectChange = (name, selectedOptions) => {
        setBioSocialForm(prevState => ({
            ...prevState,
            [name]: selectedOptions || []
        }));
    };

    // ✅ Handle Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentClient) {
            setSaveStatus({ type: 'error', message: "No client selected!" });
            return;
        }

        try {
            setLoading(true);
            
            // Convert arrays back to comma-separated strings for API
            const formDataToSend = {
                ...bioSocialForm,
                clientGovHousingApp: Array.isArray(bioSocialForm.clientGovHousingApp) ? 
                    bioSocialForm.clientGovHousingApp.map(item => typeof item === 'string' ? item : item.value).join(", ") : 
                    bioSocialForm.clientGovHousingApp,
                clientGovHousingLive: Array.isArray(bioSocialForm.clientGovHousingLive) ? 
                    bioSocialForm.clientGovHousingLive.map(item => typeof item === 'string' ? item : item.value).join(", ") : 
                    bioSocialForm.clientGovHousingLive,
                clientAmbulatory: Array.isArray(bioSocialForm.clientAmbulatory) ? 
                    bioSocialForm.clientAmbulatory.map(item => typeof item === 'string' ? item : item.value).join(", ") : 
                    bioSocialForm.clientAmbulatory,
                clientCommunication: Array.isArray(bioSocialForm.clientCommunication) ? 
                    bioSocialForm.clientCommunication.map(item => typeof item === 'string' ? item : item.value).join(", ") : 
                    bioSocialForm.clientCommunication,
                clientID: currentClient.clientID
            };

            await axios.post(`${HCD_API}/bio-social/${currentClient.clientID}`, formDataToSend);

            if (user) {
                await logUserAction(user, "SAVE_BIOSOCIAL", {
                    clientID: currentClient.clientID
                });
            }
            
            setSaveStatus({ type: 'success', message: "✅ Client Bio-Social Data Saved Successfully!" });
            setLoading(false);
        } catch (error) {
            console.error("❌ Error saving bio-social data:", error);
            setSaveStatus({ type: 'error', message: "Failed to save client bio-social data." });
            setLoading(false);
        }
    };

    // ✅ Calculate total monthly income
    const calculateTotalIncome = () => {
        const incomeFields = [
            'clientCalWorks', 'clientEmployment', 'clientFoodStamps', 'clientWidowBen',
            'clientCS', 'clientGenRelief', 'clientSSI', 'clientSSDI', 'clientTANF',
            'clientWorkComp', 'clientUnEmp', 'clientVetBen', 'clientStDis', 
            'clientInherit', 'clientOtherInc'
        ];
        
        return incomeFields.reduce((total, field) => {
            const value = parseFloat(bioSocialForm[field]) || 0;
            return total + value;
        }, 0);
    };

    // ✅ Calculate completion percentage
    const calculateCompletionPercentage = () => {
        const requiredFields = [
            'clientCalWorks', 'clientEmployment', 'payeeChoice', 'clientBeenEmployed',
            'clientEmpIntr', 'clientDebt', 'clientPastRenter', 'clientEating', 'clientBathing'
        ];
        const completed = requiredFields.filter(field => bioSocialForm[field] !== "").length;
        return Math.round((completed / requiredFields.length) * 100);
    };

    // Convert your data arrays to Material-UI format
    const convertToMUIOptions = (array) => {
        return array.map(item => ({
            label: typeof item === 'string' ? item : item.label || item.value,
            value: typeof item === 'string' ? item : item.value
        }));
    };

    const housingOptions = convertToMUIOptions(housingList);
    const ambulatoryOptions = convertToMUIOptions(ambulatoryStatus);
    const communicationOptions = convertToMUIOptions(functionalCommunication);

    // ✅ Show no client screen
    if (!currentClient) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="h6">No Client Selected</Typography>
                    <Typography>Please select a client to view the Bio-Social assessment.</Typography>
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
                                    {debugMode ? 'Hide Debug' : 'Show Debug'}
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    const totalIncome = calculateTotalIncome();
    const completionPercentage = calculateCompletionPercentage();

    return (
        <Paper elevation={3} sx={{ maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Bio-Social Assessment
                </Typography>
                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                    Comprehensive assessment for {currentClient.clientName} ({currentClient.clientID})
                </Typography>
                
                {/* Progress Overview */}
                <Card elevation={1} sx={{ mt: 2 }}>
                    <CardContent>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Completion</Typography>
                                    <Typography variant="h6" color={completionPercentage >= 80 ? 'success.main' : 'warning.main'}>
                                        {completionPercentage}%
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={completionPercentage}
                                        color={completionPercentage >= 80 ? 'success' : 'warning'}
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box textAlign="center">
                                    <Typography variant="body2" color="textSecondary">Total Monthly Income</Typography>
                                    <Typography variant="h6" color="primary">
                                        ${totalIncome.toFixed(2)}
                                    </Typography>
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
                    
                    {/* Financial Screening Section */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <MoneyIcon color="primary" />
                                <Typography variant="h6">Financial Screening</Typography>
                                <Chip 
                                    label={`Total: $${totalIncome.toFixed(2)}`} 
                                    size="small" 
                                    color="primary" 
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                {/* Map through finList for all financial fields */}
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="CalWorks"
                                        type="number"
                                        name="clientCalWorks"
                                        value={bioSocialForm.clientCalWorks}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Employment"
                                        type="number"
                                        name="clientEmployment"
                                        value={bioSocialForm.clientEmployment}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Food Stamps"
                                        type="number"
                                        name="clientFoodStamps"
                                        value={bioSocialForm.clientFoodStamps}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Widow Benefits"
                                        type="number"
                                        name="clientWidowBen"
                                        value={bioSocialForm.clientWidowBen}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Child Support"
                                        type="number"
                                        name="clientCS"
                                        value={bioSocialForm.clientCS}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="General Relief"
                                        type="number"
                                        name="clientGenRelief"
                                        value={bioSocialForm.clientGenRelief}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="SSI"
                                        type="number"
                                        name="clientSSI"
                                        value={bioSocialForm.clientSSI}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="SSDI"
                                        type="number"
                                        name="clientSSDI"
                                        value={bioSocialForm.clientSSDI}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="TANF"
                                        type="number"
                                        name="clientTANF"
                                        value={bioSocialForm.clientTANF}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Workers Comp"
                                        type="number"
                                        name="clientWorkComp"
                                        value={bioSocialForm.clientWorkComp}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Unemployment"
                                        type="number"
                                        name="clientUnEmp"
                                        value={bioSocialForm.clientUnEmp}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Veterans Benefits"
                                        type="number"
                                        name="clientVetBen"
                                        value={bioSocialForm.clientVetBen}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="State Disability"
                                        type="number"
                                        name="clientStDis"
                                        value={bioSocialForm.clientStDis}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Inheritance"
                                        type="number"
                                        name="clientInherit"
                                        value={bioSocialForm.clientInherit}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Other Income"
                                        type="number"
                                        name="clientOtherInc"
                                        value={bioSocialForm.clientOtherInc}
                                        onChange={handleChange}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Payee Information Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <PersonIcon color="primary" />
                                <Typography variant="h6">Payee Information</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={4}>
                                    <InputLabel>Do you have a payee?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.payeeChoice}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, payeeChoice: e.target.value}))}
                                            label="Do you have a payee?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <InputLabel>Payee Name</InputLabel>
                                    <TextField
                                        fullWidth
                                        name="payeeName"
                                        value={bioSocialForm.payeeName}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <InputLabel>Payee Phone</InputLabel>
                                    <TextField
                                        fullWidth
                                        type="tel"
                                        name="payeePhone"
                                        value={bioSocialForm.payeePhone}
                                        onChange={handleChange}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Employment History Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <WorkIcon color="primary" />
                                <Typography variant="h6">Employment History</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Have you ever been employed?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientBeenEmployed}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientBeenEmployed: e.target.value}))}
                                            label="Have you ever been employed?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Interested in obtaining employment?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientEmpIntr}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientEmpIntr: e.target.value}))}
                                            label="Interested in obtaining employment?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Currently employed?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientEmployed}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientEmployed: e.target.value}))}
                                            label="Currently employed?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Name of Employer</InputLabel>
                                    <TextField
                                        fullWidth
                                        name="clientEmployer"
                                        value={bioSocialForm.clientEmployer}
                                        onChange={handleChange}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Debt Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <DebtIcon color="primary" />
                                <Typography variant="h6">Debt Information</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Owe debt to public agency?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientDebt}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientDebt: e.target.value}))}
                                            label="Owe debt to public agency?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Ever filed for bankruptcy?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientBankrupt}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientBankrupt: e.target.value}))}
                                            label="Ever filed for bankruptcy?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Housing Screening Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <HomeIcon color="primary" />
                                <Typography variant="h6">Housing Screening</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Ever applied for government housing?</InputLabel>
                                    <Autocomplete
                                        multiple
                                        options={housingOptions}
                                        getOptionLabel={(option) => option.label}
                                        value={housingOptions.filter(option => 
                                            bioSocialForm.clientGovHousingApp.includes(option.value)
                                        )}
                                        onChange={(event, newValue) => handleMultiSelectChange('clientGovHousingApp', newValue.map(v => v.value))}
                                        renderInput={(params) => (
                                            <TextField {...params}/>
                                        )}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    key={option.value}
                                                    label={option.label}
                                                    {...getTagProps({ index })}
                                                    size="small"
                                                />
                                            ))
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <label>Ever lived in government housing?</label>
                                    <Autocomplete
                                        multiple
                                        options={housingOptions}
                                        getOptionLabel={(option) => option.label}
                                        value={housingOptions.filter(option => 
                                            bioSocialForm.clientGovHousingLive.includes(option.value)
                                        )}
                                        onChange={(event, newValue) => handleMultiSelectChange('clientGovHousingLive', newValue.map(v => v.value))}
                                        renderInput={(params) => (
                                            <TextField {...params}  />
                                        )}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    key={option.value}
                                                    label={option.label}
                                                    {...getTagProps({ index })}
                                                    size="small"
                                                />
                                            ))
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Have you ever rented before?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientPastRenter}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientPastRenter: e.target.value}))}
                                            label="Have you ever rented before?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Ever been served a late notice?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientPastRenterLate}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientPastRenterLate: e.target.value}))}
                                            label="Ever been served a late notice?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Ever been evicted?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientEvicted}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientEvicted: e.target.value}))}
                                            label="Ever been evicted?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Problems with previous landlords?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientLandlordProb}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientLandlordProb: e.target.value}))}
                                            label="Problems with previous landlords?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Outstanding utility bills?</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientUtilityBill}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientUtilityBill: e.target.value}))}
                                            label="Outstanding utility bills?"
                                        >
                                            {ynd.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <InputLabel>Rate your credit</InputLabel>
                                    <FormControl fullWidth>
                                        <Select
                                            value={bioSocialForm.clientCreditRating}
                                            onChange={(e) => setBioSocialForm(prev => ({...prev, clientCreditRating: e.target.value}))}
                                            label="Rate your credit"
                                        >
                                            {gfp.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <label>Housing Summary Notes</label>
                                    <TextField
                                        fullWidth
                                        name="clientHousingSummary"
                                        value={bioSocialForm.clientHousingSummary}
                                        onChange={handleChange}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Functional Screening Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <AccessibilityIcon color="primary" />
                                <Typography variant="h6">Functional Screening</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                {/* <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom>Ambulatory Status</Typography>
                                </Grid> */}
                                <Grid item xs={12} md={8}>
                                    <label>Ambulatory Status</label>
                                    <Autocomplete
                                        multiple
                                        options={ambulatoryOptions}
                                        getOptionLabel={(option) => option.label}
                                        value={ambulatoryOptions.filter(option => 
                                            bioSocialForm.clientAmbulatory.includes(option.value)
                                        )}
                                        onChange={(event, newValue) => handleMultiSelectChange('clientAmbulatory', newValue.map(v => v.value))}
                                        renderInput={(params) => (
                                            <TextField {...params}/>
                                        )}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    key={option.value}
                                                    label={option.label}
                                                    {...getTagProps({ index })}
                                                    size="small"
                                                />
                                            ))
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Ambulatory Status Notes"
                                        name="clientAmbulatorySummary"
                                        value={bioSocialForm.clientAmbulatorySummary}
                                        onChange={handleChange}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                                
                                {/* Activities of Daily Living */}
                                
                                {[
                                    { field: 'clientEating', label: 'Eating' },
                                    { field: 'clientBathing', label: 'Bathing / Showering' },
                                    { field: 'clientBrushing', label: 'Brushing Teeth' },
                                    { field: 'clientToileting', label: 'Toileting' },
                                    { field: 'clientCooking', label: 'Cooking' },
                                    { field: 'clientCleaning', label: 'Cleaning' },
                                    { field: 'clientLaundry', label: 'Laundry' },
                                    { field: 'clientTakingMeds', label: 'Taking Medication' }
                                ].map(({ field, label }) => (
                                    <Grid item xs={12} md={6} lg={3} key={field}>
                                        <label>{label}</label>
                                        <FormControl fullWidth>
                                            <InputLabel>{label}</InputLabel>
                                            <Select
                                                value={bioSocialForm[field]}
                                                onChange={(e) => setBioSocialForm(prev => ({...prev, [field]: e.target.value}))}
                                                label={label}
                                            >
                                                {assistList.map((option) => (
                                                    <MenuItem key={option} value={option}>{option}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                ))}
                                
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="If any assistance please specify:"
                                        name="clientFunctionalAssist"
                                        value={bioSocialForm.clientFunctionalAssist}
                                        onChange={handleChange}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                            </Grid>

                        </AccordionDetails>
                    </Accordion>

                    {/* Communication & Language Section */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <CommunicationIcon color="primary" />
                                <Typography variant="h6">Communication & Language</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <label>How does patient communicate / express themselves?</label>
                                    <Autocomplete
                                        multiple
                                        options={communicationOptions}
                                        getOptionLabel={(option) => option.label}
                                        value={communicationOptions.filter(option => 
                                            bioSocialForm.clientCommunication.includes(option.value)
                                        )}
                                        onChange={(event, newValue) => handleMultiSelectChange('clientCommunication', newValue.map(v => v.value))}
                                        renderInput={(params) => (
                                            <TextField {...params} />
                                        )}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip
                                                    key={option.value}
                                                    label={option.label}
                                                    {...getTagProps({ index })}
                                                    size="small"
                                                />
                                            ))
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <label>Bio-Social Summary Notes</label>
                                    <TextField
                                        fullWidth
                                        name="clientBioSocialNotes"
                                        value={bioSocialForm.clientBioSocialNotes}
                                        onChange={handleChange}
                                        multiline
                                        rows={4}
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
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            disabled={loading || !currentClient}
                            sx={{ minWidth: 200, py: 1.5 }}
                        >
                            {loading ? 'Saving...' : 'Save Bio-Social Data'}
                        </Button>
                    </Box>
                </form>
            </Box>
        </Paper>
    );
};

export default BioSocial;