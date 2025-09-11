// services/reassessmentService.js
const sql = require('mssql');

// Try to load azureSql module (following your existing pattern)
let getDbConnection;
try {
  const azureSql = require('../store/azureSql');
  getDbConnection = azureSql.getPool;
  console.log('✅ azureSql loaded for ReassessmentService');
} catch (err) {
  console.error('⚠️ Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

class ReassessmentService {
  
  // Get reassessment data by client ID
  static async getByClientId(clientID) {
    try {
      const pool = await getDbConnection();
      
      const query = `
        SELECT TOP 1 *
        FROM ReassessmentData
        WHERE clientID = @clientID
        ORDER BY createdAt DESC
      `;
      
      const result = await pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(query);

      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      console.error('Error fetching reassessment by clientID:', error);
      throw error;
    }
  }

  // Get reassessment data by assessment ID
  static async getByAssessmentId(assessmentID) {
    try {
      const pool = await getDbConnection();
      
      const query = `
        SELECT *
        FROM ReassessmentData
        WHERE assessmentID = @assessmentID
      `;
      
      const result = await pool.request()
        .input('assessmentID', sql.VarChar, assessmentID)
        .query(query);

      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      console.error('Error fetching reassessment by assessmentID:', error);
      throw error;
    }
  }

  // Create new reassessment record
  static async create(data) {
    try {
      const pool = await getDbConnection();
      
      // Generate reassessment ID
      const reassessmentID = `RA-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;
      
      const query = `
        INSERT INTO ReassessmentData (
          reassessmentID,
          clientID,
          assessmentID,
          dateFullAssess,
          dateLastReAssess,
          reassessmentSources,
          culturalCons,
          physicalChall,
          accessIssues,
          currentSymp,
          columbiaSRComp,
          completionStatus,
          completionPercentage,
          riskLevel,
          recommendedActions,
          followUpRequired,
          nextReviewDate,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @reassessmentID,
          @clientID,
          @assessmentID,
          @dateFullAssess,
          @dateLastReAssess,
          @reassessmentSources,
          @culturalCons,
          @physicalChall,
          @accessIssues,
          @currentSymp,
          @columbiaSRComp,
          @completionStatus,
          @completionPercentage,
          @riskLevel,
          @recommendedActions,
          @followUpRequired,
          @nextReviewDate,
          @createdBy,
          @createdAt,
          @updatedBy,
          @updatedAt
        )
      `;
      
      const result = await pool.request()
        .input('reassessmentID', sql.VarChar, reassessmentID)
        .input('clientID', sql.VarChar, data.clientID)
        .input('assessmentID', sql.VarChar, data.assessmentID || null)
        .input('dateFullAssess', sql.Date, data.dateFullAssess || null)
        .input('dateLastReAssess', sql.Date, data.dateLastReAssess || null)
        .input('reassessmentSources', sql.NVarChar, data.reassessmentSources || '')
        .input('culturalCons', sql.NVarChar, data.culturalCons || '')
        .input('physicalChall', sql.NVarChar, data.physicalChall || '')
        .input('accessIssues', sql.NVarChar, data.accessIssues || '')
        .input('currentSymp', sql.NVarChar, data.currentSymp || '')
        .input('columbiaSRComp', sql.VarChar, data.columbiaSRComp || 'No')
        .input('completionStatus', sql.VarChar, 'In Progress')
        .input('completionPercentage', sql.Decimal, this.calculateCompletionPercentage(data))
        .input('riskLevel', sql.VarChar, this.assessRiskLevel(data))
        .input('recommendedActions', sql.NVarChar, data.recommendedActions || '')
        .input('followUpRequired', sql.Bit, data.followUpRequired || false)
        .input('nextReviewDate', sql.Date, data.nextReviewDate || null)
        .input('createdBy', sql.VarChar, data.createdBy)
        .input('createdAt', sql.DateTime, data.createdAt || new Date())
        .input('updatedBy', sql.VarChar, data.createdBy)
        .input('updatedAt', sql.DateTime, new Date())
        .query(query);

      return result.recordset[0];
    } catch (error) {
      console.error('Error creating reassessment:', error);
      throw error;
    }
  }

  // Update reassessment by client ID
  static async update(clientID, data) {
    try {
      const pool = await getDbConnection();
      
      const query = `
        UPDATE ReassessmentData SET
          dateFullAssess = @dateFullAssess,
          dateLastReAssess = @dateLastReAssess,
          reassessmentSources = @reassessmentSources,
          culturalCons = @culturalCons,
          physicalChall = @physicalChall,
          accessIssues = @accessIssues,
          currentSymp = @currentSymp,
          columbiaSRComp = @columbiaSRComp,
          completionPercentage = @completionPercentage,
          riskLevel = @riskLevel,
          recommendedActions = @recommendedActions,
          followUpRequired = @followUpRequired,
          nextReviewDate = @nextReviewDate,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        OUTPUT INSERTED.*
        WHERE clientID = @clientID
      `;
      
      const result = await pool.request()
        .input('clientID', sql.VarChar, clientID)
        .input('dateFullAssess', sql.Date, data.dateFullAssess || null)
        .input('dateLastReAssess', sql.Date, data.dateLastReAssess || null)
        .input('reassessmentSources', sql.NVarChar, data.reassessmentSources || '')
        .input('culturalCons', sql.NVarChar, data.culturalCons || '')
        .input('physicalChall', sql.NVarChar, data.physicalChall || '')
        .input('accessIssues', sql.NVarChar, data.accessIssues || '')
        .input('currentSymp', sql.NVarChar, data.currentSymp || '')
        .input('columbiaSRComp', sql.VarChar, data.columbiaSRComp || 'No')
        .input('completionPercentage', sql.Decimal, this.calculateCompletionPercentage(data))
        .input('riskLevel', sql.VarChar, this.assessRiskLevel(data))
        .input('recommendedActions', sql.NVarChar, data.recommendedActions || '')
        .input('followUpRequired', sql.Bit, data.followUpRequired || false)
        .input('nextReviewDate', sql.Date, data.nextReviewDate || null)
        .input('updatedBy', sql.VarChar, data.updatedBy)
        .input('updatedAt', sql.DateTime, data.updatedAt || new Date())
        .query(query);

      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      console.error('Error updating reassessment:', error);
      throw error;
    }
  }

  // Update reassessment by reassessment ID
  static async updateById(reassessmentID, data) {
    try {
      const pool = await getDbConnection();
      
      const query = `
        UPDATE ReassessmentData SET
          dateFullAssess = @dateFullAssess,
          dateLastReAssess = @dateLastReAssess,
          reassessmentSources = @reassessmentSources,
          culturalCons = @culturalCons,
          physicalChall = @physicalChall,
          accessIssues = @accessIssues,
          currentSymp = @currentSymp,
          columbiaSRComp = @columbiaSRComp,
          completionPercentage = @completionPercentage,
          riskLevel = @riskLevel,
          recommendedActions = @recommendedActions,
          followUpRequired = @followUpRequired,
          nextReviewDate = @nextReviewDate,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        OUTPUT INSERTED.*
        WHERE reassessmentID = @reassessmentID
      `;
      
      const result = await pool.request()
        .input('reassessmentID', sql.VarChar, reassessmentID)
        .input('dateFullAssess', sql.Date, data.dateFullAssess || null)
        .input('dateLastReAssess', sql.Date, data.dateLastReAssess || null)
        .input('reassessmentSources', sql.NVarChar, data.reassessmentSources || '')
        .input('culturalCons', sql.NVarChar, data.culturalCons || '')
        .input('physicalChall', sql.NVarChar, data.physicalChall || '')
        .input('accessIssues', sql.NVarChar, data.accessIssues || '')
        .input('currentSymp', sql.NVarChar, data.currentSymp || '')
        .input('columbiaSRComp', sql.VarChar, data.columbiaSRComp || 'No')
        .input('completionPercentage', sql.Decimal, this.calculateCompletionPercentage(data))
        .input('riskLevel', sql.VarChar, this.assessRiskLevel(data))
        .input('recommendedActions', sql.NVarChar, data.recommendedActions || '')
        .input('followUpRequired', sql.Bit, data.followUpRequired || false)
        .input('nextReviewDate', sql.Date, data.nextReviewDate || null)
        .input('updatedBy', sql.VarChar, data.updatedBy)
        .input('updatedAt', sql.DateTime, data.updatedAt || new Date())
        .query(query);

      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      console.error('Error updating reassessment by ID:', error);
      throw error;
    }
  }

  // Complete reassessment
  static async complete(clientID, data) {
    try {
      const pool = await getDbConnection();
      
      const query = `
        UPDATE ReassessmentData SET
          completionStatus = @completionStatus,
          completionPercentage = @completionPercentage,
          completedBy = @completedBy,
          completedAt = @completedAt,
          riskLevel = @riskLevel,
          recommendedActions = @recommendedActions,
          followUpRequired = @followUpRequired,
          nextReviewDate = @nextReviewDate,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        OUTPUT INSERTED.*
        WHERE clientID = @clientID
      `;
      
      const result = await pool.request()
        .input('clientID', sql.VarChar, clientID)
        .input('completionStatus', sql.VarChar, data.completionStatus || 'Complete')
        .input('completionPercentage', sql.Decimal, data.completionPercentage || 100)
        .input('completedBy', sql.VarChar, data.completedBy)
        .input('completedAt', sql.DateTime, data.completedAt || new Date())
        .input('riskLevel', sql.VarChar, this.assessRiskLevel(data))
        .input('recommendedActions', sql.NVarChar, data.recommendedActions || '')
        .input('followUpRequired', sql.Bit, data.followUpRequired || false)
        .input('nextReviewDate', sql.Date, data.nextReviewDate || null)
        .input('updatedBy', sql.VarChar, data.completedBy)
        .input('updatedAt', sql.DateTime, new Date())
        .query(query);

      return result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (error) {
      console.error('Error completing reassessment:', error);
      throw error;
    }
  }

  // Delete reassessment (soft delete)
  static async delete(clientID) {
    try {
      const pool = await getDbConnection();
      
      const query = `
        UPDATE ReassessmentData SET
          isDeleted = 1,
          deletedAt = GETDATE()
        WHERE clientID = @clientID
      `;
      
      const result = await pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(query);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('Error deleting reassessment:', error);
      throw error;
    }
  }

  // Get all reassessments (admin only)
  static async getAll() {
    try {
      const pool = await getDbConnection();
      
      const query = `
        SELECT *
        FROM ReassessmentData
        WHERE isDeleted = 0 OR isDeleted IS NULL
        ORDER BY createdAt DESC
      `;
      
      const result = await pool.request().query(query);
      return result.recordset;
    } catch (error) {
      console.error('Error fetching all reassessments:', error);
      throw error;
    }
  }

  // Search reassessments
  static async search({ query, startDate, endDate, riskLevel, completionStatus }) {
    try {
      const pool = await getDbConnection();
      
      let whereClause = 'WHERE (isDeleted = 0 OR isDeleted IS NULL)';
      const inputs = [];

      if (query) {
        whereClause += ' AND (reassessmentSources LIKE @query OR currentSymp LIKE @query OR recommendedActions LIKE @query)';
        inputs.push({ name: 'query', type: sql.NVarChar, value: `%${query}%` });
      }

      if (startDate) {
        whereClause += ' AND createdAt >= @startDate';
        inputs.push({ name: 'startDate', type: sql.DateTime, value: new Date(startDate) });
      }

      if (endDate) {
        whereClause += ' AND createdAt <= @endDate';
        inputs.push({ name: 'endDate', type: sql.DateTime, value: new Date(endDate) });
      }

      if (riskLevel) {
        whereClause += ' AND riskLevel = @riskLevel';
        inputs.push({ name: 'riskLevel', type: sql.VarChar, value: riskLevel });
      }

      if (completionStatus) {
        whereClause += ' AND completionStatus = @completionStatus';
        inputs.push({ name: 'completionStatus', type: sql.VarChar, value: completionStatus });
      }

      const searchQuery = `
        SELECT *
        FROM ReassessmentData
        ${whereClause}
        ORDER BY createdAt DESC
      `;

      const request = pool.request();
      inputs.forEach(input => {
        request.input(input.name, input.type, input.value);
      });

      const result = await request.query(searchQuery);
      return result.recordset;
    } catch (error) {
      console.error('Error searching reassessments:', error);
      throw error;
    }
  }

  // Generate assessment summary
  static async generateSummary(clientID) {
    try {
      const reassessmentData = await this.getByClientId(clientID);
      
      if (!reassessmentData) {
        return null;
      }

      const summary = {
        clientID: clientID,
        reassessmentID: reassessmentData.reassessmentID,
        assessmentOverview: {
          completionStatus: reassessmentData.completionStatus,
          completionPercentage: reassessmentData.completionPercentage,
          riskLevel: reassessmentData.riskLevel,
          lastUpdated: reassessmentData.updatedAt,
          assessedBy: reassessmentData.createdBy
        },
        assessmentDates: {
          fullAssessment: reassessmentData.dateFullAssess,
          lastReassessment: reassessmentData.dateLastReAssess,
          nextReview: reassessmentData.nextReviewDate
        },
        keyFindings: {
          culturalConsiderations: reassessmentData.culturalCons,
          physicalChallenges: reassessmentData.physicalChall,
          accessIssues: reassessmentData.accessIssues,
          currentSymptoms: reassessmentData.currentSymp,
          columbiaScreening: reassessmentData.columbiaSRComp
        },
        recommendations: {
          actions: reassessmentData.recommendedActions,
          followUpRequired: reassessmentData.followUpRequired,
          nextReviewDate: reassessmentData.nextReviewDate
        },
        sources: reassessmentData.reassessmentSources
      };

      return summary;
    } catch (error) {
      console.error('Error generating reassessment summary:', error);
      throw error;
    }
  }

  // Helper method to calculate completion percentage
  static calculateCompletionPercentage(data) {
    const requiredFields = [
      'dateFullAssess',
      'dateLastReAssess', 
      'reassessmentSources',
      'currentSymp',
      'columbiaSRComp',
      'reasonForRef',
      'clientStrengthReAssessSummary',
      'clientFormReAssessSummary'
    ];

    const completedFields = requiredFields.filter(field => {
      const value = data[field];
      return value !== '' && value !== null && value !== undefined;
    }).length;

    return Math.round((completedFields / requiredFields.length) * 100);
  }

  // Helper method to assess risk level
  static assessRiskLevel(data) {
    let riskScore = 0;

    // Columbia Suicide Risk Assessment
    if (data.columbiaSRComp === 'Yes') {
      riskScore += 3;
    }

    // Current symptoms assessment
    if (data.currentSymp && data.currentSymp.length > 0) {
      const symptoms = data.currentSymp.toLowerCase();
      if (symptoms.includes('suicide') || symptoms.includes('harm') || symptoms.includes('violent')) {
        riskScore += 3;
      } else if (symptoms.includes('depression') || symptoms.includes('anxiety') || symptoms.includes('psychosis')) {
        riskScore += 2;
      } else if (symptoms.includes('mood') || symptoms.includes('stress')) {
        riskScore += 1;
      }
    }

    // Access issues
    if (data.accessIssues && data.accessIssues.length > 50) {
      riskScore += 1;
    }

    // Determine risk level
    if (riskScore >= 5) {
      return 'High';
    } else if (riskScore >= 3) {
      return 'Medium';
    } else if (riskScore >= 1) {
      return 'Low';
    } else {
      return 'Minimal';
    }
  }
}

module.exports = ReassessmentService;