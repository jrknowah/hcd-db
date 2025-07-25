import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Badge,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    LinearProgress,
    CircularProgress,
    Alert,
    Button,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Assignment as AssignmentIcon,
    Inventory as InventoryIcon,
    Description as DocumentIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    Assessment as AssessmentIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from "react-redux";
import {
    fetchFaceSheet,
    fetchCaseStatus,
    fetchCaseTimeline,
    fetchCaseMetrics
} from "../../store/slices/section6Slice";
import { section6List, ynd, gfp, statusList } from "../../data/arrayList";

// Import child components
import IDTNoteCM from './IDTNoteCM';
import PersonalInventory from './PersonalInventory';
import MiscDoc from './MiscDoc';

const Section6 = ({ clientID = "CLIENT-123" }) => {
    const dispatch = useDispatch();
    const { 
        faceSheet, 
        faceSheetLoading, 
        caseStatus, 
        caseTimeline, 
        caseMetrics,
        useMockData 
    } = useSelector((state) => state.section6);

    const [activeTab, setActiveTab] = useState(0);

    // Mock data for development
    const mockFaceSheetData = {
        caseNumber: "CS-2025-0717-001",
        caseStatus: "Active",
        admissionDate: "2025-07-10",
        expectedDischargeDate: "2025-07-25",
        primaryCaseManager: "Sarah Johnson, LCSW",
        completionPercentage: 78.5,
        riskLevel: "Medium",
        priorityLevel: "High",
        caseComplexityScore: 7,
        lengthOfStay: 7,
        targetLOS: 10,
        documentationComplete: false
    };

    const mockMilestones = [
        { 
            id: 1, 
            title: "Initial Assessment Completed", 
            completed: true, 
            completedDate: "2025-07-10",
            required: true 
        },
        { 
            id: 2, 
            title: "Care Plan Development", 
            completed: true, 
            completedDate: "2025-07-11",
            required: true 
        },
        { 
            id: 3, 
            title: "Service Coordination", 
            completed: true, 
            completedDate: "2025-07-12",
            required: true 
        },
        { 
            id: 4, 
            title: "Family Conference", 
            completed: false, 
            dueDate: "2025-07-20",
            required: true 
        },
        { 
            id: 5, 
            title: "Discharge Planning", 
            completed: false, 
            dueDate: "2025-07-22",
            required: true 
        },
        { 
            id: 6, 
            title: "Final Documentation", 
            completed: false, 
            dueDate: "2025-07-24",
            required: true 
        }
    ];

    const mockCaseMetrics = {
        totalMilestones: 6,
        completedMilestones: 3,
        overdueTasks: 1,
        documentsComplete: 12,
        documentsTotal: 18,
        satisfactionScore: 4.2,
        lastUpdate: "2025-07-17T10:30:00Z"
    };

    // ✅ Fetch data when component loads
    useEffect(() => {
        if (!useMockData) {
            dispatch(fetchFaceSheet(clientID));
            dispatch(fetchCaseStatus(clientID));
            dispatch(fetchCaseTimeline(clientID));
            dispatch(fetchCaseMetrics(clientID));
        }
    }, [dispatch, clientID, useMockData]);

    // ✅ Handle tab change
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    // ✅ Get completion color
    const getCompletionColor = (percentage) => {
        if (percentage >= 80) return 'success';
        if (percentage >= 60) return 'warning';
        return 'error';
    };

    // ✅ Get risk level color
    const getRiskColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'low': return 'success';
            case 'medium': return 'warning';
            case 'high': return 'error';
            default: return 'default';
        }
    };

    // ✅ Get priority level color
    const getPriorityColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'low': return 'default';
            case 'medium': return 'info';
            case 'high': return 'error';
            default: return 'default';
        }
    };

    // ✅ Calculate days remaining
    const getDaysRemaining = (targetDate) => {
        if (!targetDate) return null;
        const today = new Date();
        const target = new Date(targetDate);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // ✅ Tab panel component
    const TabPanel = ({ children, value, index }) => (
        <div hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );

    // ✅ Case Face Sheet Dashboard
    const CaseFaceSheetDashboard = () => {
        const data = useMockData ? mockFaceSheetData : faceSheet;
        const milestones = useMockData ? mockMilestones : [];
        const metrics = useMockData ? mockCaseMetrics : caseMetrics;

        if (faceSheetLoading && !useMockData) {
            return (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            );
        }

        return (
            <Grid container spacing={3}>
                {/* Case Overview */}
                <Grid item xs={12}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h5" color="primary">
                                    Case Overview - {data.caseNumber}
                                </Typography>
                                <Tooltip title="Refresh Data">
                                    <IconButton color="primary">
                                        <RefreshIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="body2" color="textSecondary">Case Status</Typography>
                                        <Chip 
                                            label={data.caseStatus} 
                                            color={data.caseStatus === 'Active' ? 'success' : 'default'}
                                            size="large"
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="body2" color="textSecondary">Completion</Typography>
                                        <Typography variant="h6" color={getCompletionColor(data.completionPercentage)}>
                                            {data.completionPercentage}%
                                        </Typography>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={data.completionPercentage}
                                            color={getCompletionColor(data.completionPercentage)}
                                            sx={{ mt: 1 }}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="body2" color="textSecondary">Risk Level</Typography>
                                        <Chip 
                                            label={data.riskLevel} 
                                            color={getRiskColor(data.riskLevel)}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="body2" color="textSecondary">Priority</Typography>
                                        <Chip 
                                            label={data.priorityLevel} 
                                            color={getPriorityColor(data.priorityLevel)}
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Key Metrics */}
                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Key Metrics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Box textAlign="center" py={2}>
                                        <Typography variant="h4" color="primary">
                                            {data.lengthOfStay}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Length of Stay (days)
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Target: {data.targetLOS} days
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box textAlign="center" py={2}>
                                        <Typography variant="h4" color="secondary">
                                            {data.caseComplexityScore}/10
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Complexity Score
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box textAlign="center" py={2}>
                                        <Typography variant="h4" color="success.main">
                                            {metrics.documentsComplete}/{metrics.documentsTotal}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Documents Complete
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box textAlign="center" py={2}>
                                        <Typography variant="h4" color="info.main">
                                            {metrics.satisfactionScore}/5.0
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Satisfaction Score
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Case Information */}
                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Case Information
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemText 
                                        primary="Primary Case Manager"
                                        secondary={data.primaryCaseManager}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Admission Date"
                                        secondary={new Date(data.admissionDate).toLocaleDateString()}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Expected Discharge"
                                        secondary={
                                            <Box>
                                                {new Date(data.expectedDischargeDate).toLocaleDateString()}
                                                <Chip 
                                                    label={`${getDaysRemaining(data.expectedDischargeDate)} days remaining`}
                                                    size="small"
                                                    color={getDaysRemaining(data.expectedDischargeDate) < 3 ? 'error' : 'info'}
                                                    sx={{ ml: 1 }}
                                                />
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Case Milestones */}
                <Grid item xs={12}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Case Milestones Progress
                            </Typography>
                            
                            {metrics.overdueTasks > 0 && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    <strong>{metrics.overdueTasks}</strong> overdue task(s) require attention
                                </Alert>
                            )}

                            <List>
                                {milestones.map((milestone, index) => (
                                    <React.Fragment key={milestone.id}>
                                        <ListItem>
                                            <ListItemIcon>
                                                {milestone.completed ? (
                                                    <CheckCircleIcon color="success" />
                                                ) : (
                                                    <UncheckedIcon color="action" />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Typography variant="body1">
                                                            {milestone.title}
                                                        </Typography>
                                                        {milestone.required && (
                                                            <Chip label="Required" size="small" color="primary" />
                                                        )}
                                                        {!milestone.completed && milestone.dueDate && 
                                                         getDaysRemaining(milestone.dueDate) < 0 && (
                                                            <Chip label="Overdue" size="small" color="error" />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    milestone.completed 
                                                        ? `Completed: ${new Date(milestone.completedDate).toLocaleDateString()}`
                                                        : milestone.dueDate 
                                                            ? `Due: ${new Date(milestone.dueDate).toLocaleDateString()}`
                                                            : 'No due date set'
                                                }
                                            />
                                        </ListItem>
                                        {index < milestones.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        );
    };

    return (
        <Paper elevation={3} sx={{ maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    Section 6 - Case Management
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Comprehensive Case Tracking and Documentation
                </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ px: 3 }}
                >
                    <Tab 
                        label={
                            <Badge badgeContent={mockCaseMetrics.overdueTasks} color="error">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <DashboardIcon />
                                    Case Face Sheet
                                </Box>
                            </Badge>
                        }
                    />
                    {section6List.map((section, index) => {
                        const getTabIcon = (title) => {
                            if (title.toLowerCase().includes('case manager') || title.toLowerCase().includes('idt')) {
                                return <AssignmentIcon />;
                            }
                            if (title.toLowerCase().includes('inventory')) {
                                return <InventoryIcon />;
                            }
                            if (title.toLowerCase().includes('documentation') || title.toLowerCase().includes('discharge')) {
                                return <DocumentIcon />;
                            }
                            return <DocumentIcon />;
                        };

                        const isCompleted = section.section6Date !== "";
                        
                        return (
                            <Tab 
                                key={index}
                                label={
                                    <Badge 
                                        badgeContent={isCompleted ? null : "!"} 
                                        color="warning"
                                        variant={isCompleted ? undefined : "dot"}
                                    >
                                        <Box display="flex" alignItems="center" gap={1}>
                                            {getTabIcon(section.section6Title)}
                                            {section.section6Title}
                                        </Box>
                                    </Badge>
                                }
                            />
                        );
                    })}
                </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ p: 3 }}>
                <TabPanel value={activeTab} index={0}>
                    <CaseFaceSheetDashboard />
                </TabPanel>

                {section6List.map((section, index) => (
                    <TabPanel key={index} value={activeTab} index={index + 1}>
                        {section.section6Title === "Case Manager IDT Note" && (
                            <IDTNoteCM clientID={clientID} />
                        )}
                        {section.section6Title === "Personal Inventory" && (
                            <PersonalInventory clientID={clientID} />
                        )}
                        {(section.section6Title === "Miscellaneous Documentation" || 
                          section.section6Title === "Discharge") && (
                            <MiscDoc clientID={clientID} />
                        )} 
                        {!["Case Manager IDT Note", "Personal Inventory", "Miscellaneous Documentation", "Discharge"].includes(section.section6Title) && (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <DocumentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    {section.section6Title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    {section.section6Date ? 
                                        `Completed on ${new Date(section.section6Date).toLocaleDateString()}` :
                                        'This section is pending completion'
                                    }
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    startIcon={<AssignmentIcon />}
                                    disabled={section.section6Date !== ""}
                                >
                                    {section.section6Date ? 'Completed' : 'Start Section'}
                                </Button>
                            </Box>
                        )}
                    </TabPanel>
                ))}
            </Box>
        </Paper>
    );
};

export default Section6;