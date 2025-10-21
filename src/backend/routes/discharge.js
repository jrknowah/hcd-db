// File: src/backend/routes/discharge.js
// Complete working discharge route with validation

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const azureConfig = require('../store/azureSql');

// POST: Save client discharge summary
router.post('/saveClientDischarge', async (req, res) => {
  const {
    clientID,
    clientDischargeDate,
    clientDischargeDiag,
    clientDischargI,
    clientDischargII,
    clientDischargIII,
    clientDischargIV,
    clientDischargV,
    clientDischargVI,
    clientDischargVII
  } = req.body;

  console.log(`${new Date().toISOString()} - POST /saveClientDischarge`);
  console.log('📤 Request body:', req.body);

  // ✅ Validate required fields BEFORE database operation
  if (!clientID) {
    return res.status(400).json({ 
      error: 'clientID is required',
      message: 'Cannot save discharge data without a valid clientID'
    });
  }

  try {
    const pool = await sql.connect(azureConfig);

    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('clientDischargeDate', sql.Date, clientDischargeDate || null)
      .input('clientDischargeDiag', sql.NVarChar(sql.MAX), clientDischargeDiag || null)
      .input('clientDischargI', sql.NVarChar(sql.MAX), clientDischargI || null)
      .input('clientDischargII', sql.NVarChar(sql.MAX), clientDischargII || null)
      .input('clientDischargIII', sql.NVarChar(sql.MAX), clientDischargIII || null)
      .input('clientDischargIV', sql.NVarChar(sql.MAX), clientDischargIV || null)
      .input('clientDischargV', sql.NVarChar(sql.MAX), clientDischargV || null)
      .input('clientDischargVI', sql.NVarChar(sql.MAX), clientDischargVI || null)
      .input('clientDischargVII', sql.NVarChar(sql.MAX), clientDischargVII || null)
      .query(`
        MERGE ClientDischarge AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET
            clientDischargeDate = @clientDischargeDate,
            clientDischargeDiag = @clientDischargeDiag,
            clientDischargI = @clientDischargI,
            clientDischargII = @clientDischargII,
            clientDischargIII = @clientDischargIII,
            clientDischargIV = @clientDischargIV,
            clientDischargV = @clientDischargV,
            clientDischargVI = @clientDischargVI,
            clientDischargVII = @clientDischargVII
        WHEN NOT MATCHED THEN
          INSERT (
            clientID, 
            clientDischargeDate, 
            clientDischargeDiag,
            clientDischargI,
            clientDischargII,
            clientDischargIII,
            clientDischargIV,
            clientDischargV,
            clientDischargVI,
            clientDischargVII
          )
          VALUES (
            @clientID, 
            @clientDischargeDate, 
            @clientDischargeDiag,
            @clientDischargI,
            @clientDischargII,
            @clientDischargIII,
            @clientDischargIV,
            @clientDischargV,
            @clientDischargVI,
            @clientDischargVII
          );
      `);

    res.status(200).send('Client discharge saved.');
    
  } catch (error) {
    console.error('Error saving discharge data:', error);
    
    // Better error handling
    if (error.number === 515) { // NULL constraint violation
      return res.status(400).json({ 
        error: 'Invalid discharge data',
        message: 'Required fields are missing or invalid'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to save discharge data',
      message: error.message 
    });
  }
});

// GET: Retrieve client discharge summary
router.get('/getClientDischarge/:clientID', async (req, res) => {
  const { clientID } = req.params;
  
  console.log(`${new Date().toISOString()} - GET /getClientDischarge/${clientID}`);

  try {
    const pool = await sql.connect(azureConfig);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT 
          clientDischargeDate,
          clientDischargeDiag,
          clientDischargI,
          clientDischargII,
          clientDischargIII,
          clientDischargIV,
          clientDischargV,
          clientDischargVI,
          clientDischargVII
        FROM ClientDischarge
        WHERE clientID = @clientID
      `);

    if (result.recordset.length === 0) {
      return res.status(200).json({});
    }

    res.status(200).json(result.recordset[0]);

  } catch (error) {
    console.error('Error retrieving discharge data:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve discharge data',
      message: error.message 
    });
  }
});

// ✅ CRITICAL: Export the router
module.exports = router;