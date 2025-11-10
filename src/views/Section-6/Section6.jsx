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
import { useClientPersistence } from '../../hooks/useClientPersistence';

// ✅ FIXED: Correct imports for Section 6
import {
    fetchFaceSheet,
    fetchCaseStatus,
    fetchCaseTimeline,
    fetchCaseMetrics,
    setActiveTab,
    clearErrors
} from "../../backend/store/slices/section6Slice";
import { section6List } from "../../data/arrayList";

// Import child components
import IDTNoteCM from './IDTNoteCM';
import PersonalInventory from './PersonalInventory';
import MiscDoc from './MiscDoc';

const Section6 = () => {
    const dispatch = useDispatch();
    const { clientID, client, hasClient, loading } = useClientPersistence();
    const { 
        faceSheet, 
        faceSheetLoading, 
        faceSheetError,
        caseStatus, 
        caseTimeline, 
        caseMetrics,
        activeTab,
        useMockData 
    } = useSelector((state) => state.section6);
    
    
    // ✅ Show loading state while client is loading
    if (loading) {
        return (
        <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading client data...</Typography>
        </Box>
        );
    }

    // ✅ Show message if no client selected
    if (!hasClient || !clientID) {
        return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
            Please select a client to view Section 6
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


    // ✅ FIXED: Proper data fetching on component mount
    useEffect(() => {
        if (clientID) {
            dispatch(fetchFaceSheet(clientID));
            dispatch(fetchCaseStatus(clientID));
            dispatch(fetchCaseTimeline(clientID));
            dispatch(fetchCaseMetrics(clientID));
        }
    }, [clientID, dispatch]);

    // ✅ FIXED: Error handling
    useEffect(() => {
        if (faceSheetError) {
            console.error('Section 6 Error:', faceSheetError);
        }
    }, [faceSheetError]);

    // ✅ FIXED: Proper tab change handling
    const handleTabChange = (event, newValue) => {
        dispatch(setActiveTab(newValue));
    };

    const TabPanel = ({ children, value, index }) => (
        <div hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );

    // Filter out Discharge from section6List
    const filteredSections = section6List.filter(section => section.section6Title !== "Discharge");

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
                    {filteredSections.map((section, index) => {
                        const getTabIcon = (title) => {
                            if (title.toLowerCase().includes('case manager') || title.toLowerCase().includes('idt')) {
                                return <AssignmentIcon />;
                            }
                            if (title.toLowerCase().includes('inventory')) {
                                return <InventoryIcon />;
                            }
                            if (title.toLowerCase().includes('documentation')) {
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
                {filteredSections.map((section, index) => (
                    <TabPanel key={index} value={activeTab} index={index}>
                        {section.section6Title === "Case Manager IDT Note" && (
                            <IDTNoteCM clientID={clientID} />
                        )}
                        {section.section6Title === "Personal Inventory" && (
                            <PersonalInventory clientID={clientID} />
                        )}
                        {section.section6Title === "Miscellaneous Documentation" && (
                            <MiscDoc clientID={clientID} />
                        )} 
                        {!["Case Manager IDT Note", "Personal Inventory", "Miscellaneous Documentation"].includes(section.section6Title) && (
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