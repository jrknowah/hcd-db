const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { logUserAction } = require('../backend/config/logAction');

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
    
    if (data.idtDischargeTarget && !isValidDate(data.idtDischargeTarget)) {
        errors.idtDischargeTarget = 'Invalid target discharge date format';
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
        'idtPatientClearNotes', 'idtGoals', 'idtInterventions', 'idtOutcomes',
        'idtFollowUpNeeded', 'idtMonitoringPlan'
    ];
    
    textFields.forEach(field => {
        if (data[field]) {
            sanitized[field] = data[field].toString().trim();
        }
    });
    
    // Date fields
    const dateFields = ['idtAdmitDate', 'idtPatientClearDate', 'idtDischargeTarget', 'idtNextReview'];
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

// ✅ GET /api/idt-provider/:clientID - Get IDT provider data for client
router.get('/:clientID', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT TOP 1 *
                FROM dbo.IDTProviderNote 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No IDT provider data found for this client',
                clientID: clientID 
            });
        }
        
        // Log user action
        await logUserAction(req, 'GET', 'IDTProviderNote', clientID);
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching IDT provider data:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT provider data', 
            error: error.message 
        });
    }
});

// ✅ POST /api/idt-provider/:clientID - Save/update IDT provider data
router.post('/:clientID', async (req, res) => {
    try {
        const { clientID } = req.params;
        const rawData = req.body;
        
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
        
        // Check if record exists
        const existingRecord = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query('SELECT idtID FROM dbo.IDTProviderNote WHERE clientID = @clientID');
        
        let result;
        
        if (existingRecord.recordset.length > 0) {
            // Update existing record
            const idtID = existingRecord.recordset[0].idtID;
            
            result = await pool.request()
                .input('idtID', sql.Int, idtID)
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
                .input('idtDischargeTarget', sql.Date, data.idtDischargeTarget)
                .input('idtDischargeReadiness', sql.NVarChar(50), data.idtDischargeReadiness)
                .input('idtPatientClear', sql.NVarChar(20), data.idtPatientClear)
                .input('idtPatientClearDate', sql.Date, data.idtPatientClearDate)
                .input('idtPatientClearBy', sql.NVarChar(100), data.idtPatientClearBy)
                .input('idtPatientClearNotes', sql.NVarChar(sql.MAX), data.idtPatientClearNotes)
                .input('idtGoals', sql.NVarChar(sql.MAX), data.idtGoals)
                .input('idtInterventions', sql.NVarChar(sql.MAX), data.idtInterventions)
                .input('idtOutcomes', sql.NVarChar(sql.MAX), data.idtOutcomes)
                .input('idtLengthOfStay', sql.Int, data.idtLengthOfStay)
                .input('idtTargetLOS', sql.Int, data.idtTargetLOS)
                .input('idtComplexityScore', sql.Int, data.idtComplexityScore)
                .input('idtRiskLevel', sql.NVarChar(20), data.idtRiskLevel)
                .input('idtNextReview', sql.Date, data.idtNextReview)
                .input('idtFollowUpNeeded', sql.NVarChar(sql.MAX), data.idtFollowUpNeeded)
                .input('idtMonitoringPlan', sql.NVarChar(sql.MAX), data.idtMonitoringPlan)
                .input('updatedBy', sql.NVarChar(100), rawData.userName || 'System')
                .input('updatedAt', sql.DateTime2, new Date())
                .query(`
                    UPDATE dbo.IDTProviderNote SET
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
                        idtDischargeTarget = @idtDischargeTarget,
                        idtDischargeReadiness = @idtDischargeReadiness,
                        idtPatientClear = @idtPatientClear,
                        idtPatientClearDate = @idtPatientClearDate,
                        idtPatientClearBy = @idtPatientClearBy,
                        idtPatientClearNotes = @idtPatientClearNotes,
                        idtGoals = @idtGoals,
                        idtInterventions = @idtInterventions,
                        idtOutcomes = @idtOutcomes,
                        idtLengthOfStay = @idtLengthOfStay,
                        idtTargetLOS = @idtTargetLOS,
                        idtComplexityScore = @idtComplexityScore,
                        idtRiskLevel = @idtRiskLevel,
                        idtNextReview = @idtNextReview,
                        idtFollowUpNeeded = @idtFollowUpNeeded,
                        idtMonitoringPlan = @idtMonitoringPlan,
                        updatedBy = @updatedBy,
                        updatedAt = @updatedAt
                    WHERE idtID = @idtID;
                    
                    SELECT * FROM dbo.IDTProviderNote WHERE idtID = @idtID;
                `);
                
            await logUserAction(req, 'UPDATE', 'IDTProviderNote', clientID);
            
        } else {
            // Insert new record
            result = await pool.request()
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
                .input('idtDischargeTarget', sql.Date, data.idtDischargeTarget)
                .input('idtDischargeReadiness', sql.NVarChar(50), data.idtDischargeReadiness)
                .input('idtPatientClear', sql.NVarChar(20), data.idtPatientClear)
                .input('idtPatientClearDate', sql.Date, data.idtPatientClearDate)
                .input('idtPatientClearBy', sql.NVarChar(100), data.idtPatientClearBy)
                .input('idtPatientClearNotes', sql.NVarChar(sql.MAX), data.idtPatientClearNotes)
                .input('idtGoals', sql.NVarChar(sql.MAX), data.idtGoals)
                .input('idtInterventions', sql.NVarChar(sql.MAX), data.idtInterventions)
                .input('idtOutcomes', sql.NVarChar(sql.MAX), data.idtOutcomes)
                .input('idtLengthOfStay', sql.Int, data.idtLengthOfStay)
                .input('idtTargetLOS', sql.Int, data.idtTargetLOS)
                .input('idtComplexityScore', sql.Int, data.idtComplexityScore)
                .input('idtRiskLevel', sql.NVarChar(20), data.idtRiskLevel)
                .input('idtNextReview', sql.Date, data.idtNextReview)
                .input('idtFollowUpNeeded', sql.NVarChar(sql.MAX), data.idtFollowUpNeeded)
                .input('idtMonitoringPlan', sql.NVarChar(sql.MAX), data.idtMonitoringPlan)
                .input('createdBy', sql.NVarChar(100), rawData.userName || 'System')
                .input('createdAt', sql.DateTime2, new Date())
                .query(`
                    INSERT INTO dbo.IDTProviderNote (
                        clientID, idtHospital, idtAdmitDate, idtProviderName, idtProviderRole,
                        idtDiag, idtProblems, idtPriority, idtFunctionalStatus,
                        idtConsults, idtNoConsults, idtPlans, idtDischarge,
                        idtDischargeTarget, idtDischargeReadiness,
                        idtPatientClear, idtPatientClearDate, idtPatientClearBy, idtPatientClearNotes,
                        idtGoals, idtInterventions, idtOutcomes,
                        idtLengthOfStay, idtTargetLOS, idtComplexityScore, idtRiskLevel,
                        idtNextReview, idtFollowUpNeeded, idtMonitoringPlan,
                        createdBy, createdAt, updatedBy, updatedAt
                    ) VALUES (
                        @clientID, @idtHospital, @idtAdmitDate, @idtProviderName, @idtProviderRole,
                        @idtDiag, @idtProblems, @idtPriority, @idtFunctionalStatus,
                        @idtConsults, @idtNoConsults, @idtPlans, @idtDischarge,
                        @idtDischargeTarget, @idtDischargeReadiness,
                        @idtPatientClear, @idtPatientClearDate, @idtPatientClearBy, @idtPatientClearNotes,
                        @idtGoals, @idtInterventions, @idtOutcomes,
                        @idtLengthOfStay, @idtTargetLOS, @idtComplexityScore, @idtRiskLevel,
                        @idtNextReview, @idtFollowUpNeeded, @idtMonitoringPlan,
                        @createdBy, @createdAt, @createdBy, @createdAt
                    );
                    
                    SELECT * FROM dbo.IDTProviderNote WHERE idtID = SCOPE_IDENTITY();
                `);
                
            await logUserAction(req, 'INSERT', 'IDTProviderNote', clientID);
        }
        
        res.json({
            message: 'IDT Provider Note saved successfully',
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error saving IDT provider data:', error);
        res.status(500).json({ 
            message: 'Failed to save IDT provider data', 
            error: error.message 
        });
    }
});

// ✅ GET /api/idt-provider/:clientID/summary - Get IDT summary data
router.get('/:clientID/summary', async (req, res) => {
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
                    (SELECT TOP 1 idtDischargeReadiness FROM dbo.IDTProviderNote 
                     WHERE clientID = @clientID ORDER BY createdAt DESC) as dischargePlanningStatus
                FROM dbo.IDTProviderNote 
                WHERE clientID = @clientID
            `);
        
        await logUserAction(req, 'GET', 'IDTProviderNote_Summary', clientID);
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching IDT summary:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT summary data', 
            error: error.message 
        });
    }
});

// ✅ GET /api/idt-provider/:clientID/consultations - Get consultation data only
router.get('/:clientID/consultations', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    idtConsults,
                    idtNoConsults,
                    createdAt
                FROM dbo.IDTProviderNote 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
            `);
        
        await logUserAction(req, 'GET', 'IDTProviderNote_Consultations', clientID);
        
        res.json({
            activeConsultations: result.recordset[0]?.idtConsults || '',
            alternativeConsultations: result.recordset[0]?.idtNoConsults || '',
            lastUpdate: result.recordset[0]?.createdAt
        });
        
    } catch (error) {
        console.error('Error fetching consultation data:', error);
        res.status(500).json({ 
            message: 'Failed to fetch consultation data', 
            error: error.message 
        });
    }
});

// ✅ GET /api/idt-provider/:clientID/discharge-planning - Get discharge planning data
router.get('/:clientID/discharge-planning', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT TOP 1
                    idtDischargeReadiness,
                    idtDischargeTarget,
                    idtDischarge,
                    idtPlans,
                    idtPatientClear,
                    idtPatientClearDate,
                    idtPatientClearBy
                FROM dbo.IDTProviderNote 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
            `);
        
        await logUserAction(req, 'GET', 'IDTProviderNote_DischargePlanning', clientID);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No discharge planning data found' 
            });
        }
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching discharge planning data:', error);
        res.status(500).json({ 
            message: 'Failed to fetch discharge planning data', 
            error: error.message 
        });
    }
});

// ✅ GET /api/idt-provider/:clientID/history - Get IDT note history
router.get('/:clientID/history', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    idtID,
                    idtProviderName,
                    idtProviderRole,
                    idtComplexityScore,
                    idtRiskLevel,
                    createdAt,
                    LEFT(idtDiag, 100) + '...' as summary
                FROM dbo.IDTProviderNote 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
            `);
        
        await logUserAction(req, 'GET', 'IDTProviderNote_History', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error fetching IDT history:', error);
        res.status(500).json({ 
            message: 'Failed to fetch IDT history data', 
            error: error.message 
        });
    }
});

// ✅ DELETE /api/idt-provider/:idtID - Delete specific IDT record
router.delete('/:idtID', async (req, res) => {
    try {
        const { idtID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        
        // First check if record exists
        const existingRecord = await pool.request()
            .input('idtID', sql.Int, idtID)
            .query('SELECT clientID FROM dbo.IDTProviderNote WHERE idtID = @idtID');
        
        if (existingRecord.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'IDT record not found' 
            });
        }
        
        const clientID = existingRecord.recordset[0].clientID;
        
        // Delete the record
        await pool.request()
            .input('idtID', sql.Int, idtID)
            .query('DELETE FROM dbo.IDTProviderNote WHERE idtID = @idtID');
        
        await logUserAction(req, 'DELETE', 'IDTProviderNote', clientID);
        
        res.json({ 
            message: 'IDT Provider Note deleted successfully',
            idtID: idtID 
        });
        
    } catch (error) {
        console.error('Error deleting IDT record:', error);
        res.status(500).json({ 
            message: 'Failed to delete IDT record', 
            error: error.message 
        });
    }
});

module.exports = router;