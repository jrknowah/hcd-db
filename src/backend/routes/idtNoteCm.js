const express = require('express');
const sql = require('mssql');
const router = express.Router();
const { connectToAzureSQL } = require('../store/azureSql');

/**
 * GET /api/idt-case-manager/:clientID
 * Get ALL IDT Case Manager notes for a specific client
 */
router.get('/idt-case-manager/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    console.log(`📡 Fetching IDT Case Manager notes for client: ${clientID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset))
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
        ORDER BY createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    // Parse JSON fields for each record
    result.recordset.forEach(record => {
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
    });

    console.log(`✅ Found ${result.recordset.length} IDT Case Manager notes`);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching IDT Case Manager notes:', error);
    res.status(500).json({ 
      message: 'Error fetching IDT Case Manager notes', 
      error: error.message 
    });
  }
});

/**
 * GET /api/idt-case-manager/note/:idtCMID
 * Get specific IDT Case Manager note by ID
 */
router.get('/idt-case-manager/note/:idtCMID', async (req, res) => {
  try {
    const { idtCMID } = req.params;
    
    console.log(`📡 Fetching IDT Case Manager note: ${idtCMID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('idtCMID', sql.Int, idtCMID)
      .query(`
        SELECT *
        FROM dbo.IDTCaseManager 
        WHERE idtCMID = @idtCMID
      `);
    
    if (result.recordset.length === 0) {
      console.log(`⚠️ IDT Case Manager note not found: ${idtCMID}`);
      return res.status(404).json({ 
        message: 'IDT Case Manager note not found'
      });
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
    
    console.log(`✅ IDT Case Manager note found: ${idtCMID}`);
    res.json(record);
    
  } catch (error) {
    console.error('❌ Error fetching IDT Case Manager note:', error);
    res.status(500).json({ 
      message: 'Failed to fetch IDT Case Manager note', 
      error: error.message 
    });
  }
});

/**
 * POST /api/idt-case-manager/:clientID
 * Create new IDT Case Manager note (always INSERT)
 */
router.post('/idt-case-manager/:clientID', async (req, res) => {
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

    console.log('📡 Creating new IDT Case Manager note for client:', clientID);
    
    const pool = await connectToAzureSQL();
    
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
        INSERT INTO dbo.IDTCaseManager (
          clientID, idtMemberSituation, idtMemberSupport, idtIncomeSource,
          clientGovIssued, idtResources, idtHfhCM, idtRecommend,
          clientHighEnd, idtGoals, clientPayeeBarriers, clientPayeeAssistance,
          assessmentScore, riskLevel, readinessLevel, supportStrength,
          lastAssessmentDate, nextFollowUpDate, documentationComplete,
          createdBy, createdAt, updatedBy, updatedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @idtMemberSituation, @idtMemberSupport, @idtIncomeSource,
          @clientGovIssued, @idtResources, @idtHfhCM, @idtRecommend,
          @clientHighEnd, @idtGoals, @clientPayeeBarriers, @clientPayeeAssistance,
          @assessmentScore, @riskLevel, @readinessLevel, @supportStrength,
          GETDATE(), DATEADD(month, 1, GETDATE()), 0,
          @updatedBy, GETDATE(), @updatedBy, GETDATE()
        )
      `);

    const savedRecord = result.recordset[0];
    
    // Parse JSON fields for response
    if (savedRecord.clientGovIssued) {
      savedRecord.clientGovIssued = JSON.parse(savedRecord.clientGovIssued);
    }

    console.log('✅ IDT Case Manager note created successfully');
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('❌ Error creating IDT Case Manager note:', error);
    res.status(500).json({ 
      message: 'Error saving IDT Case Manager note', 
      error: error.message 
    });
  }
});

/**
 * PUT /api/idt-case-manager/:idtCMID
 * Update specific IDT Case Manager note
 */
router.put('/idt-case-manager/:idtCMID', async (req, res) => {
  try {
    const { idtCMID } = req.params;
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

    console.log(`📡 Updating IDT Case Manager note: ${idtCMID}`);

    const pool = await connectToAzureSQL();
    
    // Calculate assessment score based on completeness
    const assessmentScore = calculateAssessmentScore(req.body);
    const riskLevel = calculateRiskLevel(req.body);
    const readinessLevel = calculateReadinessLevel(req.body);
    const supportStrength = calculateSupportStrength(req.body);

    const result = await pool.request()
      .input('idtCMID', sql.Int, idtCMID)
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
        UPDATE dbo.IDTCaseManager 
        SET 
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
        OUTPUT INSERTED.*
        WHERE idtCMID = @idtCMID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager note not found' });
    }

    const updatedRecord = result.recordset[0];
    
    // Parse JSON fields
    if (updatedRecord.clientGovIssued) {
      updatedRecord.clientGovIssued = JSON.parse(updatedRecord.clientGovIssued);
    }

    console.log('✅ IDT Case Manager note updated successfully');
    res.json(updatedRecord);
  } catch (error) {
    console.error('❌ Error updating IDT Case Manager note:', error);
    res.status(500).json({ 
      message: 'Error updating IDT Case Manager note', 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/idt-case-manager/:idtCMID
 * Delete IDT Case Manager note
 */
router.delete('/idt-case-manager/:idtCMID', async (req, res) => {
  try {
    const { idtCMID } = req.params;

    console.log(`📡 Deleting IDT Case Manager note: ${idtCMID}`);

    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('idtCMID', sql.Int, idtCMID)
      .query(`
        DELETE FROM dbo.IDTCaseManager 
        WHERE idtCMID = @idtCMID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'IDT Case Manager note not found' });
    }

    console.log('✅ IDT Case Manager note deleted successfully');
    res.json({ message: 'IDT Case Manager note deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting IDT Case Manager note:', error);
    res.status(500).json({ 
      message: 'Error deleting IDT Case Manager note', 
      error: error.message 
    });
  }
});

/**
 * GET /api/idt-case-manager/:clientID/summary
 * Get IDT assessment summary for client (using latest note)
 */
router.get('/idt-case-manager/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT TOP 1
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
        ORDER BY createdAt DESC
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'IDT Case Manager record not found' });
    }

    const summary = result.recordset[0];
    summary.lastUpdated = new Date().toISOString().split('T')[0];

    res.json(summary);
  } catch (error) {
    console.error('❌ Error fetching IDT summary:', error);
    res.status(500).json({ 
      message: 'Error fetching IDT summary', 
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

module.exports = router;