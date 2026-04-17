const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
require('dotenv').config({ path: '../.env' });
const { BlobServiceClient } = require('@azure/storage-blob'); 
// const { requireAdmin } = require('./middleware/requireAdmin.cjs');

const authMiddleware = require('./middleware/auth.js');
const { requireAdmin } = require('./middleware/auth.js');
// ✅ FIXED: Better database connection handling
let dbConnected = false;
let dbModule = null;
let adminRoutesLoaded = false;

// Only connect to database if NOT in test mode
if (process.env.NODE_ENV !== 'test') {
  try {
    dbModule = require("./store/azureSql.js");
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
} else {
  console.log('🧪 Test mode: Skipping Azure SQL connection');
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

try {
  const adminErrorsRouter = require('./routes/admin/errors.cjs');
  // const adminAccessRouter = require('./routes/admin/access.cjs');
  // const adminHealthRouter = require('./routes/admin/health.cjs');

  // requireAdmin applied once at mount — covers all sub-routes
  app.use('/api/admin/errors', authMiddleware, requireAdmin, adminErrorsRouter);
  // app.use('/api/admin/access', requireAdmin, adminAccessRouter);
  // app.use('/api/admin/health', requireAdmin, adminHealthRouter);

  adminRoutesLoaded = true;
  console.log('✓ Admin routes loaded');
} catch (err) {
  console.error('✗ Failed to load admin routes:', err.message);
}

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
app.get('/getClientAllergies/:clientID', async (req, res) => {
  // Redirect to the correct endpoint
  res.redirect(`/api/medical/allergies/${req.params.clientID}`);
});

// Also add the save endpoint if it doesn't exist
app.post('/saveClientAllergies', async (req, res) => {
  const { clientID, allergies } = req.body;
  console.log('💾 Saving allergies for client:', clientID);
  
  // For now, just return success
  res.json({ 
    success: true,
    message: 'Allergies saved successfully',
    clientID,
    allergies 
  });
})
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
let clientExportRouterLoaded = false;


// ✅ NEW: Try to load your actual routes first
try {
  const clientsRouter = require('./routes/clients.js');
  app.use('/api/clients', clientsRouter);
  console.log('✅ Real clients router loaded from ./routes/clients.js');
  clientsRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/clients.js:', err.message);
}

try {
  const clientFaceRouter = require('./routes/clientFace.js');
  app.use('/api', clientFaceRouter);
  console.log('✅ ClientFace router loaded from ./routes/clientFace.js');
  clientFaceRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/clientFace.js:', err.message);
}
try {
  const dischargeRouter = require('./routes/discharge.js');
  app.use('/api', dischargeRouter);
  console.log('✅ Discharge router loaded from ./routes/discharge.js');
  dischargeRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/discharge.js:', err.message);
}
try {
  const referralsRouter = require('./routes/referrals.js');
  app.use('/api', referralsRouter);
  console.log('✅ Referrals router loaded from ./routes/referrals.js');
  referralsRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/referrals.js:', err.message);
}


// ✅ NEW: Try to load files router for Azure Blob Storage
// ✅ UPDATED CODE - Show the real error
try {
  const filesRouter = require('./routes/files.js');
  app.use('/api', filesRouter);
  console.log('✅ Files router loaded from ./routes/files.js');
  filesRouterLoaded = true;
} catch (err) {
  console.error('❌ CRITICAL ERROR loading files router:');
  console.error('   Message:', err.message);
  console.error('   Stack:', err.stack);
  // Don't load fallback - let it fail so we see the error
  throw err; // Re-throw to see what's wrong
}
  // ============================================================================
// Section 2: Authorization & Signatures Routes
// ============================================================================

let authSigRouterLoaded = false;

console.log('📝 Loading Section 2 Authorization & Signatures Routes...');

// Try to load the Authorization & Signatures router
try {
  const authSigRouter = require('./routes/authSig.js');
  app.use('/api/authorization', authSigRouter);
  console.log('✅ Authorization & Signatures router loaded from ./routes/authSig.js');
  authSigRouterLoaded = true;
  console.log('✅ AuthSig router loaded from ./routes/authSig.js');
} catch (err) {
  console.log('⚠️  Could not load ./routes/authSig.js:', err.message);
  authSigRouterLoaded = false;
  
  // Use regex pattern for Express 5
  app.use(/^\/api\/authorization/, (req, res) => {
    res.status(501).json({ 
      error: 'Authorization routes not implemented',
      message: 'The authSig.js router failed to load'
    });
  });
  
  // Create mock router for Authorization & Signatures
  const createMockAuthSigRouter = () => {
    const router = express.Router();
    
    // In-memory storage for mock data
    let mockAuthorizationForms = {};
    
    // GET /api/authorization/:clientID/forms - Get all forms status
    router.get('/:clientID/forms', (req, res) => {
      const { clientID } = req.params;
      console.log('📋 Getting all authorization forms (MOCK):', clientID);

      const FORM_META = [
        { formType: 'orientation',      formNumber: 1,  priority: 'high'   },
        { formType: 'clientRights',     formNumber: 2,  priority: 'high'   },
        { formType: 'consentTreatment', formNumber: 3,  priority: 'high'   },
        { formType: 'preScreen',        formNumber: 4,  priority: 'medium' },
        { formType: 'privacyPractice',  formNumber: 5,  priority: 'medium' },
        { formType: 'lahmis',           formNumber: 6,  priority: 'medium' },
        { formType: 'phiRelease',       formNumber: 7,  priority: 'medium' },
        { formType: 'residencePolicy',  formNumber: 8,  priority: 'medium' },
        { formType: 'authDisclosure',   formNumber: 9,  priority: 'medium' },
        { formType: 'termination',      formNumber: 10, priority: 'low'    },
        { formType: 'advDirective',     formNumber: 11, priority: 'medium' },
        { formType: 'grievances',       formNumber: 12, priority: 'medium' },
        { formType: 'healthDisclosure', formNumber: 13, priority: 'medium' },
        { formType: 'consentPhoto',     formNumber: 14, priority: 'medium' },
        { formType: 'housingAgreement', formNumber: 15, priority: 'low'    },
      ];

      // Build forms map — check in-memory mock storage first, then return sensible defaults
      const forms = {};
      let completedCount = 0;

      FORM_META.forEach(({ formType, formNumber, priority }) => {
        const formKey  = `${clientID}_${formType}`;
        const saved    = mockAuthorizationForms[formKey];
        const isComplete = saved
          ? (saved.status === 'completed' || Number(saved.completionPercentage) === 100)
          : false;

        if (isComplete) completedCount++;

        forms[formType] = {
          formNumber,
          priority,
          status:              saved?.status              || 'not_started',
          completionPercentage: Number(saved?.completionPercentage ?? 0),
          completedBy:         saved?.completedBy         || null,
          completedAt:         saved?.completedAt         || null,
          createdBy:           saved?.createdBy           || null,
          createdAt:           saved?.savedAt             || null,
          lastUpdated:         saved?.savedAt             || null,
          submissionID:        null,
        };
      });

      res.json({
        clientID,
        forms,
        overallCompletion: Math.round((completedCount / FORM_META.length) * 100),
        totalForms:        FORM_META.length,
        completedForms:    completedCount,
        lastUpdated:       new Date().toISOString(),
        submission:        null,
      });
    });
    
    // GET /api/authorization/:clientID/form/:formType - Get specific form
    router.get('/:clientID/form/:formType', (req, res) => {
      const { clientID, formType } = req.params;
      console.log('📋 Getting form data (MOCK):', clientID, formType);
      
      // Check if we have saved data for this form
      const formKey = `${clientID}_${formType}`;
      if (mockAuthorizationForms[formKey]) {
        return res.json(mockAuthorizationForms[formKey]);
      }
      
      // Return default mock data based on form type
      const mockFormData = {
        orientation: {
          formID: 'MOCK-ORIENT-001',
          clientID,
          formType: 'orientation',
          checkboxes: {
            "Client Rights and Responsibilities": false,
            "Privacy Practices Notice": false,
            "Consent for Treatment and Services": false,
            "clientAuthHI": false,
            "clientAuthRel": false
          },
          signature: "",
          completionPercentage: 0,
          status: 'not_started'
        },
        clientRights: {
          formID: 'MOCK-RIGHTS-001',
          clientID,
          formType: 'clientRights',
          acknowledged: false,
          signature: "",
          completionPercentage: 0,
          status: 'not_started'
        },
        consentPhoto: {
          formID: 'MOCK-PHOTO-001',
          clientID,
          formType: 'consentPhoto',
          clientReleaseItems: [],
          clientReleasePurposes: [],
          clientReleasePHTItems: [],
          consentPhotoSign1: "",
          consentPhotoEffectiveDate: "",
          consentPhotoExpireDate: "",
          completionPercentage: 0,
          status: 'not_started'
        },
        authDisclosure: {
          formID: 'MOCK-DISCLOSURE-001',
          clientID,
          formType: 'authDisclosure',
          atrClientSign: "",
          mentalHealthAuth: false,
          hivAidsAuth: false,
          substanceUseAuth: false,
          completionPercentage: 0,
          status: 'not_started'
        },
        advDirective: {
          formID: 'MOCK-DIRECTIVE-001',
          clientID,
          formType: 'advDirective',
          factSheetGiven: "",
          factSheetNotGivenReason: "",
          hasDirective: "",
          clientSignature: "",
          responsibleAdultSignature: "",
          witnessSignature: "",
          relationshipToClient: "",
          completionPercentage: 0,
          status: 'not_started'
        },
        housingAgree: {
          formID: 'MOCK-HOUSING-001',
          clientID,
          formType: 'housingAgree',
          housingAgreeeSign: "",
          acknowledgmentConfirmed: false,
          clientUnderstanding: false,
          dateAcknowledged: "",
          completionPercentage: 0,
          status: 'not_started'
        }
      };
      
      const formData = mockFormData[formType];
      if (!formData) {
        return res.status(404).json({ 
          message: 'Form type not found',
          validTypes: Object.keys(mockFormData)
        });
      }
      
      res.json(formData);
    });
    
    // POST /api/authorization/:clientID/form/:formType - Save form
    router.post('/:clientID/form/:formType', (req, res) => {
      const { clientID, formType } = req.params;
      const data = req.body;
      console.log('💾 Saving form data (MOCK):', clientID, formType);

      // Transform data for specific form types
      let transformedData = { ...data };

      // Handle consentPhoto array transformations
      if (formType === 'consentPhoto') {
        ['clientReleaseItems', 'clientReleasePurposes', 'clientReleasePHTItems'].forEach(field => {
          if (Array.isArray(data[field])) {
            transformedData[field] = data[field].map(item =>
              typeof item === 'object' ? item : { value: item }
            );
          }
        });
      }

      // Determine completion using all known signature field names
      const pct        = Number(data.completionPercentage ?? 0);
      const hasSig     = !!(
        data.signature          || data.clientSignature  ||
        data.consentPhotoSign1  || data.atrClientSign    ||
        data.housingAgreeeSign
      );
      const isComplete = pct === 100 || hasSig;
      const now        = new Date().toISOString();
      const mockUser   = 'mock.user@hospital.com';

      // Save to mock storage
      const formKey = `${clientID}_${formType}`;
      const existing = mockAuthorizationForms[formKey];

      mockAuthorizationForms[formKey] = {
        formID:              `MOCK-${formType.toUpperCase()}-${Date.now()}`,
        clientID,
        formType,
        ...transformedData,
        completionPercentage: pct,
        status:              isComplete ? 'completed' : 'in_progress',
        completedBy:         isComplete ? mockUser : null,
        completedAt:         isComplete ? now      : null,
        createdBy:           existing?.createdBy || mockUser,
        savedAt:             now,
      };

      console.log('✅ Form saved successfully (MOCK)');
      res.json(mockAuthorizationForms[formKey]);
    });
    
    // POST /api/authorization/:clientID/form/:formType/autosave - Auto-save
    router.post('/:clientID/form/:formType/autosave', (req, res) => {
      const { clientID, formType } = req.params;
      console.log('⏱️ Auto-saving form (MOCK):', clientID, formType);
      
      const formKey = `${clientID}_${formType}_autosave`;
      mockAuthorizationForms[formKey] = {
        ...req.body,
        autoSavedAt: new Date().toISOString()
      };
      
      res.json({
        message: 'Auto-save successful',
        clientID,
        formType,
        autoSavedAt: new Date().toISOString()
      });
    });
    
    // POST /api/authorization/:clientID/forms/bulk - Bulk save
    router.post('/:clientID/forms/bulk', (req, res) => {
      const { clientID } = req.params;
      const { forms } = req.body;
      console.log('💾 Bulk saving forms (MOCK):', clientID);
      
      const savedForms = [];
      
      if (Array.isArray(forms)) {
        forms.forEach(form => {
          const formKey = `${clientID}_${form.formType}`;
          mockAuthorizationForms[formKey] = {
            ...form,
            clientID,
            savedAt: new Date().toISOString()
          };
          savedForms.push(mockAuthorizationForms[formKey]);
        });
      }
      
      res.json({
        message: 'Bulk save successful',
        clientID,
        savedForms,
        totalSaved: savedForms.length
      });
    });
    
    // POST /api/authorization/:clientID/submit - Submit forms
    router.post('/:clientID/submit', (req, res) => {
      const { clientID } = req.params;
      const { submissionNotes } = req.body;
      console.log('📤 Submitting forms for approval (MOCK):', clientID);
      
      res.json({
        message: 'Forms submitted successfully',
        submission: {
          submissionID: `SUB-${Date.now()}`,
          clientID,
          submittedAt: new Date().toISOString(),
          status: 'submitted_for_review',
          submissionNotes
        }
      });
    });
    
    // GET /api/authorization/:clientID/submission-status
    router.get('/:clientID/submission-status', (req, res) => {
      const { clientID } = req.params;
      console.log('📊 Getting submission status (MOCK):', clientID);
      
      res.json({
        submissionID: `SUB-MOCK-001`,
        clientID,
        status: 'draft',
        lastUpdated: new Date().toISOString(),
        message: 'No submissions found (mock data)'
      });
    });
    
    return router;
  };
  
  // Use the mock router
  app.use('/api/authorization', createMockAuthSigRouter());
  console.log('✅ Mock Authorization & Signatures router created');
}

//Section 3: Client Assessment===========================================================

// Add these to your server.js after line 50
try {
  const bioSocialRouter = require('./routes/bioSocial.js');
  app.use('/api', bioSocialRouter);
  console.log('✅ Bio-Social router loaded');
  bioSocialRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load bioSocial.js:', err.message);
}

try {
  const mentalHealthRouter = require('./routes/mentalHealth.js');
  app.use('/api', mentalHealthRouter);
  console.log('✅ Mental Health router loaded');
  mentalHealthRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load mentalHealth.js:', err.message);
}

try {
  const reassessmentRouter = require('./routes/reassessment.js');
  app.use('/api', reassessmentRouter);
  console.log('✅ Reassessment router loaded');
  reassessmentRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load reassessment.js:', err.message);
}
// ===== MENTAL ARCHIVE ROUTES =====
try {
  const mentalArchiveRouter = require('./routes/MentalArchive.js');
  app.use('/api', mentalArchiveRouter);
  console.log('✅ Mental Archive router loaded from ./routes/MentalArchive.js');
  mentalArchiveRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/MentalArchive.js:', err.message);
}

// ✅ NEW: Section 4 Routes - CarePlans
// ✅ Section 4 Routes - Assessment Care Plans
try {
  const assessmentCarePlansRouter = require('./routes/accessCarePlan.js');
  app.use('/api', assessmentCarePlansRouter);
  console.log('✅ Assessment Care Plans router loaded from ./routes/accessCarePlan.js');
  // Add a flag if you're tracking loaded routes
} catch (err) {
  console.log('⚠️  Could not load ./routes/accessCarePlan.js:', err.message);
}
try {
  const carePlansRouter = require('./routes/carePlan.js');
  app.use('/api', carePlansRouter);
  console.log('✅ CarePlans router loaded from ./routes/carePlans.js');
  carePlansRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/carePlans.js:', err.message);
}

// ✅ NEW: Section 4 Routes - EncounterNotes
try {
  const encounterNotesRouter = require('./routes/encounterNote.js');
  app.use('/api', encounterNotesRouter);
  console.log('✅ EncounterNotes router loaded from ./routes/encounterNotes.js');
  encounterNotesRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/encounterNotes.js:', err.message);
}

// Note Archive Route
try {
  const noteArchiveRouter = require('./routes/noteArchive.js');
  app.use('/api', noteArchiveRouter);
  console.log('✅ Note Archive router loaded');
} catch (err) {
  console.log('⚠️  Could not load noteArchive.js:', err.message);
}

let miscDocRouterLoaded = false;
let personalInventoryRouterLoaded = false;

// MISC DOCUMENTS
try {
  const miscDocRouter = require('./routes/MiscDoc.js');
  app.use('/api', miscDocRouter);
  console.log('✅ Misc Documents router loaded');
  miscDocRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load MiscDoc.js:', err.message);
}

// PERSONAL INVENTORY
try {
  const personalInventoryRouter = require('./routes/PersonalInventory.js');
  app.use('/api', personalInventoryRouter);
  console.log('✅ Personal Inventory router loaded');
  personalInventoryRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load PersonalInventory.js:', err.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbConnected ? 'Connected' : 'Mock data',
    azureStorage: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'Configured' : 'Not configured',
    routes: {
      // Section 1
      clients: clientsRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      clientFace: clientFaceRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      
      //Section 2 - Authorization & Signatures
      authSig: authSigRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',

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
      medObservation: medObservationRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      
      // File Management
      files: filesRouterLoaded ? 'Real Azure Blob router' : 'Fallback mock router',
      referrals: referralsRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',
      discharge: dischargeRouterLoaded ? 'Real Azure SQL router' : 'Fallback mock router',

      // In the health check routes object, add:
      miscDoc: miscDocRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      personalInventory: personalInventoryRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',
      clientExport: clientExportRouterLoaded ? 'Real Azure SQL router' : 'Not loaded',

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



//Section 5: Medical===================================================================
let medFaceSheetRouterLoaded = false;
let medScreeningRouterLoaded = false;
let nursingAdmissionRouterLoaded = false;
let progressNoteRouterLoaded = false;
let idtProviderRouterLoaded = false;
let idtNursingRouterLoaded = false;
let nursingArchiveRouterLoaded = false;
let medObservationRouterLoaded = false;

console.log('🏥 Loading Section 5 Medical Routes...');
console.log('🔍 Current directory:', __dirname);

// Try loading medical.js first (with database)
let routerLoaded = false;
try {
  console.log('🔍 Attempting to load ./routes/medical.js...');
  const medicalRouter = require('./routes/medical.js');
  console.log('✅ medical.js file loaded successfully');
  app.use('/api/medical', medicalRouter);
  console.log('✅ Medical router registered at /api/medical');
  routerLoaded = true;
  medFaceSheetRouterLoaded = true;
} catch (err) {
  console.error('❌ medical.js FAILED TO LOAD:');
  console.error('   Error:', err.message);
  console.error('   Stack:', err.stack);
}

// Try medFaceSheet.js if medical.js failed
if (!routerLoaded) {
  try {
    console.log('🔍 Attempting to load ./routes/medFaceSheet.js...');
    const medFaceSheetRouter = require('./routes/medFaceSheet.js');
    console.log('✅ medFaceSheet.js file loaded successfully');
    app.use('/api/medical', medFaceSheetRouter);
    console.log('✅ medFaceSheet router registered at /api/medical');
    routerLoaded = true;
    medFaceSheetRouterLoaded = true;
  } catch (err) {
    console.error('❌ medFaceSheet.js FAILED TO LOAD:');
    console.error('   Error:', err.message);
    console.error('   Stack:', err.stack);
  }
}

// Create mock router if both failed
if (!routerLoaded) {
  console.log('🔄 Creating MOCK medical router...');
  
  const mockRouter = express.Router();
  const mockData = {};
  const mockAppts = {};

  mockRouter.get('/info/:clientID', (req, res) => {
    console.log('🔧 MOCK: GET /info/' + req.params.clientID);
    res.json(mockData[req.params.clientID] || {
      clientID: req.params.clientID,
      clientMedConditions: [],
      clientAddMedHistory: '',
      clientMedPertinent: '',
      clientPreviousLab: '',
      clientAllergies: []
    });
  });

  mockRouter.post('/info/:clientID', (req, res) => {
    console.log('🔧 MOCK: POST /info/' + req.params.clientID);
    mockData[req.params.clientID] = { ...req.body, clientID: req.params.clientID };
    res.json(mockData[req.params.clientID]);
  });

  mockRouter.get('/appointments/:clientID', (req, res) => {
    console.log('🔧 MOCK: GET /appointments/' + req.params.clientID);
    res.json(mockAppts[req.params.clientID] || []);
  });

  mockRouter.post('/appointments/:clientID', (req, res) => {
    console.log('🔧 MOCK: POST /appointments/' + req.params.clientID);
    const appt = { appointmentID: Date.now(), ...req.body };
    if (!mockAppts[req.params.clientID]) mockAppts[req.params.clientID] = [];
    mockAppts[req.params.clientID].push(appt);
    res.status(201).json(appt);
  });

  mockRouter.put('/appointments/:appointmentID', (req, res) => {
    console.log('🔧 MOCK: PUT /appointments/' + req.params.appointmentID);
    res.json({ ...req.body, appointmentID: req.params.appointmentID });
  });

  mockRouter.delete('/appointments/:appointmentID', (req, res) => {
    console.log('🔧 MOCK: DELETE /appointments/' + req.params.appointmentID);
    res.json({ message: 'Deleted' });
  });

  mockRouter.get('/allergies/:clientID', (req, res) => {
    console.log('🔧 MOCK: GET /allergies/' + req.params.clientID);
    res.json([
      { value: 'penicillin', label: 'Penicillin' },
      { value: 'shellfish', label: 'Shellfish' },
      { value: 'nuts', label: 'Tree Nuts' },
      { value: 'dairy', label: 'Dairy' },
      { value: 'latex', label: 'Latex' }
    ]);
  });

  mockRouter.get('/stats/:clientID', (req, res) => {
    console.log('🔧 MOCK: GET /stats/' + req.params.clientID);
    res.json({
      totalAppointments: 0,
      upcomingAppointments: 0,
      pastAppointments: 0,
      appointmentsNeedingTransport: 0,
      nextAppointmentDate: null,
      hasAllergies: 0
    });
  });

  app.use('/api/medical', mockRouter);
  console.log('✅ MOCK Medical router created at /api/medical');
  medFaceSheetRouterLoaded = true;
}

console.log('✅ Section 5 Medical Routes Loading Complete');
console.log('   medFaceSheetRouterLoaded:', medFaceSheetRouterLoaded);

//Section 6: Case Management================================================================

let idtCaseManagerRouterLoaded = false;

console.log('📋 Loading Section 6 Case Management Routes...');

// IDT CASE MANAGER
try {
  const idtCaseManagerRouter = require('./routes/idtNoteCm.js');
  app.use('/api', idtCaseManagerRouter);
  console.log('✅ IDT Case Manager router loaded from ./routes/idtNoteCm.js');
  idtCaseManagerRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/idtNoteCm.js:', err.message);
  console.error('   Error details:', err);
}

console.log('✅ Section 6 Case Management Routes Loading Complete');
//End Section 6: Case Management ===========================================================


console.log('  📋 Section 6 - Case Management:');
console.log(`    IDTCaseManager: ${idtCaseManagerRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);

// MEDICAL SCREENING
try {
  const medScreeningRouter = require('./routes/medScreening.js');
  app.use('/api', medScreeningRouter);
  console.log('✅ Medical Screening router loaded');
  medScreeningRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load medScreening.js:', err.message);
}

// NURSING ADMISSION
try {
  const nursingAdmissionRouter = require('./routes/nursingAdmission.js');
  app.use('/api', nursingAdmissionRouter);
  console.log('✅ Nursing Admission router loaded');
  nursingAdmissionRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load nursingAdmission.js:', err.message);
}

// PROGRESS NOTES
try {
  const progressNoteRouter = require('./routes/progressNote.js');
  app.use('/api', progressNoteRouter);
  console.log('✅ Progress Notes router loaded');
  progressNoteRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load progressNote.js:', err.message);
}

// IDT PROVIDER
try {
  const idtProviderRouter = require('./routes/idtProvider.js');
  app.use('/api', idtProviderRouter);
  console.log('✅ IDT Provider router loaded');
  idtProviderRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load idtProvider.js:', err.message);
}

// IDT NURSING
try {
  const idtNursingRouter = require('./routes/idtNursing.js');
  app.use('/api', idtNursingRouter);
  console.log('✅ IDT Nursing router loaded');
  idtNursingRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load idtNursing.js:', err.message);
}

// NURSING ARCHIVE
try {
  const nursingArchiveRouter = require('./routes/nursingArchive.js');
  app.use('/api', nursingArchiveRouter);
  console.log('✅ Nursing Archive router loaded');
  nursingArchiveRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load nursingArchive.js:', err.message);
}

// MEDICAL OBSERVATION RECORD
try {
  const medObservationRouter = require('./routes/medObservation.js');
  app.use('/api', medObservationRouter);
  console.log('✅ Medical Observation router loaded');
  medObservationRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load medObservation.js:', err.message);
}

console.log('✅ Section 5 Medical Routes Loading Complete');
//End Section 5: Medical ===================================================================

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

// ============================================================================
// PDF Export Route
// ============================================================================
try {
  const clientExportRouter = require('./routes/clientExport.js');
  app.use('/api/export', clientExportRouter);
  console.log('✅ Client Export router loaded from ./routes/clientExport.js');
  clientExportRouterLoaded = true;
} catch (err) {
  console.log('⚠️  Could not load ./routes/clientExport.js:', err.message);
}


app.get('/api/debug/storage', (req, res) => {
  res.json({
    hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    connectionStringLength: process.env.AZURE_STORAGE_CONNECTION_STRING?.length || 0,
    startsCorrectly: process.env.AZURE_STORAGE_CONNECTION_STRING?.startsWith('DefaultEndpointsProtocol='),
    containerName: process.env.AZURE_CONTAINER_NAME || 'not set'
  });
});
app.get('/api/test-storage', async (req, res) => {
  try {
    const { BlobServiceClient } = require('@azure/storage-blob');
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      return res.json({
        success: false,
        error: 'AZURE_STORAGE_CONNECTION_STRING not found in environment'
      });
    }

    // Try to create a client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Try to list containers (this will fail if credentials are wrong)
    const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // This operation will throw if not authorized
    const exists = await containerClient.exists();
    
    res.json({
      success: true,
      connectionStringConfigured: true,
      containerName: containerName,
      containerExists: exists,
      message: exists ? 'Azure Storage connection successful!' : 'Connection OK but container does not exist'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: 'Azure Storage connection failed'
    });
  }
});

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
// Replace your existing app.listen at the bottom of server.js with this updated version:

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${dbConnected ? '✅ Azure SQL Connected' : '⚠️  Mock Data Only'}`);
      console.log(`☁️  Azure Storage: ${process.env.AZURE_STORAGE_CONNECTION_STRING ? '✅ Configured' : '⚠️  Not configured'}`);
      console.log('STORAGE STRING:', process.env.AZURE_STORAGE_CONNECTION_STRING);
      // const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
      // console.log('Using connection string:', connStr); // add this temporarily
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔍 Debug endpoint: http://localhost:${PORT}/api/debug/database`);
      
      console.log('📋 Routes loaded:');
      console.log('  📁 Section 1 - Client Information:');
      console.log(`    Clients: ${clientsRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
      console.log(`    ClientFace: ${clientFaceRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
      
      console.log('  📝 Section 2 - Authorization & Signatures:');
      console.log(`    AuthSig: ${authSigRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
      
      console.log('  🧠 Section 3 - Assessment & Care Plans:');
      console.log(`    BioSocial: ${bioSocialRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
      console.log(`    MentalHealth: ${mentalHealthRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
      console.log(`    Reassessment: ${reassessmentRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
      console.log(`    MentalArchive: ${mentalArchiveRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
      
      console.log('  📊 Section 4 - Client Progress:');
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
      console.log(`    MedObservation: ${medObservationRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
      
      console.log('  📂 File Management:');
      console.log(`    Files: ${filesRouterLoaded ? '✅ Real Azure Blob' : '⚠️  Mock fallback'}`);
      console.log(`    Referrals: ${referralsRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
      console.log(`    Discharge: ${dischargeRouterLoaded ? '✅ Real Azure SQL' : '⚠️  Mock fallback'}`);
      
      // Section 2 specific endpoints
      console.log('\n📝 Section 2 - Authorization & Signatures endpoints:');
      console.log('  📄 Forms Management:');
      console.log('    GET    /api/authorization/:clientID/forms           - Get all forms status');
      console.log('    GET    /api/authorization/:clientID/form/:formType  - Get specific form');
      console.log('    POST   /api/authorization/:clientID/form/:formType  - Save form data');
      console.log('    POST   /api/authorization/:clientID/form/:formType/autosave - Auto-save');
      console.log('    POST   /api/authorization/:clientID/forms/bulk      - Bulk save forms');
      console.log('    POST   /api/authorization/:clientID/submit          - Submit for approval');
      console.log('    GET    /api/authorization/:clientID/submission-status - Get status');
      
      console.log('\n  📄 Available Form Types:');
      console.log('    - orientation      : Patient Orientation Information');
      console.log('    - clientRights     : Client Rights & Responsibilities');
      console.log('    - consentTreatment : Consent for Treatment');
      console.log('    - consentPhoto     : Photo/Media Consent');
      console.log('    - authDisclosure   : Authorization for Disclosure');
      console.log('    - advDirective     : Advance Healthcare Directive');
      console.log('    - housingAgree     : Housing Agreement');
      console.log('    - privacyPractice  : Privacy Practices');
      console.log('    - lahmis          : LAHMIS Consent');
      console.log('    - phiRelease      : PHI Release');
      console.log('    - residencePolicy : Residence Policy');
      console.log('    - grievances      : Client Grievances');
      console.log('    - healthDisclosure: Health Info Disclosure');
      console.log('    - interimHousing  : Interim Housing Agreement');
      console.log('    - termination     : Termination Policy');
      console.log('  📄 Export:');
      console.log(`    ClientExport: ${clientExportRouterLoaded ? '✅ Real Azure SQL' : '❌ Not loaded'}`);
    });
}
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

module.exports = app;