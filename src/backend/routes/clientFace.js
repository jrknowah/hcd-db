const express = require('express');
const router = express.Router();
const { getPool } = require('../store/azureSql');
const sql = require('mssql');
const { programError } = require('../utils/clientStatus');

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

// Placeholder entries used when a client has no email on file
const NO_EMAIL_VALUES = ['n/a', 'na', 'none', 'no email', 'no', '-', 'unknown'];
const normalizeEmail = (email) => {
  if (typeof email !== 'string') return email;
  const trimmed = email.trim();
  return NO_EMAIL_VALUES.includes(trimmed.toLowerCase()) ? '' : trimmed;
};

// Get client face data
router.get('/getClientFace/:clientID', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - GET /api/getClientFace/${req.params.clientID}`);
  
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar, req.params.clientID)
      .query(`
        SELECT * FROM ClientFace WHERE clientID = @clientID;
        SELECT clientProgram FROM Clients WHERE clientID = @clientID;
      `);
    
    console.log(`📄 Fetched ClientFace for: ${req.params.clientID}`);
    // The program is kept on the client (dbo.Clients) but edited on the face sheet
    const [faceRows = [], clientRows = []] = result.recordsets || [];
    const face = faceRows[0] || {};
    const program = clientRows[0]?.clientProgram;
    res.json(program ? { ...face, clientProgram: program } : face);
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

  // ✅ VALIDATION: Program (saved to dbo.Clients)
  const { clientProgram } = req.body;
  const invalidProgram = programError(clientProgram);
  if (invalidProgram) {
    return res.status(400).json({
      error: invalidProgram,
      field: 'clientProgram',
      value: clientProgram
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

  // ✅ VALIDATION: Email (optional — clients without email may leave it blank)
  req.body.clientEmail = normalizeEmail(req.body.clientEmail);
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
      .input('updateProgram', sql.Bit, clientProgram !== undefined)
      .input('clientProgram', sql.NVarChar(50), clientProgram || null)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;

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

        IF @updateProgram = 1
          UPDATE Clients SET clientProgram = @clientProgram, updatedAt = GETDATE()
          WHERE clientID = @clientID;

        COMMIT TRANSACTION;
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