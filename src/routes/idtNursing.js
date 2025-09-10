
const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Database configuration (use your existing pattern)
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// GET /api/idt-nursing/:clientID - Get IDT nursing data
router.get('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT TOP 1 *
        FROM dbo.IDTNursing 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        message: 'No IDT nursing data found for this client',
        clientID: clientID 
      });
    }
    
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('Error fetching IDT nursing data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch IDT nursing data', 
      error: error.message 
    });
  }
});

// POST /api/idt-nursing/:clientID - Save IDT nursing data
router.post('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const data = req.body;
    
    const pool = await sql.connect(dbConfig);
    
    // Check if record exists
    const existingRecord = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query('SELECT idtNursingID FROM dbo.IDTNursing WHERE clientID = @clientID');
    
    let result;
    
    if (existingRecord.recordset.length > 0) {
      // Update existing record
      const idtNursingID = existingRecord.recordset[0].idtNursingID;
      
      result = await pool.request()
        .input('idtNursingID', sql.Int, idtNursingID)
        .input('idtNursingAppointYN', sql.NVarChar(sql.MAX), data.idtNursingAppointYN)
        .input('idtNursingAppoint', sql.NVarChar(sql.MAX), data.idtNursingAppoint)
        .input('idtNursingProb', sql.NVarChar(sql.MAX), data.idtNursingProb)
        .input('idtNursingGoal', sql.NVarChar(sql.MAX), data.idtNursingGoal)
        .input('idtNursingCompliant', sql.NVarChar(sql.MAX), data.idtNursingCompliant)
        .input('idtNursingInfo', sql.NVarChar(sql.MAX), data.idtNursingInfo)
        .input('goalStatus', sql.NVarChar(50), data.goalStatus)
        .input('goalPriority', sql.NVarChar(50), data.goalPriority)
        .input('goalTargetDate', sql.Date, data.goalTargetDate)
        .input('complianceScore', sql.Int, data.complianceScore)
        .input('updatedBy', sql.NVarChar(100), data.userName || 'System')
        .input('updatedAt', sql.DateTime2, new Date())
        .query(`
          UPDATE dbo.IDTNursing SET
            idtNursingAppointYN = @idtNursingAppointYN,
            idtNursingAppoint = @idtNursingAppoint,
            idtNursingProb = @idtNursingProb,
            idtNursingGoal = @idtNursingGoal,
            idtNursingCompliant = @idtNursingCompliant,
            idtNursingInfo = @idtNursingInfo,
            goalStatus = @goalStatus,
            goalPriority = @goalPriority,
            goalTargetDate = @goalTargetDate,
            complianceScore = @complianceScore,
            updatedBy = @updatedBy,
            updatedAt = @updatedAt
          WHERE idtNursingID = @idtNursingID;
          
          SELECT * FROM dbo.IDTNursing WHERE idtNursingID = @idtNursingID;
        `);
    } else {
      // Insert new record
      result = await pool.request()
        .input('clientID', sql.VarChar(50), clientID)
        .input('idtNursingAppointYN', sql.NVarChar(sql.MAX), data.idtNursingAppointYN)
        .input('idtNursingAppoint', sql.NVarChar(sql.MAX), data.idtNursingAppoint)
        .input('idtNursingProb', sql.NVarChar(sql.MAX), data.idtNursingProb)
        .input('idtNursingGoal', sql.NVarChar(sql.MAX), data.idtNursingGoal)
        .input('idtNursingCompliant', sql.NVarChar(sql.MAX), data.idtNursingCompliant)
        .input('idtNursingInfo', sql.NVarChar(sql.MAX), data.idtNursingInfo)
        .input('goalStatus', sql.NVarChar(50), data.goalStatus)
        .input('goalPriority', sql.NVarChar(50), data.goalPriority)
        .input('goalTargetDate', sql.Date, data.goalTargetDate)
        .input('complianceScore', sql.Int, data.complianceScore)
        .input('createdBy', sql.NVarChar(100), data.userName || 'System')
        .input('createdAt', sql.DateTime2, new Date())
        .query(`
          INSERT INTO dbo.IDTNursing (
            clientID, idtNursingAppointYN, idtNursingAppoint, idtNursingProb,
            idtNursingGoal, idtNursingCompliant, idtNursingInfo,
            goalStatus, goalPriority, goalTargetDate, complianceScore,
            createdBy, createdAt, updatedBy, updatedAt
          ) VALUES (
            @clientID, @idtNursingAppointYN, @idtNursingAppoint, @idtNursingProb,
            @idtNursingGoal, @idtNursingCompliant, @idtNursingInfo,
            @goalStatus, @goalPriority, @goalTargetDate, @complianceScore,
            @createdBy, @createdAt, @createdBy, @createdAt
          );
          
          SELECT * FROM dbo.IDTNursing WHERE idtNursingID = SCOPE_IDENTITY();
        `);
    }
    
    res.json({
      message: 'IDT Nursing data saved successfully',
      data: result.recordset[0]
    });
    
  } catch (error) {
    console.error('Error saving IDT nursing data:', error);
    res.status(500).json({ 
      message: 'Failed to save IDT nursing data', 
      error: error.message 
    });
  }
});

module.exports = router;