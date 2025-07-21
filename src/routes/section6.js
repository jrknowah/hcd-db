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

// ✅ Helper function to validate face sheet data
const validateFaceSheetData = (data) => {
    const errors = {};
    
    if (!data.caseStatus) {
        errors.caseStatus = 'Case status is required';
    }
    
    if (!data.primaryCaseManager) {
        errors.primaryCaseManager = 'Primary case manager is required';
    }
    
    if (data.admissionDate && !isValidDate(data.admissionDate)) {
        errors.admissionDate = 'Invalid admission date format';
    }
    
    if (data.expectedDischargeDate && !isValidDate(data.expectedDischargeDate)) {
        errors.expectedDischargeDate = 'Invalid expected discharge date format';
    }
    
    if (data.completionPercentage && (data.completionPercentage < 0 || data.completionPercentage > 100)) {
        errors.completionPercentage = 'Completion percentage must be between 0 and 100';
    }
    
    if (data.caseComplexityScore && (data.caseComplexityScore < 1 || data.caseComplexityScore > 10)) {
        errors.caseComplexityScore = 'Case complexity score must be between 1 and 10';
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
};

// ✅ Helper function to validate date format
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

// ✅ GET /api/section6/:clientID/facesheet - Get face sheet data for client
router.get('/:clientID/facesheet', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT TOP 1 *
                FROM dbo.Section6FaceSheet 
                WHERE clientID = @clientID 
                ORDER BY createdAt DESC
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No face sheet data found for this client',
                clientID: clientID 
            });
        }
        
        // Parse JSON fields
        const faceSheet = result.recordset[0];
        try {
            if (faceSheet.milestonesCompleted) {
                faceSheet.milestonesCompleted = JSON.parse(faceSheet.milestonesCompleted);
            }
            if (faceSheet.milestonesInProgress) {
                faceSheet.milestonesInProgress = JSON.parse(faceSheet.milestonesInProgress);
            }
            if (faceSheet.milestonesPending) {
                faceSheet.milestonesPending = JSON.parse(faceSheet.milestonesPending);
            }
        } catch (jsonError) {
            console.error('Error parsing JSON fields:', jsonError);
        }
        
        await logUserAction(req, 'GET', 'Section6FaceSheet', clientID);
        
        res.json(faceSheet);
        
    } catch (error) {
        console.error('Error fetching face sheet data:', error);
        res.status(500).json({ 
            message: 'Failed to fetch face sheet data', 
            error: error.message 
        });
    }
});

// ✅ POST /api/section6/:clientID/facesheet - Save/update face sheet data
router.post('/:clientID/facesheet', async (req, res) => {
    try {
        const { clientID } = req.params;
        const data = req.body;
        
        // Validate input data
        const validationErrors = validateFaceSheetData(data);
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
            .query('SELECT faceSheetID FROM dbo.Section6FaceSheet WHERE clientID = @clientID');
        
        let result;
        
        if (existingRecord.recordset.length > 0) {
            // Update existing record
            const faceSheetID = existingRecord.recordset[0].faceSheetID;
            
            result = await pool.request()
                .input('faceSheetID', sql.Int, faceSheetID)
                .input('caseNumber', sql.NVarChar(50), data.caseNumber)
                .input('caseStatus', sql.NVarChar(50), data.caseStatus)
                .input('admissionDate', sql.Date, data.admissionDate)
                .input('expectedDischargeDate', sql.Date, data.expectedDischargeDate)
                .input('actualDischargeDate', sql.Date, data.actualDischargeDate)
                .input('primaryCaseManager', sql.NVarChar(100), data.primaryCaseManager)
                .input('backupCaseManager', sql.NVarChar(100), data.backupCaseManager)
                .input('caseManagerAssignedDate', sql.Date, data.caseManagerAssignedDate)
                .input('milestonesCompleted', sql.NVarChar(sql.MAX), JSON.stringify(data.milestonesCompleted || []))
                .input('milestonesInProgress', sql.NVarChar(sql.MAX), JSON.stringify(data.milestonesInProgress || []))
                .input('milestonesPending', sql.NVarChar(sql.MAX), JSON.stringify(data.milestonesPending || []))
                .input('completionPercentage', sql.Decimal(5,2), data.completionPercentage)
                .input('riskLevel', sql.NVarChar(20), data.riskLevel)
                .input('priorityLevel', sql.NVarChar(20), data.priorityLevel)
                .input('caseComplexityScore', sql.Int, data.caseComplexityScore)
                .input('lengthOfStay', sql.Int, data.lengthOfStay)
                .input('targetLOS', sql.Int, data.targetLOS)
                .input('satisfactionScore', sql.Decimal(3,1), data.satisfactionScore)
                .input('documentationComplete', sql.Bit, data.documentationComplete || false)
                .input('missingDocuments', sql.NVarChar(sql.MAX), data.missingDocuments)
                .input('lastDocumentUpdate', sql.DateTime2, data.lastDocumentUpdate || new Date())
                .input('updatedBy', sql.NVarChar(100), req.user?.email || 'System')
                .input('updatedAt', sql.DateTime2, new Date())
                .query(`
                    UPDATE dbo.Section6FaceSheet SET
                        caseNumber = @caseNumber,
                        caseStatus = @caseStatus,
                        admissionDate = @admissionDate,
                        expectedDischargeDate = @expectedDischargeDate,
                        actualDischargeDate = @actualDischargeDate,
                        primaryCaseManager = @primaryCaseManager,
                        backupCaseManager = @backupCaseManager,
                        caseManagerAssignedDate = @caseManagerAssignedDate,
                        milestonesCompleted = @milestonesCompleted,
                        milestonesInProgress = @milestonesInProgress,
                        milestonesPending = @milestonesPending,
                        completionPercentage = @completionPercentage,
                        riskLevel = @riskLevel,
                        priorityLevel = @priorityLevel,
                        caseComplexityScore = @caseComplexityScore,
                        lengthOfStay = @lengthOfStay,
                        targetLOS = @targetLOS,
                        satisfactionScore = @satisfactionScore,
                        documentationComplete = @documentationComplete,
                        missingDocuments = @missingDocuments,
                        lastDocumentUpdate = @lastDocumentUpdate,
                        updatedBy = @updatedBy,
                        updatedAt = @updatedAt
                    WHERE faceSheetID = @faceSheetID;
                    
                    SELECT * FROM dbo.Section6FaceSheet WHERE faceSheetID = @faceSheetID;
                `);
                
            await logUserAction(req, 'UPDATE', 'Section6FaceSheet', clientID);
            
        } else {
            // Insert new record
            result = await pool.request()
                .input('clientID', sql.VarChar(50), clientID)
                .input('caseNumber', sql.NVarChar(50), data.caseNumber)
                .input('caseStatus', sql.NVarChar(50), data.caseStatus)
                .input('admissionDate', sql.Date, data.admissionDate)
                .input('expectedDischargeDate', sql.Date, data.expectedDischargeDate)
                .input('actualDischargeDate', sql.Date, data.actualDischargeDate)
                .input('primaryCaseManager', sql.NVarChar(100), data.primaryCaseManager)
                .input('backupCaseManager', sql.NVarChar(100), data.backupCaseManager)
                .input('caseManagerAssignedDate', sql.Date, data.caseManagerAssignedDate)
                .input('milestonesCompleted', sql.NVarChar(sql.MAX), JSON.stringify(data.milestonesCompleted || []))
                .input('milestonesInProgress', sql.NVarChar(sql.MAX), JSON.stringify(data.milestonesInProgress || []))
                .input('milestonesPending', sql.NVarChar(sql.MAX), JSON.stringify(data.milestonesPending || []))
                .input('completionPercentage', sql.Decimal(5,2), data.completionPercentage || 0)
                .input('riskLevel', sql.NVarChar(20), data.riskLevel)
                .input('priorityLevel', sql.NVarChar(20), data.priorityLevel)
                .input('caseComplexityScore', sql.Int, data.caseComplexityScore)
                .input('lengthOfStay', sql.Int, data.lengthOfStay)
                .input('targetLOS', sql.Int, data.targetLOS)
                .input('satisfactionScore', sql.Decimal(3,1), data.satisfactionScore)
                .input('documentationComplete', sql.Bit, data.documentationComplete || false)
                .input('missingDocuments', sql.NVarChar(sql.MAX), data.missingDocuments)
                .input('lastDocumentUpdate', sql.DateTime2, data.lastDocumentUpdate || new Date())
                .input('createdBy', sql.NVarChar(100), req.user?.email || 'System')
                .input('createdAt', sql.DateTime2, new Date())
                .query(`
                    INSERT INTO dbo.Section6FaceSheet (
                        clientID, caseNumber, caseStatus, admissionDate, expectedDischargeDate, actualDischargeDate,
                        primaryCaseManager, backupCaseManager, caseManagerAssignedDate,
                        milestonesCompleted, milestonesInProgress, milestonesPending,
                        completionPercentage, riskLevel, priorityLevel, caseComplexityScore,
                        lengthOfStay, targetLOS, satisfactionScore,
                        documentationComplete, missingDocuments, lastDocumentUpdate,
                        createdBy, createdAt, updatedBy, updatedAt
                    ) VALUES (
                        @clientID, @caseNumber, @caseStatus, @admissionDate, @expectedDischargeDate, @actualDischargeDate,
                        @primaryCaseManager, @backupCaseManager, @caseManagerAssignedDate,
                        @milestonesCompleted, @milestonesInProgress, @milestonesPending,
                        @completionPercentage, @riskLevel, @priorityLevel, @caseComplexityScore,
                        @lengthOfStay, @targetLOS, @satisfactionScore,
                        @documentationComplete, @missingDocuments, @lastDocumentUpdate,
                        @createdBy, @createdAt, @createdBy, @createdAt
                    );
                    
                    SELECT * FROM dbo.Section6FaceSheet WHERE faceSheetID = SCOPE_IDENTITY();
                `);
                
            await logUserAction(req, 'INSERT', 'Section6FaceSheet', clientID);
        }
        
        res.json({
            message: 'Face sheet data saved successfully',
            data: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error saving face sheet data:', error);
        res.status(500).json({ 
            message: 'Failed to save face sheet data', 
            error: error.message 
        });
    }
});

// ✅ GET /api/section6/:clientID/status - Get case status summary
router.get('/:clientID/status', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    caseStatus as currentStatus,
                    updatedAt as lastStatusUpdate,
                    updatedBy as lastUpdatedBy,
                    expectedDischargeDate as nextReviewDate
                FROM dbo.Section6FaceSheet 
                WHERE clientID = @clientID
                ORDER BY createdAt DESC
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No case status found for this client' 
            });
        }
        
        await logUserAction(req, 'GET', 'Section6Status', clientID);
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching case status:', error);
        res.status(500).json({ 
            message: 'Failed to fetch case status', 
            error: error.message 
        });
    }
});

// ✅ GET /api/section6/:clientID/timeline - Get case timeline
router.get('/:clientID/timeline', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    ct.*
                FROM dbo.CaseTimeline ct
                INNER JOIN dbo.Section6FaceSheet fs ON ct.caseID = fs.faceSheetID
                WHERE fs.clientID = @clientID
                ORDER BY ct.eventDate ASC
            `);
        
        await logUserAction(req, 'GET', 'Section6Timeline', clientID);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Error fetching case timeline:', error);
        res.status(500).json({ 
            message: 'Failed to fetch case timeline', 
            error: error.message 
        });
    }
});

// ✅ GET /api/section6/:clientID/metrics - Get case metrics
router.get('/:clientID/metrics', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    fs.completionPercentage,
                    fs.caseComplexityScore,
                    fs.satisfactionScore,
                    fs.lengthOfStay,
                    fs.targetLOS,
                    fs.documentationComplete,
                    COUNT(ct.timelineID) as totalMilestones,
                    SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) as completedMilestones,
                    SUM(CASE WHEN ct.completed = 0 AND ct.eventDate < GETDATE() THEN 1 ELSE 0 END) as overdueTasks,
                    fs.updatedAt as lastMetricsUpdate
                FROM dbo.Section6FaceSheet fs
                LEFT JOIN dbo.CaseTimeline ct ON ct.caseID = fs.faceSheetID
                WHERE fs.clientID = @clientID
                GROUP BY fs.faceSheetID, fs.completionPercentage, fs.caseComplexityScore, 
                         fs.satisfactionScore, fs.lengthOfStay, fs.targetLOS, 
                         fs.documentationComplete, fs.updatedAt
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No metrics found for this client' 
            });
        }
        
        await logUserAction(req, 'GET', 'Section6Metrics', clientID);
        
        res.json(result.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching case metrics:', error);
        res.status(500).json({ 
            message: 'Failed to fetch case metrics', 
            error: error.message 
        });
    }
});

// ✅ PUT /api/section6/:clientID/status - Update case status
router.put('/:clientID/status', async (req, res) => {
    try {
        const { clientID } = req.params;
        const { newStatus, reason } = req.body;
        
        if (!newStatus) {
            return res.status(400).json({ message: 'New status is required' });
        }
        
        const pool = await sql.connect(dbConfig);
        
        // Update the case status
        const result = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .input('newStatus', sql.NVarChar(50), newStatus)
            .input('updatedBy', sql.NVarChar(100), req.user?.email || 'System')
            .input('updatedAt', sql.DateTime2, new Date())
            .query(`
                UPDATE dbo.Section6FaceSheet 
                SET caseStatus = @newStatus,
                    updatedBy = @updatedBy,
                    updatedAt = @updatedAt
                WHERE clientID = @clientID;
                
                SELECT * FROM dbo.Section6FaceSheet WHERE clientID = @clientID;
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Case not found' });
        }
        
        // Log status change in timeline
        await pool.request()
            .input('caseID', sql.Int, result.recordset[0].faceSheetID)
            .input('eventType', sql.NVarChar(50), 'Status Change')
            .input('eventDescription', sql.NVarChar(500), `Status changed to ${newStatus}. ${reason || ''}`)
            .input('eventDate', sql.DateTime2, new Date())
            .input('createdBy', sql.NVarChar(100), req.user?.email || 'System')
            .query(`
                INSERT INTO dbo.CaseTimeline (caseID, eventType, eventDescription, eventDate, completed, createdBy, createdAt)
                VALUES (@caseID, @eventType, @eventDescription, @eventDate, 1, @createdBy, @eventDate)
            `);
        
        await logUserAction(req, 'UPDATE_STATUS', 'Section6FaceSheet', clientID);
        
        res.json({
            message: 'Case status updated successfully',
            newStatus: newStatus,
            updatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error updating case status:', error);
        res.status(500).json({ 
            message: 'Failed to update case status', 
            error: error.message 
        });
    }
});

// ✅ PUT /api/section6/:clientID/milestone/:milestoneID - Update milestone completion
router.put('/:clientID/milestone/:milestoneID', async (req, res) => {
    try {
        const { clientID, milestoneID } = req.params;
        const { completed, notes } = req.body;
        
        const pool = await sql.connect(dbConfig);
        
        // Update milestone in timeline
        const result = await pool.request()
            .input('milestoneID', sql.Int, milestoneID)
            .input('completed', sql.Bit, completed)
            .input('completionNotes', sql.NVarChar(sql.MAX), notes)
            .input('completedBy', sql.NVarChar(100), req.user?.email || 'System')
            .input('completedAt', sql.DateTime2, completed ? new Date() : null)
            .query(`
                UPDATE dbo.CaseTimeline 
                SET completed = @completed,
                    completionNotes = @completionNotes,
                    completedBy = @completedBy,
                    completedAt = @completedAt
                WHERE timelineID = @milestoneID;
                
                SELECT * FROM dbo.CaseTimeline WHERE timelineID = @milestoneID;
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Milestone not found' });
        }
        
        await logUserAction(req, 'UPDATE_MILESTONE', 'CaseTimeline', milestoneID);
        
        res.json({
            message: 'Milestone updated successfully',
            milestone: result.recordset[0]
        });
        
    } catch (error) {
        console.error('Error updating milestone:', error);
        res.status(500).json({ 
            message: 'Failed to update milestone', 
            error: error.message 
        });
    }
});

// ✅ GET /api/section6/:clientID/dashboard - Get complete dashboard data
router.get('/:clientID/dashboard', async (req, res) => {
    try {
        const { clientID } = req.params;
        
        const pool = await sql.connect(dbConfig);
        
        // Get comprehensive dashboard data
        const dashboardResult = await pool.request()
            .input('clientID', sql.VarChar(50), clientID)
            .query(`
                SELECT 
                    fs.*,
                    COUNT(ct.timelineID) as totalMilestones,
                    SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) as completedMilestones,
                    SUM(CASE WHEN ct.completed = 0 AND ct.eventDate < GETDATE() THEN 1 ELSE 0 END) as overdueTasks,
                    (SELECT COUNT(*) FROM dbo.PersonalInventory pi WHERE pi.clientID = @clientID) as inventoryItems,
                    (SELECT COUNT(*) FROM dbo.NursingArchive na WHERE na.clientID = @clientID) as documentCount
                FROM dbo.Section6FaceSheet fs
                LEFT JOIN dbo.CaseTimeline ct ON ct.caseID = fs.faceSheetID
                WHERE fs.clientID = @clientID
                GROUP BY fs.faceSheetID, fs.clientID, fs.caseNumber, fs.caseStatus, fs.admissionDate,
                         fs.expectedDischargeDate, fs.actualDischargeDate, fs.primaryCaseManager,
                         fs.backupCaseManager, fs.caseManagerAssignedDate, fs.milestonesCompleted,
                         fs.milestonesInProgress, fs.milestonesPending, fs.completionPercentage,
                         fs.riskLevel, fs.priorityLevel, fs.caseComplexityScore, fs.lengthOfStay,
                         fs.targetLOS, fs.satisfactionScore, fs.documentationComplete,
                         fs.missingDocuments, fs.lastDocumentUpdate, fs.createdBy, fs.createdAt,
                         fs.updatedBy, fs.updatedAt
            `);
        
        if (dashboardResult.recordset.length === 0) {
            return res.status(404).json({ 
                message: 'No dashboard data found for this client' 
            });
        }
        
        await logUserAction(req, 'GET', 'Section6Dashboard', clientID);
        
        res.json(dashboardResult.recordset[0]);
        
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ 
            message: 'Failed to fetch dashboard data', 
            error: error.message 
        });
    }
});

module.exports = router;