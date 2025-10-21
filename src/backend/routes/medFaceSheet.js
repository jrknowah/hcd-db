// routes/medFaceSheet.js - Medical Face Sheet Router for Section 5
const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Use the same Azure SQL connection pattern as clients.js
let getPool;
try {
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ medFaceSheet router: azureSql loaded');
} catch (err) {
  console.error('❌ medFaceSheet router: Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

// Validation helper
const validateMedicalData = (data) => {
  const errors = {};
  
  if (data.clientMedConditions && typeof data.clientMedConditions !== 'string') {
    try {
      JSON.stringify(data.clientMedConditions);
    } catch (e) {
      errors.clientMedConditions = 'Invalid medical conditions format';
    }
  }
  
  if (data.clientAllergies && typeof data.clientAllergies !== 'string') {
    try {
      JSON.stringify(data.clientAllergies);
    } catch (e) {
      errors.clientAllergies = 'Invalid allergies format';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// ============================================================================
// MEDICAL FACE SHEET ENDPOINTS - FIXED ROUTES (removed /medical prefix)
// ============================================================================

// 🔧 FIXED: GET /api/medical/info/:clientID
router.get('/info/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📄 Getting medical face sheet for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Get medical face sheet data
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT TOP 1 * FROM medical_face_sheet 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);
    
    if (result.recordset.length === 0) {
      res.json({
        clientID,
        clientMedConditions: [],
        clientAddMedHistory: '',
        clientMedPertinent: '',
        clientPreviousLab: '',
        clientAllergies: []
      });
    } else {
      const data = result.recordset[0];
      
      try {
        data.clientMedConditions = data.clientMedConditions ? JSON.parse(data.clientMedConditions) : [];
      } catch (e) {
        data.clientMedConditions = [];
      }
      
      try {
        data.clientAllergies = data.clientAllergies ? JSON.parse(data.clientAllergies) : [];
      } catch (e) {
        data.clientAllergies = [];
      }
      
      console.log(`✅ Medical face sheet retrieved for client: ${clientID}`);
      res.json(data);
    }
  } catch (err) {
    console.error('❌ Error fetching medical face sheet:', err);
    res.status(500).json({ 
      error: 'Failed to fetch medical face sheet',
      message: err.message 
    });
  }
});

// 🔧 FIXED: POST /api/medical/info/:clientID
router.post('/info/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const medicalData = req.body;
    
    console.log(`💾 Saving medical face sheet for client: ${clientID}`);
    
    const validationErrors = validateMedicalData(medicalData);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const existingRecord = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT id FROM medical_face_sheet WHERE clientID = @clientID');
    
    const request = pool.request();
    request.input('clientID', sql.NVarChar(50), clientID);
    request.input('clientMedConditions', sql.NVarChar(sql.MAX), JSON.stringify(medicalData.clientMedConditions || []));
    request.input('clientAddMedHistory', sql.NVarChar(sql.MAX), medicalData.clientAddMedHistory || '');
    request.input('clientMedPertinent', sql.NVarChar(sql.MAX), medicalData.clientMedPertinent || '');
    request.input('clientPreviousLab', sql.NVarChar(10), medicalData.clientPreviousLab || '');
    request.input('clientAllergies', sql.NVarChar(sql.MAX), JSON.stringify(medicalData.clientAllergies || []));
    request.input('createdBy', sql.NVarChar(255), medicalData.createdBy || 'system');
    
    let query;
    if (existingRecord.recordset.length > 0) {
      request.input('updatedBy', sql.NVarChar(255), medicalData.updatedBy || medicalData.createdBy || 'system');
      query = `
        UPDATE medical_face_sheet 
        SET 
          clientMedConditions = @clientMedConditions,
          clientAddMedHistory = @clientAddMedHistory,
          clientMedPertinent = @clientMedPertinent,
          clientPreviousLab = @clientPreviousLab,
          clientAllergies = @clientAllergies,
          updatedBy = @updatedBy,
          updatedAt = GETDATE()
        WHERE clientID = @clientID;
        
        SELECT TOP 1 * FROM medical_face_sheet WHERE clientID = @clientID ORDER BY updatedAt DESC;
      `;
    } else {
      query = `
        INSERT INTO medical_face_sheet (
          clientID, clientMedConditions, clientAddMedHistory, 
          clientMedPertinent, clientPreviousLab, clientAllergies,
          createdBy, createdAt, updatedAt
        )
        VALUES (
          @clientID, @clientMedConditions, @clientAddMedHistory,
          @clientMedPertinent, @clientPreviousLab, @clientAllergies,
          @createdBy, GETDATE(), GETDATE()
        );
        
        SELECT TOP 1 * FROM medical_face_sheet WHERE clientID = @clientID ORDER BY createdAt DESC;
      `;
    }
    
    const result = await request.query(query);
    const savedData = result.recordset[0];
    
    try {
      savedData.clientMedConditions = JSON.parse(savedData.clientMedConditions || '[]');
    } catch (e) {
      savedData.clientMedConditions = [];
    }
    
    try {
      savedData.clientAllergies = JSON.parse(savedData.clientAllergies || '[]');
    } catch (e) {
      savedData.clientAllergies = [];
    }
    
    console.log(`✅ Medical face sheet saved for client: ${clientID}`);
    res.json(savedData);
    
  } catch (err) {
    console.error('❌ Error saving medical face sheet:', err);
    res.status(500).json({ 
      error: 'Failed to save medical face sheet',
      message: err.message 
    });
  }
});

// ============================================================================
// MEDICAL APPOINTMENTS ENDPOINTS
// ============================================================================

// 🔧 FIXED: GET /api/medical/appointments/:clientID
router.get('/appointments/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📅 Getting medical appointments for client: ${clientID}`);
    
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT * FROM medical_appointments 
        WHERE clientID = @clientID 
        ORDER BY medApptDate DESC, createdAt DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} appointments for client: ${clientID}`);
    res.json(result.recordset);
    
  } catch (err) {
    console.error('❌ Error fetching medical appointments:', err);
    res.status(500).json({ 
      error: 'Failed to fetch medical appointments',
      message: err.message 
    });
  }
});

// 🔧 FIXED: POST /api/medical/appointments/:clientID
router.post('/appointments/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const appointmentData = req.body;
    
    console.log(`📅 Creating medical appointment for client: ${clientID}`);
    
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    if (appointmentData.medApptDate) {
      const apptDate = new Date(appointmentData.medApptDate);
      if (isNaN(apptDate.getTime())) {
        return res.status(400).json({ error: 'Invalid appointment date format' });
      }
    }
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('medApptDate', sql.Date, appointmentData.medApptDate || null)
      .input('medApptLoc', sql.NVarChar(255), appointmentData.medApptLoc || '')
      .input('medApptType', sql.NVarChar(255), appointmentData.medApptType || '')
      .input('medApptProv', sql.NVarChar(255), appointmentData.medApptProv || '')
      .input('medApptTranport', sql.NVarChar(10), appointmentData.medApptTranport || '')
      .input('createdBy', sql.NVarChar(255), appointmentData.createdBy || 'system')
      .query(`
        INSERT INTO medical_appointments (
          clientID, medApptDate, medApptLoc, medApptType, 
          medApptProv, medApptTranport, createdBy, createdAt, updatedAt
        )
        VALUES (
          @clientID, @medApptDate, @medApptLoc, @medApptType,
          @medApptProv, @medApptTranport, @createdBy, GETDATE(), GETDATE()
        );
        
        SELECT TOP 1 * FROM medical_appointments 
        WHERE clientID = @clientID 
        ORDER BY appointmentID DESC;
      `);
    
    const newAppointment = result.recordset[0];
    
    console.log(`✅ Medical appointment created for client: ${clientID}, ID: ${newAppointment.appointmentID}`);
    res.status(201).json(newAppointment);
    
  } catch (err) {
    console.error('❌ Error creating medical appointment:', err);
    res.status(500).json({ 
      error: 'Failed to create medical appointment',
      message: err.message 
    });
  }
});

// 🔧 FIXED: PUT /api/medical/appointments/:appointmentID
router.put('/appointments/:appointmentID', async (req, res) => {
  try {
    const pool = await getPool();
    const { appointmentID } = req.params;
    const updates = req.body;
    
    console.log(`📄 Updating medical appointment: ${appointmentID}`);
    
    const checkResult = await pool.request()
      .input('appointmentID', sql.BigInt, appointmentID)
      .query('SELECT * FROM medical_appointments WHERE appointmentID = @appointmentID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const request = pool.request();
    request.input('appointmentID', sql.BigInt, appointmentID);
    
    let updateFields = [];
    if (updates.medApptDate !== undefined) {
      request.input('medApptDate', sql.Date, updates.medApptDate);
      updateFields.push('medApptDate = @medApptDate');
    }
    if (updates.medApptLoc !== undefined) {
      request.input('medApptLoc', sql.NVarChar(255), updates.medApptLoc);
      updateFields.push('medApptLoc = @medApptLoc');
    }
    if (updates.medApptType !== undefined) {
      request.input('medApptType', sql.NVarChar(255), updates.medApptType);
      updateFields.push('medApptType = @medApptType');
    }
    if (updates.medApptProv !== undefined) {
      request.input('medApptProv', sql.NVarChar(255), updates.medApptProv);
      updateFields.push('medApptProv = @medApptProv');
    }
    if (updates.medApptTranport !== undefined) {
      request.input('medApptTranport', sql.NVarChar(10), updates.medApptTranport);
      updateFields.push('medApptTranport = @medApptTranport');
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    request.input('updatedBy', sql.NVarChar(255), updates.updatedBy || 'system');
    
    const updateQuery = `
      UPDATE medical_appointments 
      SET ${updateFields.join(', ')}, updatedBy = @updatedBy, updatedAt = GETDATE()
      WHERE appointmentID = @appointmentID;
      
      SELECT * FROM medical_appointments WHERE appointmentID = @appointmentID;
    `;
    
    const result = await request.query(updateQuery);
    const updatedAppointment = result.recordset[0];
    
    console.log(`✅ Medical appointment updated: ${appointmentID}`);
    res.json(updatedAppointment);
    
  } catch (err) {
    console.error('❌ Error updating medical appointment:', err);
    res.status(500).json({ 
      error: 'Failed to update medical appointment',
      message: err.message 
    });
  }
});

// 🔧 FIXED: DELETE /api/medical/appointments/:appointmentID
router.delete('/appointments/:appointmentID', async (req, res) => {
  try {
    const pool = await getPool();
    const { appointmentID } = req.params;
    
    console.log(`🗑️ Deleting medical appointment: ${appointmentID}`);
    
    const checkResult = await pool.request()
      .input('appointmentID', sql.BigInt, appointmentID)
      .query('SELECT * FROM medical_appointments WHERE appointmentID = @appointmentID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    await pool.request()
      .input('appointmentID', sql.BigInt, appointmentID)
      .query('DELETE FROM medical_appointments WHERE appointmentID = @appointmentID');
    
    console.log(`✅ Medical appointment deleted: ${appointmentID}`);
    res.json({ message: 'Medical appointment deleted successfully' });
    
  } catch (err) {
    console.error('❌ Error deleting medical appointment:', err);
    res.status(500).json({ 
      error: 'Failed to delete medical appointment',
      message: err.message 
    });
  }
});

// ============================================================================
// MEDICAL ALLERGIES ENDPOINTS
// ============================================================================

// 🔧 FIXED: GET /api/medical/allergies/:clientID
router.get('/allergies/:clientID', async (req, res) => {
  try {
    const allergyOptions = [
      { value: 'penicillin', label: 'Penicillin' },
      { value: 'shellfish', label: 'Shellfish' },
      { value: 'nuts', label: 'Tree Nuts' },
      { value: 'peanuts', label: 'Peanuts' },
      { value: 'dairy', label: 'Dairy Products' },
      { value: 'eggs', label: 'Eggs' },
      { value: 'latex', label: 'Latex' },
      { value: 'sulfa', label: 'Sulfa Drugs' },
      { value: 'iodine', label: 'Iodine' },
      { value: 'aspirin', label: 'Aspirin' },
      { value: 'codeine', label: 'Codeine' },
      { value: 'morphine', label: 'Morphine' }
    ];
    
    console.log(`📋 Returning allergy options for client: ${req.params.clientID}`);
    res.json(allergyOptions);
    
  } catch (err) {
    console.error('❌ Error fetching allergy options:', err);
    res.status(500).json({ 
      error: 'Failed to fetch allergy options',
      message: err.message 
    });
  }
});

module.exports = router;