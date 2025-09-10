const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config({ path: '../.env' });
// ✅ FIXED: Better database connection handling
let dbConnected = false;
let dbModule = null;

try {
  dbModule = require("./azureSql.js");
  dbModule.getPool()
    .then(() => {
      console.log('✅ Database connected successfully');
      dbConnected = true;
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
      dbConnected = false;
    });
} catch (err) {
  console.log('⚠️  Database module not found, using mock data:', err.message);
  dbConnected = false;
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 
    'http://localhost:5173',
    'https://zealous-river-09541d21e.1.azurestaticapps.net' 
  ],
  credentials: true
}));
app.use(express.json());

// ============================================================================
// Azure Authentication Endpoints
// ============================================================================

// Azure login endpoint
app.post('/api/auth/azure-login', (req, res) => {
  console.log('🔐 Azure login request received');
  console.log('📤 User data:', req.body.user?.name || 'Unknown user');
  console.log('📤 Token present:', req.body.token ? 'Yes' : 'No');
  console.log('📤 User roles:', req.body.user?.roles || []);
  
  // Validate the request
  if (!req.body.user || !req.body.token) {
    return res.status(400).json({
      success: false,
      error: 'Missing user data or token'
    });
  }
  
  // For now, just return success with the user data
  // In the future, you could add database operations here
  res.json({
    success: true,
    message: 'Azure authentication validated successfully',
    user: {
      ...req.body.user,
      // You could add additional server-side data here
      lastLogin: new Date().toISOString(),
      serverValidated: true
    }
  });
});

// Azure logout endpoint
app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 Azure logout request received');
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Token validation endpoint (optional - for future use)
app.get('/api/auth/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      valid: false,
      error: 'No valid token provided'
    });
  }
  
  // For now, just return valid (in production, you'd validate the actual token)
  res.json({
    valid: true,
    message: 'Token is valid'
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📤 Request body:', req.body);
  }
  next();
});

// ✅ NEW: Track which routers are loaded
let clientsRouterLoaded = false;
let clientFaceRouterLoaded = false;
let referralsRouterLoaded = false;
let dischargeRouterLoaded = false;
let filesRouterLoaded = false;
// ✅ NEW: Section 4 router tracking
let carePlansRouterLoaded = false;
let encounterNotesRouterLoaded = false;
let bioSocialRouterLoaded = false;
let mentalHealthRouterLoaded = false;
let reassessmentRouterLoaded = false;
let mentalArchiveRouterLoaded = false;

// ✅ NEW: Try to load your actual routes first
try {
  const clientsRouter = require('../routes/clients.js');
  app.use('/api/clients', clientsRouter);
  console.log('✅ Real clients router loaded from ../routes/clients.js');
  clientsRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/clients.js:', err.message);
}

try {
  const clientFaceRouter = require('../routes/clientFace.js');
  app.use('/api', clientFaceRouter);
  console.log('✅ ClientFace router loaded from ../routes/clientFace.js');
  clientFaceRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/clientFace.js:', err.message);
}

try {
  const referralsRouter = require('../routes/referrals.js');
  app.use('/api', referralsRouter);
  console.log('✅ Referrals router loaded from ../routes/referrals.js');
  referralsRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/referrals.js:', err.message);
}

try {
  const dischargeRouter = require('../routes/discharge.js');
  app.use('/api', dischargeRouter);
  console.log('✅ Discharge router loaded from ../routes/discharge.js');
  dischargeRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/discharge.js:', err.message);
}

// ✅ NEW: Try to load files router for Azure Blob Storage
try {
  const filesRouter = require('../routes/files.js');
  app.use('/api', filesRouter);
  console.log('✅ Files router loaded from ../routes/files.js');
  filesRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/files.js:', err.message);
}
//Section 3: Client Assessment===========================================================

// Add these to your server.js after line 50
try {
  const bioSocialRouter = require('../routes/bioSocial.js');
  app.use('/api', bioSocialRouter);
  console.log('✅ Bio-Social router loaded');
  bioSocialRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load bioSocial.js:', err.message);
}

try {
  const mentalHealthRouter = require('../routes/mentalHealth.js');
  app.use('/api', mentalHealthRouter);
  console.log('✅ Mental Health router loaded');
  mentalHealthRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load mentalHealth.js:', err.message);
}

try {
  const reassessmentRouter = require('../routes/reassessment.js');
  app.use('/api', reassessmentRouter);
  console.log('✅ Reassessment router loaded');
  reassessmentRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load reassessment.js:', err.message);
}
// ===== MENTAL ARCHIVE ROUTES =====
try {
  const mentalArchiveRouter = require('../routes/MentalArchive.js');
  app.use('/api', mentalArchiveRouter);
  console.log('✅ Mental Archive router loaded from ../routes/MentalArchive.js');
  mentalArchiveRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/MentalArchive.js:', err.message);
}

// ✅ NEW: Section 4 Routes - CarePlans
try {
  const carePlansRouter = require('../routes/carePlan.js');
  app.use('/api/care-plans', carePlansRouter);
  console.log('✅ CarePlans router loaded from ../routes/carePlans.js');
  carePlansRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/carePlans.js:', err.message);
}

// ✅ NEW: Section 4 Routes - EncounterNotes
try {
  const encounterNotesRouter = require('../routes/encounterNote.js');
  app.use('/api/encounter-notes', encounterNotesRouter);
  console.log('✅ EncounterNotes router loaded from ../routes/encounterNotes.js');
  encounterNotesRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/encounterNotes.js:', err.message);
}

// ✅ NEW: Create mock files router if real one doesn't load
// if (!filesRouterLoaded) {
//   console.log('🔄 Creating fallback mock files router...');
  
//   const createMockFilesRouter = () => {
//     const router = express.Router();
    
//     // Mock files data
//     let mockFiles = [
//       {
//         id: 1,
//         clientID: '123456789',
//         fileName: 'mock_id_card.pdf',
//         blobUrl: '/mock/path/id_card.pdf',
//         docType: 'Identification Card',
//         uploadDate: new Date().toISOString(),
//         fileSize: 1024000,
//         contentType: 'application/pdf'
//       }
//     ];

//     // GET /api/files/:clientID - Get all files for a client
//     router.get('/files/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       console.log('📁 Getting files for client (MOCK):', clientID);
      
//       const clientFiles = mockFiles.filter(file => file.clientID === clientID);
//       res.json(clientFiles);
//     });

//     // POST /api/upload - Upload file (mock)
//     router.post('/upload', (req, res) => {
//       console.log('📤 Mock file upload:', req.body);
      
//       const { clientID, docType, fileName } = req.body;
      
//       const newFile = {
//         id: Date.now(),
//         clientID: clientID,
//         fileName: fileName || 'mock_upload.pdf',
//         blobUrl: `/mock/uploads/${fileName || 'mock_upload.pdf'}`,
//         docType: docType || 'Other',
//         uploadDate: new Date().toISOString(),
//         fileSize: 1024000,
//         contentType: 'application/pdf'
//       };
      
//       mockFiles.push(newFile);
      
//       // Simulate upload delay
//       setTimeout(() => {
//         res.json({
//           success: true,
//           ...newFile,
//           message: 'File uploaded successfully (Mock)'
//         });
//       }, 1000);
//     });

//     // DELETE /api/files/:fileId - Delete file
//     router.delete('/files/:fileId', (req, res) => {
//       const { fileId } = req.params;
//       console.log('🗑️ Deleting file (MOCK):', fileId);
      
//       const fileIndex = mockFiles.findIndex(file => file.id == fileId);
//       if (fileIndex === -1) {
//         return res.status(404).json({ error: 'File not found' });
//       }
      
//       const deletedFile = mockFiles.splice(fileIndex, 1)[0];
//       res.json({
//         success: true,
//         message: 'File deleted successfully (Mock)',
//         fileName: deletedFile.fileName
//       });
//     });

//     // GET /api/files/:fileId/download - Get download URL
//     router.get('/files/:fileId/download', (req, res) => {
//       const { fileId } = req.params;
//       console.log('📥 Getting download URL (MOCK):', fileId);
      
//       const file = mockFiles.find(file => file.id == fileId);
//       if (!file) {
//         return res.status(404).json({ error: 'File not found' });
//       }
      
//       res.json({
//         downloadUrl: file.blobUrl,
//         fileName: file.fileName,
//         contentType: file.contentType
//       });
//     });

//     return router;
//   };

//   app.use('/api', createMockFilesRouter());
// }

// // ✅ NEW: Create mock Section 4 routers if real ones don't load
// if (!carePlansRouterLoaded) {
//   console.log('🔄 Creating fallback mock care plans router...');
  
//   const createMockCarePlansRouter = () => {
//     const router = express.Router();
    
//     let mockCarePlans = [
//       {
//         _id: 'CP-test-client-001-001',
//         clientID: 'test-client-001',
//         careGoal: 'Obtain stable permanent housing',
//         careSteps: '1. Complete housing application\n2. Gather required documentation\n3. Attend housing interviews\n4. Follow up with housing coordinators',
//         careClientAct: 'Attend all scheduled appointments, provide necessary documentation, maintain contact with case manager',
//         careCmAct: 'Assist with application process, provide transportation vouchers, coordinate with housing providers',
//         careOutcome: 'Client successfully housed in permanent supportive housing within 90 days',
//         status: 'In Progress',
//         priority: 'High',
//         targetDate: '2024-06-01',
//         createdBy: 'test@example.com',
//         createdAt: '2024-03-01T10:00:00Z',
//         updatedAt: '2024-03-10T14:30:00Z'
//       }
//     ];

//     router.get('/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       console.log('📋 Getting care plans (MOCK):', clientID);
//       const clientPlans = mockCarePlans.filter(plan => plan.clientID === clientID);
//       res.json(clientPlans);
//     });

//     router.post('/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       const planData = req.body;
//       console.log('📝 Creating care plan (MOCK):', clientID);
      
//       const newPlan = {
//         _id: `CP-${clientID}-${Date.now()}`,
//         clientID,
//         ...planData,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString()
//       };
      
//       mockCarePlans.push(newPlan);
//       res.status(201).json(newPlan);
//     });

//     router.put('/:carePlanID', (req, res) => {
//       const { carePlanID } = req.params;
//       const updateData = req.body;
//       console.log('📝 Updating care plan (MOCK):', carePlanID);
      
//       const planIndex = mockCarePlans.findIndex(plan => plan._id === carePlanID);
//       if (planIndex === -1) {
//         return res.status(404).json({ error: 'Care plan not found' });
//       }
      
//       mockCarePlans[planIndex] = {
//         ...mockCarePlans[planIndex],
//         ...updateData,
//         updatedAt: new Date().toISOString()
//       };
      
//       res.json(mockCarePlans[planIndex]);
//     });

//     router.delete('/:carePlanID', (req, res) => {
//       const { carePlanID } = req.params;
//       console.log('🗑️ Deleting care plan (MOCK):', carePlanID);
      
//       const planIndex = mockCarePlans.findIndex(plan => plan._id === carePlanID);
//       if (planIndex === -1) {
//         return res.status(404).json({ error: 'Care plan not found' });
//       }
      
//       mockCarePlans.splice(planIndex, 1);
//       res.json({ message: 'Care plan deleted successfully' });
//     });

//     return router;
//   };

//   app.use('/api/care-plans', createMockCarePlansRouter());
// }

// if (!encounterNotesRouterLoaded) {
//   console.log('🔄 Creating fallback mock encounter notes router...');
  
//   const createMockEncounterNotesRouter = () => {
//     const router = express.Router();
    
//     let mockEncounterNotes = [
//       {
//         _id: 'EN-test-client-001-001',
//         clientID: 'test-client-001',
//         careNoteDate: '2024-03-10',
//         careNoteType: 'Individual',
//         careNoteSite: '41st',
//         careNote: 'Client attended weekly session. Reports improved mood and medication compliance.',
//         createdBy: 'test@example.com',
//         createdAt: '2024-03-10T10:00:00Z',
//         updatedAt: '2024-03-10T10:00:00Z'
//       }
//     ];

//     router.get('/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       console.log('📋 Getting encounter notes (MOCK):', clientID);
//       const clientNotes = mockEncounterNotes.filter(note => note.clientID === clientID);
//       res.json(clientNotes);
//     });

//     router.post('/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       const noteData = req.body;
//       console.log('📝 Creating encounter note (MOCK):', clientID);
      
//       const newNote = {
//         _id: `EN-${clientID}-${Date.now()}`,
//         clientID,
//         ...noteData,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString()
//       };
      
//       mockEncounterNotes.push(newNote);
//       res.status(201).json(newNote);
//     });

//     router.put('/:noteId', (req, res) => {
//       const { noteId } = req.params;
//       const updateData = req.body;
//       console.log('📝 Updating encounter note (MOCK):', noteId);
      
//       const noteIndex = mockEncounterNotes.findIndex(note => note._id === noteId);
//       if (noteIndex === -1) {
//         return res.status(404).json({ error: 'Encounter note not found' });
//       }
      
//       mockEncounterNotes[noteIndex] = {
//         ...mockEncounterNotes[noteIndex],
//         ...updateData,
//         updatedAt: new Date().toISOString()
//       };
      
//       res.json(mockEncounterNotes[noteIndex]);
//     });

//     router.delete('/:noteId', (req, res) => {
//       const { noteId } = req.params;
//       console.log('🗑️ Deleting encounter note (MOCK):', noteId);
      
//       const noteIndex = mockEncounterNotes.findIndex(note => note._id === noteId);
//       if (noteIndex === -1) {
//         return res.status(404).json({ error: 'Encounter note not found' });
//       }
      
//       mockEncounterNotes.splice(noteIndex, 1);
//       res.json({ message: 'Encounter note deleted successfully' });
//     });

//     return router;
//   };

//   app.use('/api/encounter-notes', createMockEncounterNotesRouter());
// }

// // ✅ Only create fallback router if real one didn't load
// if (!clientsRouterLoaded) {
//   console.log('🔄 Creating fallback mock clients router...');
  
//   const createFallbackClientsRouter = () => {
//     const router = express.Router();
    
//     // Mock data as fallback
//     let mockClients = [
//       {
//         clientID: '123456789',
//         clientFirstName: 'John',
//         clientLastName: 'Doe',
//         clientEmail: 'john.doe@email.com',
//         clientSite: 'Main Office',
//         clientGender: 'Male',
//         clientDOB: '1990-01-15',
//         createdAt: new Date().toISOString()
//       }
//     ];

//     router.get('/', (req, res) => {
//       console.log('📋 Getting all clients (FALLBACK)');
//       res.json(mockClients);
//     });

//     router.get('/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       console.log('👤 Getting client by ID (FALLBACK):', clientID);
//       const client = mockClients.find(c => c.clientID === clientID);
//       if (!client) {
//         return res.status(404).json({ error: 'Client not found' });
//       }
//       res.json(client);
//     });

//     router.post('/', (req, res) => {
//       console.log('➕ Creating new client (FALLBACK):', req.body);
//       const newClient = {
//         ...req.body,
//         createdAt: new Date().toISOString(),
//         clientID: req.body.clientID || Date.now().toString()
//       };
      
//       mockClients.push(newClient);
//       res.status(201).json(newClient);
//     });

//     router.put('/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       const updates = req.body;
      
//       console.log('🔄 Updating client (FALLBACK):', clientID);
      
//       const clientIndex = mockClients.findIndex(c => c.clientID === clientID);
//       if (clientIndex === -1) {
//         return res.status(404).json({ error: 'Client not found' });
//       }
      
//       mockClients[clientIndex] = {
//         ...mockClients[clientIndex],
//         ...updates,
//         clientID: clientID,
//         updatedAt: new Date().toISOString()
//       };
      
//       res.json(mockClients[clientIndex]);
//     });

//     return router;
//   };

//   app.use('/api/clients', createFallbackClientsRouter());
// }

// // ✅ NEW: Mock referrals router if real one doesn't load
// if (!referralsRouterLoaded) {
//   console.log('🔄 Creating fallback mock referrals router...');
  
//   const createMockReferralsRouter = () => {
//     const router = express.Router();
    
//     let mockReferrals = {};

//     router.get('/clientReferrals/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       console.log('📄 Getting referrals (MOCK):', clientID);
      
//       res.json(mockReferrals[clientID] || {
//         lahsaReferral: "",
//         odrReferral: "",
//         dhsReferral: ""
//       });
//     });

//     router.post('/saveClientReferrals', (req, res) => {
//       const { clientID, ...referrals } = req.body;
//       console.log('💾 Saving referrals (MOCK):', clientID);
      
//       mockReferrals[clientID] = referrals;
//       res.json({ success: true, message: 'Referrals saved (Mock)' });
//     });

//     router.post('/uploadReferral', (req, res) => {
//       console.log('📤 Mock referral upload:', req.body);
//       res.json({ 
//         success: true, 
//         filePath: `/mock/uploads/${Date.now()}_referral.pdf`,
//         message: 'Referral uploaded (Mock)' 
//       });
//     });

//     return router;
//   };

//   app.use('/api', createMockReferralsRouter());
// }

// // ✅ NEW: Mock discharge router if real one doesn't load
// if (!dischargeRouterLoaded) {
//   console.log('🔄 Creating fallback mock discharge router...');
  
//   const createMockDischargeRouter = () => {
//     const router = express.Router();
    
//     let mockDischarges = {};

//     router.get('/getClientDischarge/:clientID', (req, res) => {
//       const { clientID } = req.params;
//       console.log('📄 Getting discharge (MOCK):', clientID);
      
//       res.json(mockDischarges[clientID] || {});
//     });

//     router.post('/saveClientDischarge', (req, res) => {
//       const { clientID, ...dischargeData } = req.body;
//       console.log('💾 Saving discharge (MOCK):', clientID);
      
//       mockDischarges[clientID] = dischargeData;
//       res.json({ success: true, message: 'Discharge saved (Mock)' });
//     });

//     return router;
//   };

//   app.use('/api', createMockDischargeRouter());
// }

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'Connected' : 'Mock data',
    azureStorage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Configured' : 'Not configured',
    routes: {
      // Section 1 & 2
      clients: clientsRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      clientFace: clientFaceRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      
      // Section 3 - Assessment & Care Plans
      bioSocial: bioSocialRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      mentalHealth: mentalHealthRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      reassessment: reassessmentRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      mentalArchive: mentalArchiveRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      
      // Section 4 - Client Progress
      carePlans: carePlansRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      encounterNotes: encounterNotesRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      
      // Section 5 - Medical
      medFaceSheet: medFaceSheetRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      medScreening: medScreeningRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      nursingAdmission: nursingAdmissionRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      progressNote: progressNoteRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      idtProvider: idtProviderRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      idtNursing: idtNursingRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      nursingArchive: nursingArchiveRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      
      // File Management
      files: filesRouterLoaded ? 'Real Azure Blob router' : 'Fallback mock router',
      referrals: referralsRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      discharge: dischargeRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router'
    },
    section3Endpoints: {
      bioSocial: [
        'GET /api/bio-social/:clientID',
        'POST /api/bio-social/:clientID',
        'GET /api/bio-social/assessment/:assessmentID',
        'PUT /api/bio-social/:clientID/complete',
        'GET /api/bio-social/:clientID/financial-summary',
        'POST /api/bio-social/calculate-adl',
        'GET /api/bio-social/:clientID/summary'
      ],
      mentalHealth: [
        'GET /api/mental-health/:clientId',
        'POST /api/mental-health/:clientId',
        'POST /api/mental-health/:clientId/providers',
        'DELETE /api/mental-health/:clientId/providers/:providerId',
        'POST /api/mental-health/:clientId/hospitalizations',
        'POST /api/mental-health/:clientId/medications',
        'GET /api/arrests/:clientId',
        'POST /api/arrests/:clientId',
        'DELETE /api/arrests/:clientId/records/:arrestId'
      ],
      reassessment: [
        'GET /api/reassessment/:clientID',
        'GET /api/reassessment/assessment/:assessmentID',
        'POST /api/reassessment/:clientID',
        'PUT /api/reassessment/:clientID',
        'PUT /api/reassessment/record/:reassessmentID',
        'PUT /api/reassessment/:clientID/complete',
        'DELETE /api/reassessment/:clientID',
        'GET /api/reassessment/all',
        'GET /api/reassessment/search',
        'GET /api/reassessment/:clientID/summary'
      ],
      mentalArchive: [
        'POST /api/mental-archive/upload/:clientID',
        'GET /api/mental-archive/:clientID',
        'GET /api/mental-archive/file/:fileId/download',
        'DELETE /api/mental-archive/file/:fileId',
        'GET /api/mental-archive/:clientID/summary',
        'PUT /api/mental-archive/file/:fileId'
      ]
    },
    message: dbConnected ? 'Server running with real Azure SQL routes' : 'Server running with fallback mock data'
  });
});

// Update the debug endpoint as well
app.get('/api/debug/database', async (req, res) => {
  try {
    if (!dbConnected || !dbModule) {
      return res.json({
        status: 'Database not connected',
        usingMockData: true,
        routes: {
          clients: clientsRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router',
          clientFace: clientFaceRouterLoaded ? 'Real router loaded but DB not connected' : 'Not loaded',
          
          // Section 3
          bioSocial: bioSocialRouterLoaded ? 'Real router loaded but DB not connected' : 'Not loaded',
          mentalHealth: mentalHealthRouterLoaded ? 'Real router loaded but DB not connected' : 'Not loaded',
          reassessment: reassessmentRouterLoaded ? 'Real router loaded but DB not connected' : 'Not loaded',
          mentalArchive: mentalArchiveRouterLoaded ? 'Real router loaded but DB not connected' : 'Not loaded',
          
          // Section 4
          carePlans: carePlansRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router',
          encounterNotes: encounterNotesRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router',
          
          // Section 5
          medFaceSheet: medFaceSheetRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router',
          
          // File Management
          files: filesRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router',
          referrals: referralsRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router',
          discharge: dischargeRouterLoaded ? 'Real router loaded but DB not connected' : 'Mock router'
        }
      });
    }

    console.log('🔍 Getting database information...');
    
    const tables = await dbModule.getTables();
    console.log('📋 Found tables:', tables);
    
    const debugInfo = {
      status: 'Connected',
      tables: tables,
      tableStructures: {},
      routes: {
        // Section 1 & 2
        clients: clientsRouterLoaded ? 'Real Azure SQL router' : 'Mock router',
        clientFace: clientFaceRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
        
        // Section 3
        bioSocial: bioSocialRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
        mentalHealth: mentalHealthRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
        reassessment: reassessmentRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
        mentalArchive: mentalArchiveRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
        
        // Section 4
        carePlans: carePlansRouterLoaded ? 'Real Azure SQL router' : 'Mock router',
        encounterNotes: encounterNotesRouterLoaded ? 'Real Azure SQL router' : 'Mock router',
        
        // Section 5
        medFaceSheet: medFaceSheetRouterLoaded ? 'Real Azure SQL router' : 'Mock router',
        
        // File Management
        files: filesRouterLoaded ? 'Real Azure Blob router' : 'Mock router',
        referrals: referralsRouterLoaded ? 'Real Azure SQL router' : 'Mock router',
        discharge: dischargeRouterLoaded ? 'Real Azure SQL router' : 'Mock router'
      }
    };

    // Get structure for all relevant tables
    for (const table of tables) {
      if (table.toLowerCase().includes('client') || 
          table.toLowerCase().includes('careplan') || 
          table.toLowerCase().includes('encounter') ||
          table.toLowerCase().includes('biosocial') ||
          table.toLowerCase().includes('mentalhealth') ||
          table.toLowerCase().includes('reassessment') ||
          table.toLowerCase().includes('mental') ||
          table.toLowerCase().includes('archive')) {
        debugInfo.tableStructures[table] = await dbModule.getTableStructure(table);
      }
    }

    res.json(debugInfo);
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      routes: {
        // All routes status here...
        clients: clientsRouterLoaded ? 'Real router loaded' : 'Mock router',
        bioSocial: bioSocialRouterLoaded ? 'Real router loaded' : 'Not loaded',
        mentalHealth: mentalHealthRouterLoaded ? 'Real router loaded' : 'Not loaded',
        reassessment: reassessmentRouterLoaded ? 'Real router loaded' : 'Not loaded',
        // ... etc
      }
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({ error: 'Route not found' });
});

//Section 5: Medical===================================================================
let medFaceSheetRouterLoaded = false;
let medScreeningRouterLoaded = false;
let nursingAdmissionRouterLoaded = false;
let progressNoteRouterLoaded = false;
let idtProviderRouterLoaded = false;
let idtNursingRouterLoaded = false;
let nursingArchiveRouterLoaded = false;

console.log('🏥 Loading Section 5 Medical Routes...');

// ===== MEDICAL FACE SHEET ROUTES =====
try {
  const medFaceSheetRouter = require('../routes/medFaceSheet.js');
  app.use('/api', medFaceSheetRouter);
  console.log('✅ Medical Face Sheet router loaded from ../routes/medFaceSheet.js');
  medFaceSheetRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/medFaceSheet.js:', err.message);
}

//Alternative path for medical routes
try {
  const medicalRouter = require('../routes/medical.js');
  app.use('/api/medical', medicalRouter);
  console.log('✅ Medical router loaded from ../routes/medical.js');
} catch (err) {
  console.log('⚠️  Could not load ../routes/medical.js:', err.message);
}

// ===== MEDICAL SCREENING ROUTES =====
try {
  const medScreeningRouter = require('../routes/medScreening.js');
  app.use('/api', medScreeningRouter);
  console.log('✅ Medical Screening router loaded from ../routes/medScreening.js');
  medScreeningRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/medScreening.js:', err.message);
}

// ===== NURSING ADMISSION ROUTES =====
try {
  const nursingAdmissionRouter = require('../routes/nursingAdmission.js');
  app.use('/api/nursing-admission', nursingAdmissionRouter);
  console.log('✅ Nursing Admission router loaded from ../routes/nursingAdmission.js');
  nursingAdmissionRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/nursingAdmission.js:', err.message);
}

// ===== PROGRESS NOTES ROUTES =====
try {
  const progressNoteRouter = require('../routes/progressNote.js');
  app.use('/api/progress-notes', progressNoteRouter);
  console.log('✅ Progress Notes router loaded from ../routes/progressNote.js');
  progressNoteRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/progressNote.js:', err.message);
}

// ===== IDT PROVIDER ROUTES =====
try {
  const idtProviderRouter = require('../routes/idtProvider.js');
  app.use('/api/idt-provider', idtProviderRouter);
  console.log('✅ IDT Provider router loaded from ../routes/idtProvider.js');
  idtProviderRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/idtProvider.js:', err.message);
}

// ===== IDT NURSING ROUTES =====
try {
  const idtNursingRouter = require('../routes/idtNursing.js');
  app.use('/api/idt-nursing', idtNursingRouter);
  console.log('✅ IDT Nursing router loaded from ../routes/idtNursing.js');
  idtNursingRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/idtNursing.js:', err.message);
}

// ===== NURSING ARCHIVE ROUTES =====
try {
  const nursingArchiveRouter = require('../routes/nursingArchive.js');
  app.use('/api/nursing-archive', nursingArchiveRouter);
  console.log('✅ Nursing Archive router loaded from ../routes/nursingArchive.js');
  nursingArchiveRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ../routes/nursingArchive.js:', err.message);
}

// ============================================================================
// CREATE FALLBACK ROUTERS FOR MISSING SECTION 5 ROUTES
// ============================================================================

// ✅ Create mock IDT Nursing router if real one doesn't load
if (!idtNursingRouterLoaded) {
  console.log('🔄 Creating fallback mock IDT Nursing router...');
  
  const createMockIDTNursingRouter = () => {
    const router = express.Router();
    
    let mockIDTNursing = {};

    // GET /api/idt-nursing/:clientID
    router.get('/:clientID', (req, res) => {
      const { clientID } = req.params;
      console.log('📋 Getting IDT nursing (MOCK):', clientID);
      
      const mockData = {
        clientID: clientID,
        idtNursingAppointYN: "Client has been attending most appointments regularly. Missed 2 appointments last month due to transportation issues.",
        idtNursingAppoint: "Focus on cardiology follow-up appointment next week and continuing physical therapy sessions twice weekly.",
        idtNursingProb: "Primary barriers include: 1) Transportation challenges, 2) Occasional anxiety about medical procedures, 3) Medication side effects causing morning fatigue.",
        idtNursingGoal: "Client's goal is to improve medication compliance to 95% or higher, attend all scheduled PT sessions.",
        idtNursingCompliant: "Current medication compliance is approximately 85%. Client occasionally skips evening medication dose.",
        idtNursingInfo: "Client reports feeling more confident about self-care activities. Family support system is strong.",
        goalStatus: "Active",
        goalPriority: "High",
        goalTargetDate: "2025-09-01",
        complianceScore: 7
      };
      
      res.json(mockData);
    });

    // POST /api/idt-nursing/:clientID
    router.post('/:clientID', (req, res) => {
      const { clientID } = req.params;
      const data = req.body;
      console.log('💾 Saving IDT nursing (MOCK):', clientID);
      
      mockIDTNursing[clientID] = {
        ...data,
        idtNursingID: Date.now(),
        updatedAt: new Date().toISOString()
      };
      
      res.json(mockIDTNursing[clientID]);
    });

    return router;
  };

  app.use('/api/idt-nursing', createMockIDTNursingRouter());
}

// ✅ Create mock routers for any missing Section 5 routes
if (!medFaceSheetRouterLoaded) {
  console.log('🔄 Creating fallback mock Medical Face Sheet router...');
  
  const createMockMedFaceSheetRouter = () => {
    const router = express.Router();
    
    let mockMedFaceSheet = {};

    // GET /api/medical/info/:clientID
    router.get('/medical/info/:clientID', (req, res) => {
      const { clientID } = req.params;
      console.log('📋 Getting medical info (MOCK):', clientID);
      
      const mockData = {
        clientID: clientID,
        clientMedConditions: [
          { value: 'diabetes', label: 'Diabetes Type 2' },
          { value: 'hypertension', label: 'Hypertension' }
        ],
        clientAddMedHistory: 'Patient has a history of diabetes diagnosed 5 years ago.',
        clientMedPertinent: 'Patient reports occasional dizziness and fatigue.',
        clientPreviousLab: 'Yes',
        clientAllergies: [
          { value: 'penicillin', label: 'Penicillin - Severe allergic reaction' }
        ]
      };
      
      res.json(mockData);
    });

    // POST /api/medical/info/:clientID
    router.post('/medical/info/:clientID', (req, res) => {
      const { clientID } = req.params;
      const data = req.body;
      console.log('💾 Saving medical info (MOCK):', clientID);
      
      mockMedFaceSheet[clientID] = {
        ...data,
        clientID,
        updatedAt: new Date().toISOString()
      };
      
      res.json(mockMedFaceSheet[clientID]);
    });

    // GET /api/medical/appointments/:clientID
    router.get('/medical/appointments/:clientID', (req, res) => {
      const { clientID } = req.params;
      console.log('📅 Getting appointments (MOCK):', clientID);
      
      const mockAppointments = [
        {
          appointmentID: 1,
          clientID: clientID,
          medApptDate: '2024-03-20',
          medApptLoc: 'Main Medical Center',
          medApptType: 'Follow-up',
          medApptProv: 'Dr. Smith',
          medApptTranport: 'Yes',
          createdAt: '2024-03-01T10:00:00Z'
        }
      ];
      
      res.json(mockAppointments);
    });

    // POST /api/medical/appointments/:clientID
    router.post('/medical/appointments/:clientID', (req, res) => {
      const { clientID } = req.params;
      const data = req.body;
      console.log('💾 Saving appointment (MOCK):', clientID);
      
      const newAppointment = {
        appointmentID: Date.now(),
        clientID,
        ...data,
        createdAt: new Date().toISOString()
      };
      
      res.json(newAppointment);
    });

    return router;
  };

  app.use('/api', createMockMedFaceSheetRouter());
}
//End Section 5: Medical ===================================================================


// Add this debug middleware to catch all requests
app.use((req, res, next) => {
  console.log(`🔍 REQUEST: ${req.method} ${req.path}`);
  console.log(`🔍 FULL URL: ${req.originalUrl}`);
  next();
});

// Test route to verify basic functionality
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});
//End Test Code


// Add a catch-all route at the end to see what's happening
app.use((req, res) => {
  console.log(`❌ UNMATCHED ROUTE: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: [
      'GET /api/health',
      'GET /api/clients',
      'GET /api/medical/info/:clientID',
      // ... list your other routes
    ]
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${dbConnected ? '✅ Azure SQL Connected' : '⚠️  Mock Data Only'}`);
  console.log(`☁️  Azure Storage: ${process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Debug endpoint: http://localhost:${PORT}/api/debug/database`);
  
  console.log('📋 Routes loaded:');
  console.log('  Section 1 & 2:');
  console.log(`    Clients: ${clientsRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    ClientFace: ${clientFaceRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
  
  console.log('  🧠 Section 3 - Assessment & Care Plans:');
  console.log(`    BioSocial: ${bioSocialRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
  console.log(`    MentalHealth: ${mentalHealthRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
  console.log(`    Reassessment: ${reassessmentRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
  console.log(`    MentalArchive: ${mentalArchiveRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
  
  console.log('  Section 4 - Client Progress:');
  console.log(`    CarePlans: ${carePlansRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    EncounterNotes: ${encounterNotesRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  
  console.log('  🏥 Section 5 - Medical:');
  console.log(`    MedFaceSheet: ${medFaceSheetRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    MedScreening: ${medScreeningRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    NursingAdmission: ${nursingAdmissionRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    ProgressNotes: ${progressNoteRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    IDTProvider: ${idtProviderRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    IDTNursing: ${idtNursingRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    NursingArchive: ${nursingArchiveRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  
  console.log('  File Management:');
  console.log(`    Files: ${filesRouterLoaded ? '✅ Real Azure Blob' : '⚠️  Mock fallback'}`);
  console.log(`    Referrals: ${referralsRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  console.log(`    Discharge: ${dischargeRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
});

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
//   console.log(`💾 Database: ${dbConnected ? '✅ Azure SQL Connected' : '⚠️  Mock Data Only'}`);
//   console.log(`☁️  Azure Storage: ${process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ Configured' : '⚠️  Not configured'}`);
//   console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
//   console.log(`🔍 Debug endpoint: http://localhost:${PORT}/api/debug/database`);
//   console.log('📋 Routes loaded:');
//   console.log(`  Clients: ${clientsRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  ClientFace: ${clientFaceRouterLoaded ? '✅ Real Azure SQL' : '❌ Mock fallback'}`);
//   console.log(`  Referrals: ${referralsRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  Discharge: ${dischargeRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  Files: ${filesRouterLoaded ? '✅ Real Azure Blob' : '⚠️  Mock fallback'}`);
//   console.log(`  CarePlans: ${carePlansRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  EncounterNotes: ${encounterNotesRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   // ✅ NEW: Section 5 route status
//   console.log('🏥 Section 5 Medical Routes:');
//   console.log(`  MedFaceSheet: ${medFaceSheetRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  MedScreening: ${medScreeningRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  NursingAdmission: ${nursingAdmissionRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  ProgressNotes: ${progressNoteRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  IDTProvider: ${idtProviderRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  IDTNursing: ${idtNursingRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
//   console.log(`  NursingArchive: ${nursingArchiveRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
  
//   console.log('📋 Available Section 5 endpoints:');
//   console.log('  🏥 Medical Face Sheet:');
//   console.log('    GET    /api/medical/info/:clientID');
//   console.log('    POST   /api/medical/info/:clientID');
//   console.log('    GET    /api/medical/appointments/:clientID');
//   console.log('    POST   /api/medical/appointments/:clientID');
//   console.log('  🏥 Medical Screening:');
//   console.log('    GET    /api/medical-screening/:clientID');
//   console.log('    POST   /api/medical-screening/:clientID');
//   console.log('  🏥 Nursing Admission:');
//   console.log('    GET    /api/nursing-admission/:clientID');
//   console.log('    POST   /api/nursing-admission/:clientID');
//   console.log('  🏥 Progress Notes:');
//   console.log('    GET    /api/progress-notes/:clientID');
//   console.log('    POST   /api/progress-notes/:clientID');
//   console.log('  🏥 IDT Provider:');
//   console.log('    GET    /api/idt-provider/:clientID');
//   console.log('    POST   /api/idt-provider/:clientID');
//   console.log('  🏥 IDT Nursing:');
//   console.log('    GET    /api/idt-nursing/:clientID');
//   console.log('    POST   /api/idt-nursing/:clientID');
//   console.log('  🏥 Nursing Archive:');
//   console.log('    GET    /api/nursing-archive/:clientID');
//   console.log('    POST   /api/nursing-archive/:clientID/upload');
// });

module.exports = app;