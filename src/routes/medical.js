// routes/medical.js - Backend routes for medical face sheet
const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { connectToAzureSQL } = require("../db");

// Middleware for logging (optional)
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ===================================================================
// MEDICAL INFORMATION ROUTES
// ===================================================================

// GET /api/medical/info/:clientID - Get medical information for a client
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
        // Parse JSON fields if they're stored as strings
        clientMedConditions: record.clientMedConditions ? JSON.parse(record.clientMedConditions) : [],
        clientAllergies: record.clientAllergies ? JSON.parse(record.clientAllergies) : []
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

// POST /api/medical/info/:clientID - Save/Update medical information
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
        OUTPUT INSERTED.clientID,
               INSERTED.clientMedConditions,
               INSERTED.clientAddMedHistory,
               INSERTED.clientMedPertinent,
               INSERTED.clientPreviousLab,
               INSERTED.clientAllergies,
               INSERTED.updatedBy,
               INSERTED.updatedAt;
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

// GET /api/medical/appointments/:clientID - Get all appointments for a client
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

// POST /api/medical/appointments/:clientID - Add new appointment
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

  // Validation
  if (!medApptDate || !medApptLoc || !medApptType) {
    return res.status(400).json({ 
      error: "Missing required fields: medApptDate, medApptLoc, medApptType" 
    });
  }

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .input("medApptDate", sql.Date, medApptDate)
      .input("medApptLoc", sql.NVarChar, medApptLoc)
      .input("medApptType", sql.NVarChar, medApptType)
      .input("medApptProv", sql.NVarChar, medApptProv || '')
      .input("medApptTranport", sql.NVarChar, medApptTranport || '')
      .input("createdBy", sql.NVarChar, createdBy || 'system')
      .input("createdAt", sql.DateTime, new Date())
      .query(`
        INSERT INTO MedicalAppointments (
          clientID, 
          medApptDate, 
          medApptLoc, 
          medApptType, 
          medApptProv, 
          medApptTranport, 
          createdBy, 
          createdAt
        ) 
        OUTPUT INSERTED.appointmentID,
               INSERTED.clientID,
               INSERTED.medApptDate,
               INSERTED.medApptLoc,
               INSERTED.medApptType,
               INSERTED.medApptProv,
               INSERTED.medApptTranport,
               INSERTED.createdBy,
               INSERTED.createdAt,
               INSERTED.updatedBy,
               INSERTED.updatedAt
        VALUES (
          @clientID, 
          @medApptDate, 
          @medApptLoc, 
          @medApptType, 
          @medApptProv, 
          @medApptTranport, 
          @createdBy, 
          @createdAt
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

// PUT /api/medical/appointments/:appointmentID - Update existing appointment
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

  // Validation
  if (!medApptDate || !medApptLoc || !medApptType) {
    return res.status(400).json({ 
      error: "Missing required fields: medApptDate, medApptLoc, medApptType" 
    });
  }

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("appointmentID", sql.Int, appointmentID)
      .input("medApptDate", sql.Date, medApptDate)
      .input("medApptLoc", sql.NVarChar, medApptLoc)
      .input("medApptType", sql.NVarChar, medApptType)
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
        OUTPUT INSERTED.appointmentID,
               INSERTED.clientID,
               INSERTED.medApptDate,
               INSERTED.medApptLoc,
               INSERTED.medApptType,
               INSERTED.medApptProv,
               INSERTED.medApptTranport,
               INSERTED.createdBy,
               INSERTED.createdAt,
               INSERTED.updatedBy,
               INSERTED.updatedAt
        WHERE appointmentID = @appointmentID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: "Appointment not found" 
      });
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

// DELETE /api/medical/appointments/:appointmentID - Delete appointment
router.delete("/appointments/:appointmentID", async (req, res) => {
  const { appointmentID } = req.params;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("appointmentID", sql.Int, appointmentID)
      .query(`
        DELETE FROM MedicalAppointments 
        WHERE appointmentID = @appointmentID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        error: "Appointment not found" 
      });
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

// GET /api/medical/allergies/:clientID - Get available allergy options for client
router.get("/allergies/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT DISTINCT
          allergyCode as value,
          allergyName as label,
          allergyDescription
        FROM AllergyOptions 
        WHERE isActive = 1
        ORDER BY allergyName
      `);
    
    console.log(`✅ Retrieved ${result.recordset.length} allergy options for client ${clientID}`);
    res.json(result.recordset);
    
  } catch (err) {
    console.error("❌ Error fetching allergy options:", err);
    res.status(500).json({ 
      error: "Error fetching allergy options",
      details: err.message 
    });
  }
});

// ===================================================================
// STATISTICS AND REPORTING ROUTES
// ===================================================================

// GET /api/medical/stats/:clientID - Get medical statistics for a client
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