const express = require('express');
const router = express.Router();
const { getPool } = require('../store/azureSql');
const sql = require('mssql');

// ✅ VALIDATION HELPERS
const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') return true;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10;
};

const validateEmail = (email) => {
  if (!email || email.trim() === '') return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Get client face data
router.get('/getClientFace/:clientID', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - GET /api/getClientFace/${req.params.clientID}`);
  
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
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - POST /api/saveClientFace`);
  console.log('📤 Request body:', req.body);

  const { clientID } = req.body;

  // ✅ VALIDATION: Require clientID
  if (!clientID || clientID.trim() === '') {
    console.error('❌ ClientID is required');
    return res.status(400).json({ 
      error: 'ClientID is required',
      field: 'clientID'
    });
  }

  // ✅ VALIDATION: Phone numbers
  const phoneFields = [
    { field: 'clientContactNum', value: req.body.clientContactNum },
    { field: 'clientContactAltNum', value: req.body.clientContactAltNum },
    { field: 'clientEmgContactNum', value: req.body.clientEmgContactNum },
    { field: 'clientMedPrimaryPhyPhone', value: req.body.clientMedPrimaryPhyPhone }
  ];

  for (const { field, value } of phoneFields) {
    if (value && !validatePhone(value)) {
      console.error(`❌ Invalid phone format: ${field} = ${value}`);
      return res.status(400).json({ 
        error: 'Invalid phone number format. Must be 10 digits.',
        field: field,
        value: value
      });
    }
  }

  // ✅ VALIDATION: Email
  if (req.body.clientEmail && !validateEmail(req.body.clientEmail)) {
    console.error(`❌ Invalid email format: ${req.body.clientEmail}`);
    return res.status(400).json({ 
      error: 'Invalid email format',
      field: 'clientEmail',
      value: req.body.clientEmail
    });
  }

  try {
    const pool = await getPool();
    
    // ✅ Extract fields (NOTE: clientAllergies REMOVED - now in medical_face_sheet)
    const {
      clientContactNum, clientEmail, clientMedInsType, clientAllergyComments,
      clientContactAltNum, clientEmgContactName, clientEmgContactNum, clientEmgContactRel, 
      clientEmgContactAddress, clientMedCarrier, clientMedInsNum, clientMedPrimaryPhy,
      clientMedPrimaryPhyFacility, clientMedPrimaryPhyPhone
    } = req.body;

    // ✅ Build MERGE query WITHOUT clientAllergies
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
          clientContactNum = COALESCE(@clientContactNum, target.clientContactNum),
          clientContactAltNum = COALESCE(@clientContactAltNum, target.clientContactAltNum),
          clientEmail = COALESCE(@clientEmail, target.clientEmail),
          clientEmgContactName = COALESCE(@clientEmgContactName, target.clientEmgContactName),
          clientEmgContactNum = COALESCE(@clientEmgContactNum, target.clientEmgContactNum),
          clientEmgContactRel = COALESCE(@clientEmgContactRel, target.clientEmgContactRel),
          clientEmgContactAddress = COALESCE(@clientEmgContactAddress, target.clientEmgContactAddress),
          clientMedInsType = COALESCE(@clientMedInsType, target.clientMedInsType),
          clientMedCarrier = COALESCE(@clientMedCarrier, target.clientMedCarrier),
          clientMedInsNum = COALESCE(@clientMedInsNum, target.clientMedInsNum),
          clientMedPrimaryPhy = COALESCE(@clientMedPrimaryPhy, target.clientMedPrimaryPhy),
          clientMedPrimaryPhyFacility = COALESCE(@clientMedPrimaryPhyFacility, target.clientMedPrimaryPhyFacility),
          clientMedPrimaryPhyPhone = COALESCE(@clientMedPrimaryPhyPhone, target.clientMedPrimaryPhyPhone),
          clientAllergyComments = COALESCE(@clientAllergyComments, target.clientAllergyComments),
          updatedAt = GETDATE()
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

// ❌ REMOVED: getClientAllergies endpoint - now use /api/medical/info/:clientID
// ❌ REMOVED: saveClientAllergies endpoint - now use /api/medical/info/:clientID

module.exports = router;