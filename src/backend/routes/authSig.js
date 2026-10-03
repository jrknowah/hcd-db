// backend/routes/authSig.js - Complete with all fixes
const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../store/azureSql');
const { logUserAction } = require('../config/logAction');
const { requireSignedFormUnlock, canUnlockSignedForms } = require('../middleware/signedFormUnlock');

const router = express.Router();

// A form is locked once signed. Only an IT Admin / Level 1 unlock (which
// archives the signed version and clears the signature) re-opens it.
const LOCKED_STATUSES = ['completed', 'submitted', 'approved'];

const isLockedStatus = (status) => LOCKED_STATUSES.includes(status);

const lockedResponse = (res, currentStatus) => res.status(409).json({
  code: 'FORM_LOCKED',
  message: 'This form has been signed and is locked. An IT Admin or Level 1 user must unlock it before it can be changed.',
  currentStatus,
});

// Authenticated user for audit columns (set by middleware/auth.js)
const getCurrentUser = (req) => req.user?.email || req.user?.name || 'system';

// Valid form types - UPDATED to match frontend FORM_CONFIGS
const VALID_FORM_TYPES = [
  'orientation',
  'clientRights',
  'consentTreatment',
  'preScreen',
  'privacyPractice',
  'lahmis',
  'phiRelease',          // ← Was missing, was 'releaseInfo' before
  'residencePolicy',
  'authDisclosure',
  'termination',
  'advDirective',        // ← Was 'advanceDirective' before
  'grievances',          // ← Was 'grievanceProcedure' before
  'healthDisclosure',    // ← Was missing
  'consentPhoto',
  'housingAgreement',    // ← Was missing
  'calaimVerbalOptIn'    // ← CalAIM Community Supports verbal consent (ODR/HSH)
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * FIX #1: Validate completion percentage is between 0-100
 */
function validateCompletionPercentage(value) {
  if (value !== undefined && value !== null) {
    const num = Number(value);
    if (isNaN(num) || num < 0 || num > 100) {
      return { completionPercentage: 'Completion percentage must be between 0-100' };
    }
  }
  return {};
}

/**
 * FIX #2: Validate array fields with improved error messages
 */
function validateArrayField(fieldName, value, minLength = 1) {
  if (!Array.isArray(value)) {
    return { [fieldName]: `${fieldName} must be an array` };
  }
  if (value.length < minLength) {
    return { [fieldName]: `At least one ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()} must be selected` };
  }
  return {};
}

/**
 * FIX #3 & #9: Strict date validation (YYYY-MM-DD format) - TIMEZONE FIX
 */
function validateDateFormat(dateString, fieldName) {
  if (!dateString) return {};
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return { [fieldName]: `Invalid date format for ${fieldName}. Expected YYYY-MM-DD` };
  }
  
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);
  
  // ✅ CRITICAL FIX: Use UTC to avoid timezone issues
  const date = new Date(Date.UTC(year, month - 1, day));
  
  // Check if it's a valid date
  if (isNaN(date.getTime())) {
    return { [fieldName]: `Invalid date for ${fieldName}` };
  }
  
  // ✅ CRITICAL FIX: Verify using UTC methods
  if (date.getUTCFullYear() !== year || 
      date.getUTCMonth() !== month - 1 || 
      date.getUTCDate() !== day) {
    return { [fieldName]: `Invalid date for ${fieldName}` };
  }
  
  return {};
}

/**
 * Validate signature field
 */
function validateSignature(signature) {
  const errors = {};
  
  if (!signature) {
    errors.signature = 'Signature is required';
  } else if (typeof signature !== 'string') {
    errors.signature = 'Signature must be a string';
  } else {
    const trimmed = signature.trim();
    if (trimmed.length < 2) {
      errors.signature = 'Signature must be at least 2 characters';
    } else if (trimmed.length > 200) {
      errors.signature = 'Signature must be a maximum 200 characters';
    }
  }
  
  return errors;
}

/**
 * Validate checkboxes object
 */
function validateCheckboxes(checkboxes) {
  const errors = {};
  
  if (!checkboxes || typeof checkboxes !== 'object') {
    errors.checkboxes = 'Checkboxes must be an object';
  } else {
    const keys = Object.keys(checkboxes);
    if (keys.length === 0) {
      errors.checkboxes = 'at least one checkbox is required';
    } else {
      // Check all values are booleans
      const invalidKeys = keys.filter(key => typeof checkboxes[key] !== 'boolean');
      if (invalidKeys.length > 0) {
        errors.checkboxes = 'All checkbox values must be boolean';
      }
    }
  }
  
  return errors;
}

/**
 * Validate acknowledged field for clientRights
 */
function validateAcknowledged(acknowledged) {
  const errors = {};
  
  if (acknowledged === undefined || acknowledged === null) {
    errors.acknowledged = 'Acknowledged field is required';
  } else if (acknowledged !== true) {
    errors.acknowledged = 'Client rights must be acknowledged';
  }
  
  return errors;
}

/**
 * Validate consentPhoto specific fields
 * ✅ FIXED: Corrected validation logic for consentPhoto form
 */
function validateConsentPhoto(data) {
  let errors = {};
  
  // Validate arrays - ensure they exist and have at least one item
  Object.assign(errors, validateArrayField('clientReleaseItems', data.clientReleaseItems));
  Object.assign(errors, validateArrayField('clientReleasePurposes', data.clientReleasePurposes));
  
  // ✅ FIX #1: Validate signature field as STRING (NOT a date!)
  if (!data.consentPhotoSign1 || typeof data.consentPhotoSign1 !== 'string' || data.consentPhotoSign1.trim().length < 2) {
    errors.consentPhotoSign1 = 'Electronic signature must be at least 2 characters';
  }
  
  // Validate dates (only if provided)
  if (data.consentPhotoEffectiveDate) {
    Object.assign(errors, validateDateFormat(data.consentPhotoEffectiveDate, 'consentPhotoEffectiveDate'));
  }
  
  // ✅ FIX #2: Support both old and new field names for backwards compatibility
  const expirationDate = data.consentPhotoExpirationDate || data.consentPhotoExpireDate;
  if (expirationDate) {
    Object.assign(errors, validateDateFormat(expirationDate, 'consentPhotoExpirationDate'));
  }
  
  // Validate expiration after effective (only if both dates are valid and provided)
  if (data.consentPhotoEffectiveDate && expirationDate) {
    const effectiveErrors = validateDateFormat(data.consentPhotoEffectiveDate, 'consentPhotoEffectiveDate');
    const expirationErrors = validateDateFormat(expirationDate, 'consentPhotoExpirationDate');
    
    // Only compare dates if both are valid
    if (Object.keys(effectiveErrors).length === 0 && Object.keys(expirationErrors).length === 0) {
      // Use UTC to avoid timezone issues
      const effective = new Date(data.consentPhotoEffectiveDate + 'T00:00:00Z');
      const expiration = new Date(expirationDate + 'T00:00:00Z');
      if (expiration <= effective) {
        errors.consentPhotoExpirationDate = 'Expiration date must be after effective date';
      }
    }
  }
  
  // ✅ FIX #3: Validate array items - must be valid strings
  if (Array.isArray(data.clientReleaseItems) && data.clientReleaseItems.length > 0) {
    const hasInvalidItems = data.clientReleaseItems.some(item => 
      item === null || item === undefined || item === '' || typeof item !== 'string'
    );
    if (hasInvalidItems) {
      errors.clientReleaseItems = 'All release items must be valid strings';
    }
  }
  
  if (Array.isArray(data.clientReleasePurposes) && data.clientReleasePurposes.length > 0) {
    const hasInvalidItems = data.clientReleasePurposes.some(item => 
      item === null || item === undefined || item === '' || typeof item !== 'string'
    );
    if (hasInvalidItems) {
      errors.clientReleasePurposes = 'All release purpose items must be valid strings';
    }
  }
  
  return errors;
}

// ============================================================================
// FORM METADATA - priorities and display numbers match frontend FORM_CONFIGS
// ============================================================================

const FORM_METADATA = {
  orientation:      { formNumber: 1,  priority: 'high'   },
  clientRights:     { formNumber: 2,  priority: 'high'   },
  consentTreatment: { formNumber: 3,  priority: 'high'   },
  preScreen:        { formNumber: 4,  priority: 'medium' },
  privacyPractice:  { formNumber: 5,  priority: 'medium' },
  lahmis:           { formNumber: 6,  priority: 'medium' },
  phiRelease:       { formNumber: 7,  priority: 'medium' },
  residencePolicy:  { formNumber: 8,  priority: 'medium' },
  authDisclosure:   { formNumber: 9,  priority: 'medium' },
  termination:      { formNumber: 10, priority: 'low'    },
  advDirective:     { formNumber: 11, priority: 'medium' },
  grievances:       { formNumber: 12, priority: 'medium' },
  healthDisclosure: { formNumber: 13, priority: 'medium' },
  consentPhoto:     { formNumber: 14, priority: 'medium' },
  housingAgreement: { formNumber: 15, priority: 'low'    },
  calaimVerbalOptIn:{ formNumber: 16, priority: 'high'   },
};

// Per-form signature field names, as sent by each form's getFormData()
const SIGNATURE_FIELDS = {
  orientation:      'signature',
  clientRights:     'signature',
  consentTreatment: 'signature',
  preScreen:        'signature',
  privacyPractice:  'signature',
  lahmis:           'signature',
  phiRelease:       'signature',
  residencePolicy:  'resPolicySignature',
  authDisclosure:   'atrClientSign',
  termination:      'tppSign',
  advDirective:     'clientSignature',
  grievances:       'clientGrievanceSign',
  healthDisclosure: 'atrClientSign',
  consentPhoto:     'consentPhotoSign1',
  housingAgreement: 'housingAgreeeSign',
  calaimVerbalOptIn:'signature',
};

/**
 * A form is complete (and therefore locked) only once it carries a signature.
 * The client-sent completionPercentage is display-only: trusting it would
 * lock forms that were never signed.
 */
function isFormComplete(formType, formData) {
  const sigField = SIGNATURE_FIELDS[formType] || 'signature';
  return !!(formData[sigField] && String(formData[sigField]).trim().length >= 2);
}

/**
 * Remove the client signature from a stored formData blob so the form must be
 * signed again after an unlock. Some forms (PrivacyPractice) also nest their
 * fields under a `formData` key.
 */
function clearSignatureFields(formType, data) {
  const fields = new Set([SIGNATURE_FIELDS[formType] || 'signature', 'signature', 'clientSignature']);
  const strip = (obj) => {
    const out = { ...obj };
    fields.forEach(f => { delete out[f]; });
    return out;
  };
  const cleared = strip(data);
  if (cleared.formData && typeof cleared.formData === 'object' && !Array.isArray(cleared.formData)) {
    cleared.formData = strip(cleared.formData);
  }
  return cleared;
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /:clientID/forms
 * Get all authorization forms status for a client — used by dashboard & export.
 * This was the MISSING endpoint causing completion%, completedBy, completedAt,
 * createdBy, and submissionID to always show N/A / 0%.
 */
router.get('/:clientID/forms', async (req, res) => {
  const { clientID } = req.params;

  try {
    const pool = await poolPromise;

    // Fetch all saved forms for this client — read every dedicated column
    const formsResult = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT formID, formType, status, priority,
               completionPercentage, completedBy, completedAt,
               createdBy, createdAt, updatedBy, updatedAt,
               submissionID, lastAutoSave
        FROM AuthorizationForms
        WHERE clientID = @clientID
      `);

    // Fetch latest submission record (for submissionID)
    const submissionResult = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT TOP 1 submissionID, status AS submissionStatus,
                     submittedBy, submittedAt
        FROM FormSubmissions
        WHERE clientID = @clientID
        ORDER BY submittedAt DESC
      `);

    const submission = submissionResult.recordset[0] || null;

    // Index rows by formType — no need to parse formData JSON for the list view,
    // all display fields are now in dedicated columns.
    const dbForms = {};
    formsResult.recordset.forEach(row => {
      dbForms[row.formType] = row;
    });

    // Build full response for all 15 form types
    const forms = {};
    let completedCount = 0;

    VALID_FORM_TYPES.forEach(formType => {
      const meta = FORM_METADATA[formType] || { formNumber: 0, priority: 'medium' };
      const row  = dbForms[formType];

      if (!row) {
        forms[formType] = {
          formNumber:          meta.formNumber,
          priority:            meta.priority,
          status:              'not_started',
          completionPercentage: 0,
          completedBy:         null,
          completedAt:         null,
          createdBy:           null,
          createdAt:           null,
          updatedBy:           null,
          lastUpdated:         null,
          submissionID:        submission?.submissionID || null,
        };
        return;
      }

      if (row.status === 'completed') completedCount++;

      forms[formType] = {
        formNumber:          meta.formNumber,
        // Use the stored priority column; fall back to metadata default
        priority:            row.priority            || meta.priority,
        status:              row.status              || 'draft',
        completionPercentage: Number(row.completionPercentage ?? 0),
        completedBy:         row.completedBy         || null,
        completedAt:         row.completedAt         || null,
        createdBy:           row.createdBy           || null,
        createdAt:           row.createdAt           || null,
        updatedBy:           row.updatedBy           || null,
        lastUpdated:         row.updatedAt           || null,
        lastAutoSave:        row.lastAutoSave        || null,
        // Prefer the form's own FK submissionID column; fall back to latest submission
        submissionID:        row.submissionID        || submission?.submissionID || null,
      };
    });

    const overallCompletion = Math.round((completedCount / VALID_FORM_TYPES.length) * 100);

    logUserAction(getCurrentUser(req), 'GET', 'AuthorizationForms');

    res.json({
      clientID,
      forms,
      overallCompletion,
      totalForms:    VALID_FORM_TYPES.length,
      completedForms: completedCount,
      lastUpdated:   new Date().toISOString(),
      submission:    submission || null,
    });

  } catch (err) {
    console.error('Error fetching authorization forms list:', err);
    res.status(500).json({
      message: 'Error fetching authorization forms',
      error: err.message,
    });
  }
});

/**
 * POST /:clientID/form/:formType
 * Create or update an authorization form
 */
router.post('/:clientID/form/:formType', async (req, res) => {
  const { clientID, formType } = req.params;
  
  try {
    const pool = await poolPromise;
    
    // Validate form type
    if (!VALID_FORM_TYPES.includes(formType)) {
      return res.status(400).json({ 
        message: `Invalid form type: ${formType}`,
        validFormTypes: VALID_FORM_TYPES
      });
    }
    
    // Signed (completed), submitted and approved forms are locked
    const statusCheck = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('formType', sql.VarChar(50), formType)
      .query('SELECT status FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');

    if (statusCheck.recordset.length > 0) {
      const currentStatus = statusCheck.recordset[0].status;
      if (isLockedStatus(currentStatus)) {
        return lockedResponse(res, currentStatus);
      }
    }
    
    // Run validations
    let errors = {};
    
    // Form-specific validations
    if (formType === 'orientation') {
      Object.assign(errors, validateSignature(req.body.signature));
      Object.assign(errors, validateCheckboxes(req.body.checkboxes));
    }
    
    if (formType === 'clientRights') {
      Object.assign(errors, validateSignature(req.body.signature));
      Object.assign(errors, validateAcknowledged(req.body.acknowledged));
    }
    
    if (formType === 'consentPhoto') {
      // consentPhoto uses consentPhotoSign1 instead of signature field
      // Don't validate signature field for this form type
      Object.assign(errors, validateConsentPhoto(req.body));
    }
    
    // Validate completion percentage for all forms
    Object.assign(errors, validateCompletionPercentage(req.body.completionPercentage));
    
    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      console.log('🔴 Validation errors for', formType, ':', JSON.stringify(errors, null, 2));
      return res.status(422).json({ 
        message: 'Validation failed',
        errors 
      });
    }
    
    // ─── Resolve save metadata ───────────────────────────────────────────────
    const incomingPct  = Number(req.body.completionPercentage ?? 0);
    const isComplete   = isFormComplete(formType, req.body);
    const newStatus    = isComplete ? 'completed' : 'in_progress';
    const currentUser  = getCurrentUser(req);
    const now          = new Date();

    // priority: honour whatever the frontend sent, default to schema value
    const formPriority = req.body.priority || FORM_METADATA[formType]?.priority || 'medium';

    // checkboxData: some forms (orientation) keep checkboxes in a dedicated field
    const checkboxData = req.body.checkboxes
      ? JSON.stringify(req.body.checkboxes)
      : req.body.checkboxData || null;

    // signature: use the canonical top-level signature field when present
    const signature = req.body.signature || null;

    // Strip fields that are stored as dedicated columns out of the JSON blob
    // so we don't duplicate data between columns and the blob.
    const { checkboxes, priority: _p, completionPercentage: _pct, status: _s,
            completedBy: _cb, completedAt: _ca, createdBy: _crb, updatedBy: _ub,
            submissionID: _sid, signature: _sig, checkboxData: _cd,
            unlockedBy: _ulb, unlockedAt: _ula, unlockReason: _ulr, locked: _lk,
            ...formDataPayload } = req.body;

    const formDataJson = JSON.stringify({
      ...formDataPayload,
      clientID,
      formType,
    });

    // ─── Check if form already exists ───────────────────────────────────────
    const existingForm = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('formType', sql.VarChar(50), formType)
      .query(`
        SELECT formID, status, createdBy, completedBy, completedAt
        FROM AuthorizationForms
        WHERE clientID = @clientID AND formType = @formType
      `);

    const isNew = existingForm.recordset.length === 0;
    const prev  = existingForm.recordset[0] || {};

    if (isNew) {
      // ── INSERT ─────────────────────────────────────────────────────────────
      await pool.request()
        .input('clientID',             sql.NVarChar(50),         clientID)
        .input('formType',             sql.NVarChar(50),         formType)
        .input('formData',             sql.NVarChar(sql.MAX),    formDataJson)
        .input('checkboxData',         sql.NVarChar(sql.MAX),    checkboxData)
        .input('signature',            sql.NVarChar(200),        signature)
        .input('completionPercentage', sql.Decimal(5, 2),        incomingPct)
        .input('status',               sql.NVarChar(20),         newStatus)
        .input('priority',             sql.NVarChar(10),         formPriority)
        .input('createdBy',            sql.NVarChar(100),        currentUser)
        .input('updatedBy',            sql.NVarChar(100),        currentUser)
        .input('completedBy',          sql.NVarChar(100),        isComplete ? currentUser : null)
        .input('completedAt',          sql.DateTime2,            isComplete ? now : null)
        .query(`
          INSERT INTO AuthorizationForms
            (clientID, formType, formData, checkboxData, signature,
             completionPercentage, status, priority,
             completedBy, completedAt,
             createdBy, updatedBy, createdAt, updatedAt)
          VALUES
            (@clientID, @formType, @formData, @checkboxData, @signature,
             @completionPercentage, @status, @priority,
             @completedBy, @completedAt,
             @createdBy, @updatedBy, GETDATE(), GETDATE())
        `);

      logUserAction(getCurrentUser(req), 'CREATE', 'AuthorizationForm');

    } else {
      // ── UPDATE ─────────────────────────────────────────────────────────────
      // Only set completedBy/completedAt on the transition to completed —
      // don't overwrite them if a form is being re-edited after completion.
      const wasCompleted   = prev.status === 'completed';
      const nowCompleted   = isComplete;
      const completedBy    = nowCompleted ? (prev.completedBy || currentUser) : prev.completedBy;
      const completedAt    = nowCompleted ? (prev.completedAt || now)         : prev.completedAt;

      await pool.request()
        .input('clientID',             sql.NVarChar(50),         clientID)
        .input('formType',             sql.NVarChar(50),         formType)
        .input('formData',             sql.NVarChar(sql.MAX),    formDataJson)
        .input('checkboxData',         sql.NVarChar(sql.MAX),    checkboxData)
        .input('signature',            sql.NVarChar(200),        signature)
        .input('completionPercentage', sql.Decimal(5, 2),        incomingPct)
        .input('status',               sql.NVarChar(20),         newStatus)
        .input('priority',             sql.NVarChar(10),         formPriority)
        .input('updatedBy',            sql.NVarChar(100),        currentUser)
        .input('completedBy',          sql.NVarChar(100),        completedBy  || null)
        .input('completedAt',          sql.DateTime2,            completedAt  || null)
        .query(`
          UPDATE AuthorizationForms
          SET formData             = @formData,
              checkboxData         = @checkboxData,
              signature            = @signature,
              completionPercentage = @completionPercentage,
              status               = @status,
              priority             = @priority,
              updatedBy            = @updatedBy,
              updatedAt            = GETDATE(),
              completedBy          = @completedBy,
              completedAt          = @completedAt
          WHERE clientID = @clientID AND formType = @formType
        `);

      logUserAction(getCurrentUser(req), 'UPDATE', 'AuthorizationForm');
    }

    res.json({
      message:             isNew ? 'Form created successfully' : 'Form updated successfully',
      clientID,
      formType,
      status:              newStatus,
      completionPercentage: incomingPct,
      priority:            formPriority,
      completedBy:         isComplete ? (prev.completedBy || currentUser) : null,
      completedAt:         isComplete ? (prev.completedAt || now.toISOString()) : null,
      createdBy:           isNew ? currentUser : (prev.createdBy || null),
      lastSaved:           now.toISOString(),
    });
    
  } catch (err) {
    console.error('Form save error:', err);
    res.status(500).json({ 
      message: 'Error saving form',
      error: err.message 
    });
  }
});

/**
 * GET /:clientID/form/:formType
 * Retrieve a specific authorization form
 */
router.get('/:clientID/form/:formType', async (req, res) => {
  const { clientID, formType } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('formType', sql.VarChar(50), formType)
      .query('SELECT * FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    const form     = result.recordset[0];
    let formData   = {};
    try { formData = JSON.parse(form.formData || '{}'); } catch (_) {}

    let checkboxData = formData.checkboxes || null;
    if (form.checkboxData) {
      try { checkboxData = JSON.parse(form.checkboxData); } catch (_) {}
    }

    // Dedicated columns are authoritative — they were written explicitly on save.
    // formData JSON is supplementary (contains the actual field values for the form UI).
    logUserAction(getCurrentUser(req), 'GET', 'AuthorizationForm');

    res.json({
      // Form UI fields from the JSON blob
      ...formData,
      // Dedicated columns override anything in the blob
      formID:              form.formID,
      clientID:            form.clientID,
      formType:            form.formType,
      checkboxData,
      // Forms (e.g. orientation) read their checkbox state back as `checkboxes`
      checkboxes:          checkboxData,
      signature:           form.signature    || formData.signature || null,
      completionPercentage: Number(form.completionPercentage ?? formData.completionPercentage ?? 0),
      status:              form.status,
      priority:            form.priority,
      submissionID:        form.submissionID || null,
      completedBy:         form.completedBy  || null,
      completedAt:         form.completedAt  || null,
      createdBy:           form.createdBy    || null,
      createdAt:           form.createdAt,
      updatedBy:           form.updatedBy    || null,
      updatedAt:           form.updatedAt,
      locked:              isLockedStatus(form.status),
      canUnlock:           canUnlockSignedForms(req.user),
      unlockedBy:          form.unlockedBy   || null,
      unlockedAt:          form.unlockedAt   || null,
      unlockReason:        form.unlockReason || null,
    });
    
  } catch (err) {
    console.error('Error fetching form:', err);
    res.status(500).json({ 
      message: 'Error fetching form',
      error: err.message 
    });
  }
});

/**
 * POST /:clientID/form/:formType/autosave
 * Autosave form data (draft status)
 */
router.post('/:clientID/form/:formType/autosave', async (req, res) => {
  const { clientID, formType } = req.params;

  if (!VALID_FORM_TYPES.includes(formType)) {
    return res.status(400).json({ message: `Invalid form type: ${formType}` });
  }

  try {
    const pool        = await poolPromise;
    const currentUser = getCurrentUser(req);
    const incomingPct = Number(req.body.completionPercentage ?? 0);
    const formPriority = req.body.priority || FORM_METADATA[formType]?.priority || 'medium';

    // Strip dedicated-column fields from the JSON blob
    const { checkboxes, priority: _p, completionPercentage: _pct, status: _s,
            completedBy: _cb, completedAt: _ca, createdBy: _crb, updatedBy: _ub,
            submissionID: _sid, signature: _sig, checkboxData: _cd,
            unlockedBy: _ulb, unlockedAt: _ula, unlockReason: _ulr, locked: _lk,
            ...formDataPayload } = req.body;

    const formDataJson = JSON.stringify({ ...formDataPayload, clientID, formType });
    const checkboxData = req.body.checkboxes ? JSON.stringify(req.body.checkboxes) : req.body.checkboxData || null;

    // Check if form exists
    const existingForm = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('formType', sql.NVarChar(50), formType)
      .query('SELECT formID, status FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');

    const currentStatus = existingForm.recordset[0]?.status;
    if (isLockedStatus(currentStatus)) {
      return lockedResponse(res, currentStatus);
    }

    if (existingForm.recordset.length > 0) {
      await pool.request()
        .input('clientID',             sql.NVarChar(50),      clientID)
        .input('formType',             sql.NVarChar(50),      formType)
        .input('formData',             sql.NVarChar(sql.MAX), formDataJson)
        .input('checkboxData',         sql.NVarChar(sql.MAX), checkboxData)
        .input('completionPercentage', sql.Decimal(5, 2),     incomingPct)
        .input('priority',             sql.NVarChar(10),      formPriority)
        .input('updatedBy',            sql.NVarChar(100),     currentUser)
        .query(`
          UPDATE AuthorizationForms
          SET formData             = @formData,
              checkboxData         = @checkboxData,
              completionPercentage = @completionPercentage,
              priority             = @priority,
              updatedBy            = @updatedBy,
              lastAutoSave         = GETDATE(),
              updatedAt            = GETDATE()
          WHERE clientID = @clientID AND formType = @formType
        `);
    } else {
      await pool.request()
        .input('clientID',             sql.NVarChar(50),      clientID)
        .input('formType',             sql.NVarChar(50),      formType)
        .input('formData',             sql.NVarChar(sql.MAX), formDataJson)
        .input('checkboxData',         sql.NVarChar(sql.MAX), checkboxData)
        .input('completionPercentage', sql.Decimal(5, 2),     incomingPct)
        .input('status',               sql.NVarChar(20),      'in_progress')
        .input('priority',             sql.NVarChar(10),      formPriority)
        .input('createdBy',            sql.NVarChar(100),     currentUser)
        .input('updatedBy',            sql.NVarChar(100),     currentUser)
        .query(`
          INSERT INTO AuthorizationForms
            (clientID, formType, formData, checkboxData, completionPercentage,
             status, priority, createdBy, updatedBy, lastAutoSave, createdAt, updatedAt)
          VALUES
            (@clientID, @formType, @formData, @checkboxData, @completionPercentage,
             @status, @priority, @createdBy, @updatedBy, GETDATE(), GETDATE(), GETDATE())
        `);
    }

    res.json({
      message:             'Form autosaved',
      clientID,
      formType,
      completionPercentage: incomingPct,
      autoSavedAt:         new Date().toISOString(),
    });

  } catch (err) {
    console.error('Autosave error:', err);
    res.status(500).json({ message: 'Error autosaving form', error: err.message });
  }
});

/**
 * POST /:clientID/forms/bulk
 * Save multiple forms at once
 */
router.post('/:clientID/forms/bulk', async (req, res) => {
  const { clientID } = req.params;
  const { forms } = req.body;

  if (!Array.isArray(forms)) {
    return res.status(400).json({ message: 'forms must be an array' });
  }
  if (forms.length === 0) {
    return res.status(400).json({ message: 'forms array cannot be empty' });
  }

  try {
    const pool        = await poolPromise;
    const currentUser = getCurrentUser(req);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const results = [];

    try {
      for (const form of forms) {
        const { formType, ...rest } = form;

        if (!VALID_FORM_TYPES.includes(formType)) continue;

        const incomingPct  = Number(rest.completionPercentage ?? 0);
        const isComplete   = isFormComplete(formType, rest);
        const newStatus    = isComplete ? 'completed' : 'in_progress';
        const formPriority = rest.priority || FORM_METADATA[formType]?.priority || 'medium';
        const checkboxData = rest.checkboxes ? JSON.stringify(rest.checkboxes) : rest.checkboxData || null;
        const signature    = rest.signature || null;
        const now          = new Date();

        const { checkboxes, priority: _p, completionPercentage: _pct, status: _s,
                completedBy: _cb, completedAt: _ca, createdBy: _crb, updatedBy: _ub,
                submissionID: _sid, signature: _sig, checkboxData: _cd,
                unlockedBy: _ulb, unlockedAt: _ula, unlockReason: _ulr, locked: _lk,
                ...formDataPayload } = rest;

        const formDataJson = JSON.stringify({ ...formDataPayload, clientID, formType });

        const existing = await transaction.request()
          .input('clientID', sql.NVarChar(50), clientID)
          .input('formType', sql.NVarChar(50), formType)
          .query('SELECT formID, status, createdBy, completedBy, completedAt FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');

        const prev = existing.recordset[0] || null;

        if (prev && isLockedStatus(prev.status)) {
          await transaction.rollback();
          return res.status(409).json({
            code: 'FORM_LOCKED',
            message: `Form ${formType} has been signed and is locked. No forms were saved.`,
            formType,
            currentStatus: prev.status,
          });
        }

        if (prev) {
          const completedBy = isComplete ? (prev.completedBy || currentUser) : prev.completedBy;
          const completedAt = isComplete ? (prev.completedAt || now)         : prev.completedAt;

          await transaction.request()
            .input('clientID',             sql.NVarChar(50),      clientID)
            .input('formType',             sql.NVarChar(50),      formType)
            .input('formData',             sql.NVarChar(sql.MAX), formDataJson)
            .input('checkboxData',         sql.NVarChar(sql.MAX), checkboxData)
            .input('signature',            sql.NVarChar(200),     signature)
            .input('completionPercentage', sql.Decimal(5, 2),     incomingPct)
            .input('status',               sql.NVarChar(20),      newStatus)
            .input('priority',             sql.NVarChar(10),      formPriority)
            .input('updatedBy',            sql.NVarChar(100),     currentUser)
            .input('completedBy',          sql.NVarChar(100),     completedBy || null)
            .input('completedAt',          sql.DateTime2,         completedAt || null)
            .query(`
              UPDATE AuthorizationForms
              SET formData             = @formData,
                  checkboxData         = @checkboxData,
                  signature            = @signature,
                  completionPercentage = @completionPercentage,
                  status               = @status,
                  priority             = @priority,
                  updatedBy            = @updatedBy,
                  updatedAt            = GETDATE(),
                  completedBy          = @completedBy,
                  completedAt          = @completedAt
              WHERE clientID = @clientID AND formType = @formType
            `);
        } else {
          await transaction.request()
            .input('clientID',             sql.NVarChar(50),      clientID)
            .input('formType',             sql.NVarChar(50),      formType)
            .input('formData',             sql.NVarChar(sql.MAX), formDataJson)
            .input('checkboxData',         sql.NVarChar(sql.MAX), checkboxData)
            .input('signature',            sql.NVarChar(200),     signature)
            .input('completionPercentage', sql.Decimal(5, 2),     incomingPct)
            .input('status',               sql.NVarChar(20),      newStatus)
            .input('priority',             sql.NVarChar(10),      formPriority)
            .input('createdBy',            sql.NVarChar(100),     currentUser)
            .input('updatedBy',            sql.NVarChar(100),     currentUser)
            .input('completedBy',          sql.NVarChar(100),     isComplete ? currentUser : null)
            .input('completedAt',          sql.DateTime2,         isComplete ? now : null)
            .query(`
              INSERT INTO AuthorizationForms
                (clientID, formType, formData, checkboxData, signature,
                 completionPercentage, status, priority,
                 completedBy, completedAt,
                 createdBy, updatedBy, createdAt, updatedAt)
              VALUES
                (@clientID, @formType, @formData, @checkboxData, @signature,
                 @completionPercentage, @status, @priority,
                 @completedBy, @completedAt,
                 @createdBy, @updatedBy, GETDATE(), GETDATE())
            `);
        }

        results.push({ formType, status: newStatus, completionPercentage: incomingPct, success: true });
      }

      await transaction.commit();

      res.json({
        message:    'Forms saved successfully',
        savedForms: results.length,
        results,
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Bulk save error:', err);
    res.status(500).json({ message: 'Error saving forms', error: err.message });
  }
});

/**
 * FIX #4, #5, #6: Submit all completed forms
 * POST /:clientID/submit
 */
router.post('/:clientID/submit', async (req, res) => {
  const { clientID } = req.params;
  const { submissionNotes } = req.body;
  
  try {
    const pool = await poolPromise;
    
    // Get all forms for this client
    const formsResult = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query('SELECT formType, status FROM AuthorizationForms WHERE clientID = @clientID');
    
    if (formsResult.recordset.length === 0) {
      return res.status(404).json({ message: 'No forms found for this client' });
    }
    
    // Check if all required forms are completed
    const requiredFormTypes = ['orientation', 'clientRights', 'consentPhoto'];
    
    const existingForms = formsResult.recordset.reduce((acc, form) => {
      acc[form.formType] = form.status;
      return acc;
    }, {});
    
    const incompleteRequired = requiredFormTypes.filter(
      type => !existingForms[type] || existingForms[type] !== 'completed'
    );
    
    if (incompleteRequired.length > 0) {
      return res.status(400).json({ 
        message: 'Not all required forms are completed',
        incompleteFormTypes: incompleteRequired
      });
    }
    
    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Update all forms to submitted status
      await transaction.request()
        .input('clientID', sql.VarChar(50), clientID)
        .query('UPDATE AuthorizationForms SET status = \'submitted\', updatedAt = GETDATE() WHERE clientID = @clientID');
      
      // Create submission record
      const submissionResult = await transaction.request()
        .input('clientID', sql.VarChar(50), clientID)
        .input('submissionNotes', sql.Text, submissionNotes || '')
        .input('submittedBy', sql.VarChar(100), getCurrentUser(req))
        .query(`
          INSERT INTO FormSubmissions 
            (clientID, status, submittedBy, submittedAt, notes)
          OUTPUT INSERTED.submissionID
          VALUES 
            (@clientID, 'submitted', @submittedBy, GETDATE(), @submissionNotes)
        `);
      
      await transaction.commit();
      
      const submissionID = submissionResult.recordset[0].submissionID;
      
      res.json({ 
        message: 'Forms submitted successfully',
        submissionID,
        submittedForms: formsResult.recordset.length
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Form submission error:', err);
    res.status(500).json({ 
      message: 'Error submitting forms',
      error: err.message 
    });
  }
});

/**
 * FIX #7: Get submission status
 * GET /:clientID/submission-status
 */
router.get('/:clientID/submission-status', async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT 
          submissionID,
          status,
          submittedBy,
          submittedAt,
          approvedBy,
          approvedAt,
          notes
        FROM FormSubmissions
        WHERE clientID = @clientID
        ORDER BY submittedAt DESC
      `);
    
    if (result.recordset.length === 0) {
      return res.json({ 
        status: 'draft',
        message: 'No submission found for this client'
      });
    }
    
    // Log action
    logUserAction(getCurrentUser(req), 'GET', 'FormSubmission');
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching submission status:', err);
    res.status(500).json({ 
      message: 'Error fetching submission status',
      error: err.message 
    });
  }
});

/**
 * POST /:clientID/form/:formType/unlock
 * IT Admin / Level 1 only. Archives the signed version to
 * AuthorizationFormVersions, clears the client signature and returns the form
 * to in_progress so it must be signed again. Body: { reason }
 */
router.post('/:clientID/form/:formType/unlock', requireSignedFormUnlock, async (req, res) => {
  const { clientID, formType } = req.params;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  if (!VALID_FORM_TYPES.includes(formType)) {
    return res.status(400).json({ message: `Invalid form type: ${formType}` });
  }
  if (reason.length < 5 || reason.length > 500) {
    return res.status(422).json({ message: 'A reason between 5 and 500 characters is required to unlock a signed form' });
  }

  const currentUser = getCurrentUser(req);
  const now = new Date();

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // UPDLOCK so a concurrent save or unlock can't slip in between read and write
      const existing = await transaction.request()
        .input('clientID', sql.NVarChar(50), clientID)
        .input('formType', sql.NVarChar(50), formType)
        .query(`
          SELECT formID, formData, checkboxData, signature, status, completionPercentage,
                 completedBy, completedAt, submissionID
          FROM AuthorizationForms WITH (UPDLOCK, HOLDLOCK)
          WHERE clientID = @clientID AND formType = @formType
        `);

      const form = existing.recordset[0];
      if (!form) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Form not found' });
      }
      if (!isLockedStatus(form.status)) {
        await transaction.rollback();
        return res.status(409).json({ code: 'FORM_NOT_LOCKED', message: 'Form is not signed or locked', currentStatus: form.status });
      }

      // Keep the signed version exactly as it was
      await transaction.request()
        .input('formID',               sql.Int,               form.formID)
        .input('clientID',             sql.NVarChar(50),      clientID)
        .input('formType',             sql.NVarChar(50),      formType)
        .input('formData',             sql.NVarChar(sql.MAX), form.formData)
        .input('checkboxData',         sql.NVarChar(sql.MAX), form.checkboxData)
        .input('signature',            sql.NVarChar(200),     form.signature)
        .input('status',               sql.NVarChar(20),      form.status)
        .input('completionPercentage', sql.Decimal(5, 2),     form.completionPercentage)
        .input('completedBy',          sql.NVarChar(100),     form.completedBy)
        .input('completedAt',          sql.DateTime2,         form.completedAt)
        .input('submissionID',         sql.Int,               form.submissionID)
        .input('archivedBy',           sql.NVarChar(100),     currentUser)
        .input('archivedAt',           sql.DateTime2,         now)
        .input('unlockReason',         sql.NVarChar(500),     reason)
        .query(`
          INSERT INTO AuthorizationFormVersions
            (formID, clientID, formType, formData, checkboxData, signature, status,
             completionPercentage, completedBy, completedAt, submissionID,
             archivedReason, archivedBy, archivedAt, unlockReason)
          VALUES
            (@formID, @clientID, @formType, @formData, @checkboxData, @signature, @status,
             @completionPercentage, @completedBy, @completedAt, @submissionID,
             'unlock', @archivedBy, @archivedAt, @unlockReason)
        `);

      let formData = {};
      try { formData = JSON.parse(form.formData || '{}'); } catch (_) {}
      const clearedFormData = JSON.stringify(clearSignatureFields(formType, formData));

      await transaction.request()
        .input('formID',       sql.Int,               form.formID)
        .input('formData',     sql.NVarChar(sql.MAX), clearedFormData)
        .input('updatedBy',    sql.NVarChar(100),     currentUser)
        .input('unlockedAt',   sql.DateTime2,         now)
        .input('unlockReason', sql.NVarChar(500),     reason)
        .query(`
          UPDATE AuthorizationForms
          SET status       = 'in_progress',
              signature    = NULL,
              formData     = @formData,
              completedBy  = NULL,
              completedAt  = NULL,
              unlockedBy   = @updatedBy,
              unlockedAt   = @unlockedAt,
              unlockReason = @unlockReason,
              updatedBy    = @updatedBy,
              updatedAt    = @unlockedAt
          WHERE formID = @formID
        `);

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }

    // Admin audit trail. The reason is free text that may contain PHI, so it
    // stays in AuthorizationForms / AuthorizationFormVersions only. The archived
    // version and unlock columns are the durable record; failure here is non-fatal.
    try {
      await pool.request()
        .input('userID',    sql.NVarChar(100),     currentUser)
        .input('action',    sql.NVarChar(50),      'UNLOCK_SIGNED_FORM')
        .input('tableName', sql.NVarChar(100),     'AuthorizationForms')
        .input('recordID',  sql.NVarChar(100),     `${clientID}:${formType}`)
        .input('newValues', sql.NVarChar(sql.MAX), JSON.stringify({ clientID, formType }))
        .input('timestamp', sql.DateTime2,         now)
        .query(`INSERT INTO dbo.AuditLog (userID, action, tableName, recordID, newValues, timestamp)
                VALUES (@userID, @action, @tableName, @recordID, @newValues, @timestamp)`);
    } catch (auditErr) {
      console.warn('Audit log failed (non-fatal):', auditErr.message);
    }

    res.json({
      message:      'Form unlocked. The client must sign again.',
      clientID,
      formType,
      status:       'in_progress',
      unlockedBy:   currentUser,
      unlockedAt:   now.toISOString(),
      unlockReason: reason,
    });
  } catch (err) {
    console.error('Form unlock error:', err.message);
    res.status(500).json({ message: 'Error unlocking form' });
  }
});

// Export router
module.exports = router;
module.exports.isFormComplete = isFormComplete;
module.exports.clearSignatureFields = clearSignatureFields;