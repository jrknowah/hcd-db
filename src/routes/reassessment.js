// ====================================================================
// 2. BACKEND API ROUTES - routes/reassessmentRoutes.js (Node.js/Express)
// ====================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ReassessmentService = require('../services/reassessmentService');
const authMiddleware = require('../middleware/auth');
const logMiddleware = require('../middleware/logging');

// ✅ Validation Rules
const reassessmentValidation = [
    body('dateFullAssess').optional().isDate().withMessage('Invalid baseline assessment date'),
    body('dateLastReAssess').optional().isDate().withMessage('Invalid re-assessment date'),
    body('reassessmentSources').optional().isString().isLength({ max: 1000 }),
    body('culturalCons').optional().isString().isLength({ max: 500 }),
    body('physicalChall').optional().isString().isLength({ max: 500 }),
    body('accessIssues').optional().isString().isLength({ max: 500 }),
    body('currentSymp').optional().isString().isLength({ max: 2000 }),
    body('columbiaSRComp').optional().isIn(['Yes', 'No']),
    body('updatedBy').notEmpty().withMessage('updatedBy is required'),
];

// ✅ GET /api/reassessment/:clientID - Fetch reassessment data for a client
router.get('/:clientID', 
    authMiddleware, 
    async (req, res) => {
        try {
            const { clientID } = req.params;
            
            if (!clientID) {
                return res.status(400).json({ message: 'Client ID is required' });
            }

            const reassessmentData = await ReassessmentService.getByClientId(clientID);
            
            if (!reassessmentData) {
                return res.status(404).json({ message: 'Reassessment data not found' });
            }

            res.json(reassessmentData);
        } catch (error) {
            console.error('Error fetching reassessment data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ GET /api/reassessment/assessment/:assessmentID - Fetch by assessment ID
router.get('/assessment/:assessmentID',
    authMiddleware,
    async (req, res) => {
        try {
            const { assessmentID } = req.params;
            
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
router.post('/:clientID', 
    authMiddleware, 
    reassessmentValidation,
    logMiddleware('CREATE_REASSESSMENT_RECORD'),
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

            // Check if record already exists
            const existingRecord = await ReassessmentService.getByClientId(clientID);
            if (existingRecord) {
                return res.status(409).json({ 
                    message: 'Reassessment record already exists for this client' 
                });
            }

            const newRecord = await ReassessmentService.create({
                clientID,
                ...reassessmentData,
                createdBy: req.user.email,
                createdAt: new Date()
            });

            res.status(201).json(newRecord);
        } catch (error) {
            console.error('Error creating reassessment record:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ PUT /api/reassessment/:clientID - Update existing reassessment record
router.put('/:clientID', 
    authMiddleware, 
    reassessmentValidation,
    logMiddleware('UPDATE_REASSESSMENT_RECORD'),
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

            const updatedRecord = await ReassessmentService.update(clientID, {
                ...updateData,
                updatedBy: req.user.email,
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

// ✅ PUT /api/reassessment/record/:reassessmentID - Update by reassessment ID
router.put('/record/:reassessmentID',
    authMiddleware,
    reassessmentValidation,
    logMiddleware('UPDATE_REASSESSMENT_BY_ID'),
    async (req, res) => {
        try {
            const { reassessmentID } = req.params;
            const updateData = req.body;

            const updatedRecord = await ReassessmentService.updateById(reassessmentID, {
                ...updateData,
                updatedBy: req.user.email,
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
router.put('/:clientID/complete',
    authMiddleware,
    logMiddleware('COMPLETE_REASSESSMENT'),
    async (req, res) => {
        try {
            const { clientID } = req.params;
            const completionData = req.body;

            const completedRecord = await ReassessmentService.complete(clientID, {
                ...completionData,
                completedBy: req.user.email,
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
router.delete('/:clientID', 
    authMiddleware, 
    logMiddleware('DELETE_REASSESSMENT_RECORD'),
    async (req, res) => {
        try {
            const { clientID } = req.params;

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

// ✅ GET /api/reassessment/all - Get all reassessment records (admin only)
router.get('/all', 
    authMiddleware,
    async (req, res) => {
        try {
            // Check if user has admin privileges
            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Admin access required' });
            }

            const allRecords = await ReassessmentService.getAll();
            res.json(allRecords);
        } catch (error) {
            console.error('Error fetching all reassessment records:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

// ✅ GET /api/reassessment/search - Search reassessment records
router.get('/search', 
    authMiddleware,
    async (req, res) => {
        try {
            const { query, startDate, endDate, riskLevel, completionStatus } = req.query;
            
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
router.get('/:clientID/summary',
    authMiddleware,
    async (req, res) => {
        try {
            const { clientID } = req.params;
            
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