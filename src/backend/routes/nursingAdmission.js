const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Database connection - adjust config as needed
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
  },
};

// Utility function to handle database errors
const handleDatabaseError = (error, res, operation) => {
  console.error(`Database error during ${operation}:`, error);
  res.status(500).json({
    error: 'Database operation failed',
    message: error.message,
    operation: operation
  });
};

// Utility function to validate nursing admission data
const validateNursingAdmission = (admissionData) => {
  const required = ['loc', 'orientedToList'];
  const missing = required.filter(field => !admissionData[field] || admissionData[field].length === 0);
  
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  
  return { valid: true };
};

// Utility function to safely stringify JSON
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Error stringifying object:', error);
    return '[]';
  }
};

// Utility function to safely parse JSON
const safeParse = (str) => {
  try {
    return JSON.parse(str || '[]');
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
};

// GET /api/nursing-admission/:clientID - Fetch nursing admission data
router.get('/nursing-admission/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT * FROM nursing_admission 
      WHERE clientID = @clientID
      ORDER BY createdAt DESC
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(query);
    
    if (result.recordset.length > 0) {
      const admission = result.recordset[0];
      
      // Parse JSON fields
      const jsonFields = [
        'loc', 'orientedToList', 'orientedToRoomList',
        'tList', 'pList', 'rList', 'historyOf', 'edema',
        'clientPain', 'painHistory', 'lungSounds',
        'bowelBladder', 'elimMethUsed', 'abdomen',
        'physicalFuncStat', 'weightBearing', 'transfers', 
        'ambulation', 'mobDevices', 'nutrHyd', 'enteral', 
        'oral', 'hearing', 'vision', 'communication',
        'bathing', 'eating', 'toileting', 'bedMobility',
        'frontBodyInspection', 'rearBodyInspection'
      ];
      
      jsonFields.forEach(field => {
        if (admission[field]) {
          try {
            admission[field] = JSON.parse(admission[field]);
          } catch (e) {
            console.warn(`Failed to parse ${field}`);
            admission[field] = [];
          }
        } else {
          admission[field] = [];
        }
      });
      
      res.json([admission]); // Return as array
    } else {
      res.json([]); // Return empty array if no data
    }
    
  } catch (error) {
    console.error('Error fetching nursing admission:', error);
    res.status(500).json({ 
      error: 'Failed to fetch nursing admission',
      message: error.message 
    });
  }
});

// POST /api/nursing-admission/:clientID - Create/update nursing admission
router.post('/nursing-admission/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const admissionData = req.body;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    // Validate required fields
    const validation = validateNursingAdmission(admissionData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Check if admission already exists
    const checkQuery = `SELECT id FROM nursing_admission WHERE clientID = @clientID`;
    const checkResult = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(checkQuery);
    
    let query;
    const request = pool.request();
    
    if (checkResult.recordset.length > 0) {
      // Update existing admission
      query = `
        UPDATE nursing_admission 
        SET 
          -- Basic Assessment
          loc = @loc,
          orientedToList = @orientedToList,
          orientedToRoomList = @orientedToRoomList,
          
          -- Cardio-Pulmonary
          cpT = @cpT, cpP = @cpP, cpR = @cpR, cpBP = @cpBP,
          tList = @tList, pList = @pList, rList = @rList,
          historyOf = @historyOf, edema = @edema, edemaLocation = @edemaLocation,
          
          -- Pain Assessment
          clientPain = @clientPain, painHistory = @painHistory, lungSounds = @lungSounds,
          
          -- Bowel & Bladder
          bowelBladder = @bowelBladder, cathType = @cathType, cathSize = @cathSize, cathDiag = @cathDiag,
          elimMethUsed = @elimMethUsed, lastBowelDate = @lastBowelDate, lastVoidDate = @lastVoidDate, abdomen = @abdomen,
          
          -- Physical & Functional Status
          physicalFuncStat = @physicalFuncStat, clientPhysicalFuncNotes = @clientPhysicalFuncNotes,
          weightBearing = @weightBearing, transfers = @transfers, ambulation = @ambulation, mobDevices = @mobDevices,
          
          -- Nutrition & Communication
          nutrHyd = @nutrHyd, enteral = @enteral, oral = @oral, hearing = @hearing, vision = @vision, communication = @communication,
          
          -- ADL Levels
          bathing = @bathing, eating = @eating, toileting = @toileting, bedMobility = @bedMobility,
          
          -- Body Inspection
          frontBodyInspection = @frontBodyInspection,
          rearBodyInspection = @rearBodyInspection,
          
          -- Audit
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        OUTPUT INSERTED.*
        WHERE clientID = @clientID
      `;
      
      request.input('updatedBy', sql.NVarChar, admissionData.createdBy || admissionData.updatedBy);
      request.input('updatedAt', sql.DateTime2, new Date());
    } else {
      // Insert new admission
      query = `
        INSERT INTO nursing_admission (
          clientID,
          -- Basic Assessment
          loc, orientedToList, orientedToRoomList,
          -- Cardio-Pulmonary
          cpT, cpP, cpR, cpBP, tList, pList, rList, historyOf, edema, edemaLocation,
          -- Pain Assessment
          clientPain, painHistory, lungSounds,
          -- Bowel & Bladder
          bowelBladder, cathType, cathSize, cathDiag, elimMethUsed, lastBowelDate, lastVoidDate, abdomen,
          -- Physical & Functional Status
          physicalFuncStat, clientPhysicalFuncNotes, weightBearing, transfers, ambulation, mobDevices,
          -- Nutrition & Communication
          nutrHyd, enteral, oral, hearing, vision, communication,
          -- ADL Levels
          bathing, eating, toileting, bedMobility,
          -- Body Inspection
          frontBodyInspection, rearBodyInspection,
          -- Audit
          createdBy, createdAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @clientID,
          @loc, @orientedToList, @orientedToRoomList,
          @cpT, @cpP, @cpR, @cpBP, @tList, @pList, @rList, @historyOf, @edema, @edemaLocation,
          @clientPain, @painHistory, @lungSounds,
          @bowelBladder, @cathType, @cathSize, @cathDiag, @elimMethUsed, @lastBowelDate, @lastVoidDate, @abdomen,
          @physicalFuncStat, @clientPhysicalFuncNotes, @weightBearing, @transfers, @ambulation, @mobDevices,
          @nutrHyd, @enteral, @oral, @hearing, @vision, @communication,
          @bathing, @eating, @toileting, @bedMobility,
          @frontBodyInspection, @rearBodyInspection,
          @createdBy, @createdAt
        )
      `;
      
      request.input('createdBy', sql.NVarChar, admissionData.createdBy);
      request.input('createdAt', sql.DateTime2, new Date());
    }
    
    // Add all input parameters
    request.input('clientID', sql.NVarChar, clientID);
    
    // Basic Assessment
    request.input('loc', sql.NVarChar(sql.MAX), safeStringify(admissionData.loc || []));
    request.input('orientedToList', sql.NVarChar(sql.MAX), safeStringify(admissionData.orientedToList || []));
    request.input('orientedToRoomList', sql.NVarChar(sql.MAX), safeStringify(admissionData.orientedToRoomList || []));
    
    // Cardio-Pulmonary
    request.input('cpT', sql.NVarChar(50), admissionData.cpT || null);
    request.input('cpP', sql.NVarChar(50), admissionData.cpP || null);
    request.input('cpR', sql.NVarChar(50), admissionData.cpR || null);
    request.input('cpBP', sql.NVarChar(50), admissionData.cpBP || null);
    request.input('tList', sql.NVarChar(sql.MAX), safeStringify(admissionData.tList || []));
    request.input('pList', sql.NVarChar(sql.MAX), safeStringify(admissionData.pList || []));
    request.input('rList', sql.NVarChar(sql.MAX), safeStringify(admissionData.rList || []));
    request.input('historyOf', sql.NVarChar(sql.MAX), safeStringify(admissionData.historyOf || []));
    request.input('edema', sql.NVarChar(sql.MAX), safeStringify(admissionData.edema || []));
    request.input('edemaLocation', sql.NVarChar(500), admissionData.edemaLocation || null);
    
    // Pain Assessment
    request.input('clientPain', sql.NVarChar(sql.MAX), safeStringify(admissionData.clientPain || []));
    request.input('painHistory', sql.NVarChar(sql.MAX), safeStringify(admissionData.painHistory || []));
    request.input('lungSounds', sql.NVarChar(sql.MAX), safeStringify(admissionData.lungSounds || []));
    
    // Bowel & Bladder
    request.input('bowelBladder', sql.NVarChar(sql.MAX), safeStringify(admissionData.bowelBladder || []));
    request.input('cathType', sql.NVarChar(100), admissionData.cathType || null);
    request.input('cathSize', sql.NVarChar(100), admissionData.cathSize || null);
    request.input('cathDiag', sql.NVarChar(500), admissionData.cathDiag || null);
    request.input('elimMethUsed', sql.NVarChar(sql.MAX), safeStringify(admissionData.elimMethUsed || []));
    request.input('lastBowelDate', sql.Date, admissionData.lastBowelDate || null);
    request.input('lastVoidDate', sql.Date, admissionData.lastVoidDate || null);
    request.input('abdomen', sql.NVarChar(sql.MAX), safeStringify(admissionData.abdomen || []));
    
    // Physical & Functional Status
    request.input('physicalFuncStat', sql.NVarChar(sql.MAX), safeStringify(admissionData.physicalFuncStat || []));
    request.input('clientPhysicalFuncNotes', sql.NVarChar(sql.MAX), admissionData.clientPhysicalFuncNotes || null);
    request.input('weightBearing', sql.NVarChar(sql.MAX), safeStringify(admissionData.weightBearing || []));
    request.input('transfers', sql.NVarChar(sql.MAX), safeStringify(admissionData.transfers || []));
    request.input('ambulation', sql.NVarChar(sql.MAX), safeStringify(admissionData.ambulation || []));
    request.input('mobDevices', sql.NVarChar(sql.MAX), safeStringify(admissionData.mobDevices || []));
    
    // Nutrition & Communication
    request.input('nutrHyd', sql.NVarChar(sql.MAX), safeStringify(admissionData.nutrHyd || []));
    request.input('enteral', sql.NVarChar(sql.MAX), safeStringify(admissionData.enteral || []));
    request.input('oral', sql.NVarChar(sql.MAX), safeStringify(admissionData.oral || []));
    request.input('hearing', sql.NVarChar(sql.MAX), safeStringify(admissionData.hearing || []));
    request.input('vision', sql.NVarChar(sql.MAX), safeStringify(admissionData.vision || []));
    request.input('communication', sql.NVarChar(sql.MAX), safeStringify(admissionData.communication || []));
    
    // ADL Levels
    request.input('bathing', sql.NVarChar(sql.MAX), safeStringify(admissionData.bathing || []));
    request.input('eating', sql.NVarChar(sql.MAX), safeStringify(admissionData.eating || []));
    request.input('toileting', sql.NVarChar(sql.MAX), safeStringify(admissionData.toileting || []));
    request.input('bedMobility', sql.NVarChar(sql.MAX), safeStringify(admissionData.bedMobility || []));
    
    // Body Inspection
    request.input('frontBodyInspection', sql.NVarChar(sql.MAX), safeStringify(admissionData.frontBodyInspection || {}));
    request.input('rearBodyInspection', sql.NVarChar(sql.MAX), safeStringify(admissionData.rearBodyInspection || {}));
    
    const result = await request.query(query);
    
    if (result.recordset.length > 0) {
      res.status(201).json(result.recordset[0]);
    } else {
      res.status(500).json({ error: 'Failed to save nursing admission' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'saving nursing admission');
  }
});

// PUT /api/nursing-admission/:id - Update specific admission record
router.put('/nursing-admission/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Admission ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Check if admission exists
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id FROM nursing_admission WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Nursing admission not found' });
    }
    
    // Build dynamic update query (similar to POST but for specific fields)
    const updateFields = [];
    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('updatedBy', sql.NVarChar, updateData.updatedBy);
    request.input('updatedAt', sql.DateTime2, new Date());
    
    // Add fields that are being updated
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedBy' && key !== 'updatedAt' && key !== 'id') {
        updateFields.push(`${key} = @${key}`);
        
        // Handle different data types
        if (Array.isArray(updateData[key]) || typeof updateData[key] === 'object') {
          request.input(key, sql.NVarChar(sql.MAX), safeStringify(updateData[key]));
        } else if (key.includes('Date')) {
          request.input(key, sql.Date, updateData[key]);
        } else {
          request.input(key, sql.NVarChar(sql.MAX), updateData[key]);
        }
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    
    const updateQuery = `
      UPDATE nursing_admission 
      SET ${updateFields.join(', ')}, updatedBy = @updatedBy, updatedAt = @updatedAt
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await request.query(updateQuery);
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(500).json({ error: 'Failed to update nursing admission' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'updating nursing admission');
  }
});

// DELETE /api/nursing-admission/:id - Delete admission record
router.delete('/nursing-admission/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Admission ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Check if admission exists
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, clientID FROM nursing_admission WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Nursing admission not found' });
    }
    
    // Hard delete (you might want to implement soft delete instead)
    const deleteQuery = 'DELETE FROM nursing_admission WHERE id = @id';
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(deleteQuery);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ message: 'Nursing admission deleted successfully', id });
    } else {
      res.status(500).json({ error: 'Failed to delete nursing admission' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'deleting nursing admission');
  }
});

// GET /api/nursing-admission/:clientID/summary - Get admission summary and statistics
router.get('/nursing-admission/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalAssessments,
        MAX(createdAt) as lastAssessmentDate,
        -- Calculate ADL independence score
        CASE 
          WHEN COUNT(*) > 0 THEN 'Assessed'
          ELSE 'Not Assessed'
        END as overallStatus,
        
        -- Count risk factors from history
        (
          SELECT COUNT(*)
          FROM nursing_admission n
          WHERE n.clientID = @clientID 
            AND (
              JSON_VALUE(n.historyOf, '$[0]') IS NOT NULL OR
              JSON_VALUE(n.clientPain, '$[0]') LIKE '%Pain%' OR
              n.cpBP LIKE '%/%' AND (
                CAST(LEFT(n.cpBP, CHARINDEX('/', n.cpBP) - 1) AS INT) > 140 OR
                CAST(RIGHT(n.cpBP, LEN(n.cpBP) - CHARINDEX('/', n.cpBP)) AS INT) > 90
              )
            )
        ) as riskFactorCount,
        
        -- Check for follow-up requirements
        CASE 
          WHEN EXISTS(
            SELECT 1 FROM nursing_admission 
            WHERE clientID = @clientID 
              AND (
                JSON_VALUE(clientPain, '$[0]') LIKE '%High%' OR
                JSON_VALUE(clientPain, '$[0]') LIKE '%Severe%' OR
                cathType IS NOT NULL AND cathType != ''
              )
          ) THEN 1
          ELSE 0
        END as followUpRequired
        
      FROM nursing_admission 
      WHERE clientID = @clientID
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(summaryQuery);
    
    if (result.recordset.length > 0) {
      const summary = result.recordset[0];
      res.json({
        totalAssessments: summary.totalAssessments || 0,
        lastAssessmentDate: summary.lastAssessmentDate,
        overallStatus: summary.overallStatus,
        riskFactorCount: summary.riskFactorCount || 0,
        followUpRequired: summary.followUpRequired === 1,
        adlScore: 16 // Default full independence, calculate based on actual data
      });
    } else {
      res.json({
        totalAssessments: 0,
        lastAssessmentDate: null,
        overallStatus: 'Not Assessed',
        riskFactorCount: 0,
        followUpRequired: false,
        adlScore: 0
      });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching admission summary');
  }
});

// GET /api/nursing-admission/:clientID/body-inspection - Get body inspection data only
router.get('/nursing-admission/:clientID/body-inspection', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        frontBodyInspection,
        rearBodyInspection,
        updatedAt
      FROM nursing_admission 
      WHERE clientID = @clientID
      ORDER BY updatedAt DESC
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(query);
    
    if (result.recordset.length > 0) {
      const inspection = result.recordset[0];
      res.json({
        frontBodyInspection: safeParse(inspection.frontBodyInspection),
        rearBodyInspection: safeParse(inspection.rearBodyInspection),
        updatedAt: inspection.updatedAt
      });
    } else {
      res.status(404).json({ error: 'No body inspection data found' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching body inspection');
  }
});

// GET /api/nursing-admission/:clientID/vitals - Get vitals history
router.get('/nursing-admission/:clientID/vitals', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { limit = 10 } = req.query;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT TOP (@limit)
        CAST(createdAt AS DATE) as date,
        cpT as temperature,
        cpP as pulse,
        cpR as respiration,
        cpBP as bloodPressure,
        createdAt
      FROM nursing_admission 
      WHERE clientID = @clientID 
        AND (cpT IS NOT NULL OR cpP IS NOT NULL OR cpR IS NOT NULL OR cpBP IS NOT NULL)
      ORDER BY createdAt DESC
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('limit', sql.Int, parseInt(limit))
      .query(query);
    
    res.json(result.recordset);
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching vitals history');
  }
});

module.exports = router;