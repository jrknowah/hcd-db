// routes/medicalScreening.js - Backend routes for medical screening
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
// MEDICAL SCREENING ROUTES
// ===================================================================

// GET /api/medical-screening/:clientID - Get medical screening data for a client
router.get("/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          screeningID as id,
          clientID,
          clientMedConditions,
          clientHepAB,
          clientAlcoholRisk,
          clientAlcoholRiskMed,
          clientLastTBTest,
          clientLastTBTestResults,
          clientLastTBTestResultsTreatment,
          clientLastTBTestResultsTreatmentOutcome,
          tbCough,
          tbCoughBlood,
          medSweat,
          clientFever,
          clientWeightLoss,
          clientMedications,
          clientSurgeries,
          clientBC,
          clientBCName,
          clientBCDate,
          clientBCLoc,
          clientBCPreg,
          clientBCPregDate,
          clientBCPap,
          clientBCMam,
          clientSexLastYear,
          clientSexLastMonth,
          clientLastSexDate,
          clientSexRelations,
          clientRiskFactors,
          clientSTDDate,
          clientSTDStatus,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        FROM MedicalScreening 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} medical screening records for client ${clientID}`);
    res.json(result.recordset);
    
  } catch (err) {
    console.error("❌ Error fetching medical screening:", err);
    res.status(500).json({ 
      error: "Error fetching medical screening data",
      details: err.message 
    });
  }
});

// POST /api/medical-screening/:clientID - Save new medical screening data
router.post("/:clientID", async (req, res) => {
  const { clientID } = req.params;
  const {
    clientMedConditions,
    clientHepAB,
    clientAlcoholRisk,
    clientAlcoholRiskMed,
    clientLastTBTest,
    clientLastTBTestResults,
    clientLastTBTestResultsTreatment,
    clientLastTBTestResultsTreatmentOutcome,
    tbCough,
    tbCoughBlood,
    medSweat,
    clientFever,
    clientWeightLoss,
    clientMedications,
    clientSurgeries,
    clientBC,
    clientBCName,
    clientBCDate,
    clientBCLoc,
    clientBCPreg,
    clientBCPregDate,
    clientBCPap,
    clientBCMam,
    clientSexLastYear,
    clientSexLastMonth,
    clientLastSexDate,
    clientSexRelations,
    clientRiskFactors,
    clientSTDDate,
    clientSTDStatus,
    createdBy,
    updatedBy
  } = req.body;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .input("clientMedConditions", sql.NVarChar(sql.MAX), JSON.stringify(clientMedConditions || []))
      .input("clientHepAB", sql.NVarChar(sql.MAX), JSON.stringify(clientHepAB || []))
      .input("clientAlcoholRisk", sql.NVarChar, clientAlcoholRisk || '')
      .input("clientAlcoholRiskMed", sql.NVarChar, clientAlcoholRiskMed || '')
      .input("clientLastTBTest", sql.Date, clientLastTBTest || null)
      .input("clientLastTBTestResults", sql.NVarChar, clientLastTBTestResults || '')
      .input("clientLastTBTestResultsTreatment", sql.NVarChar, clientLastTBTestResultsTreatment || '')
      .input("clientLastTBTestResultsTreatmentOutcome", sql.NVarChar, clientLastTBTestResultsTreatmentOutcome || '')
      .input("tbCough", sql.NVarChar, tbCough || '')
      .input("tbCoughBlood", sql.NVarChar, tbCoughBlood || '')
      .input("medSweat", sql.NVarChar, medSweat || '')
      .input("clientFever", sql.NVarChar, clientFever || '')
      .input("clientWeightLoss", sql.NVarChar, clientWeightLoss || '')
      .input("clientMedications", sql.NVarChar(sql.MAX), JSON.stringify(clientMedications || []))
      .input("clientSurgeries", sql.NVarChar(sql.MAX), JSON.stringify(clientSurgeries || []))
      .input("clientBC", sql.NVarChar, clientBC || '')
      .input("clientBCName", sql.NVarChar, clientBCName || '')
      .input("clientBCDate", sql.Date, clientBCDate || null)
      .input("clientBCLoc", sql.NVarChar, clientBCLoc || '')
      .input("clientBCPreg", sql.NVarChar, clientBCPreg || '')
      .input("clientBCPregDate", sql.Date, clientBCPregDate || null)
      .input("clientBCPap", sql.Date, clientBCPap || null)
      .input("clientBCMam", sql.Date, clientBCMam || null)
      .input("clientSexLastYear", sql.NVarChar, clientSexLastYear || '')
      .input("clientSexLastMonth", sql.NVarChar, clientSexLastMonth || '')
      .input("clientLastSexDate", sql.Date, clientLastSexDate || null)
      .input("clientSexRelations", sql.NVarChar, clientSexRelations || '')
      .input("clientRiskFactors", sql.NVarChar(sql.MAX), JSON.stringify(clientRiskFactors || []))
      .input("clientSTDDate", sql.Date, clientSTDDate || null)
      .input("clientSTDStatus", sql.NVarChar(sql.MAX), JSON.stringify(clientSTDStatus || []))
      .input("createdBy", sql.NVarChar, createdBy || updatedBy || 'system')
      .input("updatedBy", sql.NVarChar, updatedBy || 'system')
      .input("createdAt", sql.DateTime, new Date())
      .input("updatedAt", sql.DateTime, new Date())
      .query(`
        MERGE MedicalScreening AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN UPDATE SET
          clientMedConditions = @clientMedConditions,
          clientHepAB = @clientHepAB,
          clientAlcoholRisk = @clientAlcoholRisk,
          clientAlcoholRiskMed = @clientAlcoholRiskMed,
          clientLastTBTest = @clientLastTBTest,
          clientLastTBTestResults = @clientLastTBTestResults,
          clientLastTBTestResultsTreatment = @clientLastTBTestResultsTreatment,
          clientLastTBTestResultsTreatmentOutcome = @clientLastTBTestResultsTreatmentOutcome,
          tbCough = @tbCough,
          tbCoughBlood = @tbCoughBlood,
          medSweat = @medSweat,
          clientFever = @clientFever,
          clientWeightLoss = @clientWeightLoss,
          clientMedications = @clientMedications,
          clientSurgeries = @clientSurgeries,
          clientBC = @clientBC,
          clientBCName = @clientBCName,
          clientBCDate = @clientBCDate,
          clientBCLoc = @clientBCLoc,
          clientBCPreg = @clientBCPreg,
          clientBCPregDate = @clientBCPregDate,
          clientBCPap = @clientBCPap,
          clientBCMam = @clientBCMam,
          clientSexLastYear = @clientSexLastYear,
          clientSexLastMonth = @clientSexLastMonth,
          clientLastSexDate = @clientLastSexDate,
          clientSexRelations = @clientSexRelations,
          clientRiskFactors = @clientRiskFactors,
          clientSTDDate = @clientSTDDate,
          clientSTDStatus = @clientSTDStatus,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (clientID, clientMedConditions, clientHepAB, clientAlcoholRisk, clientAlcoholRiskMed,
                  clientLastTBTest, clientLastTBTestResults, clientLastTBTestResultsTreatment,
                  clientLastTBTestResultsTreatmentOutcome, tbCough, tbCoughBlood, medSweat,
                  clientFever, clientWeightLoss, clientMedications, clientSurgeries,
                  clientBC, clientBCName, clientBCDate, clientBCLoc, clientBCPreg, clientBCPregDate,
                  clientBCPap, clientBCMam, clientSexLastYear, clientSexLastMonth, clientLastSexDate,
                  clientSexRelations, clientRiskFactors, clientSTDDate, clientSTDStatus,
                  createdBy, createdAt, updatedBy, updatedAt)
          VALUES (@clientID, @clientMedConditions, @clientHepAB, @clientAlcoholRisk, @clientAlcoholRiskMed,
                  @clientLastTBTest, @clientLastTBTestResults, @clientLastTBTestResultsTreatment,
                  @clientLastTBTestResultsTreatmentOutcome, @tbCough, @tbCoughBlood, @medSweat,
                  @clientFever, @clientWeightLoss, @clientMedications, @clientSurgeries,
                  @clientBC, @clientBCName, @clientBCDate, @clientBCLoc, @clientBCPreg, @clientBCPregDate,
                  @clientBCPap, @clientBCMam, @clientSexLastYear, @clientSexLastMonth, @clientLastSexDate,
                  @clientSexRelations, @clientRiskFactors, @clientSTDDate, @clientSTDStatus,
                  @createdBy, @createdAt, @updatedBy, @updatedAt)
        OUTPUT INSERTED.screeningID as id,
               INSERTED.clientID,
               INSERTED.clientMedConditions,
               INSERTED.clientHepAB,
               INSERTED.clientAlcoholRisk,
               INSERTED.clientAlcoholRiskMed,
               INSERTED.clientLastTBTest,
               INSERTED.clientLastTBTestResults,
               INSERTED.clientLastTBTestResultsTreatment,
               INSERTED.clientLastTBTestResultsTreatmentOutcome,
               INSERTED.tbCough,
               INSERTED.tbCoughBlood,
               INSERTED.medSweat,
               INSERTED.clientFever,
               INSERTED.clientWeightLoss,
               INSERTED.clientMedications,
               INSERTED.clientSurgeries,
               INSERTED.clientBC,
               INSERTED.clientBCName,
               INSERTED.clientBCDate,
               INSERTED.clientBCLoc,
               INSERTED.clientBCPreg,
               INSERTED.clientBCPregDate,
               INSERTED.clientBCPap,
               INSERTED.clientBCMam,
               INSERTED.clientSexLastYear,
               INSERTED.clientSexLastMonth,
               INSERTED.clientLastSexDate,
               INSERTED.clientSexRelations,
               INSERTED.clientRiskFactors,
               INSERTED.clientSTDDate,
               INSERTED.clientSTDStatus,
               INSERTED.createdBy,
               INSERTED.createdAt,
               INSERTED.updatedBy,
               INSERTED.updatedAt;
      `);

    console.log(`✅ Saved medical screening for client ${clientID}`);
    res.json(result.recordset[0]);
    
  } catch (err) {
    console.error("❌ Error saving medical screening:", err);
    res.status(500).json({ 
      error: "Error saving medical screening data",
      details: err.message 
    });
  }
});

// PUT /api/medical-screening/:screeningID - Update existing medical screening
router.put("/:screeningID", async (req, res) => {
  const { screeningID } = req.params;
  const updateData = req.body;

  try {
    const pool = await connectToAzureSQL();
    
    // Build dynamic update query based on provided fields
    let updateFields = [];
    let inputParams = [];
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'screeningID' && key !== 'createdAt' && key !== 'createdBy') {
        updateFields.push(`${key} = @${key}`);
        inputParams.push({ name: key, value: updateData[key] });
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    updateFields.push('updatedAt = @updatedAt');
    updateFields.push('updatedBy = @updatedBy');

    let request = pool.request()
      .input("screeningID", sql.Int, screeningID)
      .input("updatedAt", sql.DateTime, new Date())
      .input("updatedBy", sql.NVarChar, updateData.updatedBy || 'system');

    // Add all input parameters
    inputParams.forEach(param => {
      if (Array.isArray(param.value)) {
        request.input(param.name, sql.NVarChar(sql.MAX), JSON.stringify(param.value));
      } else if (param.name.includes('Date') && param.value) {
        request.input(param.name, sql.Date, param.value);
      } else {
        request.input(param.name, sql.NVarChar, param.value || '');
      }
    });

    const result = await request.query(`
      UPDATE MedicalScreening 
      SET ${updateFields.join(', ')}
      OUTPUT INSERTED.screeningID as id,
             INSERTED.*
      WHERE screeningID = @screeningID
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Medical screening record not found" });
    }

    console.log(`✅ Updated medical screening ${screeningID}`);
    res.json(result.recordset[0]);
    
  } catch (err) {
    console.error("❌ Error updating medical screening:", err);
    res.status(500).json({ 
      error: "Error updating medical screening data",
      details: err.message 
    });
  }
});

// DELETE /api/medical-screening/:screeningID - Delete medical screening record
router.delete("/:screeningID", async (req, res) => {
  const { screeningID } = req.params;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("screeningID", sql.Int, screeningID)
      .query(`
        DELETE FROM MedicalScreening 
        WHERE screeningID = @screeningID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Medical screening record not found" });
    }

    console.log(`✅ Deleted medical screening ${screeningID}`);
    res.status(200).json({ 
      message: "Medical screening record deleted successfully",
      screeningID: screeningID 
    });
    
  } catch (err) {
    console.error("❌ Error deleting medical screening:", err);
    res.status(500).json({ 
      error: "Error deleting medical screening record",
      details: err.message 
    });
  }
});

// ===================================================================
// SUMMARY AND STATISTICS ROUTES
// ===================================================================

// GET /api/medical-screening/:clientID/summary - Get medical screening summary/stats
router.get("/:clientID/summary", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          ms.clientID,
          LEN(ms.clientMedConditions) - LEN(REPLACE(ms.clientMedConditions, ',', '')) + 1 as totalConditions,
          LEN(ms.clientMedications) - LEN(REPLACE(ms.clientMedications, '}', '')) as totalMedications,
          LEN(ms.clientSurgeries) - LEN(REPLACE(ms.clientSurgeries, '}', '')) as totalSurgeries,
          CASE WHEN ms.clientLastTBTestResults = 'Negative' THEN 1 ELSE 0 END as hasTBClearance,
          ms.createdAt as lastScreeningDate,
          LEN(ms.clientRiskFactors) - LEN(REPLACE(ms.clientRiskFactors, ',', '')) + 1 as riskFactorsCount,
          CASE 
            WHEN ms.tbCough = 'Yes' OR ms.tbCoughBlood = 'Yes' OR ms.medSweat = 'Yes' 
                 OR ms.clientFever = 'Yes' OR ms.clientWeightLoss = 'Yes'
            THEN 1 ELSE 0 
          END as needsFollowUp,
          CASE WHEN ms.clientBCPap IS NOT NULL AND ms.clientBCPap != '' THEN 1 ELSE 0 END as hasRecentPap,
          CASE WHEN ms.clientBCMam IS NOT NULL AND ms.clientBCMam != '' THEN 1 ELSE 0 END as hasRecentMammogram,
          CASE WHEN ms.clientSTDDate IS NOT NULL AND ms.clientSTDDate != '' THEN 1 ELSE 0 END as hasRecentSTDTest
        FROM MedicalScreening ms
        WHERE ms.clientID = @clientID
      `);
    
    const summary = result.recordset[0] || {
      clientID,
      totalConditions: 0,
      totalMedications: 0,
      totalSurgeries: 0,
      hasTBClearance: false,
      lastScreeningDate: null,
      riskFactorsCount: 0,
      needsFollowUp: false,
      hasRecentPap: false,
      hasRecentMammogram: false,
      hasRecentSTDTest: false
    };

    console.log(`✅ Retrieved medical screening summary for client ${clientID}`);
    res.json(summary);
    
  } catch (err) {
    console.error("❌ Error fetching screening summary:", err);
    res.status(500).json({ 
      error: "Error fetching medical screening summary",
      details: err.message 
    });
  }
});

// GET /api/medical-screening/:clientID/medications - Get client medications only
router.get("/:clientID/medications", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          clientMedications,
          updatedAt
        FROM MedicalScreening 
        WHERE clientID = @clientID
      `);
    
    let medications = [];
    if (result.recordset.length > 0 && result.recordset[0].clientMedications) {
      try {
        medications = JSON.parse(result.recordset[0].clientMedications);
      } catch (parseError) {
        console.warn("Error parsing medications JSON:", parseError);
      }
    }

    console.log(`✅ Retrieved ${medications.length} medications for client ${clientID}`);
    res.json({
      clientID,
      medications,
      lastUpdated: result.recordset[0]?.updatedAt || null
    });
    
  } catch (err) {
    console.error("❌ Error fetching medications:", err);
    res.status(500).json({ 
      error: "Error fetching client medications",
      details: err.message 
    });
  }
});

// GET /api/medical-screening/:clientID/risk-assessment - Get risk assessment
router.get("/:clientID/risk-assessment", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          clientAlcoholRisk,
          clientAlcoholRiskMed,
          tbCough,
          tbCoughBlood,
          medSweat,
          clientFever,
          clientWeightLoss,
          clientRiskFactors,
          clientSTDStatus,
          clientLastTBTestResults
        FROM MedicalScreening 
        WHERE clientID = @clientID
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "No medical screening data found" });
    }

    const data = result.recordset[0];
    let riskFactors = [];
    let stdStatus = [];

    try {
      riskFactors = JSON.parse(data.clientRiskFactors || '[]');
      stdStatus = JSON.parse(data.clientSTDStatus || '[]');
    } catch (parseError) {
      console.warn("Error parsing risk factors JSON:", parseError);
    }

    const riskAssessment = {
      alcoholRisk: data.clientAlcoholRisk === 'Yes',
      tbSymptoms: [data.tbCough, data.tbCoughBlood, data.medSweat, data.clientFever, data.clientWeightLoss].includes('Yes'),
      tbClearance: data.clientLastTBTestResults === 'Negative',
      sexualRiskFactors: riskFactors.length > 0,
      stdHistory: stdStatus.some(status => status.value !== 'none'),
      overallRiskLevel: 'Low', // This would be calculated based on above factors
    };

    // Calculate overall risk level
    let riskScore = 0;
    if (riskAssessment.alcoholRisk) riskScore += 2;
    if (riskAssessment.tbSymptoms) riskScore += 3;
    if (!riskAssessment.tbClearance) riskScore += 2;
    if (riskAssessment.sexualRiskFactors) riskScore += 1;
    if (riskAssessment.stdHistory) riskScore += 1;

    if (riskScore >= 5) riskAssessment.overallRiskLevel = 'High';
    else if (riskScore >= 3) riskAssessment.overallRiskLevel = 'Medium';
    else riskAssessment.overallRiskLevel = 'Low';

    console.log(`✅ Calculated risk assessment for client ${clientID}: ${riskAssessment.overallRiskLevel} risk`);
    res.json({
      clientID,
      ...riskAssessment,
      riskScore,
      assessmentDate: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("❌ Error calculating risk assessment:", err);
    res.status(500).json({ 
      error: "Error calculating risk assessment",
      details: err.message 
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error("❌ Medical Screening Routes Error:", error);
  res.status(500).json({
    error: "Internal server error in medical screening routes",
    details: error.message
  });
});

module.exports = router;