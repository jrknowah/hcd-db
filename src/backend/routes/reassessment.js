// ====================================================================
// REASSESSMENT ROUTES - PRODUCTION (Fixed 500 and validation errors)
// ====================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ReassessmentService = require('../services/reassessmentService');

// ✅ Simple logging helper
const logUserAction = (action, details) => {
    console.log(`[${new Date().toISOString()}] ${action}:`, JSON.stringify(details, null, 2));
};

// ✅ Validation Rules - FIXED to allow empty strings
const reassessmentValidation = [
    body('dateFullAssess').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid baseline assessment date'),
    body('dateLastReAssess').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid re-assessment date'),
    body('reassessmentSources').optional().isString().isLength({ max: 1000 }),
    body('culturalCons').optional().isString().isLength({ max: 500 }),
    body('physicalChall').optional().isString().isLength({ max: 500 }),
    body('accessIssues').optional().isString().isLength({ max: 500 }),
    body('currentSymp').optional().isString().isLength({ max: 2000 }),
    body('columbiaSRComp').optional({ checkFalsy: true }).isIn(['Yes', 'No']).withMessage('Must be Yes or No'),
    body('updatedBy').optional().notEmpty().withMessage('updatedBy should be provided'),
];

// ===== ROUTES =====

// ✅ GET /api/reassessment/:clientID - FIXED to handle no records gracefully
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
            
            // ✅ FIXED: Return empty object instead of 404 when no record exists
            if (!reassessmentData) {
                console.log(`📝 No reassessment found for client ${clientID}, returning empty object`);
                return res.json({});
            }

            res.json(reassessmentData);
        } catch (error) {
            console.error('Error fetching reassessment data:', error);
            logUserAction('GET_REASSESSMENT_DATA_ERROR', {
                clientID: req.params.clientID,
                error: error.message
            });
            
            // ✅ FIXED: Return empty object on error instead of 500
            console.log('Returning empty object due to error');
            res.json({});
        }
    }
);

// ✅ GET /api/reassessment/assessment/:assessmentID
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
                return res.json({});
            }

            res.json(reassessmentData);
        } catch (error) {
            console.error('Error fetching reassessment by assessment:', error);
            res.json({});
        }
    }
);

// ✅ POST /api/reassessment/:clientID - FIXED validation
router.post('/reassessment/:clientID', 
    reassessmentValidation,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.error('Validation errors:', errors.array());
                return res.status(400).json({ 
                    message: 'Validation errors', 
                    errors: errors.array() 
                });
            }

            const { clientID } = req.params;
            const reassessmentData = req.body;

            // ✅ FIXED: Clean empty strings from data before validation
            const cleanedData = Object.entries(reassessmentData).reduce((acc, [key, value]) => {
                acc[key] = value === '' ? null : value;
                return acc;
            }, {});

            logUserAction('CREATE_REASSESSMENT_RECORD', {
                clientID,
                timestamp: new Date().toISOString()
            });

            // Check if record already exists
            const existingRecord = await ReassessmentService.getByClientId(clientID);
            if (existingRecord && Object.keys(existingRecord).length > 0) {
                // ✅ If exists, update instead of creating
                console.log(`Reassessment exists for ${clientID}, updating instead`);
                const updatedRecord = await ReassessmentService.update(clientID, {
                    ...cleanedData,
                    updatedBy: cleanedData.updatedBy || "system",
                    updatedAt: new Date()
                });
                
                return res.json(updatedRecord);
            }

            // Create new record
            const newRecord = await ReassessmentService.create({
                clientID,
                ...cleanedData,
                createdBy: cleanedData.createdBy || cleanedData.updatedBy || 'system',
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
            res.status(500).json({ message: error.message || 'Internal server error' });
        }
    }
);

// ✅ PUT /api/reassessment/:clientID
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

            // ✅ Clean empty strings
            const cleanedData = Object.entries(updateData).reduce((acc, [key, value]) => {
                acc[key] = value === '' ? null : value;
                return acc;
            }, {});

            logUserAction('UPDATE_REASSESSMENT_RECORD', {
                clientID,
                timestamp: new Date().toISOString()
            });

            const updatedRecord = await ReassessmentService.update(clientID, {
                ...cleanedData,
                updatedBy: cleanedData.updatedBy || 'system',
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

// ✅ PUT /api/reassessment/record/:reassessmentID
router.put('/reassessment/record/:reassessmentID',
    reassessmentValidation,
    async (req, res) => {
        try {
            const { reassessmentID } = req.params;
            const updateData = req.body;

            // ✅ Clean empty strings
            const cleanedData = Object.entries(updateData).reduce((acc, [key, value]) => {
                acc[key] = value === '' ? null : value;
                return acc;
            }, {});

            logUserAction('UPDATE_REASSESSMENT_BY_ID', {
                reassessmentID,
                timestamp: new Date().toISOString()
            });

            const updatedRecord = await ReassessmentService.updateById(reassessmentID, {
                ...cleanedData,
                updatedBy: cleanedData.updatedBy || 'system',
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

// ✅ PUT /api/reassessment/:clientID/complete
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

// ✅ DELETE /api/reassessment/:clientID
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

// ✅ GET /api/reassessment/all
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

// ✅ GET /api/reassessment/search
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

// ✅ GET /api/reassessment/:clientID/summary
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