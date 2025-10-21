// routes/medical.js - Backend routes for medical face sheet
const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { connectToAzureSQL } = require("../store/azureSql");

// Middleware for logging (optional)
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ===================================================================
// MEDICAL INFORMATION ROUTES
// ===================================================================

// 🔧 FIXED: GET /api/medical/info/:clientID (removed /medical prefix)
router.get("/info/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          clientID,
          clientMedConditions,
          clientAddMedHistory,
          clientMedPertinent,
          clientPreviousLab,
          clientAllergies,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        FROM MedicalInfo 
        WHERE clientID = @clientID
      `);
    
    let medicalInfo = {};
    if (result.recordset.length > 0) {
      const record = result.recordset[0];
      medicalInfo = {
        ...record,
        clientMedConditions: record.clientMedConditions ? JSON.parse(record.clientMedConditions) : [],
        clientAllergies: record.clientAllergies ? JSON.parse(record.clientAllergies) : []
      };
    } else {
      // Return empty structure if no data
      medicalInfo = {
        clientID,
        clientMedConditions: [],
        clientAddMedHistory: '',
        clientMedPertinent: '',
        clientPreviousLab: '',
        clientAllergies: []
      };
    }
    
    console.log(`✅ Retrieved medical info for client ${clientID}`);
    res.json(medicalInfo);
    
  } catch (err) {
    console.error("❌ Error fetching medical info:", err);
    res.status(500).json({ 
      error: "Error fetching medical information",
      details: err.message 
    });
  }
});

// 🔧 FIXED: POST /api/medical/info/:clientID
router.post("/info/:clientID", async (req, res) => {
  const { clientID } = req.params;
  const {
    clientMedConditions,
    clientAddMedHistory,
    clientMedPertinent,
    clientPreviousLab,
    clientAllergies,
    createdBy,
    updatedBy
  } = req.body;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .input("clientMedConditions", sql.NVarChar(sql.MAX), JSON.stringify(clientMedConditions || []))
      .input("clientAddMedHistory", sql.NVarChar(sql.MAX), clientAddMedHistory || '')
      .input("clientMedPertinent", sql.NVarChar(sql.MAX), clientMedPertinent || '')
      .input("clientPreviousLab", sql.NVarChar, clientPreviousLab || '')
      .input("clientAllergies", sql.NVarChar(sql.MAX), JSON.stringify(clientAllergies || []))
      .input("createdBy", sql.NVarChar, createdBy || updatedBy || 'system')
      .input("updatedBy", sql.NVarChar, updatedBy || 'system')
      .input("createdAt", sql.DateTime, new Date())
      .input("updatedAt", sql.DateTime, new Date())
      .query(`
        MERGE MedicalInfo AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN UPDATE SET
          clientMedConditions = @clientMedConditions,
          clientAddMedHistory = @clientAddMedHistory,
          clientMedPertinent = @clientMedPertinent,
          clientPreviousLab = @clientPreviousLab,
          clientAllergies = @clientAllergies,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (clientID, clientMedConditions, clientAddMedHistory, clientMedPertinent, 
                  clientPreviousLab, clientAllergies, createdBy, createdAt, updatedBy, updatedAt)
          VALUES (@clientID, @clientMedConditions, @clientAddMedHistory, @clientMedPertinent,
                  @clientPreviousLab, @clientAllergies, @createdBy, @createdAt, @updatedBy, @updatedAt)
        OUTPUT INSERTED.*;
      `);

    const savedRecord = result.recordset[0];
    const response = {
      ...savedRecord,
      clientMedConditions: JSON.parse(savedRecord.clientMedConditions || '[]'),
      clientAllergies: JSON.parse(savedRecord.clientAllergies || '[]')
    };

    console.log(`✅ Saved medical info for client ${clientID}`);
    res.json(response);
    
  } catch (err) {
    console.error("❌ Error saving medical info:", err);
    res.status(500).json({ 
      error: "Error saving medical information",
      details: err.message 
    });
  }
});

// ===================================================================
// APPOINTMENTS ROUTES
// ===================================================================

// 🔧 FIXED: GET /api/medical/appointments/:clientID
router.get("/appointments/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          appointmentID,
          clientID,
          medApptDate,
          medApptLoc,
          medApptType,
          medApptProv,
          medApptTranport,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        FROM MedicalAppointments 
        WHERE clientID = @clientID 
        ORDER BY medApptDate DESC, createdAt DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} appointments for client ${clientID}`);
    res.json(result.recordset);
    
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.status(500).json({ 
      error: "Error fetching appointments",
      details: err.message 
    });
  }
});

// 🔧 FIXED: POST /api/medical/appointments/:clientID
router.post("/appointments/:clientID", async (req, res) => {
  const { clientID } = req.params;
  const {
    medApptDate,
    medApptLoc,
    medApptType,
    medApptProv,
    medApptTranport,
    createdBy
  } = req.body;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .input("medApptDate", sql.Date, medApptDate || null)
      .input("medApptLoc", sql.NVarChar, medApptLoc || '')
      .input("medApptType", sql.NVarChar, medApptType || '')
      .input("medApptProv", sql.NVarChar, medApptProv || '')
      .input("medApptTranport", sql.NVarChar, medApptTranport || '')
      .input("createdBy", sql.NVarChar, createdBy || 'system')
      .input("createdAt", sql.DateTime, new Date())
      .query(`
        INSERT INTO MedicalAppointments (
          clientID, medApptDate, medApptLoc, medApptType, 
          medApptProv, medApptTranport, createdBy, createdAt
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @medApptDate, @medApptLoc, @medApptType, 
          @medApptProv, @medApptTranport, @createdBy, @createdAt
        )
      `);

    console.log(`✅ Created appointment for client ${clientID}`);
    res.status(201).json(result.recordset[0]);
    
  } catch (err) {
    console.error("❌ Error adding appointment:", err);
    res.status(500).json({ 
      error: "Error adding appointment",
      details: err.message 
    });
  }
});

// 🔧 FIXED: PUT /api/medical/appointments/:appointmentID
router.put("/appointments/:appointmentID", async (req, res) => {
  const { appointmentID } = req.params;
  const {
    medApptDate,
    medApptLoc,
    medApptType,
    medApptProv,
    medApptTranport,
    updatedBy
  } = req.body;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("appointmentID", sql.Int, appointmentID)
      .input("medApptDate", sql.Date, medApptDate)
      .input("medApptLoc", sql.NVarChar, medApptLoc || '')
      .input("medApptType", sql.NVarChar, medApptType || '')
      .input("medApptProv", sql.NVarChar, medApptProv || '')
      .input("medApptTranport", sql.NVarChar, medApptTranport || '')
      .input("updatedBy", sql.NVarChar, updatedBy || 'system')
      .input("updatedAt", sql.DateTime, new Date())
      .query(`
        UPDATE MedicalAppointments 
        SET 
          medApptDate = @medApptDate,
          medApptLoc = @medApptLoc,
          medApptType = @medApptType,
          medApptProv = @medApptProv,
          medApptTranport = @medApptTranport,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        OUTPUT INSERTED.*
        WHERE appointmentID = @appointmentID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    console.log(`✅ Updated appointment ${appointmentID}`);
    res.json(result.recordset[0]);
    
  } catch (err) {
    console.error("❌ Error updating appointment:", err);
    res.status(500).json({ 
      error: "Error updating appointment",
      details: err.message 
    });
  }
});

// 🔧 FIXED: DELETE /api/medical/appointments/:appointmentID
router.delete("/appointments/:appointmentID", async (req, res) => {
  const { appointmentID } = req.params;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("appointmentID", sql.Int, appointmentID)
      .query(`DELETE FROM MedicalAppointments WHERE appointmentID = @appointmentID`);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    console.log(`✅ Deleted appointment ${appointmentID}`);
    res.status(200).json({ 
      message: "Appointment deleted successfully",
      appointmentID: appointmentID 
    });
    
  } catch (err) {
    console.error("❌ Error deleting appointment:", err);
    res.status(500).json({ 
      error: "Error deleting appointment",
      details: err.message 
    });
  }
});

// ===================================================================
// CLIENT ALLERGIES ROUTES
// ===================================================================

// 🔧 FIXED: GET /api/medical/allergies/:clientID
router.get("/allergies/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    
    // Try to get from AllergyOptions table first
    const result = await pool
      .request()
      .query(`
        SELECT DISTINCT
          allergyCode as value,
          allergyName as label,
          allergyDescription
        FROM AllergyOptions 
        WHERE isActive = 1
        ORDER BY allergyName
      `);
    
    // If table doesn't exist or is empty, return static options
    if (result.recordset.length === 0) {
      const defaultAllergies = [
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
      console.log(`✅ Returning default allergy options for client ${clientID}`);
      return res.json(defaultAllergies);
    }
    
    console.log(`✅ Retrieved ${result.recordset.length} allergy options for client ${clientID}`);
    res.json(result.recordset);
    
  } catch (err) {
    // If table doesn't exist, return static options
    console.log("⚠️ AllergyOptions table not found, returning static options");
    const defaultAllergies = [
      { value: 'penicillin', label: 'Penicillin' },
      { value: 'shellfish', label: 'Shellfish' },
      { value: 'nuts', label: 'Tree Nuts' },
      { value: 'peanuts', label: 'Peanuts' },
      { value: 'dairy', label: 'Dairy Products' },
      { value: 'eggs', label: 'Eggs' },
      { value: 'latex', label: 'Latex' },
      { value: 'sulfa', label: 'Sulfa Drugs' }
    ];
    res.json(defaultAllergies);
  }
});

// 🔧 FIXED: POST /api/medical/allergies/:clientID
router.post("/allergies/:clientID", async (req, res) => {
  const { clientID } = req.params;
  const { allergies } = req.body;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .input("allergies", sql.NVarChar(sql.MAX), JSON.stringify(allergies || []))
      .input("updatedAt", sql.DateTime, new Date())
      .query(`
        UPDATE MedicalInfo 
        SET clientAllergies = @allergies,
            updatedAt = @updatedAt
        WHERE clientID = @clientID
      `);

    console.log(`✅ Saved allergies for client ${clientID}`);
    res.json({ 
      success: true,
      clientID,
      allergies,
      updatedAt: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("❌ Error saving allergies:", err);
    res.status(500).json({ 
      error: "Error saving allergies",
      details: err.message 
    });
  }
});

// ===================================================================
// STATISTICS AND REPORTING ROUTES
// ===================================================================

// 🔧 FIXED: GET /api/medical/stats/:clientID
router.get("/stats/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM MedicalAppointments WHERE clientID = @clientID) as totalAppointments,
          (SELECT COUNT(*) FROM MedicalAppointments WHERE clientID = @clientID AND medApptDate >= GETDATE()) as upcomingAppointments,
          (SELECT COUNT(*) FROM MedicalAppointments WHERE clientID = @clientID AND medApptDate < GETDATE()) as pastAppointments,
          (SELECT COUNT(*) FROM MedicalAppointments WHERE clientID = @clientID AND medApptTranport = 'Yes') as appointmentsNeedingTransport,
          (SELECT TOP 1 medApptDate FROM MedicalAppointments WHERE clientID = @clientID AND medApptDate >= GETDATE() ORDER BY medApptDate ASC) as nextAppointmentDate,
          (SELECT COUNT(*) FROM MedicalInfo WHERE clientID = @clientID AND clientAllergies != '[]' AND clientAllergies IS NOT NULL) as hasAllergies
      `);
    
    console.log(`✅ Retrieved medical stats for client ${clientID}`);
    res.json(result.recordset[0] || {
      totalAppointments: 0,
      upcomingAppointments: 0,
      pastAppointments: 0,
      appointmentsNeedingTransport: 0,
      nextAppointmentDate: null,
      hasAllergies: 0
    });
    
  } catch (err) {
    console.error("❌ Error fetching medical stats:", err);
    res.status(500).json({ 
      error: "Error fetching medical statistics",
      details: err.message 
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error("❌ Medical Routes Error:", error);
  res.status(500).json({
    error: "Internal server error in medical routes",
    details: error.message
  });
});

module.exports = router;