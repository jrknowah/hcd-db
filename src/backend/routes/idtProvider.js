const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { logUserAction } = require('../config/logAction');

// ✅ Database connection configuration
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

// ✅ Helper function to validate required fields
const validateIDTData = (data) => {
    const errors = {};
    
    // Required fields validation
    if (!data.idtHospital || data.idtHospital.trim() === '') {
        errors.idtHospital = 'Hospital is required';
    }
    
    if (!data.idtProviderName || data.idtProviderName.trim() === '') {
        errors.idtProviderName = 'Provider name is required';
    }
    
    if (!data.idtProviderRole || data.idtProviderRole.trim() === '') {
        errors.idtProviderRole = 'Provider role is required';
    }
    
    // Date validations
    if (data.idtAdmitDate && !isValidDate(data.idtAdmitDate)) {
        errors.idtAdmitDate = 'Invalid admit date format';
    }
    
    if (data.idtPatientClearDate && !isValidDate(data.idtPatientClearDate)) {
        errors.idtPatientClearDate = 'Invalid clearance date format';
    }
    
    // Numeric validations
    if (data.idtComplexityScore && (data.idtComplexityScore < 1 || data.idtComplexityScore > 10)) {
        errors.idtComplexityScore = 'Complexity score must be between 1 and 10';
    }
    
    if (data.idtLengthOfStay && data.idtLengthOfStay < 0) {
        errors.idtLengthOfStay = 'Length of stay cannot be negative';
    }
    
    if (data.idtTargetLOS && data.idtTargetLOS < 0) {
        errors.idtTargetLOS = 'Target LOS cannot be negative';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
};

// ✅ Helper function to validate date format
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

// ✅ Helper function to sanitize input data
const sanitizeIDTData = (data) => {
    const sanitized = {};
    
    // String fields with max lengths
    const stringFields = {
        idtHospital: 200,
        idtProviderName: 100,
        idtProviderRole: 50,
        idtPatientClear: 20,
        idtPatientClearBy: 100,
        idtDischargeReadiness: 50,
        idtRiskLevel: 20
    };
    
    Object.keys(stringFields).forEach(field => {
        if (data[field]) {
            sanitized[field] = data[field].toString().substring(0, stringFields[field]).trim();
        }
    });
    
    // Text fields (NVARCHAR(MAX))
    const textFields = [
        'idtDiag', 'idtProblems', 'idtPriority', 'idtFunctionalStatus',
        'idtConsults', 'idtNoConsults', 'idtPlans', 'idtDischarge',
        'idtGoals', 'idtInterventions', 'idtOutcomes'
    ];
    
    textFields.forEach(field => {
        if (data[field]) {
            sanitized[field] = data[field].toString().trim();
        }
    });
    
    // Date fields
    const dateFields = ['idtAdmitDate', 'idtPatientClearDate'];
    dateFields.forEach(field => {
        if (data[field] && isValidDate(data[field])) {
            sanitized[field] = new Date(data[field]).toISOString().split('T')[0];
        }
    });
    
    // Numeric fields
    if (data.idtComplexityScore) {
        sanitized.idtComplexityScore = Math.max(1, Math.min(10, parseInt(data.idtComplexityScore)));
    }
    
    if (data.idtLengthOfStay) {
        sanitized.idtLengthOfStay = Math.max(0, parseInt(data.idtLengthOfStay));
    }
    
    if (data.idtTargetLOS) {
        sanitized.idtTargetLOS = Math.max(0, parseInt(data.idtTargetLOS));
    }
    
    return sanitized;
};

// ✅ GET /api/idt-provider/note/:id - Get specific IDT provider note
router.get('/idt-provider/note/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`📡 Fetching IDT provider note: ${id}`);
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT *
                FROM dbo.idt_provider_notes 
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            console.log(`⚠️ IDT provider note not found: ${id}`);
            return res.status(404).json({ 
                message: 'IDT provider note not found'
            });
        }
        
        console.log(`✅ IDT provider note found: ${id}`);
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('❌ Error fetching IDT provider note:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT provider note', 
            error: error.message 
        });
    }
});


// ✅ GET /api/idt-provider/:clientID - Get ALL IDT provider notes for client
router.get('/idt-provider/:clientID', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        
        console.log(`📡 Fetching IDT provider notes for client: ${clientID}`);
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('limit', sql.Int, parseInt(limit))
            .input('offset', sql.Int, parseInt(offset))
            .query(`
                SELECT *
                FROM dbo.idt_provider_notes 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);
        
        console.log(`✅ Found ${result.recordset.length} IDT provider notes`);
        
        // Log user action
        await logUserAction(req, 'GET', 'idt_provider_notes', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('❌ Error fetching IDT provider notes:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT provider notes', 
            error: error.message 
        });
    }
});

// ✅ POST /api/idt-provider/:clientID - Create new IDT provider note (always INSERT)
router.post('/idt-provider/:clientID', async (req, res) => {
    try {
        const { clientID } = req.params;
        const rawData = req.body;
        
        console.log(`📡 Creating IDT provider note for client: ${clientID}`);
        
        // Validate input data
        const validationErrors = validateIDTData(rawData);
        if (validationErrors) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        // Sanitize input data
        const data = sanitizeIDTData(rawData);
        
        const pool = await sql.connect(dbConfig);
        
        // Insert new record
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('idtHospital', sql.NVarChar(200), data.idtHospital)
            .input('idtAdmitDate', sql.Date, data.idtAdmitDate)
            .input('idtProviderName', sql.NVarChar(100), data.idtProviderName)
            .input('idtProviderRole', sql.NVarChar(50), data.idtProviderRole)
            .input('idtDiag', sql.NVarChar(sql.MAX), data.idtDiag)
            .input('idtProblems', sql.NVarChar(sql.MAX), data.idtProblems)
            .input('idtPriority', sql.NVarChar(sql.MAX), data.idtPriority)
            .input('idtFunctionalStatus', sql.NVarChar(sql.MAX), data.idtFunctionalStatus)
            .input('idtConsults', sql.NVarChar(sql.MAX), data.idtConsults)
            .input('idtNoConsults', sql.NVarChar(sql.MAX), data.idtNoConsults)
            .input('idtPlans', sql.NVarChar(sql.MAX), data.idtPlans)
            .input('idtDischarge', sql.NVarChar(sql.MAX), data.idtDischarge)
            .input('idtPatientClear', sql.NVarChar(20), data.idtPatientClear)
            .input('idtPatientClearDate', sql.Date, data.idtPatientClearDate)
            .input('idtPatientClearBy', sql.NVarChar(100), data.idtPatientClearBy)
            .input('idtDischargeReadiness', sql.NVarChar(50), data.idtDischargeReadiness)
            .input('idtComplexityScore', sql.Int, data.idtComplexityScore)
            .input('idtRiskLevel', sql.NVarChar(20), data.idtRiskLevel)
            .input('idtLengthOfStay', sql.Int, data.idtLengthOfStay)
            .input('idtTargetLOS', sql.Int, data.idtTargetLOS)
            .input('idtGoals', sql.NVarChar(sql.MAX), data.idtGoals)
            .input('idtInterventions', sql.NVarChar(sql.MAX), data.idtInterventions)
            .input('idtOutcomes', sql.NVarChar(sql.MAX), data.idtOutcomes)
            .input('createdBy', sql.NVarChar(100), rawData.userName || 'System')
            .query(`
                INSERT INTO dbo.idt_provider_notes (
                    clientID, idtHospital, idtAdmitDate, idtProviderName, idtProviderRole,
                    idtDiag, idtProblems, idtPriority, idtFunctionalStatus,
                    idtConsults, idtNoConsults, idtPlans, idtDischarge,
                    idtPatientClear, idtPatientClearDate, idtPatientClearBy,
                    idtDischargeReadiness, idtComplexityScore, idtRiskLevel,
                    idtLengthOfStay, idtTargetLOS,
                    idtGoals, idtInterventions, idtOutcomes,
                    createdBy, createdAt, updatedBy, updatedAt
                )
                OUTPUT INSERTED.*
                VALUES (
                    @clientID, @idtHospital, @idtAdmitDate, @idtProviderName, @idtProviderRole,
                    @idtDiag, @idtProblems, @idtPriority, @idtFunctionalStatus,
                    @idtConsults, @idtNoConsults, @idtPlans, @idtDischarge,
                    @idtPatientClear, @idtPatientClearDate, @idtPatientClearBy,
                    @idtDischargeReadiness, @idtComplexityScore, @idtRiskLevel,
                    @idtLengthOfStay, @idtTargetLOS,
                    @idtGoals, @idtInterventions, @idtOutcomes,
                    @createdBy, GETDATE(), @createdBy, GETDATE()
                )
            `);
            
        await logUserAction(req, 'INSERT', 'idt_provider_notes', clientID);
        
        console.log(`✅ IDT provider note created successfully: ${result.recordset[0].id}`);
        res.status(201).json(result.recordset[0]);
        
    } catch (error) {
        console.error('❌ Error creating IDT provider note:', error);
        res.status(500).json({ 
            message: 'Failed to create IDT provider note', 
            error: error.message 
        });
    }
});

// ✅ PUT /api/idt-provider/note/:id - Update existing IDT provider note
router.put('/idt-provider/note/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rawData = req.body;
        
        console.log(`📡 Updating IDT provider note: ${id}`);
        
        // Validate input data
        const validationErrors = validateIDTData(rawData);
        if (validationErrors) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: validationErrors
            });
        }
        
        // Sanitize input data
        const data = sanitizeIDTData(rawData);
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('idtHospital', sql.NVarChar(200), data.idtHospital)
            .input('idtAdmitDate', sql.Date, data.idtAdmitDate)
            .input('idtProviderName', sql.NVarChar(100), data.idtProviderName)
            .input('idtProviderRole', sql.NVarChar(50), data.idtProviderRole)
            .input('idtDiag', sql.NVarChar(sql.MAX), data.idtDiag)
            .input('idtProblems', sql.NVarChar(sql.MAX), data.idtProblems)
            .input('idtPriority', sql.NVarChar(sql.MAX), data.idtPriority)
            .input('idtFunctionalStatus', sql.NVarChar(sql.MAX), data.idtFunctionalStatus)
            .input('idtConsults', sql.NVarChar(sql.MAX), data.idtConsults)
            .input('idtNoConsults', sql.NVarChar(sql.MAX), data.idtNoConsults)
            .input('idtPlans', sql.NVarChar(sql.MAX), data.idtPlans)
            .input('idtDischarge', sql.NVarChar(sql.MAX), data.idtDischarge)
            .input('idtPatientClear', sql.NVarChar(20), data.idtPatientClear)
            .input('idtPatientClearDate', sql.Date, data.idtPatientClearDate)
            .input('idtPatientClearBy', sql.NVarChar(100), data.idtPatientClearBy)
            .input('idtDischargeReadiness', sql.NVarChar(50), data.idtDischargeReadiness)
            .input('idtComplexityScore', sql.Int, data.idtComplexityScore)
            .input('idtRiskLevel', sql.NVarChar(20), data.idtRiskLevel)
            .input('idtLengthOfStay', sql.Int, data.idtLengthOfStay)
            .input('idtTargetLOS', sql.Int, data.idtTargetLOS)
            .input('idtGoals', sql.NVarChar(sql.MAX), data.idtGoals)
            .input('idtInterventions', sql.NVarChar(sql.MAX), data.idtInterventions)
            .input('idtOutcomes', sql.NVarChar(sql.MAX), data.idtOutcomes)
            .input('updatedBy', sql.NVarChar(100), rawData.userName || 'System')
            .query(`
                UPDATE dbo.idt_provider_notes SET
                    idtHospital = @idtHospital,
                    idtAdmitDate = @idtAdmitDate,
                    idtProviderName = @idtProviderName,
                    idtProviderRole = @idtProviderRole,
                    idtDiag = @idtDiag,
                    idtProblems = @idtProblems,
                    idtPriority = @idtPriority,
                    idtFunctionalStatus = @idtFunctionalStatus,
                    idtConsults = @idtConsults,
                    idtNoConsults = @idtNoConsults,
                    idtPlans = @idtPlans,
                    idtDischarge = @idtDischarge,
                    idtPatientClear = @idtPatientClear,
                    idtPatientClearDate = @idtPatientClearDate,
                    idtPatientClearBy = @idtPatientClearBy,
                    idtDischargeReadiness = @idtDischargeReadiness,
                    idtComplexityScore = @idtComplexityScore,
                    idtRiskLevel = @idtRiskLevel,
                    idtLengthOfStay = @idtLengthOfStay,
                    idtTargetLOS = @idtTargetLOS,
                    idtGoals = @idtGoals,
                    idtInterventions = @idtInterventions,
                    idtOutcomes = @idtOutcomes,
                    updatedBy = @updatedBy,
                    updatedAt = GETDATE()
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
            
        if (result.recordset.length === 0) {
            console.log(`⚠️ IDT provider note not found: ${id}`);
            return res.status(404).json({ 
                message: 'IDT provider note not found'
            });
        }
        
        await logUserAction(req, 'UPDATE', 'idt_provider_notes', result.recordset[0].clientID);
        
        console.log(`✅ IDT provider note updated successfully: ${id}`);
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('❌ Error updating IDT provider note:', error);
        res.status(500).json({ 
            message: 'Failed to update IDT provider note', 
            error: error.message 
        });
    }
});

// ✅ DELETE /api/idt-provider/note/:id - Delete specific IDT provider note
router.delete('/idt-provider/note/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`📡 Deleting IDT provider note: ${id}`);
        
        const pool = await sql.connect(dbConfig);
        
        // First check if record exists
        const existingRecord = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT clientID FROM dbo.idt_provider_notes WHERE id = @id');
        
        if (existingRecord.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'IDT provider note not found' 
            });
        }
        
        const clientID = existingRecord.recordset[0].clientID;
        
        // Delete the record
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM dbo.idt_provider_notes WHERE id = @id');
        
        await logUserAction(req, 'DELETE', 'idt_provider_notes', clientID);
        
        console.log(`✅ IDT provider note deleted successfully: ${id}`);
        res.json({ 
            message: 'IDT provider note deleted successfully',
            id: parseInt(id)
        });
        
    } catch (error) {
        console.error('❌ Error deleting IDT provider note:', error);
        res.status(500).json({ 
            message: 'Failed to delete IDT provider note', 
            error: error.message 
        });
    }
});

// ✅ GET /api/idt-provider/:clientID/summary - Get IDT summary data
router.get('/idt-provider/:clientID/summary', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    COUNT(*) as totalNotes,
                    AVG(CAST(idtComplexityScore as FLOAT)) as averageComplexity,
                    AVG(CAST(idtLengthOfStay as FLOAT)) as averageLOS,
                    MAX(createdAt) as lastUpdate,
                    (SELECT TOP 1 idtDischargeReadiness FROM dbo.idt_provider_notes 
                     WHERE clientID = @clientID ORDER BY createdAt DESC) as dischargePlanningStatus
                FROM dbo.idt_provider_notes 
                WHERE clientID = @clientID
            `);
        
        await logUserAction(req, 'GET', 'idt_provider_notes_summary', clientID);
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching IDT summary:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT summary data', 
            error: error.message 
        });
    }
});

// ✅ GET /api/idt-provider/:clientID/history - Get IDT note history
router.get('/idt-provider/:clientID/history', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    id,
                    idtProviderName,
                    idtProviderRole,
                    idtComplexityScore,
                    idtRiskLevel,
                    createdAt,
                    LEFT(idtDiag, 100) + '...' as summary
                FROM dbo.idt_provider_notes 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
            `);
        
        await logUserAction(req, 'GET', 'idt_provider_notes_history', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error fetching IDT history:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT history data', 
            error: error.message 
        });
    }
});

module.exports = router;