const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { logUserAction } = require('../config/logAction');

// ✅ Database connection configuration
const dbConfig = {
    user: process.env.DB_USER || 'fallback_user',
    password: process.env.DB_PASSWORD || 'fallback_password',
    server: process.env.DB_SERVER || 'clientintakeserver.database.windows.net',
    database: process.env.DB_NAME || 'your_database',
    options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 30000,
        requestTimeout: 30000
    }
};

// Add connection testing
async function testConnection() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('✅ AuthSig connected to database');
        return pool;
    } catch (error) {
        console.error('❌ AuthSig database connection failed:', error.message);
        return null;
    }
}
// ✅ Form type mappings
const FORM_TYPES = {
    'orientation': 'patient_orientation',
    'clientRights': 'client_rights', 
    'consentTreatment': 'consent_treatment',
    'preScreen': 'housing_prescreen',
    'privacyPractice': 'privacy_practice',
    'lahmis': 'lahmis_consent',
    'phiRelease': 'phi_release',
    'residencePolicy': 'residence_policy',
    'authDisclosure': 'auth_disclosure',
    'termination': 'termination_policy',
    'advDirective': 'advance_directive',
    'grievances': 'client_grievances',
    'healthDisclosure': 'health_disclosure',
    'consentPhoto': 'consent_photo',
    'housingAgreement': 'housing_agreement'
};

// ✅ Helper function to validate form data
// ✅ Enhanced validateFormData function - Replace in your authSig.js

const validateFormData = (formType, data) => {
    const errors = {};
    
    // Common validations
    if (!data.clientID || typeof data.clientID !== 'string') {
        errors.clientID = 'Valid Client ID is required';
    }
    
    // Form-specific validations
    switch (formType) {
        case 'orientation':
            // Validate checkboxes
            if (!data.checkboxes || typeof data.checkboxes !== 'object') {
                errors.checkboxes = 'Checkboxes data must be an object';
            } else if (Object.keys(data.checkboxes).length === 0) {
                errors.checkboxes = 'At least one checkbox must be acknowledged';
            } else {
                // Validate checkbox values are booleans
                const invalidCheckboxes = Object.entries(data.checkboxes)
                    .filter(([key, value]) => typeof value !== 'boolean')
                    .map(([key]) => key);
                
                if (invalidCheckboxes.length > 0) {
                    errors.checkboxes = `Invalid checkbox values: ${invalidCheckboxes.join(', ')}`;
                }
            }
            
            // Validate signature
            if (!data.signature || typeof data.signature !== 'string' || data.signature.trim() === '') {
                errors.signature = 'Electronic signature is required';
            } else if (data.signature.length < 2) {
                errors.signature = 'Signature must be at least 2 characters';
            } else if (data.signature.length > 200) {
                errors.signature = 'Signature cannot exceed 200 characters';
            }
            
            // Validate completion percentage
            if (data.completionPercentage !== undefined) {
                const percentage = parseFloat(data.completionPercentage);
                if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                    errors.completionPercentage = 'Completion percentage must be between 0-100';
                }
            }
            break;
            
        case 'clientRights':
            // Validate acknowledged field
            if (typeof data.acknowledged !== 'boolean') {
                errors.acknowledged = 'Acknowledged must be a boolean value';
            } else if (!data.acknowledged) {
                errors.acknowledged = 'Client rights must be acknowledged';
            }
            
            // Validate signature
            if (!data.signature || data.signature.trim() === '') {
                errors.signature = 'Electronic signature is required for rights acknowledgment';
            } else if (data.signature.length < 2) {
                errors.signature = 'Signature must be at least 2 characters';
            }
            break;
            
        case 'consentPhoto':
            // Validate release items array
            if (!Array.isArray(data.clientReleaseItems)) {
                errors.clientReleaseItems = 'Release items must be an array';
            } else if (data.clientReleaseItems.length === 0) {
                errors.clientReleaseItems = 'At least one release item must be selected';
            }
            
            // Validate release purposes array
            if (!Array.isArray(data.clientReleasePurposes)) {
                errors.clientReleasePurposes = 'Release purposes must be an array';
            } else if (data.clientReleasePurposes.length === 0) {
                errors.clientReleasePurposes = 'At least one purpose must be selected';
            }
            
            // Validate signature
            if (!data.consentPhotoSign1 || data.consentPhotoSign1.trim() === '') {
                errors.consentPhotoSign1 = 'Electronic signature is required';
            }
            
            // Validate dates
            if (data.consentPhotoEffectiveDate) {
                const effectiveDate = new Date(data.consentPhotoEffectiveDate);
                if (isNaN(effectiveDate.getTime())) {
                    errors.consentPhotoEffectiveDate = 'Invalid effective date format';
                }
            }
            
            if (data.consentPhotoExpireDate) {
                const expireDate = new Date(data.consentPhotoExpireDate);
                if (isNaN(expireDate.getTime())) {
                    errors.consentPhotoExpireDate = 'Invalid expiration date format';
                } else if (data.consentPhotoEffectiveDate) {
                    const effectiveDate = new Date(data.consentPhotoEffectiveDate);
                    if (expireDate <= effectiveDate) {
                        errors.consentPhotoExpireDate = 'Expiration date must be after effective date';
                    }
                }
            }
            break;
            
        case 'consentTreatment':
            if (!data.signature || data.signature.trim() === '') {
                errors.signature = 'Electronic signature is required for treatment consent';
            }
            break;
            
        case 'privacyPractice':
            if (!data.signature || data.signature.trim() === '') {
                errors.signature = 'Electronic signature is required for privacy acknowledgment';
            }
            break;
            
        default:
            // Generic form validation
            if (data.signature && typeof data.signature !== 'string') {
                errors.signature = 'Signature must be a string';
            }
    }
    
    // Validate JSON fields that will be stored in database
    if (data.checkboxes) {
        try {
            JSON.stringify(data.checkboxes);
        } catch (e) {
            errors.checkboxes = 'Checkbox data is not valid JSON';
        }
    }
    
    if (data.formData) {
        try {
            JSON.stringify(data.formData);
        } catch (e) {
            errors.formData = 'Form data is not valid JSON';
        }
    }
    
    // Validate array fields for consentPhoto
    if (formType === 'consentPhoto') {
        ['clientReleaseItems', 'clientReleasePurposes', 'clientReleasePHTItems'].forEach(field => {
            if (data[field]) {
                if (!Array.isArray(data[field])) {
                    errors[field] = `${field} must be an array`;
                } else {
                    // Validate array items have expected structure
                    const invalidItems = data[field].filter(item => 
                        !item || typeof item !== 'object' || !item.value
                    );
                    if (invalidItems.length > 0) {
                        errors[field] = `${field} contains invalid items`;
                    }
                }
            }
        });
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
};

// ✅ Enhanced data sanitization function
const sanitizeFormData = (data) => {
    const sanitized = { ...data };
    
    // Trim string fields
    const stringFields = ['signature', 'consentPhotoSign1', 'consentPhotoSign1Revoke'];
    stringFields.forEach(field => {
        if (sanitized[field] && typeof sanitized[field] === 'string') {
            sanitized[field] = sanitized[field].trim();
        }
    });
    
    // Ensure completion percentage is a valid number
    if (sanitized.completionPercentage !== undefined) {
        const percentage = parseFloat(sanitized.completionPercentage);
        sanitized.completionPercentage = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
    }
    
    // Ensure checkboxes is an object
    if (sanitized.checkboxes && typeof sanitized.checkboxes !== 'object') {
        sanitized.checkboxes = {};
    }
    
    // Ensure boolean fields are actually booleans
    if (sanitized.acknowledged !== undefined) {
        sanitized.acknowledged = Boolean(sanitized.acknowledged);
    }
    
    // Ensure arrays are actually arrays
    const arrayFields = ['clientReleaseItems', 'clientReleasePurposes', 'clientReleasePHTItems'];
    arrayFields.forEach(field => {
        if (sanitized[field] && !Array.isArray(sanitized[field])) {
            sanitized[field] = [];
        }
    });
    
    // Validate and clean date fields
    const dateFields = ['consentPhotoEffectiveDate', 'consentPhotoExpireDate'];
    dateFields.forEach(field => {
        if (sanitized[field]) {
            const date = new Date(sanitized[field]);
            if (isNaN(date.getTime())) {
                delete sanitized[field]; // Remove invalid dates
            } else {
                sanitized[field] = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            }
        }
    });
    
    return sanitized;
};

// ✅ GET /api/authorization/:clientID/form/:formType - Get specific form data
router.get('/authorization/:clientID/form/:formType', async (req, res) => {
    try {
        const { clientID, formType } = req.params;
        
        if (!FORM_TYPES[formType]) {
            return res.status(400).json({ 
                message: 'Invalid form type',
                validTypes: Object.keys(FORM_TYPES)
            });
        }
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('formType', sql.VarChar(50), FORM_TYPES[formType])
            .query(`
                SELECT TOP 1 *
                FROM dbo.AuthorizationForms 
                WHERE clientID = @clientID AND formType = @formType
                ORDER BY createdAt DESC
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'Form not found for this client',
                clientID: clientID,
                formType: formType
            });
        }
        
        const form = result.recordset[0];
        
        // Parse JSON fields
        let checkboxData = {};
        let formData = {};
        
        try {
            if (form.checkboxData) {
                checkboxData = JSON.parse(form.checkboxData);
            }
            if (form.formData) {
                formData = JSON.parse(form.formData);
            }
        } catch (jsonError) {
            console.error('Error parsing JSON fields:', jsonError);
        }
        
        await logUserAction(req, 'GET', 'AuthorizationForm', `${clientID}-${formType}`);
        
        res.json({
            formID: form.formID,
            clientID: form.clientID,
            formType: formType,
            checkboxes: checkboxData,
            signature: form.signature,
            formData: formData,
            completedAt: form.completedAt,
            completedBy: form.completedBy,
            completionPercentage: form.completionPercentage,
            status: form.status,
            priority: form.priority,
            createdAt: form.createdAt,
            updatedAt: form.updatedAt
        });
        
    } catch (error) {
        console.error('Error fetching form data:', error);
        res.status(500).json({ 
            message: 'Failed to fetch form data', 
            error: error.message 
        });
    }
});

// ✅ POST /api/authorization/:clientID/form/:formType - Save/update form data
// ✅ Enhanced POST route - Replace the existing POST route in your authSig.js

router.post('/authorization/:clientID/form/:formType', async (req, res) => {
    try {
        const { clientID, formType } = req.params;
        let data = req.body;
        
        // Validate form type
        if (!FORM_TYPES[formType]) {
            return res.status(400).json({ 
                message: 'Invalid form type',
                validTypes: Object.keys(FORM_TYPES),
                provided: formType
            });
        }
        
        // Sanitize input data
        data = sanitizeFormData(data);
        
        // Add clientID to data if not present
        if (!data.clientID) {
            data.clientID = clientID;
        }
        
        // Validate input data
        const validationErrors = validateFormData(formType, data);
        if (validationErrors) {
            return res.status(422).json({
                message: 'Validation failed',
                errors: validationErrors,
                formType: formType
            });
        }
        
        const pool = await sql.connect(dbConfig);
        
        // Check if client exists
        const clientCheck = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query('SELECT clientID FROM dbo.Clients WHERE clientID = @clientID');
        
        if (clientCheck.recordset.length === 0) {
            return res.status(404).json({
                message: 'Client not found',
                clientID: clientID
            });
        }
        
        // Check if record exists
        const existingRecord = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('formType', sql.VarChar(50), FORM_TYPES[formType])
            .query('SELECT formID, status, updatedAt FROM dbo.AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
        
        let result;
        
        // Determine completion status
        const isCompleted = data.signature && data.signature.trim() !== '';
        const status = data.status || (isCompleted ? 'completed' : 'in_progress');
        
        // Check for concurrent modifications
        if (existingRecord.recordset.length > 0) {
            const existing = existingRecord.recordset[0];
            
            // Don't allow updates to submitted/approved forms unless explicitly allowed
            if (['submitted', 'approved'].includes(existing.status) && status !== existing.status) {
                return res.status(409).json({
                    message: `Cannot modify form with status: ${existing.status}`,
                    currentStatus: existing.status,
                    formType: formType
                });
            }
            
            // Update existing record
            const formID = existing.formID;
            
            try {
                result = await pool.request()
                    .input('formID', sql.Int, formID)
                    .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                    .input('signature', sql.NVarChar(200), data.signature || '')
                    .input('formData', sql.NVarChar(sql.MAX), JSON.stringify({
                        ...data.formData,
                        clientReleaseItems: data.clientReleaseItems,
                        clientReleasePurposes: data.clientReleasePurposes,
                        clientReleasePHTItems: data.clientReleasePHTItems,
                        consentPhotoSign1: data.consentPhotoSign1,
                        consentPhotoEffectiveDate: data.consentPhotoEffectiveDate,
                        consentPhotoExpireDate: data.consentPhotoExpireDate,
                        acknowledged: data.acknowledged,
                        lastModified: new Date().toISOString()
                    } || {}))
                    .input('completionPercentage', sql.Decimal(5,2), data.completionPercentage || 0)
                    .input('status', sql.VarChar(20), status)
                    .input('completedAt', sql.DateTime2, isCompleted ? new Date() : null)
                    .input('completedBy', sql.VarChar(100), isCompleted ? (req.user?.email || 'System') : null)
                    .input('updatedBy', sql.VarChar(100), req.user?.email || 'System')
                    .input('updatedAt', sql.DateTime2, new Date())
                    .query(`
                        UPDATE dbo.AuthorizationForms SET
                            checkboxData = @checkboxData,
                            signature = @signature,
                            formData = @formData,
                            completionPercentage = @completionPercentage,
                            status = @status,
                            completedAt = @completedAt,
                            completedBy = @completedBy,
                            updatedBy = @updatedBy,
                            updatedAt = @updatedAt
                        WHERE formID = @formID;
                        
                        SELECT * FROM dbo.AuthorizationForms WHERE formID = @formID;
                    `);
                    
                await logUserAction(req, 'UPDATE', 'AuthorizationForm', `${clientID}-${formType}`);
                
            } catch (dbError) {
                console.error('Database update error:', dbError);
                return res.status(500).json({
                    message: 'Database update failed',
                    error: dbError.message,
                    formType: formType
                });
            }
            
        } else {
            // Insert new record
            try {
                result = await pool.request()
                    .input('clientID', sql.VarChar(50), clientID)
                    .input('formType', sql.VarChar(50), FORM_TYPES[formType])
                    .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                    .input('signature', sql.NVarChar(200), data.signature || '')
                    .input('formData', sql.NVarChar(sql.MAX), JSON.stringify({
                        ...data.formData,
                        clientReleaseItems: data.clientReleaseItems,
                        clientReleasePurposes: data.clientReleasePurposes,
                        clientReleasePHTItems: data.clientReleasePHTItems,
                        consentPhotoSign1: data.consentPhotoSign1,
                        consentPhotoEffectiveDate: data.consentPhotoEffectiveDate,
                        consentPhotoExpireDate: data.consentPhotoExpireDate,
                        acknowledged: data.acknowledged,
                        createdVersion: '1.0'
                    } || {}))
                    .input('completionPercentage', sql.Decimal(5,2), data.completionPercentage || 0)
                    .input('status', sql.VarChar(20), status)
                    .input('priority', sql.VarChar(10), data.priority || 'medium')
                    .input('completedAt', sql.DateTime2, isCompleted ? new Date() : null)
                    .input('completedBy', sql.VarChar(100), isCompleted ? (req.user?.email || 'System') : null)
                    .input('createdBy', sql.VarChar(100), req.user?.email || 'System')
                    .input('createdAt', sql.DateTime2, new Date())
                    .query(`
                        INSERT INTO dbo.AuthorizationForms (
                            clientID, formType, checkboxData, signature, formData,
                            completionPercentage, status, priority, completedAt, completedBy,
                            createdBy, createdAt, updatedBy, updatedAt
                        ) VALUES (
                            @clientID, @formType, @checkboxData, @signature, @formData,
                            @completionPercentage, @status, @priority, @completedAt, @completedBy,
                            @createdBy, @createdAt, @createdBy, @createdAt
                        );
                        
                        SELECT * FROM dbo.AuthorizationForms WHERE formID = SCOPE_IDENTITY();
                    `);
                    
                await logUserAction(req, 'INSERT', 'AuthorizationForm', `${clientID}-${formType}`);
                
            } catch (dbError) {
                console.error('Database insert error:', dbError);
                return res.status(500).json({
                    message: 'Database insert failed',
                    error: dbError.message,
                    formType: formType
                });
            }
        }
        
        if (!result.recordset || result.recordset.length === 0) {
            return res.status(500).json({
                message: 'No data returned from database operation',
                formType: formType
            });
        }
        
        const savedForm = result.recordset[0];
        
        // Parse the saved form data for response
        let responseData = {
            formID: savedForm.formID,
            clientID: savedForm.clientID,
            formType: formType,
            signature: savedForm.signature,
            status: savedForm.status,
            completionPercentage: savedForm.completionPercentage,
            completedAt: savedForm.completedAt,
            completedBy: savedForm.completedBy,
            createdAt: savedForm.createdAt,
            updatedAt: savedForm.updatedAt
        };
        
        // Parse JSON fields safely
        try {
            if (savedForm.checkboxData) {
                responseData.checkboxes = JSON.parse(savedForm.checkboxData);
            }
            if (savedForm.formData) {
                const parsedFormData = JSON.parse(savedForm.formData);
                responseData.formData = parsedFormData;
                
                // Extract specific fields for easier access
                if (formType === 'consentPhoto') {
                    responseData.clientReleaseItems = parsedFormData.clientReleaseItems;
                    responseData.clientReleasePurposes = parsedFormData.clientReleasePurposes;
                    responseData.clientReleasePHTItems = parsedFormData.clientReleasePHTItems;
                    responseData.consentPhotoSign1 = parsedFormData.consentPhotoSign1;
                    responseData.consentPhotoEffectiveDate = parsedFormData.consentPhotoEffectiveDate;
                    responseData.consentPhotoExpireDate = parsedFormData.consentPhotoExpireDate;
                }
                
                if (formType === 'clientRights') {
                    responseData.acknowledged = parsedFormData.acknowledged;
                }
            }
        } catch (parseError) {
            console.error('Error parsing saved form data:', parseError);
            // Continue with response even if parsing fails
        }
        
        res.status(200).json({
            message: 'Form data saved successfully',
            formType: formType,
            action: existingRecord.recordset.length > 0 ? 'updated' : 'created',
            data: responseData
        });
        
    } catch (error) {
        console.error('Error saving form data:', error);
        
        // Enhanced error response based on error type
        let statusCode = 500;
        let errorMessage = 'Failed to save form data';
        
        if (error.message.includes('connection')) {
            statusCode = 503;
            errorMessage = 'Database connection failed';
        } else if (error.message.includes('timeout')) {
            statusCode = 408;
            errorMessage = 'Request timeout';
        } else if (error.message.includes('permission')) {
            statusCode = 403;
            errorMessage = 'Permission denied';
        }
        
        res.status(statusCode).json({ 
            message: errorMessage, 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            formType: req.params.formType,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ POST /api/authorization/:clientID/form/:formType/autosave - Auto-save form data
router.post('/authorization/:clientID/form/:formType/autosave', async (req, res) => {
    try {
        const { clientID, formType } = req.params;
        const data = req.body;
        
        if (!FORM_TYPES[formType]) {
            return res.status(400).json({ message: 'Invalid form type' });
        }
        
        const pool = await sql.connect(dbConfig);
        
        // Check if record exists
        const existingRecord = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('formType', sql.VarChar(50), FORM_TYPES[formType])
            .query('SELECT formID FROM dbo.AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
        
        if (existingRecord.recordset.length > 0) {
            // Update existing record with auto-save data
            await pool.request()
                .input('formID', sql.Int, existingRecord.recordset[0].formID)
                .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                .input('signature', sql.NVarChar(200), data.signature)
                .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data.formData || {}))
                .input('lastAutoSave', sql.DateTime2, new Date())
                .query(`
                    UPDATE dbo.AuthorizationForms SET
                        checkboxData = @checkboxData,
                        signature = @signature,
                        formData = @formData,
                        lastAutoSave = @lastAutoSave
                    WHERE formID = @formID;
                `);
        } else {
            // Create new record for auto-save
            await pool.request()
                .input('clientID', sql.VarChar(50), clientID)
                .input('formType', sql.VarChar(50), FORM_TYPES[formType])
                .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                .input('signature', sql.NVarChar(200), data.signature || '')
                .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data.formData || {}))
                .input('status', sql.VarChar(20), 'draft')
                .input('priority', sql.VarChar(10), 'medium')
                .input('lastAutoSave', sql.DateTime2, new Date())
                .input('createdBy', sql.VarChar(100), req.user?.email || 'System')
                .query(`
                    INSERT INTO dbo.AuthorizationForms (
                        clientID, formType, checkboxData, signature, formData,
                        status, priority, lastAutoSave, createdBy, createdAt, updatedBy, updatedAt
                    ) VALUES (
                        @clientID, @formType, @checkboxData, @signature, @formData,
                        @status, @priority, @lastAutoSave, @createdBy, GETDATE(), @createdBy, GETDATE()
                    );
                `);
        }
        
        res.json({
            message: 'Auto-save successful',
            clientID: clientID,
            formType: formType,
            autoSavedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error auto-saving form data:', error);
        res.status(500).json({ 
            message: 'Auto-save failed', 
            error: error.message 
        });
    }
});

// ✅ POST /api/authorization/:clientID/forms/bulk - Bulk save multiple forms
router.post('/authorization/:clientID/forms/bulk', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { forms } = req.body;
        
        if (!Array.isArray(forms) || forms.length === 0) {
            return res.status(400).json({ message: 'Forms array is required' });
        }
        
        const pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            const savedForms = [];
            
            for (const formData of forms) {
                const { formType, ...data } = formData;
                
                if (!FORM_TYPES[formType]) {
                    continue; // Skip invalid form types
                }
                
                const isCompleted = data.signature && data.signature.trim() !== '';
                const status = isCompleted ? 'completed' : 'in_progress';
                
                // Check if record exists
                const existingRecord = await transaction.request()
                    .input('clientID', sql.VarChar(50), clientID)
                    .input('formType', sql.VarChar(50), FORM_TYPES[formType])
                    .query('SELECT formID FROM dbo.AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
                
                let result;
                
                if (existingRecord.recordset.length > 0) {
                    // Update existing
                    result = await transaction.request()
                        .input('formID', sql.Int, existingRecord.recordset[0].formID)
                        .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                        .input('signature', sql.NVarChar(200), data.signature)
                        .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data.formData || {}))
                        .input('status', sql.VarChar(20), status)
                        .input('updatedBy', sql.VarChar(100), req.user?.email || 'System')
                        .query(`
                            UPDATE dbo.AuthorizationForms SET
                                checkboxData = @checkboxData,
                                signature = @signature,
                                formData = @formData,
                                status = @status,
                                updatedBy = @updatedBy,
                                updatedAt = GETDATE()
                            WHERE formID = @formID;
                            
                            SELECT * FROM dbo.AuthorizationForms WHERE formID = @formID;
                        `);
                } else {
                    // Insert new
                    result = await transaction.request()
                        .input('clientID', sql.VarChar(50), clientID)
                        .input('formType', sql.VarChar(50), FORM_TYPES[formType])
                        .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                        .input('signature', sql.NVarChar(200), data.signature)
                        .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data.formData || {}))
                        .input('status', sql.VarChar(20), status)
                        .input('priority', sql.VarChar(10), data.priority || 'medium')
                        .input('createdBy', sql.VarChar(100), req.user?.email || 'System')
                        .query(`
                            INSERT INTO dbo.AuthorizationForms (
                                clientID, formType, checkboxData, signature, formData,
                                status, priority, createdBy, createdAt, updatedBy, updatedAt
                            ) VALUES (
                                @clientID, @formType, @checkboxData, @signature, @formData,
                                @status, @priority, @createdBy, GETDATE(), @createdBy, GETDATE()
                            );
                            
                            SELECT * FROM dbo.AuthorizationForms WHERE formID = SCOPE_IDENTITY();
                        `);
                }
                
                if (result.recordset.length > 0) {
                    savedForms.push({
                        formType: formType,
                        ...result.recordset[0]
                    });
                }
            }
            
            await transaction.commit();
            
            await logUserAction(req, 'BULK_SAVE', 'AuthorizationForms', clientID);
            
            res.json({
                message: 'Bulk save successful',
                clientID: clientID,
                savedForms: savedForms,
                totalSaved: savedForms.length
            });
            
        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Error bulk saving forms:', error);
        res.status(500).json({ 
            message: 'Failed to bulk save forms', 
            error: error.message 
        });
    }
});

// ✅ POST /api/authorization/:clientID/submit - Submit forms for approval
router.post('/authorization/:clientID/submit', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { submissionNotes } = req.body;
        
        const pool = await sql.connect(dbConfig);
        
        // Check if all required forms are completed
        const completionCheck = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    COUNT(*) as totalForms,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedForms
                FROM dbo.AuthorizationForms 
                WHERE clientID = @clientID AND priority IN ('high', 'medium')
            `);
        
        const { totalForms, completedForms } = completionCheck.recordset[0];
        
        if (completedForms < totalForms) {
            return res.status(400).json({
                message: 'Cannot submit: Not all required forms are completed',
                totalForms,
                completedForms,
                remaining: totalForms - completedForms
            });
        }
        
        // Create submission record
        const submissionResult = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('submissionNotes', sql.NVarChar(sql.MAX), submissionNotes)
            .input('submittedBy', sql.VarChar(100), req.user?.email || 'System')
            .input('submittedAt', sql.DateTime2, new Date())
            .query(`
                INSERT INTO dbo.FormSubmissions (
                    clientID, submissionNotes, submittedBy, submittedAt, status
                ) VALUES (
                    @clientID, @submissionNotes, @submittedBy, @submittedAt, 'submitted'
                );
                
                SELECT * FROM dbo.FormSubmissions WHERE submissionID = SCOPE_IDENTITY();
            `);
        
        // Update all forms to submitted status
        await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('submissionID', sql.Int, submissionResult.recordset[0].submissionID)
            .query(`
                UPDATE dbo.AuthorizationForms 
                SET submissionID = @submissionID,
                    status = 'submitted',
                    updatedAt = GETDATE()
                WHERE clientID = @clientID AND status = 'completed'
            `);
        
        await logUserAction(req, 'SUBMIT', 'FormSubmission', clientID);
        
        res.json({
            message: 'Forms submitted successfully',
            submission: submissionResult.recordset[0]
        });
        
    } catch (error) {
        console.error('Error submitting forms:', error);
        res.status(500).json({ 
            message: 'Failed to submit forms', 
            error: error.message 
        });
    }
});

// ✅ GET /api/authorization/:clientID/submission-status - Get submission status
router.get('/authorization/:clientID/submission-status', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT TOP 1 *
                FROM dbo.FormSubmissions 
                WHERE clientID = @clientID
                ORDER BY submittedAt DESC
            `);
        
        if (result.recordset.length === 0) {
            return res.json({
                status: 'draft',
                message: 'No submissions found'
            });
        }
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching submission status:', error);
        res.status(500).json({ 
            message: 'Failed to fetch submission status', 
            error: error.message 
        });
    }
});

module.exports = router;