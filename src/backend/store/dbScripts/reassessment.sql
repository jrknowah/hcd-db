// ====================================================================
// 1. REDUX SLICE - store/slices/reassessmentSlice.js
// ====================================================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Base API URL - adjust according to your setup
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ✅ Async Thunk - Fetch ReAssessment Data
export const fetchReassessmentData = createAsyncThunk(
    'reassessment/fetchData',
    async (clientID, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/reassessment/${clientID}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch reassessment data');
        }
    }
);

// ✅ Async Thunk - Save ReAssessment Data
export const saveReassessmentData = createAsyncThunk(
    'reassessment/saveData',
    async ({ clientID, data }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/reassessment/${clientID}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to save reassessment data');
        }
    }
);

// ✅ Async Thunk - Update ReAssessment Data
export const updateReassessmentData = createAsyncThunk(
    'reassessment/updateData',
    async ({ clientID, data }, { rejectWithValue }) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/reassessment/${clientID}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update reassessment data');
        }
    }
);

// ✅ Async Thunk - Delete ReAssessment Data
export const deleteReassessmentData = createAsyncThunk(
    'reassessment/deleteData',
    async (clientID, { rejectWithValue }) => {
        try {
            await axios.delete(`${API_BASE_URL}/reassessment/${clientID}`);
            return clientID;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete reassessment data');
        }
    }
);

// ✅ Async Thunk - Fetch All Client ReAssessment Records (for admin/reports)
export const fetchAllReassessmentRecords = createAsyncThunk(
    'reassessment/fetchAllRecords',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/reassessment/all`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch reassessment records');
        }
    }
);

// ✅ Initial State
const initialState = {
    data: {},
    allRecords: [],
    loading: false,
    saving: false,
    error: null,
    lastUpdated: null,
    useMockData: process.env.NODE_ENV === 'development'
};

// ✅ ReAssessment Slice
const reassessmentSlice = createSlice({
    name: 'reassessment',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearData: (state) => {
            state.data = {};
            state.error = null;
        },
        setMockDataMode: (state, action) => {
            state.useMockData = action.payload;
        },
        updateFormField: (state, action) => {
            const { field, value } = action.payload;
            state.data[field] = value;
        }
    },
    extraReducers: (builder) => {
        builder
            // ✅ Fetch ReAssessment Data
            .addCase(fetchReassessmentData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchReassessmentData.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload || {};
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchReassessmentData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            
            // ✅ Save ReAssessment Data
            .addCase(saveReassessmentData.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(saveReassessmentData.fulfilled, (state, action) => {
                state.saving = false;
                state.data = action.payload;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(saveReassessmentData.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload;
            })
            
            // ✅ Update ReAssessment Data
            .addCase(updateReassessmentData.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(updateReassessmentData.fulfilled, (state, action) => {
                state.saving = false;
                state.data = action.payload;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(updateReassessmentData.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload;
            })
            
            // ✅ Delete ReAssessment Data
            .addCase(deleteReassessmentData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteReassessmentData.fulfilled, (state) => {
                state.loading = false;
                state.data = {};
            })
            .addCase(deleteReassessmentData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            
            // ✅ Fetch All Records
            .addCase(fetchAllReassessmentRecords.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllReassessmentRecords.fulfilled, (state, action) => {
                state.loading = false;
                state.allRecords = action.payload;
            })
            .addCase(fetchAllReassessmentRecords.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { clearError, clearData, setMockDataMode, updateFormField } = reassessmentSlice.actions;
export default reassessmentSlice.reducer;

// ====================================================================
// 2. API ROUTES - routes/reassessmentRoutes.js (Node.js/Express)
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
            const { query, startDate, endDate, riskLevel } = req.query;
            
            const searchResults = await ReassessmentService.search({
                query,
                startDate,
                endDate,
                riskLevel
            });

            res.json(searchResults);
        } catch (error) {
            console.error('Error searching reassessment records:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
);

module.exports = router;

// ====================================================================
// 3. DATABASE SERVICE - services/reassessmentService.js
// ====================================================================

const db = require('../config/database');

class ReassessmentService {
    
    // ✅ Get reassessment data by client ID
    static async getByClientId(clientID) {
        try {
            const query = `
                SELECT * FROM client_reassessments 
                WHERE client_id = ? AND is_deleted = 0
                ORDER BY updated_at DESC 
                LIMIT 1
            `;
            
            const [rows] = await db.execute(query, [clientID]);
            
            if (rows.length === 0) {
                return null;
            }

            return this.formatRecord(rows[0]);
        } catch (error) {
            console.error('Error getting reassessment data:', error);
            throw error;
        }
    }

    // ✅ Create new reassessment record
    static async create(data) {
        try {
            const query = `
                INSERT INTO client_reassessments (
                    client_id, date_full_assess, date_last_reassess, reassessment_sources,
                    cultural_cons, physical_chall, access_issues, reason_for_ref, current_symp,
                    suic_homi_thou, columbia_sr, columbia_sr_comp, self_harm, self_harm_summary,
                    psy_hosp, psy_hosp_summary, out_pat_summary, trauma_exp, trauma_exp_summary,
                    med_reassess, med_reassess_summary, sub_abuse_reassess, sub_abuse_reassess_date,
                    sub_abuse_reassess_summary, med_hist_reassess, med_hist_reassess_date,
                    med_hist_reassess_summary, edu_history_reassess, edu_history_reassess_summary,
                    emp_hist_reassess, emp_hist_reassess_summary, legal_reassess, legal_reassess_summary,
                    living_arr_reassess, living_arr_reassess_summary, homeless_reassess, homeless_reassess_date,
                    dep_care_reassess, dep_care_reassess_summary, fam_reassess, fam_reassess_summary,
                    cm_obv_sum, client_strength_reassess_summary, client_form_reassess_summary,
                    diag_descript, diag_descript_code_choice, diag_descript_code,
                    cm_ob1, cm_ob2, cm_ob3, cm_ob4, cm_ob5, cm_ob6, cm_ob7, cm_ob8, cm_ob9, cm_ob10, cm_ob11, cm_ob_none,
                    created_by, created_at, updated_by, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                data.clientID,
                data.dateFullAssess || null,
                data.dateLastReAssess || null,
                data.reassessmentSources || '',
                data.culturalCons || '',
                data.physicalChall || '',
                data.accessIssues || '',
                data.reasonForRef || '',
                data.currentSymp || '',
                data.suicHomiThou || '',
                data.columbiaSR || '',
                data.columbiaSRComp || '',
                data.selfHarm || '',
                data.selfHarmSummary || '',
                data.psyHosp || '',
                data.psyHospSummary || '',
                data.outPatSummart || '',
                data.traumaExp || '',
                data.traumaExpSummary || '',
                data.medReAssess || '',
                data.medReAssessSummary || '',
                data.subAbuseReAssess || '',
                data.subAbuseReAssessDate || null,
                data.subAbuseReAssessSummary || '',
                data.medHistReAssess || '',
                data.medHistReAssessDate || null,
                data.medHistReAssessSummary || '',
                data.eduHistoryReAssess || '',
                data.eduHistoryReAssessSummary || '',
                data.empHistReAssess || '',
                data.empHistReAssessSummary || '',
                data.legalReAssess || '',
                data.legalReAssessSummary || '',
                data.livingArrReAssess || '',
                data.livingArrReAssessSummary || '',
                data.homelessReAssess || '',
                data.homelessReAssessDate || null,
                data.depCareReAssess || '',
                data.depCareReAssessSummary || '',
                data.famReAssess || '',
                data.famReAssessSummary || '',
                data.cmObvSum || '',
                data.clientStrengthReAssessSummary || '',
                data.clientFormReAssessSummary || '',
                data.diagDescript || '',
                data.diagDescriptCodeChoice || '',
                data.diagDescriptCode || '',
                JSON.stringify(data.cmOb1 || []),
                JSON.stringify(data.cmOb2 || []),
                JSON.stringify(data.cmOb3 || []),
                JSON.stringify(data.cmOb4 || []),
                JSON.stringify(data.cmOb5 || []),
                JSON.stringify(data.cmOb6 || []),
                JSON.stringify(data.cmOb7 || []),
                JSON.stringify(data.cmOb8 || []),
                JSON.stringify(data.cmOb9 || []),
                JSON.stringify(data.cmOb10 || []),
                JSON.stringify(data.cmOb11 || []),
                JSON.stringify(data.cmObNone || []),
                data.createdBy,
                data.createdAt,
                data.updatedBy || data.createdBy,
                data.updatedAt || data.createdAt
            ];

            const [result] = await db.execute(query, values);
            
            return await this.getByClientId(data.clientID);
        } catch (error) {
            console.error('Error creating reassessment record:', error);
            throw error;
        }
    }

    // ✅ Update reassessment record
    static async update(clientID, data) {
        try {
            const query = `
                UPDATE client_reassessments SET
                    date_full_assess = ?, date_last_reassess = ?, reassessment_sources = ?,
                    cultural_cons = ?, physical_chall = ?, access_issues = ?, reason_for_ref = ?,
                    current_symp = ?, suic_homi_thou = ?, columbia_sr = ?, columbia_sr_comp = ?,
                    self_harm = ?, self_harm_summary = ?, psy_hosp = ?, psy_hosp_summary = ?,
                    out_pat_summary = ?, trauma_exp = ?, trauma_exp_summary = ?, med_reassess = ?,
                    med_reassess_summary = ?, sub_abuse_reassess = ?, sub_abuse_reassess_date = ?,
                    sub_abuse_reassess_summary = ?, med_hist_reassess = ?, med_hist_reassess_date = ?,
                    med_hist_reassess_summary = ?, edu_history_reassess = ?, edu_history_reassess_summary = ?,
                    emp_hist_reassess = ?, emp_hist_reassess_summary = ?, legal_reassess = ?,
                    legal_reassess_summary = ?, living_arr_reassess = ?, living_arr_reassess_summary = ?,
                    homeless_reassess = ?, homeless_reassess_date = ?, dep_care_reassess = ?,
                    dep_care_reassess_summary = ?, fam_reassess = ?, fam_reassess_summary = ?,
                    cm_obv_sum = ?, client_strength_reassess_summary = ?, client_form_reassess_summary = ?,
                    diag_descript = ?, diag_descript_code_choice = ?, diag_descript_code = ?,
                    cm_ob1 = ?, cm_ob2 = ?, cm_ob3 = ?, cm_ob4 = ?, cm_ob5 = ?, cm_ob6 = ?,
                    cm_ob7 = ?, cm_ob8 = ?, cm_ob9 = ?, cm_ob10 = ?, cm_ob11 = ?, cm_ob_none = ?,
                    updated_by = ?, updated_at = ?
                WHERE client_id = ? AND is_deleted = 0
            `;

            const values = [
                data.dateFullAssess || null,
                data.dateLastReAssess || null,
                data.reassessmentSources || '',
                data.culturalCons || '',
                data.physicalChall || '',
                data.accessIssues || '',
                data.reasonForRef || '',
                data.currentSymp || '',
                data.suicHomiThou || '',
                data.columbiaSR || '',
                data.columbiaSRComp || '',
                data.selfHarm || '',
                data.selfHarmSummary || '',
                data.psyHosp || '',
                data.psyHospSummary || '',
                data.outPatSummart || '',
                data.traumaExp || '',
                data.traumaExpSummary || '',
                data.medReAssess || '',
                data.medReAssessSummary || '',
                data.subAbuseReAssess || '',
                data.subAbuseReAssessDate || null,
                data.subAbuseReAssessSummary || '',
                data.medHistReAssess || '',
                data.medHistReAssessDate || null,
                data.medHistReAssessSummary || '',
                data.eduHistoryReAssess || '',
                data.eduHistoryReAssessSummary || '',
                data.empHistReAssess || '',
                data.empHistReAssessSummary || '',
                data.legalReAssess || '',
                data.legalReAssessSummary || '',
                data.livingArrReAssess || '',
                data.livingArrReAssessSummary || '',
                data.homelessReAssess || '',
                data.homelessReAssessDate || null,
                data.depCareReAssess || '',
                data.depCareReAssessSummary || '',
                data.famReAssess || '',
                data.famReAssessSummary || '',
                data.cmObvSum || '',
                data.clientStrengthReAssessSummary || '',
                data.clientFormReAssessSummary || '',
                data.diagDescript || '',
                data.diagDescriptCodeChoice || '',
                data.diagDescriptCode || '',
                JSON.stringify(data.cmOb1 || []),
                JSON.stringify(data.cmOb2 || []),
                JSON.stringify(data.cmOb3 || []),
                JSON.stringify(data.cmOb4 || []),
                JSON.stringify(data.cmOb5 || []),
                JSON.stringify(data.cmOb6 || []),
                JSON.stringify(data.cmOb7 || []),
                JSON.stringify(data.cmOb8 || []),
                JSON.stringify(data.cmOb9 || []),
                JSON.stringify(data.cmOb10 || []),
                JSON.stringify(data.cmOb11 || []),
                JSON.stringify(data.cmObNone || []),
                data.updatedBy,
                data.updatedAt,
                clientID
            ];

            const [result] = await db.execute(query, values);
            
            if (result.affectedRows === 0) {
                return null;
            }
            
            return await this.getByClientId(clientID);
        } catch (error) {
            console.error('Error updating reassessment record:', error);
            throw error;
        }
    }

    // ✅ Delete reassessment record (soft delete)
    static async delete(clientID) {
        try {
            const query = `
                UPDATE client_reassessments 
                SET is_deleted = 1, deleted_at = NOW() 
                WHERE client_id = ? AND is_deleted = 0
            `;
            
            const [result] = await db.execute(query, [clientID]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting reassessment record:', error);
            throw error;
        }
    }

    // ✅ Get all reassessment records
    static async getAll() {
        try {
            const query = `
                SELECT ra.*, c.client_name, c.client_email 
                FROM client_reassessments ra
                LEFT JOIN clients c ON ra.client_id = c.client_id
                WHERE ra.is_deleted = 0
                ORDER BY ra.updated_at DESC
            `;
            
            const [rows] = await db.execute(query);
            return rows.map(row => this.formatRecord(row));
        } catch (error) {
            console.error('Error getting all reassessment records:', error);
            throw error;
        }
    }

    // ✅ Search reassessment records
    static async search({ query, startDate, endDate, riskLevel }) {
        try {
            let searchQuery = `
                SELECT ra.*, c.client_name, c.client_email 
                FROM client_reassessments ra
                LEFT JOIN clients c ON ra.client_id = c.client_id
                WHERE ra.is_deleted = 0
            `;
            
            const params = [];
            
            if (query) {
                searchQuery += ` AND (c.client_name LIKE ? OR ra.current_symp LIKE ?)`;
                params.push(`%${query}%`, `%${query}%`);
            }
            
            if (startDate) {
                searchQuery += ` AND ra.date_last_reassess >= ?`;
                params.push(startDate);
            }
            
            if (endDate) {
                searchQuery += ` AND ra.date_last_reassess <= ?`;
                params.push(endDate);
            }
            
            searchQuery += ` ORDER BY ra.updated_at DESC`;
            
            const [rows] = await db.execute(searchQuery, params);
            return rows.map(row => this.formatRecord(row));
        } catch (error) {
            console.error('Error searching reassessment records:', error);
            throw error;
        }
    }

    // ✅ Format database record for frontend
    static formatRecord(row) {
        return {
            id: row.id,
            clientID: row.client_id,
            clientName: row.client_name,
            dateFullAssess: row.date_full_assess,
            dateLastReAssess: row.date_last_reassess,
            reassessmentSources: row.reassessment_sources,
            culturalCons: row.cultural_cons,
            physicalChall: row.physical_chall,
            accessIssues: row.access_issues,
            reasonForRef: row.reason_for_ref,
            currentSymp: row.current_symp,
            suicHomiThou: row.suic_homi_thou,
            columbiaSR: row.columbia_sr,
            columbiaSRComp: row.columbia_sr_comp,
            selfHarm: row.self_harm,
            selfHarmSummary: row.self_harm_summary,
            psyHosp: row.psy_hosp,
            psyHospSummary: row.psy_hosp_summary,
            outPatSummart: row.out_pat_summary,
            traumaExp: row.trauma_exp,
            traumaExpSummary: row.trauma_exp_summary,
            medReAssess: row.med_reassess,
            medReAssessSummary: row.med_reassess_summary,
            subAbuseReAssess: row.sub_abuse_reassess,
            subAbuseReAssessDate: row.sub_abuse_reassess_date,
            subAbuseReAssessSummary: row.sub_abuse_reassess_summary,
            medHistReAssess: row.med_hist_reassess,
            medHistReAssessDate: row.med_hist_reassess_date,
            medHistReAssessSummary: row.med_hist_reassess_summary,
            eduHistoryReAssess: row.edu_history_reassess,
            eduHistoryReAssessSummary: row.edu_history_reassess_summary,
            empHistReAssess: row.emp_hist_reassess,
            empHistReAssessSummary: row.emp_hist_reassess_summary,
            legalReAssess: row.legal_reassess,
            legalReAssessSummary: row.legal_reassess_summary,
            livingArrReAssess: row.living_arr_reassess,
            livingArrReAssessSummary: row.living_arr_reassess_summary,
            homelessReAssess: row.homeless_reassess,
            homelessReAssessDate: row.homeless_reassess_date,
            depCareReAssess: row.dep_care_reassess,
            depCareReAssessSummary: row.dep_care_reassess_summary,
            famReAssess: row.fam_reassess,
            famReAssessSummary: row.fam_reassess_summary,
            cmObvSum: row.cm_obv_sum,
            clientStrengthReAssessSummary: row.client_strength_reassess_summary,
            clientFormReAssessSummary: row.client_form_reassess_summary,
            diagDescript: row.diag_descript,
            diagDescriptCodeChoice: row.diag_descript_code_choice,
            diagDescriptCode: row.diag_descript_code,
            cmOb1: this.parseJSON(row.cm_ob1),
            cmOb2: this.parseJSON(row.cm_ob2),
            cmOb3: this.parseJSON(row.cm_ob3),
            cmOb4: this.parseJSON(row.cm_ob4),
            cmOb5: this.parseJSON(row.cm_ob5),
            cmOb6: this.parseJSON(row.cm_ob6),
            cmOb7: this.parseJSON(row.cm_ob7),
            cmOb8: this.parseJSON(row.cm_ob8),
            cmOb9: this.parseJSON(row.cm_ob9),
            cmOb10: this.parseJSON(row.cm_ob10),
            cmOb11: this.parseJSON(row.cm_ob11),
            cmObNone: this.parseJSON(row.cm_ob_none),
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedBy: row.updated_by,
            updatedAt: row.updated_at
        };
    }

    // ✅ Parse JSON fields safely
    static parseJSON(jsonString) {
        try {
            return jsonString ? JSON.parse(jsonString) : [];
        } catch (error) {
            console.warn('Error parsing JSON:', error);
            return [];
        }
    }
}

module.exports = ReassessmentService;

// ====================================================================
// 4. DATABASE SCHEMA - SQL (MySQL/PostgreSQL)
// ====================================================================

/*
-- ✅ Client ReAssessments Table
CREATE TABLE client_reassessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(50) NOT NULL,
    
    -- Assessment Timeline
    date_full_assess DATE,
    date_last_reassess DATE,
    reassessment_sources TEXT,
    cultural_cons VARCHAR(500),
    physical_chall VARCHAR(500),
    access_issues VARCHAR(500),
    
    -- Reason for Referral
    reason_for_ref VARCHAR(255),
    current_symp TEXT,
    suic_homi_thou VARCHAR(255),
    columbia_sr TEXT,
    columbia_sr_comp VARCHAR(10),
    
    -- Self Harm & Medical History
    self_harm VARCHAR(255),
    self_harm_summary TEXT,
    psy_hosp VARCHAR(255),
    psy_hosp_summary TEXT,
    out_pat_summary TEXT,
    trauma_exp VARCHAR(255),
    trauma_exp_summary TEXT,
    
    -- Medications & Substance Use
    med_reassess VARCHAR(255),
    med_reassess_summary TEXT,
    sub_abuse_reassess VARCHAR(255),
    sub_abuse_reassess_date DATE,
    sub_abuse_reassess_summary TEXT,
    
    -- Medical History
    med_hist_reassess VARCHAR(255),
    med_hist_reassess_date DATE,
    med_hist_reassess_summary TEXT,
    
    -- Education & Employment
    edu_history_reassess VARCHAR(255),
    edu_history_reassess_summary TEXT,
    emp_hist_reassess VARCHAR(255),
    emp_hist_reassess_summary TEXT,
    
    -- Legal & Living Situation
    legal_reassess VARCHAR(255),
    legal_reassess_summary TEXT,
    living_arr_reassess VARCHAR(255),
    living_arr_reassess_summary TEXT,
    homeless_reassess VARCHAR(50),
    homeless_reassess_date DATE,
    
    -- Dependent Care & Family
    dep_care_reassess VARCHAR(255),
    dep_care_reassess_summary TEXT,
    fam_reassess VARCHAR(255),
    fam_reassess_summary TEXT,
    
    -- Mental Status Exam (JSON fields for multi-select arrays)
    cm_ob1 JSON,
    cm_ob2 JSON,
    cm_ob3 JSON,
    cm_ob4 JSON,
    cm_ob5 JSON,
    cm_ob6 JSON,
    cm_ob7 JSON,
    cm_ob8 JSON,
    cm_ob9 JSON,
    cm_ob10 JSON,
    cm_ob11 JSON,
    cm_ob_none JSON,
    cm_obv_sum TEXT,
    
    -- Clinical Summary
    client_strength_reassess_summary TEXT,
    client_form_reassess_summary TEXT,
    diag_descript TEXT,
    diag_descript_code_choice VARCHAR(50),
    diag_descript_code VARCHAR(100),
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    
    -- Indexes
    INDEX idx_client_id (client_id),
    INDEX idx_date_reassess (date_last_reassess),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at),
    
    -- Foreign Key (assuming you have a clients table)
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
);

-- ✅ Client ReAssessment History (for audit trail)
CREATE TABLE client_reassessment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reassessment_id INT NOT NULL,
    client_id VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_reassessment_id (reassessment_id),
    INDEX idx_client_id (client_id),
    INDEX idx_changed_at (changed_at),
    
    FOREIGN KEY (reassessment_id) REFERENCES client_reassessments(id) ON DELETE CASCADE
);

-- ✅ Trigger to track changes (MySQL)
DELIMITER //
CREATE TRIGGER reassessment_audit_trigger
AFTER UPDATE ON client_reassessments
FOR EACH ROW
BEGIN
    -- Track significant field changes
    IF OLD.current_symp != NEW.current_symp THEN
        INSERT INTO client_reassessment_history 
        (reassessment_id, client_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, NEW.client_id, 'current_symp', OLD.current_symp, NEW.current_symp, NEW.updated_by);
    END IF;
    
    IF OLD.columbia_sr_comp != NEW.columbia_sr_comp THEN
        INSERT INTO client_reassessment_history 
        (reassessment_id, client_id, field_name, old_value, new_value, changed_by)
        VALUES (NEW.id, NEW.client_id, 'columbia_sr_comp', OLD.columbia_sr_comp, NEW.columbia_sr_comp, NEW.updated_by);
    END IF;
END//
DELIMITER ;

-- ✅ Sample Queries for Reports
-- Get all reassessments for a specific time period
SELECT 
    ra.*,
    c.client_name,
    DATEDIFF(ra.date_last_reassess, ra.date_full_assess) as days_between_assessments
FROM client_reassessments ra
JOIN clients c ON ra.client_id = c.client_id
WHERE ra.date_last_reassess BETWEEN '2025-01-01' AND '2025-12-31'
AND ra.is_deleted = 0;

-- Get clients with high-risk indicators
SELECT 
    ra.client_id,
    c.client_name,
    ra.columbia_sr_comp,
    ra.current_symp,
    ra.updated_at
FROM client_reassessments ra
JOIN clients c ON ra.client_id = c.client_id
WHERE (ra.columbia_sr_comp = 'No' OR ra.suic_homi_thou LIKE '%Updates%')
AND ra.is_deleted = 0
ORDER BY ra.updated_at DESC;
*/