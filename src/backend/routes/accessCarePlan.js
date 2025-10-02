const express = require('express');
const router = express.Router();
const sql = require('mssql');
// const { getDbConnection } = require('../config/database');
const { connectToAzureSql } = require('../store/azureSql'); 
const { logUserAction } = require('../middleware/logging');

// ===== UTILITY FUNCTIONS =====

const formatAssessmentData = (rows) => {
    if (!rows || rows.length === 0) return null;
    
    const assessment = rows[0];
    return {
        assessmentID: assessment.assessmentID,
        clientID: assessment.clientID,
        assessmentNumber: assessment.assessmentNumber,
        assessmentStatus: assessment.assessmentStatus,
        assessmentType: assessment.assessmentType,
        startDate: assessment.startDate,
        expectedCompletionDate: assessment.expectedCompletionDate,
        actualCompletionDate: assessment.actualCompletionDate,
        primaryAssessor: assessment.primaryAssessor,
        completionPercentage: assessment.completionPercentage || 0,
        riskLevel: assessment.riskLevel,
        priorityLevel: assessment.priorityLevel,
        complexityScore: assessment.complexityScore || 0,
        daysInProgress: assessment.daysInProgress || 0,
        targetDays: assessment.targetDays || 14,
        documentationComplete: assessment.documentationComplete || false,
        notes: assessment.notes,
        createdBy: assessment.createdBy,
        createdAt: assessment.createdAt,
        updatedBy: assessment.updatedBy,
        updatedAt: assessment.updatedAt
    };
};

const calculateDaysInProgress = (startDate) => {
    if (!startDate) return 0;
    const today = new Date();
    const start = new Date(startDate);
    const diffTime = Math.abs(today - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ===== ASSESSMENT CARE PLANS ROUTES =====

// 🔸 GET /api/assessment-care-plans/:clientID - Get assessment data for client
router.get('/assessment-care-plans/:clientID', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await connectToAzureSql();
        
        // Get latest assessment for client
        const assessmentQuery = `
            SELECT TOP 1 
                acp.*,
                DATEDIFF(day, acp.startDate, GETDATE()) as daysInProgress,
                CASE 
                    WHEN acp.assessmentStatus = 'Complete' THEN 100
                    ELSE ISNULL(acp.completionPercentage, 0)
                END as completionPercentage
            FROM AssessmentCarePlans acp
            WHERE acp.clientID = @clientID
            ORDER BY acp.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(assessmentQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No assessment found for this client',
                clientID 
            });
        }

        const assessmentData = formatAssessmentData(result.recordset);
        
        await logUserAction(req.user, 'GET_ASSESSMENT_DATA', {
            clientID,
            assessmentID: assessmentData.assessmentID
        });

        res.json(assessmentData);

    } catch (error) {
        console.error('Error fetching assessment data:', error);
        await logUserAction(req.user, 'GET_ASSESSMENT_DATA_ERROR', {
            clientID,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Failed to fetch assessment data',
            details: error.message 
        });
    }
});

// 🔸 POST /api/assessment-care-plans/:clientID - Create/Save assessment data
router.post('/assessment-care-plans/:clientID', async (req, res) => {
    const { clientID } = req.params;
    const assessmentData = req.body;
    
    try {
        const pool = await connectToAzureSql();
        const userEmail = req.user?.email || 'system@example.com';
        
        // Check if assessment already exists
        const existingQuery = `
            SELECT assessmentID FROM AssessmentCarePlans 
            WHERE clientID = @clientID AND assessmentStatus != 'Complete'
        `;
        
        const existingResult = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(existingQuery);

        let assessmentID;
        let operation;

        if (existingResult.recordset.length > 0) {
            // Update existing assessment
            assessmentID = existingResult.recordset[0].assessmentID;
            operation = 'UPDATE';
            
            const updateQuery = `
                UPDATE AssessmentCarePlans SET
                    assessmentType = @assessmentType,
                    assessmentStatus = @assessmentStatus,
                    expectedCompletionDate = @expectedCompletionDate,
                    primaryAssessor = @primaryAssessor,
                    riskLevel = @riskLevel,
                    priorityLevel = @priorityLevel,
                    complexityScore = @complexityScore,
                    targetDays = @targetDays,
                    documentationComplete = @documentationComplete,
                    notes = @notes,
                    updatedBy = @updatedBy,
                    updatedAt = GETDATE()
                WHERE assessmentID = @assessmentID
            `;
            
            await pool.request()
                .input('assessmentID', sql.VarChar, assessmentID)
                .input('assessmentType', sql.VarChar, assessmentData.assessmentType || 'Comprehensive')
                .input('assessmentStatus', sql.VarChar, assessmentData.assessmentStatus || 'In Progress')
                .input('expectedCompletionDate', sql.DateTime, assessmentData.expectedCompletionDate)
                .input('primaryAssessor', sql.VarChar, assessmentData.primaryAssessor)
                .input('riskLevel', sql.VarChar, assessmentData.riskLevel || 'Medium')
                .input('priorityLevel', sql.VarChar, assessmentData.priorityLevel || 'Medium')
                .input('complexityScore', sql.Int, assessmentData.complexityScore || 5)
                .input('targetDays', sql.Int, assessmentData.targetDays || 14)
                .input('documentationComplete', sql.Bit, assessmentData.documentationComplete || false)
                .input('notes', sql.NVarChar, assessmentData.notes)
                .input('updatedBy', sql.VarChar, userEmail)
                .query(updateQuery);

        } else {
            // Create new assessment
            assessmentID = `ACP-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
            operation = 'INSERT';
            
            const insertQuery = `
                INSERT INTO AssessmentCarePlans (
                    assessmentID, clientID, assessmentNumber, assessmentType, assessmentStatus,
                    startDate, expectedCompletionDate, primaryAssessor, riskLevel, priorityLevel,
                    complexityScore, targetDays, documentationComplete, notes, createdBy, createdAt
                ) VALUES (
                    @assessmentID, @clientID, @assessmentNumber, @assessmentType, @assessmentStatus,
                    @startDate, @expectedCompletionDate, @primaryAssessor, @riskLevel, @priorityLevel,
                    @complexityScore, @targetDays, @documentationComplete, @notes, @createdBy, GETDATE()
                )
            `;
            
            await pool.request()
                .input('assessmentID', sql.VarChar, assessmentID)
                .input('clientID', sql.VarChar, clientID)
                .input('assessmentNumber', sql.VarChar, assessmentID) // Use same as ID for now
                .input('assessmentType', sql.VarChar, assessmentData.assessmentType || 'Comprehensive')
                .input('assessmentStatus', sql.VarChar, 'In Progress')
                .input('startDate', sql.DateTime, new Date())
                .input('expectedCompletionDate', sql.DateTime, assessmentData.expectedCompletionDate)
                .input('primaryAssessor', sql.VarChar, assessmentData.primaryAssessor || userEmail)
                .input('riskLevel', sql.VarChar, assessmentData.riskLevel || 'Medium')
                .input('priorityLevel', sql.VarChar, assessmentData.priorityLevel || 'Medium')
                .input('complexityScore', sql.Int, assessmentData.complexityScore || 5)
                .input('targetDays', sql.Int, assessmentData.targetDays || 14)
                .input('documentationComplete', sql.Bit, false)
                .input('notes', sql.NVarChar, assessmentData.notes)
                .input('createdBy', sql.VarChar, userEmail)
                .query(insertQuery);
        }

        // Update completion percentage if milestones are provided
        if (assessmentData.milestones) {
            const completedMilestones = assessmentData.milestones.filter(m => m.completed).length;
            const totalMilestones = assessmentData.milestones.length;
            const completionPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
            
            await pool.request()
                .input('assessmentID', sql.VarChar, assessmentID)
                .input('completionPercentage', sql.Decimal, completionPercentage)
                .query(`
                    UPDATE AssessmentCarePlans 
                    SET completionPercentage = @completionPercentage 
                    WHERE assessmentID = @assessmentID
                `);
        }

        await logUserAction(req.user, `${operation}_ASSESSMENT_DATA`, {
            clientID,
            assessmentID,
            operation
        });

        res.json({ 
            success: true, 
            assessmentID,
            operation,
            message: `Assessment ${operation === 'INSERT' ? 'created' : 'updated'} successfully` 
        });

    } catch (error) {
        console.error('Error saving assessment data:', error);
        await logUserAction(req.user, 'SAVE_ASSESSMENT_DATA_ERROR', {
            clientID,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Failed to save assessment data',
            details: error.message 
        });
    }
});

// 🔸 GET /api/assessment-care-plans/:clientID/status - Get assessment status
router.get('/assessment-care-plans/:clientID/status', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await connectToAzureSql();
        
        const statusQuery = `
            SELECT 
                acp.assessmentID,
                acp.assessmentStatus,
                acp.completionPercentage,
                acp.startDate,
                acp.expectedCompletionDate,
                DATEDIFF(day, GETDATE(), acp.expectedCompletionDate) as daysRemaining,
                CASE 
                    WHEN DATEDIFF(day, GETDATE(), acp.expectedCompletionDate) >= 0 THEN CAST(1 AS BIT)
                    ELSE CAST(0 AS BIT)
                END as onTrack,
                -- Get milestone counts
                (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID) as totalMilestones,
                (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID AND am.completed = 1) as completedMilestones,
                -- Get next milestone
                (SELECT TOP 1 am.title FROM AssessmentMilestones am 
                 WHERE am.assessmentID = acp.assessmentID AND am.completed = 0 
                 ORDER BY am.dueDate ASC) as nextMilestone,
                (SELECT TOP 1 am.dueDate FROM AssessmentMilestones am 
                 WHERE am.assessmentID = acp.assessmentID AND am.completed = 0 
                 ORDER BY am.dueDate ASC) as nextMilestoneDate
            FROM AssessmentCarePlans acp
            WHERE acp.clientID = @clientID
            ORDER BY acp.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(statusQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No assessment found for this client' 
            });
        }

        const status = result.recordset[0];
        const statusData = {
            currentPhase: status.nextMilestone || 'Assessment Complete',
            phaseProgress: status.completionPercentage || 0,
            overallProgress: status.completionPercentage || 0,
            milestonesCompleted: status.completedMilestones || 0,
            totalMilestones: status.totalMilestones || 0,
            daysRemaining: status.daysRemaining || 0,
            onTrack: status.onTrack || false,
            blockers: [], // Could be populated from a separate blockers table
            nextMilestone: status.nextMilestone,
            nextMilestoneDate: status.nextMilestoneDate
        };

        res.json(statusData);

    } catch (error) {
        console.error('Error fetching assessment status:', error);
        res.status(500).json({ 
            error: 'Failed to fetch assessment status',
            details: error.message 
        });
    }
});

// 🔸 GET /api/assessment-care-plans/:clientID/metrics - Get assessment metrics
router.get('/assessment-care-plans/:clientID/metrics', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await connectToAzureSql();
        
        const metricsQuery = `
            SELECT 
                acp.assessmentID,
                acp.completionPercentage,
                acp.complexityScore,
                DATEDIFF(day, acp.startDate, GETDATE()) as daysInProgress,
                -- Document completion metrics
                (SELECT COUNT(*) FROM AssessmentDocuments ad WHERE ad.assessmentID = acp.assessmentID AND ad.completed = 1) as documentsComplete,
                (SELECT COUNT(*) FROM AssessmentDocuments ad WHERE ad.assessmentID = acp.assessmentID) as documentsTotal,
                -- Milestone metrics
                (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID) as totalAssessments,
                (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID AND am.completed = 1) as completedAssessments,
                (SELECT COUNT(*) FROM AssessmentMilestones am 
                 WHERE am.assessmentID = acp.assessmentID AND am.completed = 0 AND am.dueDate < GETDATE()) as overdueAssessments,
                -- Risk and strength metrics  
                (SELECT COUNT(*) FROM AssessmentRiskFactors arf WHERE arf.assessmentID = acp.assessmentID) as riskFactors,
                (SELECT COUNT(*) FROM AssessmentStrengths ast WHERE ast.assessmentID = acp.assessmentID) as strengthsIdentified,
                acp.updatedAt as lastUpdate
            FROM AssessmentCarePlans acp
            WHERE acp.clientID = @clientID
            ORDER BY acp.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(metricsQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No assessment found for this client' 
            });
        }

        const metrics = result.recordset[0];
        
        // Calculate average completion time (could be improved with historical data)
        const avgCompletionQuery = `
            SELECT AVG(DATEDIFF(day, startDate, actualCompletionDate)) as averageCompletionTime
            FROM AssessmentCarePlans 
            WHERE assessmentStatus = 'Complete' 
            AND actualCompletionDate IS NOT NULL
        `;
        
        const avgResult = await pool.request().query(avgCompletionQuery);
        const averageCompletionTime = avgResult.recordset[0]?.averageCompletionTime || 12;

        const metricsData = {
            totalAssessments: metrics.totalAssessments || 0,
            completedAssessments: metrics.completedAssessments || 0,
            overdueAssessments: metrics.overdueAssessments || 0,
            documentsComplete: metrics.documentsComplete || 0,
            documentsTotal: metrics.documentsTotal || 0,
            assessmentScore: metrics.complexityScore || 0,
            lastUpdate: metrics.lastUpdate,
            riskFactors: metrics.riskFactors || 0,
            strengthsIdentified: metrics.strengthsIdentified || 0,
            averageCompletionTime: averageCompletionTime,
            clientSatisfactionScore: 4.2, // Could come from satisfaction survey table
            assessorWorkload: 'Medium' // Could be calculated based on assessor's current caseload
        };

        res.json(metricsData);

    } catch (error) {
        console.error('Error fetching assessment metrics:', error);
        res.status(500).json({ 
            error: 'Failed to fetch assessment metrics',
            details: error.message 
        });
    }
});

// 🔸 GET /api/assessment-care-plans/:clientID/milestones - Get assessment milestones
router.get('/assessment-care-plans/:clientID/milestones', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await connectToAzureSql();
        
        // First get the assessment ID
        const assessmentQuery = `
            SELECT TOP 1 assessmentID FROM AssessmentCarePlans 
            WHERE clientID = @clientID 
            ORDER BY createdAt DESC
        `;
        
        const assessmentResult = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(assessmentQuery);

        if (assessmentResult.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No assessment found for this client' 
            });
        }

        const assessmentID = assessmentResult.recordset[0].assessmentID;

        const milestonesQuery = `
            SELECT 
                milestoneID as id,
                title,
                description,
                completed,
                completedDate,
                dueDate,
                required,
                estimatedHours,
                actualHours,
                sortOrder
            FROM AssessmentMilestones
            WHERE assessmentID = @assessmentID
            ORDER BY sortOrder ASC, milestoneID ASC
        `;
        
        const result = await pool.request()
            .input('assessmentID', sql.VarChar, assessmentID)
            .query(milestonesQuery);

        // If no milestones exist, create default ones
        if (result.recordset.length === 0) {
            const defaultMilestones = [
                { title: 'Bio-Social Assessment', description: 'Financial, employment, and housing assessment', required: true, estimatedHours: 2, sortOrder: 1 },
                { title: 'Mental Health Assessment', description: 'Psychiatric evaluation and mental status exam', required: true, estimatedHours: 3, sortOrder: 2 },
                { title: 'Re-Assessment', description: 'Follow-up assessment and progress evaluation', required: true, estimatedHours: 2, sortOrder: 3 },
                { title: 'Section 3 Archive', description: 'Document archival and final documentation', required: false, estimatedHours: 1, sortOrder: 4 }
            ];

            // Insert default milestones
            for (const milestone of defaultMilestones) {
                await pool.request()
                    .input('assessmentID', sql.VarChar, assessmentID)
                    .input('title', sql.VarChar, milestone.title)
                    .input('description', sql.VarChar, milestone.description)
                    .input('required', sql.Bit, milestone.required)
                    .input('estimatedHours', sql.Decimal, milestone.estimatedHours)
                    .input('sortOrder', sql.Int, milestone.sortOrder)
                    .query(`
                        INSERT INTO AssessmentMilestones (
                            assessmentID, title, description, required, estimatedHours, sortOrder, completed
                        ) VALUES (
                            @assessmentID, @title, @description, @required, @estimatedHours, @sortOrder, 0
                        )
                    `);
            }

            // Re-fetch the milestones
            const newResult = await pool.request()
                .input('assessmentID', sql.VarChar, assessmentID)
                .query(milestonesQuery);

            res.json(newResult.recordset);
        } else {
            res.json(result.recordset);
        }

    } catch (error) {
        console.error('Error fetching assessment milestones:', error);
        res.status(500).json({ 
            error: 'Failed to fetch assessment milestones',
            details: error.message 
        });
    }
});

// 🔸 PUT /api/assessment-care-plans/assessment/:assessmentID/status - Update assessment status
router.put('/assessment-care-plans/assessment/:assessmentID/status', async (req, res) => {
    const { assessmentID } = req.params;
    const { assessmentStatus, completionPercentage, notes } = req.body;
    
    try {
        const pool = await connectToAzureSql();
        const userEmail = req.user?.email || 'system@example.com';
        
        const updateQuery = `
            UPDATE AssessmentCarePlans SET
                assessmentStatus = @assessmentStatus,
                completionPercentage = @completionPercentage,
                actualCompletionDate = CASE 
                    WHEN @assessmentStatus = 'Complete' AND actualCompletionDate IS NULL 
                    THEN GETDATE() 
                    ELSE actualCompletionDate 
                END,
                notes = @notes,
                updatedBy = @updatedBy,
                updatedAt = GETDATE()
            WHERE assessmentID = @assessmentID
        `;
        
        await pool.request()
            .input('assessmentID', sql.VarChar, assessmentID)
            .input('assessmentStatus', sql.VarChar, assessmentStatus)
            .input('completionPercentage', sql.Decimal, completionPercentage)
            .input('notes', sql.NVarChar, notes)
            .input('updatedBy', sql.VarChar, userEmail)
            .query(updateQuery);

        await logUserAction(req.user, 'UPDATE_ASSESSMENT_STATUS', {
            assessmentID,
            newStatus: assessmentStatus,
            completionPercentage
        });

        res.json({ 
            success: true, 
            message: 'Assessment status updated successfully',
            assessmentStatus,
            completionPercentage
        });

    } catch (error) {
        console.error('Error updating assessment status:', error);
        await logUserAction(req.user, 'UPDATE_ASSESSMENT_STATUS_ERROR', {
            assessmentID,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Failed to update assessment status',
            details: error.message 
        });
    }
});

// 🔸 PUT /api/assessment-care-plans/:clientID/milestones/:milestoneID/complete - Complete milestone
router.put('/assessment-care-plans/:clientID/milestones/:milestoneID/complete', async (req, res) => {
    const { clientID, milestoneID } = req.params;
    const { actualHours, notes } = req.body;
    
    try {
        const pool = await connectToAzureSql();
        const userEmail = req.user?.email || 'system@example.com';
        
        // Mark milestone as completed
        const updateMilestoneQuery = `
            UPDATE AssessmentMilestones SET
                completed = 1,
                completedDate = GETDATE(),
                actualHours = @actualHours,
                notes = @notes,
                completedBy = @completedBy
            WHERE milestoneID = @milestoneID
        `;
        
        await pool.request()
            .input('milestoneID', sql.Int, milestoneID)
            .input('actualHours', sql.Decimal, actualHours)
            .input('notes', sql.NVarChar, notes)
            .input('completedBy', sql.VarChar, userEmail)
            .query(updateMilestoneQuery);

        // Update overall assessment completion percentage
        const updateAssessmentQuery = `
            UPDATE acp SET 
                completionPercentage = (
                    SELECT CAST(
                        (COUNT(CASE WHEN am.completed = 1 THEN 1 END) * 100.0 / COUNT(*)) 
                        AS DECIMAL(5,2)
                    )
                    FROM AssessmentMilestones am 
                    WHERE am.assessmentID = acp.assessmentID
                ),
                updatedAt = GETDATE(),
                updatedBy = @updatedBy
            FROM AssessmentCarePlans acp
            INNER JOIN AssessmentMilestones am ON acp.assessmentID = am.assessmentID
            WHERE acp.clientID = @clientID AND am.milestoneID = @milestoneID
        `;
        
        await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .input('milestoneID', sql.Int, milestoneID)
            .input('updatedBy', sql.VarChar, userEmail)
            .query(updateAssessmentQuery);

        await logUserAction(req.user, 'COMPLETE_MILESTONE', {
            clientID,
            milestoneID,
            actualHours
        });

        res.json({ 
            success: true, 
            message: 'Milestone completed successfully',
            milestoneID: parseInt(milestoneID),
            completedDate: new Date().toISOString(),
            actualHours
        });

    } catch (error) {
        console.error('Error completing milestone:', error);
        await logUserAction(req.user, 'COMPLETE_MILESTONE_ERROR', {
            clientID,
            milestoneID,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Failed to complete milestone',
            details: error.message 
        });
    }
});

// 🔸 GET /api/assessment-care-plans/:clientID/report - Generate assessment report
router.get('/assessment-care-plans/:clientID/report', async (req, res) => {
    const { clientID } = req.params;
    
    try {
        const pool = await connectToAzureSql();
        
        // Get comprehensive assessment report data
        const reportQuery = `
            SELECT 
                acp.*,
                -- Milestone summary
                (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID) as totalMilestones,
                (SELECT COUNT(*) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID AND am.completed = 1) as completedMilestones,
                (SELECT SUM(am.actualHours) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID AND am.completed = 1) as totalHoursSpent,
                (SELECT SUM(am.estimatedHours) FROM AssessmentMilestones am WHERE am.assessmentID = acp.assessmentID) as totalEstimatedHours,
                -- Risk and strength counts
                (SELECT COUNT(*) FROM AssessmentRiskFactors arf WHERE arf.assessmentID = acp.assessmentID) as riskFactorCount,
                (SELECT COUNT(*) FROM AssessmentStrengths ast WHERE ast.assessmentID = acp.assessmentID) as strengthCount
            FROM AssessmentCarePlans acp
            WHERE acp.clientID = @clientID
            ORDER BY acp.createdAt DESC
        `;
        
        const result = await pool.request()
            .input('clientID', sql.VarChar, clientID)
            .query(reportQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                error: 'No assessment found for this client' 
            });
        }

        const assessment = result.recordset[0];
        
        // Get detailed milestones for report
        const milestonesQuery = `
            SELECT title, description, completed, completedDate, actualHours, estimatedHours
            FROM AssessmentMilestones
            WHERE assessmentID = @assessmentID
            ORDER BY sortOrder ASC
        `;
        
        const milestonesResult = await pool.request()
            .input('assessmentID', sql.VarChar, assessment.assessmentID)
            .query(milestonesQuery);

        const reportData = {
            assessmentSummary: {
                assessmentID: assessment.assessmentID,
                clientID: assessment.clientID,
                assessmentType: assessment.assessmentType,
                assessmentStatus: assessment.assessmentStatus,
                completionPercentage: assessment.completionPercentage,
                startDate: assessment.startDate,
                completionDate: assessment.actualCompletionDate,
                primaryAssessor: assessment.primaryAssessor,
                riskLevel: assessment.riskLevel,
                priorityLevel: assessment.priorityLevel,
                complexityScore: assessment.complexityScore
            },
            milestonesSummary: {
                totalMilestones: assessment.totalMilestones || 0,
                completedMilestones: assessment.completedMilestones || 0,
                totalHoursSpent: assessment.totalHoursSpent || 0,
                totalEstimatedHours: assessment.totalEstimatedHours || 0,
                efficiencyRatio: assessment.totalEstimatedHours > 0 ? 
                    Math.round((assessment.totalHoursSpent / assessment.totalEstimatedHours) * 100) / 100 : 0,
                milestones: milestonesResult.recordset
            },
            riskAndStrengths: {
                riskFactorCount: assessment.riskFactorCount || 0,
                strengthCount: assessment.strengthCount || 0,
                riskToStrengthRatio: assessment.strengthCount > 0 ? 
                    Math.round((assessment.riskFactorCount / assessment.strengthCount) * 100) / 100 : 0
            },
            reportMetadata: {
                generatedAt: new Date().toISOString(),
                generatedBy: req.user?.email || 'system@example.com',
                reportVersion: '1.0'
            }
        };

        await logUserAction(req.user, 'GENERATE_ASSESSMENT_REPORT', {
            clientID,
            assessmentID: assessment.assessmentID
        });

        res.json(reportData);

    } catch (error) {
        console.error('Error generating assessment report:', error);
        res.status(500).json({ 
            error: 'Failed to generate assessment report',
            details: error.message 
        });
    }
});

// 🔸 DELETE /api/assessment-care-plans/assessment/:assessmentID - Delete assessment (soft delete)
router.delete('/assessment-care-plans/assessment/:assessmentID', async (req, res) => {
    const { assessmentID } = req.params;
    
    try {
        const pool = await connectToAzureSql();
        const userEmail = req.user?.email || 'system@example.com';
        
        // Soft delete by updating status
        const deleteQuery = `
            UPDATE AssessmentCarePlans SET
                assessmentStatus = 'Deleted',
                updatedBy = @updatedBy,
                updatedAt = GETDATE()
            WHERE assessmentID = @assessmentID
        `;
        
        await pool.request()
            .input('assessmentID', sql.VarChar, assessmentID)
            .input('updatedBy', sql.VarChar, userEmail)
            .query(deleteQuery);

        await logUserAction(req.user, 'DELETE_ASSESSMENT', {
            assessmentID
        });

        res.json({ 
            success: true, 
            message: 'Assessment deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting assessment:', error);
        res.status(500).json({ 
            error: 'Failed to delete assessment',
            details: error.message 
        });
    }
});

module.exports = router;