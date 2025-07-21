const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// Get client face data
router.get('/getClientFace/:clientID', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientID', sql.NVarChar, req.params.clientID)
      .query('SELECT * FROM ClientFace WHERE clientID = @clientID');
    res.json(result.recordset[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ClientFace' });
  }
});

// Save or update client face data
router.post('/saveClientFace', async (req, res) => {
  const data = { ...req.body };
  const {
    clientID, clientContactNum, clientEmail, clientMedInsType, clientAllergyComments,
    clientContactAltNum, clientEmgContactName, clientEmgContactNum, clientEmgContactRel, 
    clientEmgContactAddress, clientMedCarrier, clientMedInsNum, clientMedPrimaryPhy,
    clientMedPrimaryPhyFacility, clientMedPrimaryPhyPhone
  } = data;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('clientContactNum', sql.NVarChar, clientContactNum)
      .input('clientContactAltNum', sql.NVarChar, clientContactAltNum)
      .input('clientEmail', sql.NVarChar, clientEmail)
      .input('clientEmgContactName', sql.NVarChar, clientEmgContactName)
      .input('clientEmgContactNum', sql.NVarChar, clientEmgContactNum)
      .input('clientEmgContactRel', sql.NVarChar, clientEmgContactRel)
      .input('clientEmgContactAddress', sql.NVarChar, clientEmgContactAddress)
      .input('clientMedInsType', sql.NVarChar, clientMedInsType)
      .input('clientMedCarrier', sql.NVarChar, clientMedCarrier)
      .input('clientMedInsNum', sql.NVarChar, clientMedInsNum)
      .input('clientMedPrimaryPhy', sql.NVarChar, clientMedPrimaryPhy)
      .input('clientMedPrimaryPhyFacility', sql.NVarChar, clientMedPrimaryPhyFacility)
      .input('clientMedPrimaryPhyPhone', sql.NVarChar, clientMedPrimaryPhyPhone)
      .input('clientAllergyComments', sql.NVarChar, clientAllergyComments)
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
          clientAllergyComments=@clientAllergyComments
        WHEN NOT MATCHED THEN INSERT (
          clientID, clientContactNum, clientContactAltNum, clientEmail,
          clientEmgContactName, clientEmgContactNum, clientEmgContactRel,
          clientEmgContactAddress, clientMedInsType, clientMedCarrier, clientMedInsNum,
          clientMedPrimaryPhy, clientMedPrimaryPhyFacility, clientMedPrimaryPhyPhone,
          clientAllergyComments
        ) VALUES (
          @clientID, @clientContactNum, @clientContactAltNum, @clientEmail,
          @clientEmgContactName, @clientEmgContactNum, @clientEmgContactRel,
          @clientEmgContactAddress, @clientMedInsType, @clientMedCarrier, @clientMedInsNum,
          @clientMedPrimaryPhy, @clientMedPrimaryPhyFacility, @clientMedPrimaryPhyPhone,
          @clientAllergyComments
        );
      `);

    res.json({ message: 'Saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save ClientFace' });
  }
});
