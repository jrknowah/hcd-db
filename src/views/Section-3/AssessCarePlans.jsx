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
    Psychology as PsychologyIcon,
    Person as PersonIcon,
    Assessment as AssessmentIcon,
    Archive as ArchiveIcon,
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    Schedule as ScheduleIcon,
    Refresh as RefreshIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import { useDispatch, useSelector } from "react-redux";
import {
    fetchAssessmentData,
    fetchAssessmentStatus,
    fetchAssessmentMetrics
} from "../../backend/store/slices/assessCarePlansSlice";
import { acpList } from "../../data/arrayList";

// Import child components
import BioSocial from './BioSocial';
import MentalHealth from './MentalHealth';
import ReAssessment from './ReAssessment';
import MentalArchive from './MentalArchive';

const AssessCarePlans = () => {
    const dispatch = useDispatch();
    const { clientID, client, hasClient, loading } = useClientPersistence();
    const { 
        assessmentData, 
        assessmentLoading, 
        assessmentStatus, 
        assessmentMetrics,
        useMockData 
    } = useSelector((state) => state.assessCarePlans || {});

    const [activeTab, setActiveTab] = useState(0);

    // ✅ Add loading state
    if (loading) {
        return (
        <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading client data...</Typography>
        </Box>
        );
    }

    // ✅ Add no-client state
    if (!hasClient || !clientID) {
        return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
            Please select a client to view Section 3
            </Typography>
            <Button 
            variant="contained" 
            onClick={() => window.location.href = '/dashboard'}
            sx={{ mt: 2 }}
            >
            Go to Dashboard
            </Button>
        </Box>
        );
    }

    // Mock data for development
    const mockAssessmentData = {
        assessmentNumber: "ACP-2025-0717-001",
        assessmentStatus: "In Progress",
        startDate: "2025-07-10",
        expectedCompletionDate: "2025-07-25",
        primaryAssessor: "Dr. Maria Rodriguez, PhD",
        completionPercentage: 65.0,
        riskLevel: "Medium",
        priorityLevel: "High",
        complexityScore: 6,
        daysInProgress: 7,
        targetDays: 14,
        documentationComplete: false,
        assessmentType: "Comprehensive"
    };

    const mockAssessmentMilestones = [
        { 
            id: 1, 
            title: "Bio-Social Assessment", 
            completed: true, 
            completedDate: "2025-07-11",
            required: true,
            description: "Financial, employment, and housing assessment"
        },
        { 
            id: 2, 
            title: "Mental Health Assessment", 
            completed: true, 
            completedDate: "2025-07-13",
            required: true,
            description: "Psychiatric evaluation and mental status exam"
        },
        { 
            id: 3, 
            title: "Re-Assessment", 
            completed: false, 
            dueDate: "2025-07-20",
            required: true,
            description: "Follow-up assessment and progress evaluation"
        },
        { 
            id: 4, 
            title: "Section 3 Archive", 
            completed: false, 
            dueDate: "2025-07-24",
            required: false,
            description: "Document archival and final documentation"
        }
    ];

    const mockAssessmentMetrics = {
        totalAssessments: 4,
        completedAssessments: 2,
        overdueAssessments: 0,
        documentsComplete: 8,
        documentsTotal: 12,
        assessmentScore: 7.8,
        lastUpdate: "2025-07-17T14:30:00Z",
        riskFactors: 2,
        strengthsIdentified: 5
    };

    // ✅ Fetch data when component loads
    useEffect(() => {
        if (!useMockData) {
            dispatch(fetchAssessmentData(clientID));
            dispatch(fetchAssessmentStatus(clientID));
            dispatch(fetchAssessmentMetrics(clientID));
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

    // ✅ Assessment Face Sheet Dashboard
    const AssessmentFaceSheetDashboard = () => {
        const data = useMockData ? mockAssessmentData : assessmentData;
        const milestones = useMockData ? mockAssessmentMilestones : [];
        const metrics = useMockData ? mockAssessmentMetrics : assessmentMetrics;

        if (assessmentLoading && !useMockData) {
            return (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            );
        }

        return (
            <Grid container spacing={3}>
                {/* Assessment Overview */}
                {/*<Grid item xs={12}>
                    <Card elevation={2}>
                        <CardContent>
                             <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h5" color="primary">
                                    Assessment & Care Plans - {data.assessmentNumber}
                                </Typography>
                                <Tooltip title="Refresh Data">
                                    <IconButton color="primary">
                                        <RefreshIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box> */}
                            
                            {/*<Grid container spacing={2}>
                                 <Grid item xs={12} sm={6} md={3}>
                                    <Box textAlign="center">
                                        <Typography variant="body2" color="textSecondary">Assessment Status</Typography>
                                        <Chip 
                                            label={data.assessmentStatus} 
                                            color={data.assessmentStatus === 'Complete' ? 'success' : 'warning'}
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
                </Grid>*/}

                {/* Key Assessment Metrics 
                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Assessment Metrics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Box textAlign="center" py={2}>
                                        <Typography variant="h4" color="primary">
                                            {data.daysInProgress}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Days in Progress
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Target: {data.targetDays} days
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box textAlign="center" py={2}>
                                        <Typography variant="h4" color="secondary">
                                            {data.complexityScore}/10
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
                                            {metrics.assessmentScore}/10
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Assessment Score
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>*/}

                {/* Assessment Information 
                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Assessment Information
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemText 
                                        primary="Primary Assessor"
                                        secondary={data.primaryAssessor}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Assessment Type"
                                        secondary={data.assessmentType}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Start Date"
                                        secondary={new Date(data.startDate).toLocaleDateString()}
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText 
                                        primary="Expected Completion"
                                        secondary={
                                            <Box>
                                                {new Date(data.expectedCompletionDate).toLocaleDateString()}
                                                <Chip 
                                                    label={`${getDaysRemaining(data.expectedCompletionDate)} days remaining`}
                                                    size="small"
                                                    color={getDaysRemaining(data.expectedCompletionDate) < 3 ? 'error' : 'info'}
                                                    sx={{ ml: 1 }}
                                                />
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>
                </Grid>*/}

                {/* Assessment Progress */}
                <Grid item xs={12}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Assessment Progress
                            </Typography>
                            
                            {metrics.overdueAssessments > 0 && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    <strong>{metrics.overdueAssessments}</strong> overdue assessment(s) require attention
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
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">
                                                            {milestone.description}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {milestone.completed 
                                                                ? `Completed: ${new Date(milestone.completedDate).toLocaleDateString()}`
                                                                : milestone.dueDate 
                                                                    ? `Due: ${new Date(milestone.dueDate).toLocaleDateString()}`
                                                                    : 'No due date set'
                                                            }
                                                        </Typography>
                                                    </Box>
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

                {/* Additional Metrics 
                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="success.main">
                                <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Strengths Identified
                            </Typography>
                            <Box textAlign="center" py={2}>
                                <Typography variant="h3" color="success.main">
                                    {metrics.strengthsIdentified}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Client Strengths
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card elevation={2}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom color="warning.main">
                                <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Risk Factors
                            </Typography>
                            <Box textAlign="center" py={2}>
                                <Typography variant="h3" color="warning.main">
                                    {metrics.riskFactors}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Identified Risks
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>*/}
            </Grid>
        );
    };

    // ✅ Get tab configurations
    const getTabConfigurations = () => {
        return [
            {
                label: "Bio-Social Assessment",
                icon: <PersonIcon />,
                component: <BioSocial clientID={clientID} />,
                completed: mockAssessmentMilestones[0]?.completed || false
            },
            {
                label: "Mental Health Assessment", 
                icon: <PsychologyIcon />,
                component: <MentalHealth clientID={clientID} />, // Replace with actual component
                completed: mockAssessmentMilestones[1]?.completed || false
            },
            {
                label: "Re-Assessment",
                icon: <AssessmentIcon />,
                component: <ReAssessment clientID={clientID} />,
                completed: mockAssessmentMilestones[2]?.completed || false
            },
            {
                label: "Section 3 Archive",
                icon: <ArchiveIcon />,
                component: <MentalArchive clientID={clientID} />,
                completed: mockAssessmentMilestones[3]?.completed || false
            }
        ];
    };

    const tabConfigs = getTabConfigurations();

    return (
        <Paper elevation={3} sx={{ maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ p: 3, pb: 0 }}>
                <Typography variant="h4" gutterBottom color="primary">
                    Assessment & Care Plans
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Comprehensive Client Assessment and Care Planning
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
                            <Badge badgeContent={mockAssessmentMetrics.overdueAssessments} color="error">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <DashboardIcon />
                                    Assessment Face Sheet
                                </Box>
                            </Badge>
                        }
                    />
                    {tabConfigs.map((tab, index) => (
                        <Tab 
                            key={index}
                            label={
                                <Badge 
                                    badgeContent={tab.completed ? null : "!"} 
                                    color="warning"
                                    variant={tab.completed ? undefined : "dot"}
                                >
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {tab.icon}
                                        {tab.label}
                                    </Box>
                                </Badge>
                            }
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ p: 3 }}>
                <TabPanel value={activeTab} index={0}>
                    <AssessmentFaceSheetDashboard />
                </TabPanel>

                {tabConfigs.map((tab, index) => (
                    <TabPanel key={index} value={activeTab} index={index + 1}>
                        {tab.component}
                    </TabPanel>
                ))}
            </Box>
        </Paper>
    );
};

export default AssessCarePlans;