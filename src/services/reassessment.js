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

    // ✅ Get reassessment data by assessment ID
    static async getByAssessmentId(assessmentID) {
        try {
            const query = `
                SELECT * FROM client_reassessments 
                WHERE assessment_id = ? AND is_deleted = 0
                ORDER BY updated_at DESC 
                LIMIT 1
            `;
            
            const [rows] = await db.execute(query, [assessmentID]);
            
            if (rows.length === 0) {
                return null;
            }

            return this.formatRecord(rows[0]);
        } catch (error) {
            console.error('Error getting reassessment by assessment ID:', error);
            throw error;
        }
    }

    // ✅ Create new reassessment record
    static async create(data) {
        try {
            const query = `
                INSERT INTO client_reassessments (
                    client_id, assessment_id, date_full_assess, date_last_reassess, 
                    reassessment_sources, cultural_cons, physical_chall, access_issues,
                    reason_for_ref, current_symp, suic_homi_thou, columbia_sr, columbia_sr_comp,
                    self_harm, self_harm_summary, psy_hosp, psy_hosp_summary, out_pat_summary,
                    trauma_exp, trauma_exp_summary, med_reassess, med_reassess_summary,
                    sub_abuse_reassess, sub_abuse_reassess_date, sub_abuse_reassess_summary,
                    med_hist_reassess, med_hist_reassess_date, med_hist_reassess_summary,
                    edu_history_reassess, edu_history_reassess_summary, emp_hist_reassess,
                    emp_hist_reassess_summary, legal_reassess, legal_reassess_summary,
                    living_arr_reassess, living_arr_reassess_summary, homeless_reassess,
                    homeless_reassess_date, dep_care_reassess, dep_care_reassess_summary,
                    fam_reassess, fam_reassess_summary, cm_ob1, cm_ob2, cm_ob3, cm_ob4,
                    cm_ob5, cm_ob6, cm_ob7, cm_ob8, cm_ob9, cm_ob10, cm_ob11, cm_ob_none,
                    cm_obv_sum, client_strength_reassess_summary, client_form_reassess_summary,
                    diag_descript, diag_descript_code_choice, diag_descript_code,
                    completion_status, completion_percentage, created_by, created_at,
                    updated_by, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                data.clientID,
                data.assessmentID || null,
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
                data.cmObvSum || '',
                data.clientStrengthReAssessSummary || '',
                data.clientFormReAssessSummary || '',
                data.diagDescript || '',
                data.diagDescriptCodeChoice || '',
                data.diagDescriptCode || '',
                data.completionStatus || 'Not Started',
                data.completionPercentage || 0,
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

    // ✅ Update reassessment record by client ID
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
                    cm_ob1 = ?, cm_ob2 = ?, cm_ob3 = ?, cm_ob4 = ?, cm_ob5 = ?, cm_ob6 = ?,
                    cm_ob7 = ?, cm_ob8 = ?, cm_ob9 = ?, cm_ob10 = ?, cm_ob11 = ?, cm_ob_none = ?,
                    cm_obv_sum = ?, client_strength_reassess_summary = ?, client_form_reassess_summary = ?,
                    diag_descript = ?, diag_descript_code_choice = ?, diag_descript_code = ?,
                    completion_status = ?, completion_percentage = ?, updated_by = ?, updated_at = ?
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
                data.cmObvSum || '',
                data.clientStrengthReAssessSummary || '',
                data.clientFormReAssessSummary || '',
                data.diagDescript || '',
                data.diagDescriptCodeChoice || '',
                data.diagDescriptCode || '',
                data.completionStatus || 'In Progress',
                data.completionPercentage || 0,
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

    // ✅ Update reassessment record by ID
    static async updateById(reassessmentID, data) {
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
                    cm_ob1 = ?, cm_ob2 = ?, cm_ob3 = ?, cm_ob4 = ?, cm_ob5 = ?, cm_ob6 = ?,
                    cm_ob7 = ?, cm_ob8 = ?, cm_ob9 = ?, cm_ob10 = ?, cm_ob11 = ?, cm_ob_none = ?,
                    cm_obv_sum = ?, client_strength_reassess_summary = ?, client_form_reassess_summary = ?,
                    diag_descript = ?, diag_descript_code_choice = ?, diag_descript_code = ?,
                    completion_status = ?, completion_percentage = ?, updated_by = ?, updated_at = ?
                WHERE id = ? AND is_deleted = 0
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
                data.cmObvSum || '',
                data.clientStrengthReAssessSummary || '',
                data.clientFormReAssessSummary || '',
                data.diagDescript || '',
                data.diagDescriptCodeChoice || '',
                data.diagDescriptCode || '',
                data.completionStatus || 'In Progress',
                data.completionPercentage || 0,
                data.updatedBy,
                data.updatedAt,
                reassessmentID
            ];

            const [result] = await db.execute(query, values);
            
            if (result.affectedRows === 0) {
                return null;
            }
            
            // Get the updated record
            const getQuery = `SELECT * FROM client_reassessments WHERE id = ? AND is_deleted = 0`;
            const [rows] = await db.execute(getQuery, [reassessmentID]);
            
            return rows.length > 0 ? this.formatRecord(rows[0]) : null;
        } catch (error) {
            console.error('Error updating reassessment record by ID:', error);
            throw error;
        }
    }

    // ✅ Complete reassessment
    static async complete(clientID, data) {
        try {
            const query = `
                UPDATE client_reassessments SET
                    completion_status = 'Complete',
                    completion_percentage = 100,
                    completed_by = ?,
                    completed_at = ?,
                    updated_by = ?,
                    updated_at = ?
                WHERE client_id = ? AND is_deleted = 0
            `;

            const [result] = await db.execute(query, [
                data.completedBy,
                data.completedAt,
                data.completedBy,
                data.completedAt,
                clientID
            ]);
            
            if (result.affectedRows === 0) {
                return null;
            }
            
            return await this.getByClientId(clientID);
        } catch (error) {
            console.error('Error completing reassessment:', error);
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
    static async search({ query, startDate, endDate, riskLevel, completionStatus }) {
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

            if (completionStatus) {
                searchQuery += ` AND ra.completion_status = ?`;
                params.push(completionStatus);
            }
            
            searchQuery += ` ORDER BY ra.updated_at DESC`;
            
            const [rows] = await db.execute(searchQuery, params);
            return rows.map(row => this.formatRecord(row));
        } catch (error) {
            console.error('Error searching reassessment records:', error);
            throw error;
        }
    }

    // ✅ Generate summary
    static async generateSummary(clientID) {
        try {
            const reassessment = await this.getByClientId(clientID);
            
            if (!reassessment) {
                return null;
            }

            // Generate summary based on assessment data
            const summary = {
                clientID: reassessment.clientID,
                assessmentDate: reassessment.dateLastReAssess,
                completionStatus: reassessment.completionStatus,
                completionPercentage: reassessment.completionPercentage,
                riskLevel: this.assessRiskLevel(reassessment),
                keyFindings: this.extractKeyFindings(reassessment),
                recommendations: this.generateRecommendations(reassessment),
                nextSteps: this.generateNextSteps(reassessment),
                generatedAt: new Date().toISOString()
            };

            return summary;
        } catch (error) {
            console.error('Error generating summary:', error);
            throw error;
        }
    }

    // ✅ Assess risk level based on assessment data
    static assessRiskLevel(assessment) {
        let riskFactors = 0;

        // Check for suicide risk indicators
        if (assessment.columbiaSRComp === 'No' || 
            (assessment.columbiaSR && assessment.columbiaSR.includes('ideation'))) {
            riskFactors += 3;
        }

        // Check for recent hospitalizations
        if (assessment.psyHosp && assessment.psyHosp.includes('Updates')) {
            riskFactors += 2;
        }

        // Check for housing instability
        if (assessment.homelessReAssess === 'Yes' || 
            (assessment.livingArrReAssess && assessment.livingArrReAssess.includes('Updates'))) {
            riskFactors += 1;
        }

        // Check for substance abuse
        if (assessment.subAbuseReAssess && assessment.subAbuseReAssess.includes('Updates')) {
            riskFactors += 2;
        }

        if (riskFactors >= 4) return 'High';
        if (riskFactors >= 2) return 'Medium';
        return 'Low';
    }

    // ✅ Extract key findings
    static extractKeyFindings(assessment) {
        const findings = [];

        if (assessment.currentSymp) {
            findings.push(`Current symptoms: ${assessment.currentSymp.substring(0, 100)}...`);
        }

        if (assessment.psyHosp && assessment.psyHosp.includes('Updates')) {
            findings.push('Recent psychiatric hospitalization noted');
        }

        if (assessment.columbiaSRComp === 'No') {
            findings.push('Columbia Suicide Risk Scale not completed - requires attention');
        }

        if (assessment.livingArrReAssess && assessment.livingArrReAssess.includes('Updates')) {
            findings.push('Housing situation has changed');
        }

        return findings;
    }

    // ✅ Generate recommendations
    static generateRecommendations(assessment) {
        const recommendations = [];

        if (assessment.columbiaSRComp === 'No') {
            recommendations.push('Complete Columbia Suicide Risk Scale assessment');
        }

        if (assessment.currentSymp && assessment.currentSymp.includes('anxiety')) {
            recommendations.push('Consider anxiety management interventions');
        }

        if (assessment.livingArrReAssess && assessment.livingArrReAssess.includes('Updates')) {
            recommendations.push('Housing stability support needed');
        }

        if (assessment.empHistReAssess && assessment.empHistReAssess.includes('Updates')) {
            recommendations.push('Vocational rehabilitation services');
        }

        return recommendations;
    }

    // ✅ Generate next steps
    static generateNextSteps(assessment) {
        const nextSteps = [];

        if (assessment.completionPercentage < 100) {
            nextSteps.push('Complete remaining assessment sections');
        }

        nextSteps.push('Review assessment with treatment team');
        nextSteps.push('Update treatment plan based on findings');

        if (assessment.dateLastReAssess) {
            const nextReassessment = new Date(assessment.dateLastReAssess);
            nextReassessment.setMonth(nextReassessment.getMonth() + 6);
            nextSteps.push(`Schedule next reassessment for ${nextReassessment.toLocaleDateString()}`);
        }

        return nextSteps;
    }

    // ✅ Format database record for frontend
    static formatRecord(row) {
        return {
            id: row.id,
            clientID: row.client_id,
            assessmentID: row.assessment_id,
            clientName: row.client_name,
            
            // Assessment Timeline
            dateFullAssess: row.date_full_assess,
            dateLastReAssess: row.date_last_reassess,
            reassessmentSources: row.reassessment_sources,
            culturalCons: row.cultural_cons,
            physicalChall: row.physical_chall,
            accessIssues: row.access_issues,
            
            // Reason for Referral
            reasonForRef: row.reason_for_ref,
            currentSymp: row.current_symp,
            suicHomiThou: row.suic_homi_thou,
            columbiaSR: row.columbia_sr,
            columbiaSRComp: row.columbia_sr_comp,
            
            // Self Harm & Medical History
            selfHarm: row.self_harm,
            selfHarmSummary: row.self_harm_summary,
            psyHosp: row.psy_hosp,
            psyHospSummary: row.psy_hosp_summary,
            outPatSummart: row.out_pat_summary,
            traumaExp: row.trauma_exp,
            traumaExpSummary: row.trauma_exp_summary,
            
            // Medications & Substance Use
            medReAssess: row.med_reassess,
            medReAssessSummary: row.med_reassess_summary,
            subAbuseReAssess: row.sub_abuse_reassess,
            subAbuseReAssessDate: row.sub_abuse_reassess_date,
            subAbuseReAssessSummary: row.sub_abuse_reassess_summary,
            
            // Medical History
            medHistReAssess: row.med_hist_reassess,
            medHistReAssessDate: row.med_hist_reassess_date,
            medHistReAssessSummary: row.med_hist_reassess_summary,
            
            // Education & Employment
            eduHistoryReAssess: row.edu_history_reassess,
            eduHistoryReAssessSummary: row.edu_history_reassess_summary,
            empHistReAssess: row.emp_hist_reassess,
            empHistReAssessSummary: row.emp_hist_reassess_summary,
            
            // Legal & Living Situation
            legalReAssess: row.legal_reassess,
            legalReAssessSummary: row.legal_reassess_summary,
            livingArrReAssess: row.living_arr_reassess,
            livingArrReAssessSummary: row.living_arr_reassess_summary,
            homelessReAssess: row.homeless_reassess,
            homelessReAssessDate: row.homeless_reassess_date,
            
            // Dependent Care & Family
            depCareReAssess: row.dep_care_reassess,
            depCareReAssessSummary: row.dep_care_reassess_summary,
            famReAssess: row.fam_reassess,
            famReAssessSummary: row.fam_reassess_summary,
            
            // Mental Status Exam
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
            cmObvSum: row.cm_obv_sum,
            
            // Clinical Summary
            clientStrengthReAssessSummary: row.client_strength_reassess_summary,
            clientFormReAssessSummary: row.client_form_reassess_summary,
            diagDescript: row.diag_descript,
            diagDescriptCodeChoice: row.diag_descript_code_choice,
            diagDescriptCode: row.diag_descript_code,
            
            // Completion Status
            completionStatus: row.completion_status,
            completionPercentage: row.completion_percentage,
            
            // Audit fields
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedBy: row.updated_by,
            updatedAt: row.updated_at,
            completedBy: row.completed_by,
            completedAt: row.completed_at
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