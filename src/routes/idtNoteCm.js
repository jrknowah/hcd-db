const express = require('express');
const sql = require('mssql');
const router = express.Router();

// Database connection (assumes you have this configured)
// const { poolPromise } = require('../db/database');

/**
 * GET /api/idt-case-manager/:clientID
 * Get IDT Case Manager data for a specific client
 */
router.get('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          idtCMID,
          clientID,
          idtMemberSituation,
          idtMemberSupport,
          idtIncomeSource,
          clientGovIssued,
          idtResources,
          idtHfhCM,
          idtRecommend,
          clientHighEnd,
          idtGoals,
          clientPayeeBarriers,
          clientPayeeAssistance,
          assessmentScore,
          riskLevel,
          readinessLevel,
          supportStrength,
          goalsCompleted,
          goalsInProgress,
          goalsPending,
          lastAssessmentDate,
          nextFollowUpDate,
          documentationComplete,
          missingDocuments,
          lastDocumentUpdate,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        FROM dbo.IDTCaseManager 
        WHERE clientID = @clientID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found for this client' });
    }

    const record = result.recordset[0];
    
    // Parse JSON fields
    if (record.clientGovIssued) {
      try {
        record.clientGovIssued = JSON.parse(record.clientGovIssued);
      } catch (e) {
        record.clientGovIssued = [];
      }
    }

    if (record.missingDocuments) {
      try {
        record.missingDocuments = JSON.parse(record.missingDocuments);
      } catch (e) {
        record.missingDocuments = [];
      }
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching IDT Case Manager data:', error);
    res.status(500).json({ 
      message: 'Error fetching IDT Case Manager data', 
      error: error.message 
    });
  }
});

/**
 * POST /api/idt-case-manager/:clientID
 * Save/update IDT Case Manager data for a client
 */
router.post('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const {
      idtMemberSituation,
      idtMemberSupport,
      idtIncomeSource,
      clientGovIssued,
      idtResources,
      idtHfhCM,
      idtRecommend,
      clientHighEnd,
      idtGoals,
      clientPayeeBarriers,
      clientPayeeAssistance,
      updatedBy
    } = req.body;

    const pool = await poolPromise;
    
    // Calculate assessment score based on completeness
    const assessmentScore = calculateAssessmentScore(req.body);
    const riskLevel = calculateRiskLevel(req.body);
    const readinessLevel = calculateReadinessLevel(req.body);
    const supportStrength = calculateSupportStrength(req.body);

    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('idtMemberSituation', sql.NVarChar(sql.MAX), idtMemberSituation || '')
      .input('idtMemberSupport', sql.NVarChar(sql.MAX), idtMemberSupport || '')
      .input('idtIncomeSource', sql.NVarChar(500), idtIncomeSource || '')
      .input('clientGovIssued', sql.NVarChar(sql.MAX), JSON.stringify(clientGovIssued || []))
      .input('idtResources', sql.NVarChar(sql.MAX), idtResources || '')
      .input('idtHfhCM', sql.NVarChar(200), idtHfhCM || '')
      .input('idtRecommend', sql.NVarChar(sql.MAX), idtRecommend || '')
      .input('clientHighEnd', sql.NVarChar(100), clientHighEnd || '')
      .input('idtGoals', sql.NVarChar(sql.MAX), idtGoals || '')
      .input('clientPayeeBarriers', sql.NVarChar(sql.MAX), clientPayeeBarriers || '')
      .input('clientPayeeAssistance', sql.NVarChar(sql.MAX), clientPayeeAssistance || '')
      .input('assessmentScore', sql.Decimal(5,2), assessmentScore)
      .input('riskLevel', sql.NVarChar(50), riskLevel)
      .input('readinessLevel', sql.NVarChar(50), readinessLevel)
      .input('supportStrength', sql.NVarChar(50), supportStrength)
      .input('updatedBy', sql.NVarChar(100), updatedBy || 'system')
      .query(`
        MERGE dbo.IDTCaseManager AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET
            idtMemberSituation = @idtMemberSituation,
            idtMemberSupport = @idtMemberSupport,
            idtIncomeSource = @idtIncomeSource,
            clientGovIssued = @clientGovIssued,
            idtResources = @idtResources,
            idtHfhCM = @idtHfhCM,
            idtRecommend = @idtRecommend,
            clientHighEnd = @clientHighEnd,
            idtGoals = @idtGoals,
            clientPayeeBarriers = @clientPayeeBarriers,
            clientPayeeAssistance = @clientPayeeAssistance,
            assessmentScore = @assessmentScore,
            riskLevel = @riskLevel,
            readinessLevel = @readinessLevel,
            supportStrength = @supportStrength,
            lastAssessmentDate = GETDATE(),
            nextFollowUpDate = DATEADD(month, 1, GETDATE()),
            updatedBy = @updatedBy,
            updatedAt = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (
            clientID, idtMemberSituation, idtMemberSupport, idtIncomeSource,
            clientGovIssued, idtResources, idtHfhCM, idtRecommend,
            clientHighEnd, idtGoals, clientPayeeBarriers, clientPayeeAssistance,
            assessmentScore, riskLevel, readinessLevel, supportStrength,
            lastAssessmentDate, nextFollowUpDate, documentationComplete,
            createdBy, createdAt, updatedBy, updatedAt
          )
          VALUES (
            @clientID, @idtMemberSituation, @idtMemberSupport, @idtIncomeSource,
            @clientGovIssued, @idtResources, @idtHfhCM, @idtRecommend,
            @clientHighEnd, @idtGoals, @clientPayeeBarriers, @clientPayeeAssistance,
            @assessmentScore, @riskLevel, @readinessLevel, @supportStrength,
            GETDATE(), DATEADD(month, 1, GETDATE()), 0,
            @updatedBy, GETDATE(), @updatedBy, GETDATE()
          )
        OUTPUT inserted.*;
      `);

    const savedRecord = result.recordset[0];
    
    // Parse JSON fields for response
    if (savedRecord.clientGovIssued) {
      savedRecord.clientGovIssued = JSON.parse(savedRecord.clientGovIssued);
    }

    res.json(savedRecord);
  } catch (error) {
    console.error('Error saving IDT Case Manager data:', error);
    res.status(500).json({ 
      message: 'Error saving IDT Case Manager data', 
      error: error.message 
    });
  }
});

/**
 * PUT /api/idt-case-manager/:idtCMID
 * Update specific IDT Case Manager record
 */
router.put('/:idtCMID', async (req, res) => {
  try {
    const { idtCMID } = req.params;
    const updateData = req.body;

    const pool = await poolPromise;
    
    // Build dynamic update query
    const updateFields = [];
    const inputs = {};
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'idtCMID') {
        updateFields.push(`${key} = @${key}`);
        inputs[key] = updateData[key];
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updateFields.push('updatedAt = GETDATE()');

    const request = pool.request();
    request.input('idtCMID', sql.Int, idtCMID);
    
    Object.keys(inputs).forEach(key => {
      if (key === 'clientGovIssued') {
        request.input(key, sql.NVarChar(sql.MAX), JSON.stringify(inputs[key]));
      } else if (typeof inputs[key] === 'string') {
        request.input(key, sql.NVarChar(sql.MAX), inputs[key]);
      } else if (typeof inputs[key] === 'number') {
        request.input(key, sql.Decimal(10,2), inputs[key]);
      } else {
        request.input(key, sql.NVarChar(sql.MAX), inputs[key]);
      }
    });

    const result = await request.query(`
      UPDATE dbo.IDTCaseManager 
      SET ${updateFields.join(', ')}
      OUTPUT inserted.*
      WHERE idtCMID = @idtCMID
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found' });
    }

    const updatedRecord = result.recordset[0];
    
    // Parse JSON fields
    if (updatedRecord.clientGovIssued) {
      updatedRecord.clientGovIssued = JSON.parse(updatedRecord.clientGovIssued);
    }

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating IDT Case Manager record:', error);
    res.status(500).json({ 
      message: 'Error updating IDT Case Manager record', 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/idt-case-manager/:idtCMID
 * Delete IDT Case Manager record
 */
router.delete('/:idtCMID', async (req, res) => {
  try {
    const { idtCMID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('idtCMID', sql.Int, idtCMID)
      .query(`
        DELETE FROM dbo.IDTCaseManager 
        WHERE idtCMID = @idtCMID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found' });
    }

    res.json({ message: 'IDT Case Manager record deleted successfully' });
  } catch (error) {
    console.error('Error deleting IDT Case Manager record:', error);
    res.status(500).json({ 
      message: 'Error deleting IDT Case Manager record', 
      error: error.message 
    });
  }
});

/**
 * GET /api/idt-case-manager/:clientID/summary
 * Get IDT assessment summary for client
 */
router.get('/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          assessmentScore,
          riskLevel,
          readinessLevel,
          supportStrength,
          goalsCompleted,
          goalsInProgress,
          goalsPending,
          lastAssessmentDate,
          nextFollowUpDate,
          documentationComplete,
          CASE 
            WHEN idtMemberSituation IS NOT NULL AND idtMemberSituation != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN idtMemberSupport IS NOT NULL AND idtMemberSupport != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN idtIncomeSource IS NOT NULL AND idtIncomeSource != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN clientGovIssued IS NOT NULL AND clientGovIssued != '[]' THEN 1 ELSE 0 END +
            CASE 
            WHEN idtResources IS NOT NULL AND idtResources != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN idtHfhCM IS NOT NULL AND idtHfhCM != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN idtRecommend IS NOT NULL AND idtRecommend != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN clientHighEnd IS NOT NULL AND clientHighEnd != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN idtGoals IS NOT NULL AND idtGoals != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN clientPayeeBarriers IS NOT NULL AND clientPayeeBarriers != '' THEN 1 ELSE 0 END +
            CASE 
            WHEN clientPayeeAssistance IS NOT NULL AND clientPayeeAssistance != '' THEN 1 ELSE 0 END
          ) * 100.0 / 11 AS completionPercentage
        FROM dbo.IDTCaseManager 
        WHERE clientID = @clientID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found' });
    }

    const summary = result.recordset[0];
    summary.lastUpdated = new Date().toISOString().split('T')[0];

    res.json(summary);
  } catch (error) {
    console.error('Error fetching IDT summary:', error);
    res.status(500).json({ 
      message: 'Error fetching IDT summary', 
      error: error.message 
    });
  }
});

/**
 * GET /api/idt-case-manager/:clientID/goals
 * Get client goals tracking
 */
router.get('/:clientID/goals', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          idtGoals,
          goalsCompleted,
          goalsInProgress,
          goalsPending,
          lastAssessmentDate,
          nextFollowUpDate
        FROM dbo.IDTCaseManager 
        WHERE clientID = @clientID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found' });
    }

    // Parse goals text into structured data (this could be enhanced with a separate goals table)
    const record = result.recordset[0];
    const goals = parseGoalsFromText(record.idtGoals);

    res.json({
      goals,
      goalsCompleted: record.goalsCompleted || 0,
      goalsInProgress: record.goalsInProgress || 0,
      goalsPending: record.goalsPending || 0,
      lastAssessmentDate: record.lastAssessmentDate,
      nextFollowUpDate: record.nextFollowUpDate
    });
  } catch (error) {
    console.error('Error fetching IDT goals:', error);
    res.status(500).json({ 
      message: 'Error fetching IDT goals', 
      error: error.message 
    });
  }
});

/**
 * GET /api/idt-case-manager/:clientID/barriers
 * Get barrier assessment for client
 */
router.get('/:clientID/barriers', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          clientPayeeBarriers,
          riskLevel,
          idtMemberSituation,
          clientHighEnd
        FROM dbo.IDTCaseManager 
        WHERE clientID = @clientID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found' });
    }

    const record = result.recordset[0];
    const barriers = parseBarriersFromText(record.clientPayeeBarriers, record.idtMemberSituation);

    res.json({
      barriers,
      overallRisk: record.riskLevel || 'Unknown'
    });
  } catch (error) {
    console.error('Error fetching IDT barriers:', error);
    res.status(500).json({ 
      message: 'Error fetching IDT barriers', 
      error: error.message 
    });
  }
});

// Helper functions for calculations

function calculateAssessmentScore(data) {
  const fields = [
    'idtMemberSituation', 'idtMemberSupport', 'idtIncomeSource',
    'idtResources', 'idtHfhCM', 'idtRecommend', 'clientHighEnd',
    'idtGoals', 'clientPayeeBarriers', 'clientPayeeAssistance'
  ];
  
  let completed = 0;
  fields.forEach(field => {
    if (data[field] && data[field].trim() !== '') {
      completed++;
    }
  });
  
  // Add government ID completion
  if (data.clientGovIssued && data.clientGovIssued.length > 0) {
    completed++;
  }
  
  return Math.round((completed / (fields.length + 1)) * 100);
}

function calculateRiskLevel(data) {
  let riskScore = 0;
  
  // Check for mental health concerns
  if (data.clientPayeeBarriers && data.clientPayeeBarriers.toLowerCase().includes('mental')) {
    riskScore += 2;
  }
  
  // Check for limited support
  if (!data.idtMemberSupport || data.idtMemberSupport.length < 50) {
    riskScore += 1;
  }
  
  // Check for transportation/housing issues
  if (data.idtMemberSituation && data.idtMemberSituation.toLowerCase().includes('transportation')) {
    riskScore += 1;
  }
  
  // Check for income instability
  if (!data.idtIncomeSource || data.idtIncomeSource.toLowerCase().includes('none')) {
    riskScore += 2;
  }
  
  if (riskScore >= 4) return 'High';
  if (riskScore >= 2) return 'Medium';
  return 'Low';
}

function calculateReadinessLevel(data) {
  let readinessScore = 0;
  
  // Education level
  if (data.clientHighEnd) {
    if (data.clientHighEnd.includes('College') || data.clientHighEnd.includes('University')) {
      readinessScore += 3;
    } else if (data.clientHighEnd.includes('High School')) {
      readinessScore += 2;
    } else {
      readinessScore += 1;
    }
  }
  
  // Goals clarity
  if (data.idtGoals && data.idtGoals.length > 50) {
    readinessScore += 2;
  }
  
  // Support system
  if (data.idtMemberSupport && data.idtMemberSupport.length > 50) {
    readinessScore += 2;
  }
  
  // Barriers
  if (!data.clientPayeeBarriers || data.clientPayeeBarriers.length < 20) {
    readinessScore += 1;
  }
  
  if (readinessScore >= 6) return 'High';
  if (readinessScore >= 4) return 'Moderate';
  return 'Low';
}

function calculateSupportStrength(data) {
  if (!data.idtMemberSupport) return 'Unknown';
  
  const supportText = data.idtMemberSupport.toLowerCase();
  
  if (supportText.includes('strong') || supportText.includes('supportive family')) {
    return 'Strong';
  } else if (supportText.includes('some') || supportText.includes('limited')) {
    return 'Moderate';
  } else if (supportText.includes('no') || supportText.includes('none')) {
    return 'Weak';
  }
  
  return 'Moderate';
}

function parseGoalsFromText(goalsText) {
  if (!goalsText) return [];
  
  // Simple parsing - could be enhanced with AI or more sophisticated parsing
  const goals = [];
  const sentences = goalsText.split(/[.!?]+/);
  
  sentences.forEach((sentence, index) => {
    if (sentence.trim().length > 10) {
      goals.push({
        id: index + 1,
        goal: sentence.trim(),
        status: index < 2 ? 'Completed' : index < 4 ? 'In Progress' : 'Pending',
        targetDate: new Date(Date.now() + (index * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      });
    }
  });
  
  return goals;
}

function parseBarriersFromText(barriersText, situationText) {
  const barriers = [];
  
  if (barriersText) {
    if (barriersText.toLowerCase().includes('mental')) {
      barriers.push({
        category: 'Mental Health',
        severity: 'Moderate',
        description: 'Mental health challenges identified'
      });
    }
    
    if (barriersText.toLowerCase().includes('physical')) {
      barriers.push({
        category: 'Physical',
        severity: 'Low',
        description: 'Physical limitations noted'
      });
    }
  }
  
  if (situationText) {
    if (situationText.toLowerCase().includes('transportation')) {
      barriers.push({
        category: 'Transportation',
        severity: 'Low',
        description: 'Transportation challenges'
      });
    }
    
    if (situationText.toLowerCase().includes('financial')) {
      barriers.push({
        category: 'Financial',
        severity: 'High',
        description: 'Financial constraints'
      });
    }
  }
  
  return barriers;
}

module.exports = router;