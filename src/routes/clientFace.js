const express = require('express');
const router = express.Router();
const { getPool } = require('../store/azureSql'); // Adjust path as needed
const sql = require('mssql');

// Get client face data
router.get('/getClientFace/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar, req.params.clientID)
      .query('SELECT * FROM ClientFace WHERE clientID = @clientID');
    
    console.log(`📄 Fetched ClientFace for: ${req.params.clientID}`);
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error('❌ Error fetching ClientFace:', err);
    res.status(500).json({ 
      error: 'Failed to fetch ClientFace',
      message: err.message 
    });
  }
});

// Save or update client face data
router.post('/saveClientFace', async (req, res) => {
  try {
    const pool = await getPool();
    const data = req.body;
    const {
      clientID, clientContactNum, clientEmail, clientMedInsType, clientAllergyComments,
      clientContactAltNum, clientEmgContactName, clientEmgContactNum, clientEmgContactRel, 
      clientEmgContactAddress, clientMedCarrier, clientMedInsNum, clientMedPrimaryPhy,
      clientMedPrimaryPhyFacility, clientMedPrimaryPhyPhone
    } = data;

    await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('clientContactNum', sql.NVarChar, clientContactNum || null)
      .input('clientContactAltNum', sql.NVarChar, clientContactAltNum || null)
      .input('clientEmail', sql.NVarChar, clientEmail || null)
      .input('clientEmgContactName', sql.NVarChar, clientEmgContactName || null)
      .input('clientEmgContactNum', sql.NVarChar, clientEmgContactNum || null)
      .input('clientEmgContactRel', sql.NVarChar, clientEmgContactRel || null)
      .input('clientEmgContactAddress', sql.NVarChar, clientEmgContactAddress || null)
      .input('clientMedInsType', sql.NVarChar, clientMedInsType || null)
      .input('clientMedCarrier', sql.NVarChar, clientMedCarrier || null)
      .input('clientMedInsNum', sql.NVarChar, clientMedInsNum || null)
      .input('clientMedPrimaryPhy', sql.NVarChar, clientMedPrimaryPhy || null)
      .input('clientMedPrimaryPhyFacility', sql.NVarChar, clientMedPrimaryPhyFacility || null)
      .input('clientMedPrimaryPhyPhone', sql.NVarChar, clientMedPrimaryPhyPhone || null)
      .input('clientAllergyComments', sql.NVarChar, clientAllergyComments || null)
      .query(`
        MERGE ClientFace AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN UPDATE SET
          clientContactNum=@clientContactNum,
          clientContactAltNum=@clientContactAltNum,
          clientEmail=@clientEmail,
          clientEmgContactName=@clientEmgContactName,
          clientEmgContactNum=@clientEmgContactNum,
          clientEmgContactRel=@clientEmgContactRel,
          clientEmgContactAddress=@clientEmgContactAddress,
          clientMedInsType=@clientMedInsType,
          clientMedCarrier=@clientMedCarrier,
          clientMedInsNum=@clientMedInsNum,
          clientMedPrimaryPhy=@clientMedPrimaryPhy,
          clientMedPrimaryPhyFacility=@clientMedPrimaryPhyFacility,
          clientMedPrimaryPhyPhone=@clientMedPrimaryPhyPhone,
          clientAllergyComments=@clientAllergyComments,
          updatedAt=GETDATE()
        WHEN NOT MATCHED THEN INSERT (
          clientID, clientContactNum, clientContactAltNum, clientEmail,
          clientEmgContactName, clientEmgContactNum, clientEmgContactRel,
          clientEmgContactAddress, clientMedInsType, clientMedCarrier, clientMedInsNum,
          clientMedPrimaryPhy, clientMedPrimaryPhyFacility, clientMedPrimaryPhyPhone,
          clientAllergyComments, createdAt, updatedAt
        ) VALUES (
          @clientID, @clientContactNum, @clientContactAltNum, @clientEmail,
          @clientEmgContactName, @clientEmgContactNum, @clientEmgContactRel,
          @clientEmgContactAddress, @clientMedInsType, @clientMedCarrier, @clientMedInsNum,
          @clientMedPrimaryPhy, @clientMedPrimaryPhyFacility, @clientMedPrimaryPhyPhone,
          @clientAllergyComments, GETDATE(), GETDATE()
        );
      `);

    console.log(`✅ ClientFace saved for: ${clientID}`);
    res.json({ message: 'Client face data saved successfully' });
  } catch (err) {
    console.error('❌ Error saving ClientFace:', err);
    res.status(500).json({ 
      error: 'Failed to save ClientFace',
      message: err.message 
    });
  }
});

// Get client allergies
router.get('/getClientAllergies/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar, req.params.clientID)
      .query('SELECT allergyName FROM ClientAllergies WHERE clientID = @clientID');
    
    const allergies = result.recordset.map(row => row.allergyName);
    console.log(`🔍 Fetched ${allergies.length} allergies for: ${req.params.clientID}`);
    res.json(allergies);
  } catch (err) {
    console.error('❌ Error fetching allergies:', err);
    res.status(500).json({ 
      error: 'Failed to fetch allergies',
      message: err.message 
    });
  }
});

// Save client allergies
router.post('/saveClientAllergies', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID, allergies } = req.body;

    console.log(`💊 Saving ${allergies?.length || 0} allergies for client: ${clientID}`);

    // First, delete existing allergies
    await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('DELETE FROM ClientAllergies WHERE clientID = @clientID');

    // Then insert new allergies
    if (allergies && allergies.length > 0) {
      for (const allergy of allergies) {
        await pool.request()
          .input('clientID', sql.NVarChar, clientID)
          .input('allergyName', sql.NVarChar, allergy)
          .query(`
            INSERT INTO ClientAllergies (clientID, allergyName, createdAt)
            VALUES (@clientID, @allergyName, GETDATE())
          `);
      }
    }

    console.log(`✅ Allergies saved for client: ${clientID}`);
    res.json({ message: 'Allergies saved successfully' });
  } catch (err) {
    console.error('❌ Error saving allergies:', err);
    res.status(500).json({ 
      error: 'Failed to save allergies',
      message: err.message 
    });
  }
});

module.exports = router;