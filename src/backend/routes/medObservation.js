// routes/medObservation.js - Medical Observation Record (MAR) Routes
const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Use the same Azure SQL connection pattern
let getPool;
try {
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ medObservation router: azureSql loaded');
} catch (err) {
  console.error('❌ medObservation router: Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

// ✅ Helper function to format dates for database
const formatDateForDB = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === 'null' || dateValue === 'undefined') {
    return null;
  }
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (e) {
    console.warn('⚠️ Invalid date value:', dateValue);
    return null;
  }
};

// ✅ Helper function to format dates for frontend (YYYY-MM-DD)
const formatDateForFrontend = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.warn('⚠️ Error formatting date:', dateValue);
    return '';
  }
};

// ✅ Helper function to format time for frontend (HH:MM)
const formatTimeForFrontend = (timeValue) => {
  if (!timeValue) return '';
  
  try {
    // If it's a time string like "08:00:00", extract HH:MM
    if (typeof timeValue === 'string') {
      const parts = timeValue.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeValue;
  } catch (e) {
    console.warn('⚠️ Error formatting time:', timeValue);
    return '';
  }
};

// ============================================================================
// MEDICATION ADMINISTRATION RECORD (MAR) ENDPOINTS
// ============================================================================

// GET /api/medication-admin/:clientID - Get all medications for a client
router.get('/medication-admin/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`💊 Getting medication administration records for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    let query = `
      SELECT * FROM medication_administration_record 
      WHERE clientID = @clientID
    `;
    
    const request = pool.request().input('clientID', sql.NVarChar(50), clientID);
    
    if (startDate) {
      query += ' AND administeredDate >= @startDate';
      request.input('startDate', sql.Date, formatDateForDB(startDate));
    }
    
    if (endDate) {
      query += ' AND administeredDate <= @endDate';
      request.input('endDate', sql.Date, formatDateForDB(endDate));
    }
    
    query += ' ORDER BY administeredDate DESC, scheduledTime DESC';
    
    const result = await request.query(query);
    
    // Format dates and times for frontend
    const formattedRecords = result.recordset.map(record => ({
      ...record,
      administeredDate: formatDateForFrontend(record.administeredDate),
      scheduledTime: formatTimeForFrontend(record.scheduledTime),
      administeredTime: record.administeredTime ? new Date(record.administeredTime).toISOString() : null
    }));
    
    console.log(`✅ Retrieved ${formattedRecords.length} medication records`);
    res.json(formattedRecords);
    
  } catch (err) {
    console.error('❌ Error fetching medication records:', err);
    res.status(500).json({ 
      error: 'Failed to fetch medication records',
      message: err.message 
    });
  }
});

// GET /api/medication-admin/:clientID/active - Get active medications only
router.get('/medication-admin/:clientID/active', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`💊 Getting active medications for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT DISTINCT 
          medicationName,
          dosage,
          route,
          frequency,
          scheduledTime
        FROM medication_administration_record 
        WHERE clientID = @clientID 
          AND status != 'Discontinued'
        ORDER BY medicationName, scheduledTime
      `);
    
    const formattedMeds = result.recordset.map(med => ({
      ...med,
      scheduledTime: formatTimeForFrontend(med.scheduledTime)
    }));
    
    console.log(`✅ Retrieved ${formattedMeds.length} active medications`);
    res.json(formattedMeds);
    
  } catch (err) {
    console.error('❌ Error fetching active medications:', err);
    res.status(500).json({ 
      error: 'Failed to fetch active medications',
      message: err.message 
    });
  }
});

// POST /api/medication-admin/:clientID - Add medication administration record
router.post('/medication-admin/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const marData = req.body;
    
    console.log(`💾 Saving medication administration record for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const request = pool.request();
    request.input('clientID', sql.NVarChar(50), clientID);
    request.input('medicationName', sql.NVarChar(255), marData.medicationName || '');
    request.input('dosage', sql.NVarChar(100), marData.dosage || '');
    request.input('route', sql.NVarChar(50), marData.route || '');
    request.input('frequency', sql.NVarChar(100), marData.frequency || '');
    const scheduledTimePost = marData.scheduledTime && marData.scheduledTime.trim() !== '' ? marData.scheduledTime.trim() : null;
    request.input('scheduledTime', sql.VarChar(10), scheduledTimePost);
    request.input('administeredDate', sql.Date, formatDateForDB(marData.administeredDate));
    request.input('administeredTime', sql.DateTime, marData.administeredTime ? new Date(marData.administeredTime) : new Date());
    request.input('administeredBy', sql.NVarChar(255), marData.administeredBy || 'system');
    request.input('status', sql.NVarChar(50), marData.status || 'Given');
    request.input('holdReason', sql.NVarChar(500), marData.holdReason || '');
    request.input('notes', sql.NVarChar(sql.MAX), marData.notes || '');
    request.input('createdBy', sql.NVarChar(255), marData.createdBy || marData.administeredBy || 'system');
    
    const query = `
      INSERT INTO medication_administration_record (
        clientID, medicationName, dosage, route, frequency, scheduledTime,
        administeredDate, administeredTime, administeredBy, status, holdReason,
        notes, createdBy, createdAt, updatedAt
      )
      OUTPUT INSERTED.*
      VALUES (
        @clientID, @medicationName, @dosage, @route, @frequency, @scheduledTime,
        @administeredDate, @administeredTime, @administeredBy, @status, @holdReason,
        @notes, @createdBy, GETDATE(), GETDATE()
      )
    `;
    
    const result = await request.query(query);
    const savedRecord = result.recordset[0];
    
    // Format response
    const formattedRecord = {
      ...savedRecord,
      administeredDate: formatDateForFrontend(savedRecord.administeredDate),
      scheduledTime: formatTimeForFrontend(savedRecord.scheduledTime),
      administeredTime: savedRecord.administeredTime ? new Date(savedRecord.administeredTime).toISOString() : null
    };
    
    console.log(`✅ Medication record saved with ID: ${savedRecord.marID}`);
    res.status(201).json(formattedRecord);
    
  } catch (err) {
    console.error('❌ Error saving medication record:', err);
    res.status(500).json({ 
      error: 'Failed to save medication record',
      message: err.message 
    });
  }
});

// PUT /api/medication-admin/:marID - Update medication record
router.put('/medication-admin/:marID', async (req, res) => {
  try {
    const pool = await getPool();
    const { marID } = req.params;
    const marData = req.body;
    
    console.log(`🔄 Updating medication record: ${marID}`);
    
    const request = pool.request();
    request.input('marID', sql.BigInt, marID);
    request.input('medicationName', sql.NVarChar(255), marData.medicationName || '');
    request.input('dosage', sql.NVarChar(100), marData.dosage || '');
    request.input('route', sql.NVarChar(50), marData.route || '');
    request.input('frequency', sql.NVarChar(100), marData.frequency || '');
    const scheduledTimePut = marData.scheduledTime && marData.scheduledTime.trim() !== '' ? marData.scheduledTime.trim() : null;
    request.input('scheduledTime', sql.VarChar(10), scheduledTimePut);
    request.input('administeredDate', sql.Date, formatDateForDB(marData.administeredDate));
    request.input('administeredTime', sql.DateTime, marData.administeredTime ? new Date(marData.administeredTime) : null);
    request.input('administeredBy', sql.NVarChar(255), marData.administeredBy || 'system');
    request.input('status', sql.NVarChar(50), marData.status || 'Given');
    request.input('holdReason', sql.NVarChar(500), marData.holdReason || '');
    request.input('notes', sql.NVarChar(sql.MAX), marData.notes || '');
    request.input('updatedBy', sql.NVarChar(255), marData.updatedBy || marData.administeredBy || 'system');
    
    const query = `
      UPDATE medication_administration_record 
      SET 
        medicationName = @medicationName,
        dosage = @dosage,
        route = @route,
        frequency = @frequency,
        scheduledTime = @scheduledTime,
        administeredDate = @administeredDate,
        administeredTime = @administeredTime,
        administeredBy = @administeredBy,
        status = @status,
        holdReason = @holdReason,
        notes = @notes,
        updatedBy = @updatedBy,
        updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE marID = @marID
    `;
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Medication record not found' });
    }
    
    const updatedRecord = result.recordset[0];
    const formattedRecord = {
      ...updatedRecord,
      administeredDate: formatDateForFrontend(updatedRecord.administeredDate),
      scheduledTime: formatTimeForFrontend(updatedRecord.scheduledTime),
      administeredTime: updatedRecord.administeredTime ? new Date(updatedRecord.administeredTime).toISOString() : null
    };
    
    console.log(`✅ Medication record updated: ${marID}`);
    res.json(formattedRecord);
    
  } catch (err) {
    console.error('❌ Error updating medication record:', err);
    res.status(500).json({ 
      error: 'Failed to update medication record',
      message: err.message 
    });
  }
});

// DELETE /api/medication-admin/:marID - Delete medication record
router.delete('/medication-admin/:marID', async (req, res) => {
  try {
    const pool = await getPool();
    const { marID } = req.params;
    
    console.log(`🗑️ Deleting medication record: ${marID}`);
    
    const result = await pool.request()
      .input('marID', sql.BigInt, marID)
      .query('DELETE FROM medication_administration_record WHERE marID = @marID');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Medication record not found' });
    }
    
    console.log(`✅ Medication record deleted: ${marID}`);
    res.json({ message: 'Medication record deleted successfully', marID });
    
  } catch (err) {
    console.error('❌ Error deleting medication record:', err);
    res.status(500).json({ 
      error: 'Failed to delete medication record',
      message: err.message 
    });
  }
});

// ============================================================================
// VITAL SIGNS ENDPOINTS
// ============================================================================

// GET /api/vital-signs/:clientID - Get vital signs for a client
router.get('/vital-signs/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    console.log(`❤️ Getting vital signs for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    let query = `
      SELECT ${limit ? `TOP ${parseInt(limit)}` : ''} * 
      FROM vital_signs 
      WHERE clientID = @clientID
    `;
    
    const request = pool.request().input('clientID', sql.NVarChar(50), clientID);
    
    if (startDate) {
      query += ' AND recordDate >= @startDate';
      request.input('startDate', sql.Date, formatDateForDB(startDate));
    }
    
    if (endDate) {
      query += ' AND recordDate <= @endDate';
      request.input('endDate', sql.Date, formatDateForDB(endDate));
    }
    
    query += ' ORDER BY recordDate DESC, recordTime DESC';
    
    const result = await request.query(query);
    
    // Format dates and times for frontend
    const formattedRecords = result.recordset.map(record => ({
      ...record,
      recordDate: formatDateForFrontend(record.recordDate),
      recordTime: formatTimeForFrontend(record.recordTime)
    }));
    
    console.log(`✅ Retrieved ${formattedRecords.length} vital sign records`);
    res.json(formattedRecords);
    
  } catch (err) {
    console.error('❌ Error fetching vital signs:', err);
    res.status(500).json({ 
      error: 'Failed to fetch vital signs',
      message: err.message 
    });
  }
});

// POST /api/vital-signs/:clientID - Add vital signs record
router.post('/vital-signs/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const vitalData = req.body;
    
    console.log(`💾 Saving vital signs for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const request = pool.request();
    request.input('clientID', sql.NVarChar(50), clientID);
    request.input('recordDate', sql.Date, formatDateForDB(vitalData.recordDate) || new Date());
    const recordTimePost = vitalData.recordTime && vitalData.recordTime.trim() !== '' ? vitalData.recordTime.trim() : new Date().toTimeString().slice(0, 5);
    request.input('recordTime', sql.VarChar(10), recordTimePost);
    request.input('bloodPressureSystolic', sql.Int, vitalData.bloodPressureSystolic || null);
    request.input('bloodPressureDiastolic', sql.Int, vitalData.bloodPressureDiastolic || null);
    request.input('temperature', sql.Decimal(4, 1), vitalData.temperature || null);
    request.input('pulse', sql.Int, vitalData.pulse || null);
    request.input('respirations', sql.Int, vitalData.respirations || null);
    request.input('oxygenSaturation', sql.Int, vitalData.oxygenSaturation || null);
    request.input('weight', sql.Decimal(5, 1), vitalData.weight || null);
    request.input('bloodGlucose', sql.Int, vitalData.bloodGlucose || null);
    request.input('painLevel', sql.Int, vitalData.painLevel || null);
    request.input('notes', sql.NVarChar(sql.MAX), vitalData.notes || '');
    request.input('recordedBy', sql.NVarChar(255), vitalData.recordedBy || 'system');
    
    const query = `
      INSERT INTO vital_signs (
        clientID, recordDate, recordTime, bloodPressureSystolic, bloodPressureDiastolic,
        temperature, pulse, respirations, oxygenSaturation, weight, bloodGlucose,
        painLevel, notes, recordedBy, createdAt
      )
      OUTPUT INSERTED.*
      VALUES (
        @clientID, @recordDate, @recordTime, @bloodPressureSystolic, @bloodPressureDiastolic,
        @temperature, @pulse, @respirations, @oxygenSaturation, @weight, @bloodGlucose,
        @painLevel, @notes, @recordedBy, GETDATE()
      )
    `;
    
    const result = await request.query(query);
    const savedRecord = result.recordset[0];
    
    // Format response
    const formattedRecord = {
      ...savedRecord,
      recordDate: formatDateForFrontend(savedRecord.recordDate),
      recordTime: formatTimeForFrontend(savedRecord.recordTime)
    };
    
    console.log(`✅ Vital signs saved with ID: ${savedRecord.vitalSignID}`);
    res.status(201).json(formattedRecord);
    
  } catch (err) {
    console.error('❌ Error saving vital signs:', err);
    res.status(500).json({ 
      error: 'Failed to save vital signs',
      message: err.message 
    });
  }
});

// PUT /api/vital-signs/:vitalSignID - Update vital signs record
router.put('/vital-signs/:vitalSignID', async (req, res) => {
  try {
    const pool = await getPool();
    const { vitalSignID } = req.params;
    const vitalData = req.body;
    
    console.log(`🔄 Updating vital signs record: ${vitalSignID}`);
    
    const request = pool.request();
    request.input('vitalSignID', sql.BigInt, vitalSignID);
    request.input('recordDate', sql.Date, formatDateForDB(vitalData.recordDate));
    const recordTimePut = vitalData.recordTime && vitalData.recordTime.trim() !== '' ? vitalData.recordTime.trim() : null;
    request.input('recordTime', sql.VarChar(10), recordTimePut);
    request.input('bloodPressureSystolic', sql.Int, vitalData.bloodPressureSystolic || null);
    request.input('bloodPressureDiastolic', sql.Int, vitalData.bloodPressureDiastolic || null);
    request.input('temperature', sql.Decimal(4, 1), vitalData.temperature || null);
    request.input('pulse', sql.Int, vitalData.pulse || null);
    request.input('respirations', sql.Int, vitalData.respirations || null);
    request.input('oxygenSaturation', sql.Int, vitalData.oxygenSaturation || null);
    request.input('weight', sql.Decimal(5, 1), vitalData.weight || null);
    request.input('bloodGlucose', sql.Int, vitalData.bloodGlucose || null);
    request.input('painLevel', sql.Int, vitalData.painLevel || null);
    request.input('notes', sql.NVarChar(sql.MAX), vitalData.notes || '');
    request.input('recordedBy', sql.NVarChar(255), vitalData.recordedBy || 'system');
    
    const query = `
      UPDATE vital_signs 
      SET 
        recordDate = @recordDate,
        recordTime = @recordTime,
        bloodPressureSystolic = @bloodPressureSystolic,
        bloodPressureDiastolic = @bloodPressureDiastolic,
        temperature = @temperature,
        pulse = @pulse,
        respirations = @respirations,
        oxygenSaturation = @oxygenSaturation,
        weight = @weight,
        bloodGlucose = @bloodGlucose,
        painLevel = @painLevel,
        notes = @notes,
        recordedBy = @recordedBy
      OUTPUT INSERTED.*
      WHERE vitalSignID = @vitalSignID
    `;
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vital signs record not found' });
    }
    
    const updatedRecord = result.recordset[0];
    const formattedRecord = {
      ...updatedRecord,
      recordDate: formatDateForFrontend(updatedRecord.recordDate),
      recordTime: formatTimeForFrontend(updatedRecord.recordTime)
    };
    
    console.log(`✅ Vital signs updated: ${vitalSignID}`);
    res.json(formattedRecord);
    
  } catch (err) {
    console.error('❌ Error updating vital signs:', err);
    res.status(500).json({ 
      error: 'Failed to update vital signs',
      message: err.message 
    });
  }
});

// DELETE /api/vital-signs/:vitalSignID - Delete vital signs record
router.delete('/vital-signs/:vitalSignID', async (req, res) => {
  try {
    const pool = await getPool();
    const { vitalSignID } = req.params;
    
    console.log(`🗑️ Deleting vital signs record: ${vitalSignID}`);
    
    const result = await pool.request()
      .input('vitalSignID', sql.BigInt, vitalSignID)
      .query('DELETE FROM vital_signs WHERE vitalSignID = @vitalSignID');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vital signs record not found' });
    }
    
    console.log(`✅ Vital signs record deleted: ${vitalSignID}`);
    res.json({ message: 'Vital signs record deleted successfully', vitalSignID });
    
  } catch (err) {
    console.error('❌ Error deleting vital signs:', err);
    res.status(500).json({ 
      error: 'Failed to delete vital signs',
      message: err.message 
    });
  }
});

// GET /api/vital-signs/:clientID/trends - Get vital signs trends for charts
router.get('/vital-signs/:clientID/trends', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const { days = 30 } = req.query;
    
    console.log(`📊 Getting vital signs trends for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('days', sql.Int, parseInt(days))
      .query(`
        SELECT 
          recordDate,
          AVG(CAST(bloodPressureSystolic AS FLOAT)) as avgSystolic,
          AVG(CAST(bloodPressureDiastolic AS FLOAT)) as avgDiastolic,
          AVG(temperature) as avgTemp,
          AVG(CAST(pulse AS FLOAT)) as avgPulse,
          AVG(CAST(respirations AS FLOAT)) as avgResp,
          AVG(CAST(oxygenSaturation AS FLOAT)) as avgO2,
          AVG(weight) as avgWeight,
          AVG(CAST(bloodGlucose AS FLOAT)) as avgGlucose
        FROM vital_signs
        WHERE clientID = @clientID
          AND recordDate >= DATEADD(day, -@days, GETDATE())
        GROUP BY recordDate
        ORDER BY recordDate DESC
      `);
    
    // Format dates for frontend
    const formattedTrends = result.recordset.map(record => ({
      ...record,
      recordDate: formatDateForFrontend(record.recordDate)
    }));
    
    console.log(`✅ Retrieved trends for ${formattedTrends.length} days`);
    res.json(formattedTrends);
    
  } catch (err) {
    console.error('❌ Error fetching vital signs trends:', err);
    res.status(500).json({ 
      error: 'Failed to fetch vital signs trends',
      message: err.message 
    });
  }
});

// ============================================================================
// DAILY OBSERVATIONS ENDPOINTS
// ============================================================================

// GET /api/daily-observations/:clientID - Get daily observations
router.get('/daily-observations/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log(`📝 Getting daily observations for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    let query = `
      SELECT * FROM daily_observations 
      WHERE clientID = @clientID
    `;
    
    const request = pool.request().input('clientID', sql.NVarChar(50), clientID);
    
    if (startDate) {
      query += ' AND observationDate >= @startDate';
      request.input('startDate', sql.Date, formatDateForDB(startDate));
    }
    
    if (endDate) {
      query += ' AND observationDate <= @endDate';
      request.input('endDate', sql.Date, formatDateForDB(endDate));
    }
    
    query += ' ORDER BY observationDate DESC';
    
    const result = await request.query(query);
    
    // Format dates for frontend
    const formattedRecords = result.recordset.map(record => ({
      ...record,
      observationDate: formatDateForFrontend(record.observationDate)
    }));
    
    console.log(`✅ Retrieved ${formattedRecords.length} daily observation records`);
    res.json(formattedRecords);
    
  } catch (err) {
    console.error('❌ Error fetching daily observations:', err);
    res.status(500).json({ 
      error: 'Failed to fetch daily observations',
      message: err.message 
    });
  }
});

// POST /api/daily-observations/:clientID - Add daily observation
router.post('/daily-observations/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const obsData = req.body;
    
    console.log(`💾 Saving daily observation for client: ${clientID}`);
    
    // Verify client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const request = pool.request();
    request.input('clientID', sql.NVarChar(50), clientID);
    request.input('observationDate', sql.Date, formatDateForDB(obsData.observationDate) || new Date());
    request.input('generalCondition', sql.NVarChar(50), obsData.generalCondition || '');
    request.input('moodBehavior', sql.NVarChar(100), obsData.moodBehavior || '');
    request.input('sleepQuality', sql.NVarChar(50), obsData.sleepQuality || '');
    request.input('appetiteIntake', sql.NVarChar(50), obsData.appetiteIntake || '');
    request.input('bowelMovement', sql.NVarChar(50), obsData.bowelMovement || '');
    request.input('urinaryOutput', sql.NVarChar(50), obsData.urinaryOutput || '');
    request.input('skinIntegrity', sql.NVarChar(100), obsData.skinIntegrity || '');
    request.input('fallRisk', sql.NVarChar(20), obsData.fallRisk || '');
    request.input('activityLevel', sql.NVarChar(50), obsData.activityLevel || '');
    request.input('painAssessment', sql.NVarChar(100), obsData.painAssessment || '');
    request.input('observationNotes', sql.NVarChar(sql.MAX), obsData.observationNotes || '');
    request.input('recordedBy', sql.NVarChar(255), obsData.recordedBy || 'system');
    request.input('createdBy', sql.NVarChar(255), obsData.createdBy || obsData.recordedBy || 'system');
    
    const query = `
      INSERT INTO daily_observations (
        clientID, observationDate, generalCondition, moodBehavior, sleepQuality,
        appetiteIntake, bowelMovement, urinaryOutput, skinIntegrity, fallRisk,
        activityLevel, painAssessment, observationNotes, recordedBy, 
        createdBy, createdAt, updatedAt
      )
      OUTPUT INSERTED.*
      VALUES (
        @clientID, @observationDate, @generalCondition, @moodBehavior, @sleepQuality,
        @appetiteIntake, @bowelMovement, @urinaryOutput, @skinIntegrity, @fallRisk,
        @activityLevel, @painAssessment, @observationNotes, @recordedBy,
        @createdBy, GETDATE(), GETDATE()
      )
    `;
    
    const result = await request.query(query);
    const savedRecord = result.recordset[0];
    
    // Format response
    const formattedRecord = {
      ...savedRecord,
      observationDate: formatDateForFrontend(savedRecord.observationDate)
    };
    
    console.log(`✅ Daily observation saved with ID: ${savedRecord.observationID}`);
    res.status(201).json(formattedRecord);
    
  } catch (err) {
    console.error('❌ Error saving daily observation:', err);
    res.status(500).json({ 
      error: 'Failed to save daily observation',
      message: err.message 
    });
  }
});

// PUT /api/daily-observations/:observationID - Update daily observation
router.put('/daily-observations/:observationID', async (req, res) => {
  try {
    const pool = await getPool();
    const { observationID } = req.params;
    const obsData = req.body;
    
    console.log(`🔄 Updating daily observation: ${observationID}`);
    
    const request = pool.request();
    request.input('observationID', sql.BigInt, observationID);
    request.input('observationDate', sql.Date, formatDateForDB(obsData.observationDate));
    request.input('generalCondition', sql.NVarChar(50), obsData.generalCondition || '');
    request.input('moodBehavior', sql.NVarChar(100), obsData.moodBehavior || '');
    request.input('sleepQuality', sql.NVarChar(50), obsData.sleepQuality || '');
    request.input('appetiteIntake', sql.NVarChar(50), obsData.appetiteIntake || '');
    request.input('bowelMovement', sql.NVarChar(50), obsData.bowelMovement || '');
    request.input('urinaryOutput', sql.NVarChar(50), obsData.urinaryOutput || '');
    request.input('skinIntegrity', sql.NVarChar(100), obsData.skinIntegrity || '');
    request.input('fallRisk', sql.NVarChar(20), obsData.fallRisk || '');
    request.input('activityLevel', sql.NVarChar(50), obsData.activityLevel || '');
    request.input('painAssessment', sql.NVarChar(100), obsData.painAssessment || '');
    request.input('observationNotes', sql.NVarChar(sql.MAX), obsData.observationNotes || '');
    request.input('recordedBy', sql.NVarChar(255), obsData.recordedBy || 'system');
    request.input('updatedBy', sql.NVarChar(255), obsData.updatedBy || obsData.recordedBy || 'system');
    
    const query = `
      UPDATE daily_observations 
      SET 
        observationDate = @observationDate,
        generalCondition = @generalCondition,
        moodBehavior = @moodBehavior,
        sleepQuality = @sleepQuality,
        appetiteIntake = @appetiteIntake,
        bowelMovement = @bowelMovement,
        urinaryOutput = @urinaryOutput,
        skinIntegrity = @skinIntegrity,
        fallRisk = @fallRisk,
        activityLevel = @activityLevel,
        painAssessment = @painAssessment,
        observationNotes = @observationNotes,
        recordedBy = @recordedBy,
        updatedBy = @updatedBy,
        updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE observationID = @observationID
    `;
    
    const result = await request.query(query);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Daily observation not found' });
    }
    
    const updatedRecord = result.recordset[0];
    const formattedRecord = {
      ...updatedRecord,
      observationDate: formatDateForFrontend(updatedRecord.observationDate)
    };
    
    console.log(`✅ Daily observation updated: ${observationID}`);
    res.json(formattedRecord);
    
  } catch (err) {
    console.error('❌ Error updating daily observation:', err);
    res.status(500).json({ 
      error: 'Failed to update daily observation',
      message: err.message 
    });
  }
});

// DELETE /api/daily-observations/:observationID - Delete daily observation
router.delete('/daily-observations/:observationID', async (req, res) => {
  try {
    const pool = await getPool();
    const { observationID } = req.params;
    
    console.log(`🗑️ Deleting daily observation: ${observationID}`);
    
    const result = await pool.request()
      .input('observationID', sql.BigInt, observationID)
      .query('DELETE FROM daily_observations WHERE observationID = @observationID');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Daily observation not found' });
    }
    
    console.log(`✅ Daily observation deleted: ${observationID}`);
    res.json({ message: 'Daily observation deleted successfully', observationID });
    
  } catch (err) {
    console.error('❌ Error deleting daily observation:', err);
    res.status(500).json({ 
      error: 'Failed to delete daily observation',
      message: err.message 
    });
  }
});

// GET /api/medical-observation/:clientID/summary - Get summary statistics
router.get('/medical-observation/:clientID/summary', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📊 Getting medical observation summary for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM medication_administration_record WHERE clientID = @clientID AND administeredDate >= DATEADD(day, -30, GETDATE())) as medicationsLast30Days,
          (SELECT COUNT(DISTINCT medicationName) FROM medication_administration_record WHERE clientID = @clientID AND status = 'Given') as activeMedications,
          (SELECT COUNT(*) FROM vital_signs WHERE clientID = @clientID AND recordDate >= DATEADD(day, -7, GETDATE())) as vitalSignsLast7Days,
          (SELECT COUNT(*) FROM daily_observations WHERE clientID = @clientID AND observationDate >= DATEADD(day, -7, GETDATE())) as observationsLast7Days,
          (SELECT TOP 1 recordDate FROM vital_signs WHERE clientID = @clientID ORDER BY recordDate DESC, recordTime DESC) as lastVitalSignsDate,
          (SELECT TOP 1 observationDate FROM daily_observations WHERE clientID = @clientID ORDER BY observationDate DESC) as lastObservationDate
      `);
    
    const summary = result.recordset[0] || {
      medicationsLast30Days: 0,
      activeMedications: 0,
      vitalSignsLast7Days: 0,
      observationsLast7Days: 0,
      lastVitalSignsDate: null,
      lastObservationDate: null
    };
    
    // Format dates
    if (summary.lastVitalSignsDate) {
      summary.lastVitalSignsDate = formatDateForFrontend(summary.lastVitalSignsDate);
    }
    if (summary.lastObservationDate) {
      summary.lastObservationDate = formatDateForFrontend(summary.lastObservationDate);
    }
    
    console.log(`✅ Medical observation summary retrieved`);
    res.json(summary);
    
  } catch (err) {
    console.error('❌ Error fetching medical observation summary:', err);
    res.status(500).json({ 
      error: 'Failed to fetch medical observation summary',
      message: err.message 
    });
  }
});

module.exports = router;