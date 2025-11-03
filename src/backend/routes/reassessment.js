// ====================================================================
// REASSESSMENT ROUTES - Updated to Match MentalHealth Pattern
// ====================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ReassessmentService = require('../services/reassessmentService');

// ✅ Simple logging helper (backend-compatible version)
const logUserAction = (action, details) => {
    console.log(`[${new Date().toISOString()}] ${action}:`, JSON.stringify(details, null, 2));
};

// ✅ Validation Rules
const reassessmentValidation = [
    body('dateFullAssess').optional().isISO8601().withMessage('Invalid baseline assessment date'),
    body('dateLastReAssess').optional().isISO8601().withMessage('Invalid re-assessment date'),
    body('reassessmentSources').optional().isString().isLength({ max: 1000 }),
    body('culturalCons').optional().isString().isLength({ max: 500 }),
    body('physicalChall').optional().isString().isLength({ max: 500 }),
    body('accessIssues').optional().isString().isLength({ max: 500 }),
    body('currentSymp').optional().isString().isLength({ max: 2000 }),
    body('columbiaSRComp').optional().isIn(['Yes', 'No']),
    body('updatedBy').optional().notEmpty().withMessage('updatedBy should be provided'),
];

// ===== ROUTES =====

// ✅ GET /api/reassessment/:clientID - Fetch reassessment data for a client
router.get('/reassessment/:clientID', 
    async (req, res) => {
        try {
            const { clientID } = req.params;
            
            if (!clientID) {
                return res.status(400).json({ message: 'Client ID is required' });
            }

            logUserAction('GET_REASSESSMENT_DATA', {
                clientID,
                timestamp: new Date().toISOString()
            });

            const reassessmentData = await ReassessmentService.getByClientId(clientID);
            
            if (!reassessmentData) {
                return res.status(404).json({ message: 'Reassessment data not found' });
            }

            res.json(reassessmentData);
        } catch (error) {
            console.error('Error fetching reassessment data:', error);
            logUserAction('GET_REASSESSMENT_DATA_ERROR', {
                clientID: req.params.clientID,
                error: error.message
            });
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ GET /api/reassessment/assessment/:assessmentID - Fetch by assessment ID
router.get('/reassessment/assessment/:assessmentID',
    async (req, res) => {
        try {
            const { assessmentID } = req.params;
            
            logUserAction('GET_REASSESSMENT_BY_ASSESSMENT', {
                assessmentID,
                timestamp: new Date().toISOString()
            });

            const reassessmentData = await ReassessmentService.getByAssessmentId(assessmentID);
            
            if (!reassessmentData) {
                return res.status(404).json({ message: 'Reassessment data not found' });
            }

            res.json(reassessmentData);
        } catch (error) {
            console.error('Error fetching reassessment by assessment:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ POST /api/reassessment/:clientID - Create new reassessment record
router.post('/reassessment/:clientID', 
    reassessmentValidation,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    message: 'Validation errors', 
                    errors: errors.array() 
                });
            }

            const { clientID } = req.params;
            const reassessmentData = req.body;

            logUserAction('CREATE_REASSESSMENT_RECORD', {
                clientID,
                timestamp: new Date().toISOString()
            });

            // Check if record already exists
            const existingRecord = await ReassessmentService.getByClientId(clientID);
            if (existingRecord) {
                return res.status(409).json({ 
                    message: 'Reassessment record already exists for this client',
                    reassessmentID: existingRecord.reassessmentID
                });
            }

            const newRecord = await ReassessmentService.create({
                clientID,
                ...reassessmentData,
                createdBy: reassessmentData.createdBy || reassessmentData.updatedBy || 'system',
                createdAt: new Date()
            });

            logUserAction('CREATE_REASSESSMENT_SUCCESS', {
                reassessmentID: newRecord.reassessmentID
            });

            res.status(201).json(newRecord);
        } catch (error) {
            console.error('Error creating reassessment record:', error);
            logUserAction('CREATE_REASSESSMENT_ERROR', {
                error: error.message
            });
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ PUT /api/reassessment/:clientID - Update existing reassessment record
router.put('/reassessment/:clientID', 
    reassessmentValidation,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    message: 'Validation errors', 
                    errors: errors.array() 
                });
            }

            const { clientID } = req.params;
            const updateData = req.body;

            logUserAction('UPDATE_REASSESSMENT_RECORD', {
                clientID,
                timestamp: new Date().toISOString()
            });

            const updatedRecord = await ReassessmentService.update(clientID, {
                ...updateData,
                updatedBy: updateData.updatedBy || 'system',
                updatedAt: new Date()
            });

            if (!updatedRecord) {
                return res.status(404).json({ message: 'Reassessment record not found' });
            }

            logUserAction('UPDATE_REASSESSMENT_SUCCESS', {
                clientID
            });

            res.json(updatedRecord);
        } catch (error) {
            console.error('Error updating reassessment record:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ PUT /api/reassessment/record/:reassessmentID - Update by reassessment ID
router.put('/reassessment/record/:reassessmentID',
    reassessmentValidation,
    async (req, res) => {
        try {
            const { reassessmentID } = req.params;
            const updateData = req.body;

            logUserAction('UPDATE_REASSESSMENT_BY_ID', {
                reassessmentID,
                timestamp: new Date().toISOString()
            });

            const updatedRecord = await ReassessmentService.updateById(reassessmentID, {
                ...updateData,
                updatedBy: updateData.updatedBy || 'system',
                updatedAt: new Date()
            });

            if (!updatedRecord) {
                return res.status(404).json({ message: 'Reassessment record not found' });
            }

            res.json(updatedRecord);
        } catch (error) {
            console.error('Error updating reassessment record:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ PUT /api/reassessment/:clientID/complete - Complete reassessment
router.put('/reassessment/:clientID/complete',
    async (req, res) => {
        try {
            const { clientID } = req.params;
            const completionData = req.body;

            logUserAction('COMPLETE_REASSESSMENT', {
                clientID,
                timestamp: new Date().toISOString()
            });

            const completedRecord = await ReassessmentService.complete(clientID, {
                ...completionData,
                completedBy: completionData.completedBy || completionData.updatedBy || 'system',
                completedAt: new Date(),
                completionStatus: 'Complete',
                completionPercentage: 100
            });

            if (!completedRecord) {
                return res.status(404).json({ message: 'Reassessment record not found' });
            }

            res.json(completedRecord);
        } catch (error) {
            console.error('Error completing reassessment:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ DELETE /api/reassessment/:clientID - Delete reassessment record
router.delete('/reassessment/:clientID', 
    async (req, res) => {
        try {
            const { clientID } = req.params;

            logUserAction('DELETE_REASSESSMENT_RECORD', {
                clientID,
                timestamp: new Date().toISOString()
            });

            const deleted = await ReassessmentService.delete(clientID);
            
            if (!deleted) {
                return res.status(404).json({ message: 'Reassessment record not found' });
            }

            res.json({ message: 'Reassessment record deleted successfully' });
        } catch (error) {
            console.error('Error deleting reassessment record:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ GET /api/reassessment/all - Get all reassessment records
router.get('/reassessment/all', 
    async (req, res) => {
        try {
            logUserAction('GET_ALL_REASSESSMENTS', {
                timestamp: new Date().toISOString()
            });

            const allRecords = await ReassessmentService.getAll();
            res.json(allRecords);
        } catch (error) {
            console.error('Error fetching all reassessment records:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ GET /api/reassessment/search - Search reassessment records
router.get('/reassessment/search', 
    async (req, res) => {
        try {
            const { query, startDate, endDate, riskLevel, completionStatus } = req.query;
            
            logUserAction('SEARCH_REASSESSMENTS', {
                query,
                timestamp: new Date().toISOString()
            });

            const searchResults = await ReassessmentService.search({
                query,
                startDate,
                endDate,
                riskLevel,
                completionStatus
            });

            res.json(searchResults);
        } catch (error) {
            console.error('Error searching reassessment records:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ GET /api/reassessment/:clientID/summary - Generate assessment summary
router.get('/reassessment/:clientID/summary',
    async (req, res) => {
        try {
            const { clientID } = req.params;
            
            logUserAction('GENERATE_REASSESSMENT_SUMMARY', {
                clientID,
                timestamp: new Date().toISOString()
            });

            const summary = await ReassessmentService.generateSummary(clientID);
            
            if (!summary) {
                return res.status(404).json({ message: 'Reassessment data not found' });
            }

            res.json(summary);
        } catch (error) {
            console.error('Error generating summary:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

module.exports = router;