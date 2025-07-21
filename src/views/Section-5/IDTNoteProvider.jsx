import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Grid,
    Paper,
    CircularProgress,
    Alert,
    Chip,
    Autocomplete,
    Rating,
    FormControlLabel,
    Switch
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    LocalHospital as HospitalIcon,
    Assignment as AssignmentIcon,
    Group as ConsultationIcon,
    ExitToApp as DischargeIcon,
    CheckCircle as ClearanceIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import { ynd } from "../../data/arrayList";
import { 
    fetchIDTNoteProvider, 
    saveIDTNoteProvider
} from "../../store/slices/idtProviderSlice";

const IDTNoteProvider = () => {
    const dispatch = useDispatch();
    const { data: savedData } = useSelector((state) => state.idtProvider);
    const user = useSelector((state) => state.auth.user);

    const [formData, setFormData] = useState({
        idtHospital: "",
        idtAdmitDate: "",
        idtDiag: "",
        idtProblems: "",
        idtPriority: "",
        idtConsults: "",
        idtNoConsults: "",
        idtPlans: "",
        idtPatientClear: "",
        idtPatientClearDate: "",
        idtDischarge: "",
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // ✅ Fetch saved data from Azure SQL when component loads
    useEffect(() => {
        dispatch(fetchIDTNoteProvider());
    }, [dispatch]);

    // ✅ Populate form with existing data if available
    useEffect(() => {
        if (Array.isArray(savedData) && savedData.length > 0) {
            setFormData(savedData[0]);
        }
    }, [savedData]);

    // ✅ Handle Input Changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ✅ Handle Form Submission
    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        dispatch(saveIDTNoteProvider({
            ...formData,
            userId: user?.id,
            userName: user?.name,
        })).finally(() => {
            setSaving(false);
            alert("IDT Provider Note Saved!");
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress size={50} />
                <Typography variant="h6" sx={{ ml: 2 }}>Loading IDT Provider Note...</Typography>
            </Box>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    IDT Provider Note
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Interdisciplinary Team Provider Documentation
                </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
                {/* Hospital & Admission Information */}
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <HospitalIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">Hospital & Admission Information</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Hospital"
                                    name="idtHospital"
                                    value={formData.idtHospital}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Admit Date"
                                    name="idtAdmitDate"
                                    type="date"
                                    value={formData.idtAdmitDate}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Clinical Assessment */}
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <AssignmentIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">Clinical Assessment & Diagnosis</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Diagnosis and H&P Pertinent"
                                    name="idtDiag"
                                    value={formData.idtDiag}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Problems Member is Having with Life"
                                    name="idtProblems"
                                    value={formData.idtProblems}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Priority Problems for Member"
                                    name="idtPriority"
                                    value={formData.idtPriority}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Consultation Management */}
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <ConsultationIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">Consultation Management</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Consultations Being Placed for Problems"
                                    name="idtConsults"
                                    value={formData.idtConsults}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="If No Consults, Alternative Options"
                                    name="idtNoConsults"
                                    value={formData.idtNoConsults}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Discharge Planning */}
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <DischargeIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">Discharge Planning</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Discharge Plans for Member"
                                    name="idtPlans"
                                    value={formData.idtPlans}
                                    onChange={handleChange}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Barriers to Discharge"
                                    name="idtDischarge"
                                    value={formData.idtDischarge}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Medical Clearance */}
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <ClearanceIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <Typography variant="h6">Medical Clearance</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Is Patient Medically Cleared?</InputLabel>
                                    <Select
                                        name="idtPatientClear"
                                        value={formData.idtPatientClear}
                                        onChange={handleChange}
                                        label="Is Patient Medically Cleared?"
                                    >
                                        <MenuItem value="">Select</MenuItem>
                                        {ynd.map((option) => (
                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Date Patient was Cleared"
                                    name="idtPatientClearDate"
                                    type="date"
                                    value={formData.idtPatientClearDate}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
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
                        startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                        disabled={saving}
                        sx={{ px: 4, py: 1.5 }}
                    >
                        {saving ? 'Saving...' : 'Save IDT Provider Note'}
                    </Button>
                </Box>
            </form>
        </Paper>
    );
};

export default IDTNoteProvider;