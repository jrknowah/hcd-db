// backend/routes/authSig.js - Complete with all fixes
const express = require('express');
const sql = require('mssql');
const { poolPromise } = require('../store/azureSql');
const { logUserAction } = require('../config/logAction');

const router = express.Router();

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
  'housingAgreement'     // ← Was missing
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
 */
function validateConsentPhoto(data) {
  let errors = {};
  
  // Validate arrays
  Object.assign(errors, validateArrayField('clientReleaseItems', data.clientReleaseItems));
  Object.assign(errors, validateArrayField('clientReleasePurposes', data.clientReleasePurposes));
  
  // Validate dates (only if provided)
  if (data.consentPhotoEffectiveDate) {
    Object.assign(errors, validateDateFormat(data.consentPhotoEffectiveDate, 'consentPhotoEffectiveDate'));
  }
  if (data.consentPhotoExpirationDate) {
    Object.assign(errors, validateDateFormat(data.consentPhotoExpirationDate, 'consentPhotoExpirationDate'));
  }
  if (data.consentPhotoSign1) {
    Object.assign(errors, validateDateFormat(data.consentPhotoSign1, 'consentPhotoSign1'));
  }
  
  // Validate expiration after effective (only if both dates are valid)
  if (data.consentPhotoEffectiveDate && data.consentPhotoExpirationDate) {
    const effectiveErrors = validateDateFormat(data.consentPhotoEffectiveDate, 'consentPhotoEffectiveDate');
    const expirationErrors = validateDateFormat(data.consentPhotoExpirationDate, 'consentPhotoExpirationDate');
    
    // Only compare dates if both are valid
    if (Object.keys(effectiveErrors).length === 0 && Object.keys(expirationErrors).length === 0) {
      const effective = new Date(data.consentPhotoEffectiveDate);
      const expiration = new Date(data.consentPhotoExpirationDate);
      if (expiration <= effective) {
        errors.consentPhotoExpirationDate = 'Expiration date must be after effective date';
      }
    }
  }
  
  // Validate array items structure (only check for null, undefined, empty strings)
  if (Array.isArray(data.clientReleaseItems) && data.clientReleaseItems.length > 0) {
    const hasInvalidItems = data.clientReleaseItems.some(item => 
      item === null || item === undefined || item === ''
    );
    if (hasInvalidItems) {
      errors.clientReleaseItems = 'All release items must be valid strings';
    }
  }
  
  return errors;
}

// ============================================================================
// ROUTES
// ============================================================================

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
    
    // FIX #8: Check if form exists and prevent updates to submitted/approved forms
    const statusCheck = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('formType', sql.VarChar(50), formType)
      .query('SELECT status FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
    
    if (statusCheck.recordset.length > 0) {
      const currentStatus = statusCheck.recordset[0].status;
      if (currentStatus === 'submitted' || currentStatus === 'approved') {
        return res.status(409).json({ 
          message: `Cannot modify form with status: ${currentStatus}`,
          currentStatus 
        });
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
    
    // Prepare form data
    const formData = {
      ...req.body,
      clientID,
      formType,
      status: req.body.signature && req.body.completionPercentage === 100 ? 'completed' : 'draft',
      updatedAt: new Date()
    };
    
    // Check if form exists
    const existingForm = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('formType', sql.VarChar(50), formType)
      .query('SELECT * FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
    
    let result;
    
    if (existingForm.recordset.length > 0) {
      // Update existing form
      result = await pool.request()
        .input('clientID', sql.VarChar(50), clientID)
        .input('formType', sql.VarChar(50), formType)
        .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(formData))
        .input('status', sql.VarChar(20), formData.status)
        .query(`
          UPDATE AuthorizationForms 
          SET formData = @formData,
              status = @status,
              updatedAt = GETDATE()
          WHERE clientID = @clientID AND formType = @formType
        `);
      
      // Log action
      logUserAction(req, 'UPDATE', 'AuthorizationForm');
    } else {
      // Insert new form
      result = await pool.request()
        .input('clientID', sql.VarChar(50), clientID)
        .input('formType', sql.VarChar(50), formType)
        .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(formData))
        .input('status', sql.VarChar(20), formData.status)
        .query(`
          INSERT INTO AuthorizationForms 
            (clientID, formType, formData, status, createdAt, updatedAt)
          VALUES 
            (@clientID, @formType, @formData, @status, GETDATE(), GETDATE())
        `);
      
      // Log action
      logUserAction(req, 'CREATE', 'AuthorizationForm');
    }
    
    res.json({ 
      message: existingForm.recordset.length > 0 ? 'Form updated successfully' : 'Form created successfully',
      clientID,
      formType,
      status: formData.status,
      formData
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
    
    const form = result.recordset[0];
    const formData = JSON.parse(form.formData || '{}');
    
    // Log action
    logUserAction(req, 'GET', 'AuthorizationForm');
    
    res.json({
      ...formData,
      status: form.status,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt
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
  
  try {
    const pool = await poolPromise;
    
    const formData = {
      ...req.body,
      clientID,
      formType,
      status: 'draft',
      updatedAt: new Date()
    };
    
    // Check if form exists
    const existingForm = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('formType', sql.VarChar(50), formType)
      .query('SELECT * FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
    
    if (existingForm.recordset.length > 0) {
      // Update existing
      await pool.request()
        .input('clientID', sql.VarChar(50), clientID)
        .input('formType', sql.VarChar(50), formType)
        .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(formData))
        .query('UPDATE AuthorizationForms SET formData = @formData, updatedAt = GETDATE() WHERE clientID = @clientID AND formType = @formType');
    } else {
      // Insert new
      await pool.request()
        .input('clientID', sql.VarChar(50), clientID)
        .input('formType', sql.VarChar(50), formType)
        .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(formData))
        .input('status', sql.VarChar(20), 'draft')
        .query('INSERT INTO AuthorizationForms (clientID, formType, formData, status, createdAt, updatedAt) VALUES (@clientID, @formType, @formData, @status, GETDATE(), GETDATE())');
    }
    
    res.json({ 
      message: 'Form autosaved',
      clientID,
      formType,
      status: 'draft'
    });
    
  } catch (err) {
    console.error('Autosave error:', err);
    res.status(500).json({ 
      message: 'Error autosaving form',
      error: err.message 
    });
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
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    const results = [];
    
    try {
      for (const form of forms) {
        const { formType, ...formData } = form;
        
        if (!VALID_FORM_TYPES.includes(formType)) {
          continue; // Skip invalid form types
        }
        
        const data = {
          ...formData,
          clientID,
          formType,
          updatedAt: new Date()
        };
        
        // Check if exists
        const existing = await transaction.request()
          .input('clientID', sql.VarChar(50), clientID)
          .input('formType', sql.VarChar(50), formType)
          .query('SELECT * FROM AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
        
        if (existing.recordset.length > 0) {
          // Update
          await transaction.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('formType', sql.VarChar(50), formType)
            .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data))
            .query('UPDATE AuthorizationForms SET formData = @formData, updatedAt = GETDATE() WHERE clientID = @clientID AND formType = @formType');
        } else {
          // Insert
          await transaction.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('formType', sql.VarChar(50), formType)
            .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data))
            .input('status', sql.VarChar(20), 'draft')
            .query('INSERT INTO AuthorizationForms (clientID, formType, formData, status, createdAt, updatedAt) VALUES (@clientID, @formType, @formData, @status, GETDATE(), GETDATE())');
        }
        
        results.push({ formType, success: true });
      }
      
      await transaction.commit();
      
      res.json({ 
        message: 'Forms saved successfully',
        savedForms: results.length,
        results
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('Bulk save error:', err);
    res.status(500).json({ 
      message: 'Error saving forms',
      error: err.message 
    });
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
        .input('submittedBy', sql.VarChar(100), req.userEmail || 'system')
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
    logUserAction(req, 'GET', 'FormSubmission');
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching submission status:', err);
    res.status(500).json({ 
      message: 'Error fetching submission status',
      error: err.message 
    });
  }
});

// Export router
module.exports = router;