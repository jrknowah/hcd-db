import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Description as DocIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  LocalHospital as HospitalIcon,
  Folder as FolderIcon
} from '@mui/icons-material';
import { pdfExportService } from '../../services/pdfExportService';
import { fetchClientFaceData } from '../../store/slices/clientFaceSlice';
import { fetchReferralData } from '../../store/slices/referralSlice';
import { fetchClientDischarge } from '../../store/slices/dischargeSlice';
import { fetchClientFiles } from '../../store/slices/filesSlice';

const ExportSection = () => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const currentClient = useSelector((state) => state?.clients?.selectedClient);
  const currentUser = useSelector((state) => state?.auth?.user);
  
  // Form data
  const clientFaceData = useSelector((state) => state?.clientFace?.formData);
  const clientFaceLoaded = useSelector((state) => state?.clientFace?.dataLoaded);
  
  const referralsData = useSelector((state) => state?.referrals?.referrals);
  const referralsLoaded = useSelector((state) => state?.referrals?.dataLoaded);
  
  const dischargeData = useSelector((state) => state?.discharge?.data);
  const dischargeLoaded = useSelector((state) => state?.discharge?.dataLoaded);
  
  const filesData = useSelector((state) => state?.files?.files);
  const filesLoaded = useSelector((state) => state?.files?.filesLoaded);

  // Local state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  // Export options
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeFaceSheet, setIncludeFaceSheet] = useState(true);
  const [includeReferrals, setIncludeReferrals] = useState(true);
  const [includeDischarge, setIncludeDischarge] = useState(true);

  // Data completeness tracking
  const [dataCompleteness, setDataCompleteness] = useState({
    client: false,
    faceSheet: false,
    referrals: false,
    discharge: false,
    files: false
  });

  // Load all data when client changes
  useEffect(() => {
    if (currentClient?.clientID) {
      if (!clientFaceLoaded) {
        dispatch(fetchClientFaceData(currentClient.clientID));
      }
      if (!referralsLoaded) {
        dispatch(fetchReferralData(currentClient.clientID));
      }
      if (!dischargeLoaded) {
        dispatch(fetchClientDischarge(currentClient.clientID));
      }
      if (!filesLoaded) {
        dispatch(fetchClientFiles(currentClient.clientID));
      }
    }
  }, [currentClient?.clientID, dispatch, clientFaceLoaded, referralsLoaded, dischargeLoaded, filesLoaded]);

  // Update data completeness
  useEffect(() => {
    setDataCompleteness({
      client: !!currentClient?.clientID,
      faceSheet: clientFaceLoaded && Object.keys(clientFaceData || {}).length > 0,
      referrals: referralsLoaded && Object.values(referralsData || {}).some(val => val),
      discharge: dischargeLoaded && Object.values(dischargeData || {}).some(val => val),
      files: filesLoaded && Array.isArray(filesData) && filesData.length > 0
    });
  }, [currentClient, clientFaceData, referralsData, dischargeData, filesData, clientFaceLoaded, referralsLoaded, dischargeLoaded, filesLoaded]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (exportSuccess) {
      const timer = setTimeout(() => setExportSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess]);

  const handleExport = async () => {
    if (!currentClient) {
      setExportError("Please select a client first.");
      return;
    }

    console.log('🚀 Starting export process...');
    console.log('👤 Current client:', currentClient);
    console.log('📋 Client face data:', clientFaceData);
    console.log('📝 Referrals data:', referralsData);
    console.log('🏥 Discharge data:', dischargeData);
    console.log('📁 Files data:', filesData);

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);
    setExportProgress(0);
    setExportStatus('Preparing export...');

    try {
      // Prepare data for export
      const exportData = {
        client: currentClient,
        clientFace: includeFaceSheet ? clientFaceData : null,
        referrals: includeReferrals ? referralsData : null,
        discharge: includeDischarge ? dischargeData : null,
        files: includeFiles ? filesData : []
      };

      console.log('📦 Export data prepared:', exportData);

      // Export with progress tracking
      const result = await pdfExportService.exportWithProgress(
        exportData,
        (progress, status) => {
          console.log(`📊 Progress: ${progress}% - ${status}`);
          setExportProgress(progress);
          setExportStatus(status);
        }
      );

      console.log('✅ Export completed:', result);
      setExportSuccess(true);
      setExportStatus('Export completed successfully!');

      // Log export action
      if (currentUser) {
        console.log('📝 Logging export action for user:', currentUser.id);
      }

    } catch (error) {
      console.error('❌ Export failed:', error);
      setExportError(`Export failed: ${error.message}`);
      setExportStatus('Export failed');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
      }, 2000);
    }
  };

  const getDataStatusIcon = (hasData) => {
    return hasData ? <CheckIcon color="success" /> : <ErrorIcon color="error" />;
  };

  const getCompletionPercentage = () => {
    const total = Object.keys(dataCompleteness).length;
    const completed = Object.values(dataCompleteness).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  // Simple fallback export function - add this to your ExportSection component

const handleSimpleExport = async () => {
if (!currentClient) {
    setExportError("Please select a client first.");
    return;
}

console.log('🚀 Starting simple export...');

setIsExporting(true);
setExportError(null);
setExportProgress(0);

try {
    // Create simple HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Client Chart - ${currentClient.clientFirstName} ${currentClient.clientLastName}</title>
        <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            color: #333; 
            line-height: 1.6; 
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #2196F3; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .header h1 { color: #2196F3; margin: 0; }
        .section { margin-bottom: 30px; }
        .section-title { 
            color: #2196F3; 
            border-bottom: 1px solid #ddd; 
            padding-bottom: 5px; 
            margin-bottom: 15px; 
        }
        .field { margin-bottom: 10px; }
        .field strong { color: #555; }
        </style>
    </head>
    <body>
        <div class="header">
        <h1>CLIENT CHART</h1>
        <h2>${currentClient.clientFirstName} ${currentClient.clientLastName}</h2>
        <p>Client ID: ${currentClient.clientID} | Generated: ${new Date().toLocaleDateString()}</p>
        </div>

        ${clientFaceData && includeFaceSheet ? `
        <div class="section">
        <h2 class="section-title">Contact Information</h2>
        <div class="field"><strong>Primary Phone:</strong> ${clientFaceData.clientContactNum || 'Not provided'}</div>
        <div class="field"><strong>Email:</strong> ${clientFaceData.clientEmail || 'Not provided'}</div>
        <div class="field"><strong>Emergency Contact:</strong> ${clientFaceData.clientEmgContactName || 'Not provided'}</div>
        <div class="field"><strong>Emergency Phone:</strong> ${clientFaceData.clientEmgContactNum || 'Not provided'}</div>
        <div class="field"><strong>Insurance Type:</strong> ${clientFaceData.clientMedInsType || 'Not provided'}</div>
        <div class="field"><strong>Allergies:</strong> ${clientFaceData.clientAllergyComments || 'None noted'}</div>
        </div>
        ` : ''}

        ${referralsData && includeReferrals ? `
        <div class="section">
        <h2 class="section-title">Referrals</h2>
        ${referralsData.lahsaReferral ? `<div class="field"><strong>LAHSA:</strong> ${referralsData.lahsaReferral}</div>` : ''}
        ${referralsData.odrReferral ? `<div class="field"><strong>ODR:</strong> ${referralsData.odrReferral}</div>` : ''}
        ${referralsData.dhsReferral ? `<div class="field"><strong>DHS:</strong> ${referralsData.dhsReferral}</div>` : ''}
        </div>
        ` : ''}

        ${dischargeData && includeDischarge ? `
        <div class="section">
        <h2 class="section-title">Discharge Summary</h2>
        <div class="field"><strong>Discharge Date:</strong> ${dischargeData.clientDischargeDate || 'Not set'}</div>
        <div class="field"><strong>Primary Diagnosis:</strong> ${dischargeData.clientDischargeDiag || 'Not provided'}</div>
        ${dischargeData.clientDischargI ? `<div class="field"><strong>Assessment:</strong> ${dischargeData.clientDischargI}</div>` : ''}
        </div>
        ` : ''}

        ${filesData && includeFiles && filesData.length > 0 ? `
        <div class="section">
        <h2 class="section-title">Uploaded Documents</h2>
        ${filesData.map(file => `
            <div class="field">• ${file.fileName} (${file.docType}) - ${new Date(file.uploadDate).toLocaleDateString()}</div>
        `).join('')}
        </div>
        ` : ''}

        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        Generated on ${new Date().toLocaleString()}
        </div>
    </body>
    </html>
    `;

    setExportProgress(30);

    // Create temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.cssText = 'position: absolute; left: -9999px; top: 0; background: white;';
    document.body.appendChild(tempDiv);

    setExportProgress(60);

    // Generate PDF with basic options
    const options = {
    margin: 0.5,
    filename: `${currentClient.clientLastName}_${currentClient.clientFirstName}_Chart.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    setExportProgress(90);

    await html2pdf().set(options).from(tempDiv).save();

    setExportProgress(100);
    setExportSuccess(true);

    // Cleanup
    document.body.removeChild(tempDiv);

} catch (error) {
    console.error('❌ Simple export failed:', error);
    setExportError(`Export failed: ${error.message}`);
} finally {
    setTimeout(() => {
    setIsExporting(false);
    setExportProgress(0);
    }, 1000);
}
};

// Add this button to your ExportSection component alongside the main export button:
<Button
variant="outlined"
size="large"
fullWidth
startIcon={<PdfIcon />}
onClick={handleSimpleExport}
disabled={isExporting || !dataCompleteness.client}
sx={{ mt: 1 }}
>
{isExporting ? `Exporting... ${exportProgress}%` : 'Simple Export (Fallback)'}
</Button>

  // No client selected
  if (!currentClient) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Please select a client to export their chart.
        </Alert>
      </Box>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Export Complete Client Chart
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Export a comprehensive PDF containing all client information for{' '}
        <strong>{currentClient.clientFirstName} {currentClient.clientLastName}</strong>
      </Typography>

      {/* Success Alert */}
      {exportSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          📄 PDF exported successfully! Check your downloads folder.
        </Alert>
      )}

      {/* Error Alert */}
      {exportError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {/* Export Progress */}
      {isExporting && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">{exportStatus}</Typography>
              <Typography variant="body2">{exportProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={exportProgress} />
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Data Completeness Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📊 Data Completeness
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">Overall Completion</Typography>
                  <Typography variant="body2">{completionPercentage}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={completionPercentage} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color={completionPercentage >= 80 ? 'success' : completionPercentage >= 50 ? 'warning' : 'error'}
                />
              </Box>

              <List dense>
                <ListItem>
                  <ListItemIcon>{getDataStatusIcon(dataCompleteness.client)}</ListItemIcon>
                  <ListItemText primary="Client Information" />
                  <Chip 
                    label={dataCompleteness.client ? "Complete" : "Missing"} 
                    size="small" 
                    color={dataCompleteness.client ? "success" : "error"}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>{getDataStatusIcon(dataCompleteness.faceSheet)}</ListItemIcon>
                  <ListItemText primary="Face Sheet" />
                  <Chip 
                    label={dataCompleteness.faceSheet ? "Complete" : "Empty"} 
                    size="small" 
                    color={dataCompleteness.faceSheet ? "success" : "warning"}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>{getDataStatusIcon(dataCompleteness.referrals)}</ListItemIcon>
                  <ListItemText primary="Referrals" />
                  <Chip 
                    label={dataCompleteness.referrals ? "Complete" : "Empty"} 
                    size="small" 
                    color={dataCompleteness.referrals ? "success" : "warning"}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>{getDataStatusIcon(dataCompleteness.discharge)}</ListItemIcon>
                  <ListItemText primary="Discharge Summary" />
                  <Chip 
                    label={dataCompleteness.discharge ? "Complete" : "Empty"} 
                    size="small" 
                    color={dataCompleteness.discharge ? "success" : "warning"}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>{getDataStatusIcon(dataCompleteness.files)}</ListItemIcon>
                  <ListItemText primary={`Documents (${filesData?.length || 0} files)`} />
                  <Chip 
                    label={dataCompleteness.files ? `${filesData.length} files` : "No files"} 
                    size="small" 
                    color={dataCompleteness.files ? "success" : "warning"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Export Options Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Export Options
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose which sections to include in the PDF:
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox 
                    checked={includeFaceSheet} 
                    onChange={(e) => setIncludeFaceSheet(e.target.checked)}
                    disabled={!dataCompleteness.faceSheet}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    Face Sheet
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox 
                    checked={includeReferrals} 
                    onChange={(e) => setIncludeReferrals(e.target.checked)}
                    disabled={!dataCompleteness.referrals}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentIcon fontSize="small" />
                    Referrals
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox 
                    checked={includeDischarge} 
                    onChange={(e) => setIncludeDischarge(e.target.checked)}
                    disabled={!dataCompleteness.discharge}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HospitalIcon fontSize="small" />
                    Discharge Summary
                  </Box>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox 
                    checked={includeFiles} 
                    onChange={(e) => setIncludeFiles(e.target.checked)}
                    disabled={!dataCompleteness.files}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon fontSize="small" />
                    Document List ({filesData?.length || 0} files)
                  </Box>
                }
              />

              <Divider sx={{ my: 2 }} />

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<PdfIcon />}
                onClick={handleExport}
                disabled={isExporting || !dataCompleteness.client}
                sx={{ mt: 2 }}
              >
                {isExporting ? `Exporting... ${exportProgress}%` : 'Export Complete Chart to PDF'}
              </Button>

              {!dataCompleteness.client && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Client information is required for export
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Preview */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Export Preview
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The PDF will include the following sections:
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon><PersonIcon color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Client Header" 
                secondary={`${currentClient.clientFirstName} ${currentClient.clientLastName} - ID: ${currentClient.clientID}`}
              />
            </ListItem>
            
            {includeFaceSheet && dataCompleteness.faceSheet && (
              <ListItem>
                <ListItemIcon><DocIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Face Sheet" 
                  secondary="Contact info, emergency contacts, medical insurance, allergies"
                />
              </ListItem>
            )}
            
            {includeFiles && dataCompleteness.files && (
              <ListItem>
                <ListItemIcon><FolderIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Document List" 
                  secondary={`${filesData?.length || 0} uploaded documents organized by type`}
                />
              </ListItem>
            )}
            
            {includeReferrals && dataCompleteness.referrals && (
              <ListItem>
                <ListItemIcon><AssignmentIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Referrals" 
                  secondary="LAHSA, ODR, and DHS referral information"
                />
              </ListItem>
            )}
            
            {includeDischarge && dataCompleteness.discharge && (
              <ListItem>
                <ListItemIcon><HospitalIcon color="primary" /></ListItemIcon>
                <ListItemText 
                  primary="Discharge Summary" 
                  secondary="Complete discharge planning and instructions"
                />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExportSection;