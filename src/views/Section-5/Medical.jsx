import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import ClientInfoBanner from '../../components/shared/ClientInfoBanner';
import {
  Card,
  CardContent,
  Tabs,
  Tab,
  Box,
  Typography,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  ListItemText,
  Paper,
  CircularProgress,
  Button
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Person as PersonIcon,
  LocalHospital as MedicalIcon,
  Assignment as FaceSheetIcon,
  HealthAndSafety as ScreeningIcon,
  PersonalInjury as AssessmentIcon,
  Notes as NotesIcon,
  Groups as IDTIcon,
  Archive as ArchiveIcon,
  Timeline as TimelineIcon,
  Medication as MedicationIcon,
  Refresh as RefreshIcon,
  // ExitToApp as DischargeIcon
} from '@mui/icons-material';
import { getApiAuthHeaders } from "../../utils/apiAuth";
import { httpError } from "../../utils/section5Lock";
import { azureBlobService } from "../../backend/services/azureBlobService";
import { ARCHIVE_SECTIONS, SECTION_CATEGORIES, filterSectionFiles } from "../../utils/archiveSections";
import MedFaceSheet from "./MedFaceSheet";
import MedScreening from "./MedScreening";
import NursingAdmission from "./NursingAdmission";
import ProgressNote from "./ProgressNote";
import IDTNoteNursing from './IDTNoteNursing';
import IDTNoteProvider from './IDTNoteProvider';
import NursingArchive from './NursingArchive';
import MedicalObservationRecord from './MedicalObservationRecord';
// ✅ ADDED: Discharge component from Section 1
// import Discharge from '../Section-1/Discharge';

// 🔁 Section-switch fix: import each slice's setCurrentClient (aliased) so we
// can wipe ALL Section-5 Redux state the instant the selected client changes.
// This prevents the previous client's medical data from lingering in any tab
// while that tab's own fetch is still in flight.
import { setCurrentClient as setIdtNursingClient } from "../../backend/store/slices/idtNursingSlice";
import { setCurrentClient as setIdtProviderClient } from "../../backend/store/slices/idtProviderSlice";
import { setCurrentClient as setMedFaceSheetClient } from "../../backend/store/slices/medFaceSheetSlice";
import { setCurrentClient as setMedObservationClient } from "../../backend/store/slices/medObservationSlice";
import { setCurrentClient as setMedScreeningClient } from "../../backend/store/slices/medScreeningSlice";
import { setCurrentClient as setNursingAdmissionClient } from "../../backend/store/slices/nursingAdmissionSlice";
import { setCurrentClient as setProgressNoteClient } from "../../backend/store/slices/progressNoteSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Main tab rows: summary key from /api/section5/summary -> tab index to open
const MAIN_TAB_ITEMS = [
  { key: 'faceSheet', label: 'Medical Face Sheet', tab: 1 },
  { key: 'nursingScreening', label: 'Nursing Screening', tab: 2 },
  { key: 'nursingAssessment', label: 'Nursing Assessment', tab: 3 },
  { key: 'progressNotes', label: 'Progress Notes', tab: 4 },
  { key: 'observationRecord', label: 'Medical Observation Record', tab: 5 },
  { key: 'nursingIdt', label: 'Nursing IDT Notes', tab: 6 },
  { key: 'providerIdt', label: 'Provider IDT Notes', tab: 7 },
  { key: 'nursingArchive', label: 'Nursing Archive', tab: 8, files: true },
];

const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const Medical = () => {
  // ✅ ALIGNED: Match Identification.jsx pattern exactly
  const { clientID, client, hasClient, user, shouldUseMockData, isDevelopment } = useClientPersistence();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState({ clientID: null, sections: {}, loading: false, error: null });

  // 🔁 Section-switch fix: whenever the selected client changes, wipe every
  // Section-5 slice immediately. Each child tab (MedFaceSheet, MedScreening,
  // NursingAdmission, ProgressNote, IDT notes, MedicalObservationRecord) runs
  // its OWN fetch effect; without this reset the prior client's data stays on
  // screen until each of those fetches resolves. Child effects run before this
  // parent effect, so the wipe lands just after the new fetches start (in the
  // pending phase) and is then replaced by the fulfilled payloads.
  // NOTE: NursingArchive.jsx does not use Redux (azureBlobService + local state
  // via useClientPersistence); it resets its own local state on clientID change.
  useEffect(() => {
    if (!clientID) return;
    dispatch(setIdtNursingClient(clientID));
    dispatch(setIdtProviderClient(clientID));
    dispatch(setMedFaceSheetClient(clientID));
    dispatch(setMedObservationClient(clientID));
    dispatch(setMedScreeningClient(clientID));
    dispatch(setNursingAdmissionClient(clientID));
    dispatch(setProgressNoteClient(clientID));
  }, [clientID, dispatch]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Main tab: which tabs have data and when/by whom they were last changed.
  // Refetched every time the Main tab is shown so edits made on other tabs show up.
  const loadSummary = useCallback(async (signal) => {
    if (!clientID || shouldUseMockData) return;
    setSummary(prev => ({ ...prev, clientID, loading: true, error: null }));

    const loadRecords = async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/section5/summary/${encodeURIComponent(clientID)}`,
        { headers: await getApiAuthHeaders(), signal }
      );
      if (!response.ok) throw await httpError(response);
      const body = await response.json();
      return body.sections || [];
    };

    // Archive uploads live in blob storage, not the database: list them the same
    // way the Nursing Archive tab does so the counts match. Uploads don't record
    // who uploaded them, so there is no "by" for this row.
    const loadArchive = async () => {
      const files = filterSectionFiles(
        await azureBlobService.listClientFiles(clientID, 'nursing_archive'),
        ARCHIVE_SECTIONS.NURSING,
        SECTION_CATEGORIES[ARCHIVE_SECTIONS.NURSING]
      );
      const latest = files
        .map(f => f.uploadDate)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0];
      return {
        key: 'nursingArchive',
        hasData: files.length > 0,
        total: files.length,
        lastUpdatedAt: latest || null,
        lastUpdatedBy: null,
        error: false,
      };
    };

    const [records, archive] = await Promise.allSettled([loadRecords(), loadArchive()]);
    if (signal?.aborted) return;

    const sections = {};
    if (records.status === 'fulfilled') {
      records.value.forEach(sec => { sections[sec.key] = sec; });
    }
    sections.nursingArchive = archive.status === 'fulfilled'
      ? archive.value
      : { key: 'nursingArchive', hasData: false, total: 0, error: true };

    setSummary({
      clientID,
      sections,
      loading: false,
      error: records.status === 'rejected' ? (records.reason?.message || 'Failed to load summary') : null,
    });
  }, [clientID, shouldUseMockData]);

  useEffect(() => {
    if (activeTab !== 0) return undefined;
    const controller = new AbortController();
    loadSummary(controller.signal);
    return () => controller.abort();
  }, [activeTab, loadSummary]);

  // Never show the previous client's summary while the new one loads
  const summarySections = summary.clientID === clientID ? summary.sections : {};
  const withData = MAIN_TAB_ITEMS.filter(item => summarySections[item.key]?.hasData).length;
  const summaryLoaded = MAIN_TAB_ITEMS.some(item => summarySections[item.key]);

  // ✅ ALIGNED: Same client check pattern as Identification.jsx
  if (!hasClient && !shouldUseMockData) {
    return (
      <Card sx={{ padding: 2 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {isDevelopment 
            ? "Development Mode: No Client Selected" 
            : "Please select a client to view medical information."}
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* ✅ ALIGNED: Development indicator like Identification.jsx */}
      {shouldUseMockData && client && (
        <Alert severity="info" sx={{ mb: 2 }}>
          🔧 Development Mode: Using mock medical data for {client.clientFirstName} {client.clientLastName}
        </Alert>
      )}

      {/* Medical Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MedicalIcon color="primary" fontSize="large" />
              <Typography variant="h5" component="h1">
                Medical Dashboard
              </Typography>
            </Box>
            <Chip
              icon={<PersonIcon />}
              label={
                client
                  ? `${client.clientFirstName} ${client.clientLastName} (${client.clientID})`
                  : "No Client Selected"
              }
              color={client ? "primary" : "default"}
              variant={client ? "filled" : "outlined"}
              size="medium"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Main Content Card */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* ✅ UPDATED: Added Discharge tab - now 10 tabs total */}
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<TimelineIcon />} label="Main" iconPosition="start" />
            <Tab icon={<FaceSheetIcon />} label="Face Sheet" iconPosition="start" />
            <Tab icon={<ScreeningIcon />} label="Nursing Screening" iconPosition="start" />
            <Tab icon={<AssessmentIcon />} label="Nursing Assessment" iconPosition="start" />
            <Tab icon={<NotesIcon />} label="Progress Notes" iconPosition="start" />
            <Tab icon={<MedicationIcon />} label="Observation Record" iconPosition="start" />
            <Tab icon={<IDTIcon />} label="Nursing IDT" iconPosition="start" />
            <Tab icon={<IDTIcon />} label="Provider IDT" iconPosition="start" />
            {/* <Tab icon={<DischargeIcon />} label="Discharge" iconPosition="start" /> */}
            <Tab icon={<ArchiveIcon />} label="Nursing Archive" iconPosition="start" />
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 3 }}>
            <ClientInfoBanner sx={{ mb: 3 }} exportSection={5} />
            {/* Main Tab: status of every other tab */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
                    <TimelineIcon color="primary" />
                    Medical Records Overview
                  </Typography>
                  {!shouldUseMockData && (
                    <Button
                      size="small"
                      startIcon={summary.loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                      onClick={() => loadSummary()}
                      disabled={summary.loading}
                    >
                      Refresh
                    </Button>
                  )}
                </Box>

                {shouldUseMockData && (
                  <Alert severity="info" sx={{ mt: 2 }}>Record status isn&apos;t available with mock data.</Alert>
                )}
                {summary.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>Could not load record status: {summary.error}</Alert>
                )}

                <Paper sx={{ p: 1, mt: 2 }}>
                  <List>
                    {MAIN_TAB_ITEMS.map((item) => {
                      const sec = summarySections[item.key];
                      const hasData = !!sec?.hasData;
                      const lastAt = formatDateTime(sec?.lastUpdatedAt);
                      return (
                        <ListItem key={item.key} disablePadding>
                          <ListItemButton onClick={() => setActiveTab(item.tab)}>
                            <ListItemIcon>
                              {hasData ? <CheckCircleIcon color="success" /> : <UncheckedIcon color="disabled" />}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="subtitle1"
                                  sx={{ fontWeight: 'medium', color: hasData ? 'success.main' : 'text.secondary' }}
                                >
                                  {item.label}
                                </Typography>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                  {!sec ? (
                                    <Chip
                                      label={summary.loading ? 'Loading…' : 'Unknown'}
                                      variant="outlined"
                                      size="small"
                                    />
                                  ) : sec.error ? (
                                    <Chip label="Unavailable" color="warning" variant="outlined" size="small" />
                                  ) : hasData ? (
                                    <Chip
                                      label={item.files
                                        ? `${sec.total} file${sec.total === 1 ? '' : 's'} uploaded`
                                        : `Data entered${sec.total > 1 ? ` (${sec.total} records)` : ''}`}
                                      color="success"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip label={item.files ? 'No files uploaded' : 'No data entered'} variant="outlined" size="small" />
                                  )}
                                  {hasData && lastAt && (
                                    <Typography variant="body2" color="text.secondary" component="span">
                                      {item.files ? 'Last uploaded' : 'Last entered'} {lastAt}
                                      {sec.lastUpdatedBy ? ` by ${sec.lastUpdatedBy}` : ''}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>

                {/* Summary counts */}
                {summaryLoaded && (
                  <Grid container spacing={2} sx={{ mt: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                        <Typography variant="h4" color="success.contrastText">{withData}</Typography>
                        <Typography variant="body2" color="success.contrastText">Tabs With Data</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                        <Typography variant="h4" color="warning.contrastText">{MAIN_TAB_ITEMS.length - withData}</Typography>
                        <Typography variant="body2" color="warning.contrastText">Tabs Without Data</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}

            {/* Face Sheet Tab */}
            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaceSheetIcon color="primary" />
                  Medical Face Sheet
                </Typography>
                <MedFaceSheet clientID={clientID} />
              </Box>
            )}

            {/* Nursing Screening Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScreeningIcon color="primary" />
                  Nursing Screening
                </Typography>
                <MedScreening clientID={clientID}  />
              </Box>
            )}

            {/* Nursing Assessment Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon color="primary" />
                  Nursing Assessment
                </Typography>
                <NursingAdmission clientID={clientID}  />
              </Box>
            )}

            {/* Progress Notes Tab */}
            {activeTab === 4 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotesIcon color="primary" />
                  Progress Notes
                </Typography>
                <ProgressNote clientID={clientID} />
              </Box>
            )}

            {/* Medical Observation Record Tab */}
            {activeTab === 5 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MedicationIcon color="primary" />
                  Medical Observation Record
                </Typography>
                <MedicalObservationRecord clientID={clientID} />
              </Box>
            )}

            {/* Nursing IDT Tab */}
            {activeTab === 6 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IDTIcon color="primary" />
                  Nursing IDT Notes
                </Typography>
                <IDTNoteNursing clientID={clientID}  />
              </Box>
            )}

            {/* Provider IDT Tab */}
            {activeTab === 7 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IDTIcon color="primary" />
                  Provider IDT Notes
                </Typography>
                <IDTNoteProvider clientID={clientID}  /> 
              </Box>
            )}

            {/* ✅ NEW: Discharge Tab 
            {activeTab === 8 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DischargeIcon color="primary" />
                  Client Discharge Summary
                </Typography>
                <Discharge />
              </Box>
            )}
*/}
            {/* Nursing Archive Tab */}
            {activeTab === 8 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArchiveIcon color="primary" />
                  Nursing Archive
                </Typography>
                <NursingArchive clientID={clientID}  />
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Medical;