const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { logUserAction } = require('../middleware/auditLogger');

// ✅ Database connection configuration
// Update this to match your Azure SQL configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

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
const validateFormData = (formType, data) => {
    const errors = {};
    
    if (!data.clientID) {
        errors.clientID = 'Client ID is required';
    }
    
    if (formType === 'orientation') {
        if (!data.checkboxes || Object.keys(data.checkboxes).length === 0) {
            errors.checkboxes = 'At least one checkbox must be acknowledged';
        }
        
        if (!data.signature || data.signature.trim() === '') {
            errors.signature = 'Electronic signature is required';
        }
    }
    
    if (formType === 'clientRights') {
        if (!data.acknowledged) {
            errors.acknowledged = 'Client rights must be acknowledged';
        }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
};

// ✅ GET /api/authorization/:clientID/forms - Get all authorization forms status
router.get('/:clientID/forms', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    af.*,
                    c.firstName,
                    c.lastName,
                    COUNT(af.formID) OVER() as totalFormsCreated,
                    SUM(CASE WHEN af.status = 'completed' THEN 1 ELSE 0 END) OVER() as completedForms
                FROM dbo.AuthorizationForms af
                LEFT JOIN dbo.Clients c ON af.clientID = c.clientID
                WHERE af.clientID = @clientID
                ORDER BY af.priority DESC, af.createdAt ASC
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No authorization forms found for this client',
                clientID: clientID 
            });
        }
        
        // Transform data into the expected format
        const forms = {};
        let overallCompletion = 0;
        let totalForms = Object.keys(FORM_TYPES).length;
        let completedForms = 0;
        
        result.recordset.forEach(form => {
            const formKey = Object.keys(FORM_TYPES).find(key => FORM_TYPES[key] === form.formType);
            if (formKey) {
                forms[formKey] = {
                    formID: form.formID,
                    completed: form.status === 'completed',
                    completedAt: form.completedAt,
                    completedBy: form.completedBy,
                    signature: form.signature,
                    completionPercentage: form.completionPercentage || 0,
                    checkboxes: form.checkboxData ? JSON.parse(form.checkboxData) : {},
                    status: form.status,
                    lastUpdated: form.updatedAt
                };
                
                if (form.status === 'completed') {
                    completedForms++;
                }
            }
        });
        
        overallCompletion = Math.round((completedForms / totalForms) * 100);
        
        await logUserAction(req, 'GET', 'AuthorizationForms', clientID);
        
        res.json({
            clientID,
            forms,
            overallCompletion,
            totalForms,
            completedForms,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error fetching authorization forms:', error);
        res.status(500).json({ 
            message: 'Failed to fetch authorization forms', 
            error: error.message 
        });
    }
});

// ✅ GET /api/authorization/:clientID/form/:formType - Get specific form data
router.get('/:clientID/form/:formType', async (req, res) => {
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
router.post('/:clientID/form/:formType', async (req, res) => {
    try {
        const { clientID, formType } = req.params;
        const data = req.body;
        
        if (!FORM_TYPES[formType]) {
            return res.status(400).json({ 
                message: 'Invalid form type',
                validTypes: Object.keys(FORM_TYPES)
            });
        }
        
        // Validate input data
        const validationErrors = validateFormData(formType, data);
        if (validationErrors) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        const pool = await sql.connect(dbConfig);
        
        // Check if record exists
        const existingRecord = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('formType', sql.VarChar(50), FORM_TYPES[formType])
            .query('SELECT formID FROM dbo.AuthorizationForms WHERE clientID = @clientID AND formType = @formType');
        
        let result;
        
        // Determine completion status
        const isCompleted = data.signature && data.signature.trim() !== '';
        const status = isCompleted ? 'completed' : 'in_progress';
        
        if (existingRecord.recordset.length > 0) {
            // Update existing record
            const formID = existingRecord.recordset[0].formID;
            
            result = await pool.request()
                .input('formID', sql.Int, formID)
                .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                .input('signature', sql.NVarChar(200), data.signature)
                .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data.formData || {}))
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
            
        } else {
            // Insert new record
            result = await pool.request()
                .input('clientID', sql.VarChar(50), clientID)
                .input('formType', sql.VarChar(50), FORM_TYPES[formType])
                .input('checkboxData', sql.NVarChar(sql.MAX), JSON.stringify(data.checkboxes || {}))
                .input('signature', sql.NVarChar(200), data.signature)
                .input('formData', sql.NVarChar(sql.MAX), JSON.stringify(data.formData || {}))
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
        }
        
        res.json({
            message: 'Form data saved successfully',
            formType: formType,
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error saving form data:', error);
        res.status(500).json({ 
            message: 'Failed to save form data', 
            error: error.message 
        });
    }
});

// ✅ POST /api/authorization/:clientID/form/:formType/autosave - Auto-save form data
router.post('/:clientID/form/:formType/autosave', async (req, res) => {
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
router.post('/:clientID/forms/bulk', async (req, res) => {
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
router.post('/:clientID/submit', async (req, res) => {
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
router.get('/:clientID/submission-status', async (req, res) => {
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