// ====================================================================
// REASSESSMENT SERVICE - With Client Validation
// ====================================================================

const sql = require('mssql');

// Try to load azureSql module
let getPool;
try {
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ azureSql loaded for Reassessment service');
} catch (err) {
  console.error('⚠️ Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

// Generate unique reassessment ID
const generateReassessmentID = (clientID) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RA-${clientID}-${timestamp}-${random}`;
};

// Helper to parse JSON fields
const parseJsonField = (field) => {
  try {
    return field ? JSON.parse(field) : [];
  } catch (e) {
    return Array.isArray(field) ? field : [];
  }
};

// Helper to stringify array fields
const stringifyArrayField = (field) => {
  return Array.isArray(field) ? JSON.stringify(field) : field;
};

// ✅ Validate client exists in database
const validateClientExists = async (clientID) => {
  const pool = await getPool();
  
  const result = await pool.request()
    .input('clientID', sql.VarChar, clientID)
    .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
  
  return result.recordset.length > 0;
};

// Get reassessment by client ID
const getByClientId = async (clientID) => {
  try {
    const pool = await getPool();
    
    console.log(`📋 Fetching reassessment for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(`
        SELECT TOP 1 * 
        FROM Reassessments 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);

    if (result.recordset.length === 0) {
      console.log(`📝 No reassessment found for client ${clientID}`);
      return null;
    }

    const reassessment = result.recordset[0];

    // Parse JSON fields
    const parsedData = {
      ...reassessment,
      cmOb1: parseJsonField(reassessment.cmOb1),
      cmOb2: parseJsonField(reassessment.cmOb2),
      cmOb3: parseJsonField(reassessment.cmOb3),
      cmOb4: parseJsonField(reassessment.cmOb4),
      cmOb5: parseJsonField(reassessment.cmOb5),
      cmOb6: parseJsonField(reassessment.cmOb6),
      cmOb7: parseJsonField(reassessment.cmOb7),
      cmOb8: parseJsonField(reassessment.cmOb8),
      cmOb9: parseJsonField(reassessment.cmOb9),
      cmOb10: parseJsonField(reassessment.cmOb10),
      cmOb11: parseJsonField(reassessment.cmOb11),
      cmObNone: parseJsonField(reassessment.cmObNone)
    };

    console.log(`✅ Reassessment retrieved for client ${clientID}`);
    return parsedData;
    
  } catch (error) {
    console.error('⚠️ Error fetching reassessment:', error);
    throw error;
  }
};

// Get reassessment by assessment ID
const getByAssessmentId = async (assessmentID) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('assessmentID', sql.VarChar, assessmentID)
      .query(`
        SELECT * FROM Reassessments 
        WHERE assessmentID = @assessmentID
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0];
    
  } catch (error) {
    console.error('⚠️ Error fetching reassessment by assessment:', error);
    throw error;
  }
};

// Create new reassessment
const create = async (reassessmentData) => {
  try {
    const pool = await getPool();
    const { clientID } = reassessmentData;
    
    console.log(`🧠 Creating reassessment for client: ${clientID}`);
    
    // ✅ VALIDATE CLIENT EXISTS
    const clientExists = await validateClientExists(clientID);
    if (!clientExists) {
      throw new Error(`Client with ID ${clientID} does not exist in the database. Please create the client first.`);
    }
    
    const reassessmentID = generateReassessmentID(clientID);
    
    await pool.request()
      .input('reassessmentID', sql.VarChar, reassessmentID)
      .input('clientID', sql.VarChar, clientID)
      .input('assessmentID', sql.VarChar, reassessmentData.assessmentID || null)
      .input('dateFullAssess', sql.Date, reassessmentData.dateFullAssess || null)
      .input('dateLastReAssess', sql.Date, reassessmentData.dateLastReAssess || null)
      .input('reassessmentSources', sql.NVarChar, reassessmentData.reassessmentSources || '')
      .input('culturalCons', sql.NVarChar, reassessmentData.culturalCons || '')
      .input('physicalChall', sql.NVarChar, reassessmentData.physicalChall || '')
      .input('accessIssues', sql.NVarChar, reassessmentData.accessIssues || '')
      .input('reasonForRef', sql.NVarChar, reassessmentData.reasonForRef || '')
      .input('currentSymp', sql.NVarChar, reassessmentData.currentSymp || '')
      .input('suicHomiThou', sql.NVarChar, reassessmentData.suicHomiThou || '')
      .input('columbiaSR', sql.NVarChar, reassessmentData.columbiaSR || '')
      .input('columbiaSRComp', sql.VarChar, reassessmentData.columbiaSRComp || 'No')
      .input('cmOb1', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb1))
      .input('cmOb2', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb2))
      .input('cmOb3', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb3))
      .input('cmOb4', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb4))
      .input('cmOb5', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb5))
      .input('cmOb6', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb6))
      .input('cmOb7', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb7))
      .input('cmOb8', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb8))
      .input('cmOb9', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb9))
      .input('cmOb10', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb10))
      .input('cmOb11', sql.NVarChar, stringifyArrayField(reassessmentData.cmOb11))
      .input('cmObNone', sql.NVarChar, stringifyArrayField(reassessmentData.cmObNone))
      .input('cmObvSum', sql.NVarChar, reassessmentData.cmObvSum || '')
      .input('clientStrengthReAssessSummary', sql.NVarChar, reassessmentData.clientStrengthReAssessSummary || '')
      .input('clientFormReAssessSummary', sql.NVarChar, reassessmentData.clientFormReAssessSummary || '')
      .input('diagDescript', sql.NVarChar, reassessmentData.diagDescript || '')
      .input('diagDescriptCodeChoice', sql.VarChar, reassessmentData.diagDescriptCodeChoice || '')
      .input('diagDescriptCode', sql.VarChar, reassessmentData.diagDescriptCode || '')
      .input('completionStatus', sql.VarChar, reassessmentData.completionStatus || 'In Progress')
      .input('completionPercentage', sql.Decimal, reassessmentData.completionPercentage || 0)
      .input('createdBy', sql.VarChar, reassessmentData.createdBy || 'system')
      .query(`
        INSERT INTO Reassessments (
          reassessmentID, clientID, assessmentID, dateFullAssess, dateLastReAssess,
          reassessmentSources, culturalCons, physicalChall, accessIssues,
          reasonForRef, currentSymp, suicHomiThou, columbiaSR, columbiaSRComp,
          cmOb1, cmOb2, cmOb3, cmOb4, cmOb5, cmOb6, cmOb7, cmOb8, cmOb9, cmOb10, cmOb11, cmObNone,
          cmObvSum, clientStrengthReAssessSummary, clientFormReAssessSummary,
          diagDescript, diagDescriptCodeChoice, diagDescriptCode,
          completionStatus, completionPercentage, createdBy, createdAt, updatedBy, updatedAt
        ) VALUES (
          @reassessmentID, @clientID, @assessmentID, @dateFullAssess, @dateLastReAssess,
          @reassessmentSources, @culturalCons, @physicalChall, @accessIssues,
          @reasonForRef, @currentSymp, @suicHomiThou, @columbiaSR, @columbiaSRComp,
          @cmOb1, @cmOb2, @cmOb3, @cmOb4, @cmOb5, @cmOb6, @cmOb7, @cmOb8, @cmOb9, @cmOb10, @cmOb11, @cmObNone,
          @cmObvSum, @clientStrengthReAssessSummary, @clientFormReAssessSummary,
          @diagDescript, @diagDescriptCodeChoice, @diagDescriptCode,
          @completionStatus, @completionPercentage, @createdBy, GETDATE(), @createdBy, GETDATE()
        )
      `);

    console.log(`✅ Reassessment created: ${reassessmentID}`);
    
    return {
      reassessmentID,
      ...reassessmentData,
      createdAt: new Date()
    };
    
  } catch (error) {
    console.error('Error creating reassessment:', error);
    throw error;
  }
};

// Update reassessment by client ID
const update = async (clientID, updateData) => {
  try {
    const pool = await getPool();
    
    console.log(`🔄 Updating reassessment for client: ${clientID}`);
    
    await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .input('dateFullAssess', sql.Date, updateData.dateFullAssess || null)
      .input('dateLastReAssess', sql.Date, updateData.dateLastReAssess || null)
      .input('reassessmentSources', sql.NVarChar, updateData.reassessmentSources || '')
      .input('culturalCons', sql.NVarChar, updateData.culturalCons || '')
      .input('physicalChall', sql.NVarChar, updateData.physicalChall || '')
      .input('accessIssues', sql.NVarChar, updateData.accessIssues || '')
      .input('reasonForRef', sql.NVarChar, updateData.reasonForRef || '')
      .input('currentSymp', sql.NVarChar, updateData.currentSymp || '')
      .input('suicHomiThou', sql.NVarChar, updateData.suicHomiThou || '')
      .input('columbiaSR', sql.NVarChar, updateData.columbiaSR || '')
      .input('columbiaSRComp', sql.VarChar, updateData.columbiaSRComp || 'No')
      .input('cmOb1', sql.NVarChar, stringifyArrayField(updateData.cmOb1))
      .input('cmOb2', sql.NVarChar, stringifyArrayField(updateData.cmOb2))
      .input('cmOb3', sql.NVarChar, stringifyArrayField(updateData.cmOb3))
      .input('cmOb4', sql.NVarChar, stringifyArrayField(updateData.cmOb4))
      .input('cmOb5', sql.NVarChar, stringifyArrayField(updateData.cmOb5))
      .input('cmOb6', sql.NVarChar, stringifyArrayField(updateData.cmOb6))
      .input('cmOb7', sql.NVarChar, stringifyArrayField(updateData.cmOb7))
      .input('cmOb8', sql.NVarChar, stringifyArrayField(updateData.cmOb8))
      .input('cmOb9', sql.NVarChar, stringifyArrayField(updateData.cmOb9))
      .input('cmOb10', sql.NVarChar, stringifyArrayField(updateData.cmOb10))
      .input('cmOb11', sql.NVarChar, stringifyArrayField(updateData.cmOb11))
      .input('cmObNone', sql.NVarChar, stringifyArrayField(updateData.cmObNone))
      .input('cmObvSum', sql.NVarChar, updateData.cmObvSum || '')
      .input('clientStrengthReAssessSummary', sql.NVarChar, updateData.clientStrengthReAssessSummary || '')
      .input('clientFormReAssessSummary', sql.NVarChar, updateData.clientFormReAssessSummary || '')
      .input('diagDescript', sql.NVarChar, updateData.diagDescript || '')
      .input('diagDescriptCodeChoice', sql.VarChar, updateData.diagDescriptCodeChoice || '')
      .input('diagDescriptCode', sql.VarChar, updateData.diagDescriptCode || '')
      .input('completionStatus', sql.VarChar, updateData.completionStatus || 'In Progress')
      .input('completionPercentage', sql.Decimal, updateData.completionPercentage || 0)
      .input('updatedBy', sql.VarChar, updateData.updatedBy || 'system')
      .query(`
        UPDATE Reassessments SET
          dateFullAssess = @dateFullAssess,
          dateLastReAssess = @dateLastReAssess,
          reassessmentSources = @reassessmentSources,
          culturalCons = @culturalCons,
          physicalChall = @physicalChall,
          accessIssues = @accessIssues,
          reasonForRef = @reasonForRef,
          currentSymp = @currentSymp,
          suicHomiThou = @suicHomiThou,
          columbiaSR = @columbiaSR,
          columbiaSRComp = @columbiaSRComp,
          cmOb1 = @cmOb1,
          cmOb2 = @cmOb2,
          cmOb3 = @cmOb3,
          cmOb4 = @cmOb4,
          cmOb5 = @cmOb5,
          cmOb6 = @cmOb6,
          cmOb7 = @cmOb7,
          cmOb8 = @cmOb8,
          cmOb9 = @cmOb9,
          cmOb10 = @cmOb10,
          cmOb11 = @cmOb11,
          cmObNone = @cmObNone,
          cmObvSum = @cmObvSum,
          clientStrengthReAssessSummary = @clientStrengthReAssessSummary,
          clientFormReAssessSummary = @clientFormReAssessSummary,
          diagDescript = @diagDescript,
          diagDescriptCodeChoice = @diagDescriptCodeChoice,
          diagDescriptCode = @diagDescriptCode,
          completionStatus = @completionStatus,
          completionPercentage = @completionPercentage,
          updatedBy = @updatedBy,
          updatedAt = GETDATE()
        WHERE clientID = @clientID
      `);

    console.log(`✅ Reassessment updated for client ${clientID}`);
    
    return await getByClientId(clientID);
    
  } catch (error) {
    console.error('Error updating reassessment:', error);
    throw error;
  }
};

// Update by reassessment ID
const updateById = async (reassessmentID, updateData) => {
  try {
    const pool = await getPool();
    
    // Similar to update but uses reassessmentID instead
    // ... (implement similar to update function)
    
    return { reassessmentID, ...updateData };
    
  } catch (error) {
    console.error('Error updating reassessment by ID:', error);
    throw error;
  }
};

// Complete reassessment
const complete = async (clientID, completionData) => {
  try {
    return await update(clientID, {
      ...completionData,
      completionStatus: 'Complete',
      completionPercentage: 100
    });
  } catch (error) {
    console.error('Error completing reassessment:', error);
    throw error;
  }
};

// Delete reassessment
const deleteReassessment = async (clientID) => {
  try {
    const pool = await getPool();
    
    await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query('DELETE FROM Reassessments WHERE clientID = @clientID');
    
    return true;
  } catch (error) {
    console.error('Error deleting reassessment:', error);
    throw error;
  }
};

// Get all reassessments
const getAll = async () => {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .query('SELECT * FROM Reassessments ORDER BY createdAt DESC');
    
    return result.recordset;
  } catch (error) {
    console.error('Error getting all reassessments:', error);
    throw error;
  }
};

// Search reassessments
const search = async (searchParams) => {
  try {
    const pool = await getPool();
    // Implement search logic
    return [];
  } catch (error) {
    console.error('Error searching reassessments:', error);
    throw error;
  }
};

// Generate summary
const generateSummary = async (clientID) => {
  try {
    const pool = await getPool();
    // Implement summary generation
    return {};
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

module.exports = {
  getByClientId,
  getByAssessmentId,
  create,
  update,
  updateById,
  complete,
  delete: deleteReassessment,
  getAll,
  search,
  generateSummary
};