// routes/mentalHealth.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Try to load azureSql module (following your existing pattern)
let getPool;
try {
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ azureSql loaded for Mental Health routes');
} catch (err) {
  console.error('⚠️ Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

// Generate unique mental health assessment ID
const generateMentalHealthID = (clientID) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MH-${clientID}-${timestamp}-${random}`;
};

// Validation helper
const validateMentalHealthData = (data, isUpdate = false) => {
  const errors = {};
  
  if (!isUpdate && !data.clientID) {
    errors.clientID = 'Client ID is required';
  }
  
  if (data.columbiaSRComp && !['Yes', 'No'].includes(data.columbiaSRComp)) {
    errors.columbiaSRComp = 'Columbia SR Comp must be Yes or No';
  }
  
  if (data.riskLevel && !['Minimal', 'Low', 'Medium', 'High'].includes(data.riskLevel)) {
    errors.riskLevel = 'Invalid risk level value';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// Helper function to parse JSON fields safely
const parseJsonField = (field) => {
  try {
    return field ? JSON.parse(field) : [];
  } catch (e) {
    return Array.isArray(field) ? field : [];
  }
};

// Helper function to stringify array fields
const stringifyArrayField = (field) => {
  return Array.isArray(field) ? JSON.stringify(field) : field;
};

// GET /api/mental-health/:clientID - Fetch complete mental health assessment
router.get('/mental-health/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`🧠 Fetching mental health data for client: ${clientID}`);
    
    // Get main mental health assessment
    const assessmentResult = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(`
        SELECT TOP 1 * 
        FROM MentalHealthAssessments 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);

    if (assessmentResult.recordset.length === 0) {
      console.log(`📝 No mental health assessment found for client ${clientID}`);
      return res.json({});
    }

    const assessment = assessmentResult.recordset[0];

    // Get related data
    const [providersResult, hospitalizationsResult, medicationsResult, substanceResult, arrestsResult] = await Promise.all([
      // Get current providers
      pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(`
          SELECT * FROM MentalHealthProviders 
          WHERE clientID = @clientID AND active = 1
          ORDER BY createdAt DESC
        `),
      
      // Get hospitalizations
      pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(`
          SELECT * FROM MentalHealthHospitalizations 
          WHERE clientID = @clientID
          ORDER BY hospitalizationDate DESC
        `),
      
      // Get medications
      pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(`
          SELECT * FROM MentalHealthMedications 
          WHERE clientID = @clientID AND active = 1
          ORDER BY createdAt DESC
        `),
      
      // Get substance abuse data
      pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(`
          SELECT * FROM SubstanceAbuseData 
          WHERE clientID = @clientID
          ORDER BY createdAt DESC
        `),
      
      // Get arrest records
      pool.request()
        .input('clientID', sql.VarChar, clientID)
        .query(`
          SELECT * FROM ArrestRecords 
          WHERE clientID = @clientID
          ORDER BY arrestDate DESC
        `)
    ]);

    // Parse JSON arrays in assessment data
    const completeData = {
      ...assessment,
      // Parse JSON fields
      mentalHealthDiagnosis: parseJsonField(assessment.mentalHealthDiagnosis),
      mhAbuse: parseJsonField(assessment.mhAbuse),
      clientRisk: parseJsonField(assessment.clientRisk),
      clientLegalIssues: parseJsonField(assessment.clientLegalIssues),
      clientPatFamNeeds: parseJsonField(assessment.clientPatFamNeeds),
      cmOb1: parseJsonField(assessment.cmOb1),
      cmOb2: parseJsonField(assessment.cmOb2),
      cmOb3: parseJsonField(assessment.cmOb3),
      cmOb4: parseJsonField(assessment.cmOb4),
      cmOb5: parseJsonField(assessment.cmOb5),
      cmOb6: parseJsonField(assessment.cmOb6),
      cmOb7: parseJsonField(assessment.cmOb7),
      cmOb8: parseJsonField(assessment.cmOb8),
      cmOb9: parseJsonField(assessment.cmOb9),
      cmOb10: parseJsonField(assessment.cmOb10),
      cmOb11: parseJsonField(assessment.cmOb11),
      cmObNone: parseJsonField(assessment.cmObNone),
      
      // Related data
      currentProvider: providersResult.recordset,
      hospitalizations: hospitalizationsResult.recordset,
      medications: medicationsResult.recordset,
      
      // Transform substance data to object format
      substanceData: substanceResult.recordset.reduce((acc, item) => {
        acc[item.substanceName] = {
          use: item.substanceUse,
          frequency: item.frequency,
          method: item.method,
          yearStarted: item.yearStarted,
          yearQuit: item.yearQuit
        };
        return acc;
      }, {}),
      
      // Include arrest records
      arrestRecords: arrestsResult.recordset
    };

    console.log(`✅ Mental health data retrieved for client ${clientID}`);
    res.json(completeData);
    
  } catch (error) {
    console.error('⚠️ Error fetching mental health data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mental health data',
      message: error.message 
    });
  }
});

// POST /api/mental-health/:clientID - Save mental health assessment
router.post('/mental-health/:clientID', async (req, res) => {
  const pool = await getPool();
  let transaction;
  
  try {
    const { clientID } = req.params;
    const formData = req.body;
    
    // Validation
    const validationErrors = validateMentalHealthData(formData);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    console.log(`🧠 Saving mental health assessment for client: ${clientID}`);
    
    // Check if assessment already exists
    const existingResult = await new sql.Request(transaction)
      .input('clientID', sql.VarChar, clientID)
      .query('SELECT mentalHealthID FROM MentalHealthAssessments WHERE clientID = @clientID');

    let mentalHealthID;
    let operation;

    if (existingResult.recordset.length > 0) {
      // Update existing assessment
      mentalHealthID = existingResult.recordset[0].mentalHealthID;
      operation = 'UPDATE';
      
      await new sql.Request(transaction)
        .input('clientID', sql.VarChar, clientID)
        .input('mentalHealthHistory', sql.NVarChar, formData.mentalHealthHistory || '')
        .input('mentalHealthDiagnosis', sql.NVarChar, stringifyArrayField(formData.mentalHealthDiagnosis))
        .input('mentalHealthTreatment', sql.NVarChar, formData.mentalHealthTreatment || '')
        .input('mentalHealthCurrentTreatment', sql.NVarChar, formData.mentalHealthCurrentTreatment || '')
        .input('mhSad', sql.VarChar, formData.mhSad || '')
        .input('mhAnxious', sql.VarChar, formData.mhAnxious || '')
        .input('mhSleepPattern', sql.VarChar, formData.mhSleepPattern || '')
        .input('mhEnergyLevel', sql.VarChar, formData.mhEnergyLevel || '')
        .input('mhConcentrate', sql.VarChar, formData.mhConcentrate || '')
        .input('mhThoughts', sql.VarChar, formData.mhThoughts || '')
        .input('mhVoices', sql.VarChar, formData.mhVoices || '')
        .input('mhVoicesSay', sql.NVarChar, formData.mhVoicesSay || '')
        .input('mhFollowing', sql.VarChar, formData.mhFollowing || '')
        .input('mhSomeone', sql.VarChar, formData.mhSomeone || '')
        .input('mhFamHistory', sql.NVarChar, formData.mhFamHistory || '')
        .input('mhSummary', sql.NVarChar, formData.mhSummary || '')
        .input('mhAbuse', sql.NVarChar, stringifyArrayField(formData.mhAbuse))
        .input('clientRisk', sql.NVarChar, stringifyArrayField(formData.clientRisk))
        .input('mhSelfHarm', sql.VarChar, formData.mhSelfHarm || '')
        .input('mhSelfHarmOccurrence', sql.NVarChar, formData.mhSelfHarmOccurrence || '')
        .input('mhSuicide', sql.VarChar, formData.mhSuicide || '')
        .input('mhSuicideLast', sql.NVarChar, formData.mhSuicideLast || '')
        .input('mhRiskSummary', sql.NVarChar, formData.mhRiskSummary || '')
        .input('mhSubAbuseHelp', sql.VarChar, formData.mhSubAbuseHelp || '')
        .input('mhSubAbSum', sql.NVarChar, formData.mhSubAbSum || '')
        .input('clientLegalIssues', sql.NVarChar, stringifyArrayField(formData.clientLegalIssues))
        .input('clientLegalProbation', sql.VarChar, formData.clientLegalProbation || '')
        .input('clientLegalParole', sql.VarChar, formData.clientLegalParole || '')
        .input('arrestMeth', sql.VarChar, formData.arrestMeth || '')
        .input('arrestDrugAlcohol', sql.VarChar, formData.arrestDrugAlcohol || '')
        .input('arrestViolent', sql.VarChar, formData.arrestViolent || '')
        .input('arrestArson', sql.VarChar, formData.arrestArson || '')
        .input('arrestSexCrime', sql.VarChar, formData.arrestSexCrime || '')
        .input('regSexOffender', sql.VarChar, formData.regSexOffender || '')
        .input('arrestCrime', sql.NVarChar, formData.arrestCrime || '')
        .input('mhLegalSum', sql.NVarChar, formData.mhLegalSum || '')
        .input('clientPatFamNeeds', sql.NVarChar, stringifyArrayField(formData.clientPatFamNeeds))
        .input('mhNeedsSum', sql.NVarChar, formData.mhNeedsSum || '')
        .input('cmOb1', sql.NVarChar, stringifyArrayField(formData.cmOb1))
        .input('cmOb2', sql.NVarChar, stringifyArrayField(formData.cmOb2))
        .input('cmOb3', sql.NVarChar, stringifyArrayField(formData.cmOb3))
        .input('cmOb4', sql.NVarChar, stringifyArrayField(formData.cmOb4))
        .input('cmOb5', sql.NVarChar, stringifyArrayField(formData.cmOb5))
        .input('cmOb6', sql.NVarChar, stringifyArrayField(formData.cmOb6))
        .input('cmOb7', sql.NVarChar, stringifyArrayField(formData.cmOb7))
        .input('cmOb8', sql.NVarChar, stringifyArrayField(formData.cmOb8))
        .input('cmOb9', sql.NVarChar, stringifyArrayField(formData.cmOb9))
        .input('cmOb10', sql.NVarChar, stringifyArrayField(formData.cmOb10))
        .input('cmOb11', sql.NVarChar, stringifyArrayField(formData.cmOb11))
        .input('cmObNone', sql.NVarChar, stringifyArrayField(formData.cmObNone))
        .input('cmObvSum', sql.NVarChar, formData.cmObvSum || '')
        .input('columbiaSRComp', sql.VarChar, formData.columbiaSRComp || 'No')
        .input('riskLevel', sql.VarChar, formData.riskLevel || 'Minimal')
        .input('completionStatus', sql.VarChar, formData.completionStatus || 'In Progress')
        .input('completionPercentage', sql.Decimal, formData.completionPercentage || 0)
        .input('updatedBy', sql.VarChar, formData.updatedBy || 'unknown')
        .query(`
          UPDATE MentalHealthAssessments SET
            mentalHealthHistory = @mentalHealthHistory,
            mentalHealthDiagnosis = @mentalHealthDiagnosis,
            mentalHealthTreatment = @mentalHealthTreatment,
            mentalHealthCurrentTreatment = @mentalHealthCurrentTreatment,
            mhSad = @mhSad,
            mhAnxious = @mhAnxious,
            mhSleepPattern = @mhSleepPattern,
            mhEnergyLevel = @mhEnergyLevel,
            mhConcentrate = @mhConcentrate,
            mhThoughts = @mhThoughts,
            mhVoices = @mhVoices,
            mhVoicesSay = @mhVoicesSay,
            mhFollowing = @mhFollowing,
            mhSomeone = @mhSomeone,
            mhFamHistory = @mhFamHistory,
            mhSummary = @mhSummary,
            mhAbuse = @mhAbuse,
            clientRisk = @clientRisk,
            mhSelfHarm = @mhSelfHarm,
            mhSelfHarmOccurrence = @mhSelfHarmOccurrence,
            mhSuicide = @mhSuicide,
            mhSuicideLast = @mhSuicideLast,
            mhRiskSummary = @mhRiskSummary,
            mhSubAbuseHelp = @mhSubAbuseHelp,
            mhSubAbSum = @mhSubAbSum,
            clientLegalIssues = @clientLegalIssues,
            clientLegalProbation = @clientLegalProbation,
            clientLegalParole = @clientLegalParole,
            arrestMeth = @arrestMeth,
            arrestDrugAlcohol = @arrestDrugAlcohol,
            arrestViolent = @arrestViolent,
            arrestArson = @arrestArson,
            arrestSexCrime = @arrestSexCrime,
            regSexOffender = @regSexOffender,
            arrestCrime = @arrestCrime,
            mhLegalSum = @mhLegalSum,
            clientPatFamNeeds = @clientPatFamNeeds,
            mhNeedsSum = @mhNeedsSum,
            cmOb1 = @cmOb1,
            cmOb2 = @cmOb2,
            cmOb3 = @cmOb3,
            cmOb4 = @cmOb4,
            cmOb5 = @cmOb5,
            cmOb6 = @cmOb6,
            cmOb7 = @cmOb7,
            cmOb8 = @cmOb8,
            cmOb9 = @cmOb9,
            cmOb10 = @cmOb10,
            cmOb11 = @cmOb11,
            cmObNone = @cmObNone,
            cmObvSum = @cmObvSum,
            columbiaSRComp = @columbiaSRComp,
            riskLevel = @riskLevel,
            completionStatus = @completionStatus,
            completionPercentage = @completionPercentage,
            updatedBy = @updatedBy,
            updatedAt = GETDATE()
          WHERE clientID = @clientID
        `);
        
    } else {
      // Insert new assessment
      mentalHealthID = generateMentalHealthID(clientID);
      operation = 'INSERT';
      
      await new sql.Request(transaction)
        .input('mentalHealthID', sql.VarChar, mentalHealthID)
        .input('clientID', sql.VarChar, clientID)
        .input('mentalHealthHistory', sql.NVarChar, formData.mentalHealthHistory || '')
        .input('mentalHealthDiagnosis', sql.NVarChar, stringifyArrayField(formData.mentalHealthDiagnosis))
        .input('mentalHealthTreatment', sql.NVarChar, formData.mentalHealthTreatment || '')
        .input('mentalHealthCurrentTreatment', sql.NVarChar, formData.mentalHealthCurrentTreatment || '')
        .input('mhSad', sql.VarChar, formData.mhSad || '')
        .input('mhAnxious', sql.VarChar, formData.mhAnxious || '')
        .input('mhSleepPattern', sql.VarChar, formData.mhSleepPattern || '')
        .input('mhEnergyLevel', sql.VarChar, formData.mhEnergyLevel || '')
        .input('mhConcentrate', sql.VarChar, formData.mhConcentrate || '')
        .input('mhThoughts', sql.VarChar, formData.mhThoughts || '')
        .input('mhVoices', sql.VarChar, formData.mhVoices || '')
        .input('mhVoicesSay', sql.NVarChar, formData.mhVoicesSay || '')
        .input('mhFollowing', sql.VarChar, formData.mhFollowing || '')
        .input('mhSomeone', sql.VarChar, formData.mhSomeone || '')
        .input('mhFamHistory', sql.NVarChar, formData.mhFamHistory || '')
        .input('mhSummary', sql.NVarChar, formData.mhSummary || '')
        .input('mhAbuse', sql.NVarChar, stringifyArrayField(formData.mhAbuse))
        .input('clientRisk', sql.NVarChar, stringifyArrayField(formData.clientRisk))
        .input('mhSelfHarm', sql.VarChar, formData.mhSelfHarm || '')
        .input('mhSelfHarmOccurrence', sql.NVarChar, formData.mhSelfHarmOccurrence || '')
        .input('mhSuicide', sql.VarChar, formData.mhSuicide || '')
        .input('mhSuicideLast', sql.NVarChar, formData.mhSuicideLast || '')
        .input('mhRiskSummary', sql.NVarChar, formData.mhRiskSummary || '')
        .input('mhSubAbuseHelp', sql.VarChar, formData.mhSubAbuseHelp || '')
        .input('mhSubAbSum', sql.NVarChar, formData.mhSubAbSum || '')
        .input('clientLegalIssues', sql.NVarChar, stringifyArrayField(formData.clientLegalIssues))
        .input('clientLegalProbation', sql.VarChar, formData.clientLegalProbation || '')
        .input('clientLegalParole', sql.VarChar, formData.clientLegalParole || '')
        .input('arrestMeth', sql.VarChar, formData.arrestMeth || '')
        .input('arrestDrugAlcohol', sql.VarChar, formData.arrestDrugAlcohol || '')
        .input('arrestViolent', sql.VarChar, formData.arrestViolent || '')
        .input('arrestArson', sql.VarChar, formData.arrestArson || '')
        .input('arrestSexCrime', sql.VarChar, formData.arrestSexCrime || '')
        .input('regSexOffender', sql.VarChar, formData.regSexOffender || '')
        .input('arrestCrime', sql.NVarChar, formData.arrestCrime || '')
        .input('mhLegalSum', sql.NVarChar, formData.mhLegalSum || '')
        .input('clientPatFamNeeds', sql.NVarChar, stringifyArrayField(formData.clientPatFamNeeds))
        .input('mhNeedsSum', sql.NVarChar, formData.mhNeedsSum || '')
        .input('cmOb1', sql.NVarChar, stringifyArrayField(formData.cmOb1))
        .input('cmOb2', sql.NVarChar, stringifyArrayField(formData.cmOb2))
        .input('cmOb3', sql.NVarChar, stringifyArrayField(formData.cmOb3))
        .input('cmOb4', sql.NVarChar, stringifyArrayField(formData.cmOb4))
        .input('cmOb5', sql.NVarChar, stringifyArrayField(formData.cmOb5))
        .input('cmOb6', sql.NVarChar, stringifyArrayField(formData.cmOb6))
        .input('cmOb7', sql.NVarChar, stringifyArrayField(formData.cmOb7))
        .input('cmOb8', sql.NVarChar, stringifyArrayField(formData.cmOb8))
        .input('cmOb9', sql.NVarChar, stringifyArrayField(formData.cmOb9))
        .input('cmOb10', sql.NVarChar, stringifyArrayField(formData.cmOb10))
        .input('cmOb11', sql.NVarChar, stringifyArrayField(formData.cmOb11))
        .input('cmObNone', sql.NVarChar, stringifyArrayField(formData.cmObNone))
        .input('cmObvSum', sql.NVarChar, formData.cmObvSum || '')
        .input('columbiaSRComp', sql.VarChar, formData.columbiaSRComp || 'No')
        .input('riskLevel', sql.VarChar, formData.riskLevel || 'Minimal')
        .input('completionStatus', sql.VarChar, 'In Progress')
        .input('completionPercentage', sql.Decimal, formData.completionPercentage || 0)
        .input('createdBy', sql.VarChar, formData.updatedBy || 'unknown')
        .input('updatedBy', sql.VarChar, formData.updatedBy || 'unknown')
        .query(`
          INSERT INTO MentalHealthAssessments (
            mentalHealthID, clientID, mentalHealthHistory, mentalHealthDiagnosis,
            mentalHealthTreatment, mentalHealthCurrentTreatment, mhSad, mhAnxious,
            mhSleepPattern, mhEnergyLevel, mhConcentrate, mhThoughts, mhVoices,
            mhVoicesSay, mhFollowing, mhSomeone, mhFamHistory, mhSummary, mhAbuse,
            clientRisk, mhSelfHarm, mhSelfHarmOccurrence, mhSuicide, mhSuicideLast,
            mhRiskSummary, mhSubAbuseHelp, mhSubAbSum, clientLegalIssues,
            clientLegalProbation, clientLegalParole, arrestMeth, arrestDrugAlcohol,
            arrestViolent, arrestArson, arrestSexCrime, regSexOffender, arrestCrime,
            mhLegalSum, clientPatFamNeeds, mhNeedsSum, cmOb1, cmOb2, cmOb3, cmOb4,
            cmOb5, cmOb6, cmOb7, cmOb8, cmOb9, cmOb10, cmOb11, cmObNone, cmObvSum,
            columbiaSRComp, riskLevel, completionStatus, completionPercentage,
            createdBy, createdAt, updatedBy, updatedAt
          ) VALUES (
            @mentalHealthID, @clientID, @mentalHealthHistory, @mentalHealthDiagnosis,
            @mentalHealthTreatment, @mentalHealthCurrentTreatment, @mhSad, @mhAnxious,
            @mhSleepPattern, @mhEnergyLevel, @mhConcentrate, @mhThoughts, @mhVoices,
            @mhVoicesSay, @mhFollowing, @mhSomeone, @mhFamHistory, @mhSummary, @mhAbuse,
            @clientRisk, @mhSelfHarm, @mhSelfHarmOccurrence, @mhSuicide, @mhSuicideLast,
            @mhRiskSummary, @mhSubAbuseHelp, @mhSubAbSum, @clientLegalIssues,
            @clientLegalProbation, @clientLegalParole, @arrestMeth, @arrestDrugAlcohol,
            @arrestViolent, @arrestArson, @arrestSexCrime, @regSexOffender, @arrestCrime,
            @mhLegalSum, @clientPatFamNeeds, @mhNeedsSum, @cmOb1, @cmOb2, @cmOb3, @cmOb4,
            @cmOb5, @cmOb6, @cmOb7, @cmOb8, @cmOb9, @cmOb10, @cmOb11, @cmObNone, @cmObvSum,
            @columbiaSRComp, @riskLevel, @completionStatus, @completionPercentage,
            @createdBy, GETDATE(), @updatedBy, GETDATE()
          )
        `);
    }

    // Save substance abuse data
    if (formData.substanceData) {
      // Clear existing substance data
      await new sql.Request(transaction)
        .input('clientID', sql.VarChar, clientID)
        .query('DELETE FROM SubstanceAbuseData WHERE clientID = @clientID');

      // Insert new substance data
      for (const [substanceName, data] of Object.entries(formData.substanceData)) {
        if (data.use || data.frequency || data.method || data.yearStarted || data.yearQuit) {
          await new sql.Request(transaction)
            .input('clientID', sql.VarChar, clientID)
            .input('substanceName', sql.VarChar, substanceName)
            .input('substanceUse', sql.VarChar, data.use || '')
            .input('frequency', sql.VarChar, data.frequency || '')
            .input('method', sql.VarChar, data.method || '')
            .input('yearStarted', sql.VarChar, data.yearStarted || '')
            .input('yearQuit', sql.VarChar, data.yearQuit || '')
            .input('createdBy', sql.VarChar, formData.updatedBy || 'unknown')
            .query(`
              INSERT INTO SubstanceAbuseData (
                clientID, substanceName, substanceUse, frequency, method, 
                yearStarted, yearQuit, createdBy, createdAt
              ) VALUES (
                @clientID, @substanceName, @substanceUse, @frequency, @method,
                @yearStarted, @yearQuit, @createdBy, GETDATE()
              )
            `);
        }
      }
    }

    await transaction.commit();
    
    console.log(`✅ Mental health assessment ${operation} completed: ${mentalHealthID}`);
    res.json({ 
      success: true, 
      mentalHealthID,
      operation,
      message: `Mental health assessment ${operation === 'INSERT' ? 'created' : 'updated'} successfully` 
    });

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    console.error('⚠️ Error saving mental health data:', error);
    res.status(500).json({ 
      error: 'Failed to save mental health data',
      message: error.message 
    });
  }
});

// POST /api/mental-health/:clientID/providers - Add mental health provider
router.post('/mental-health/:clientID/providers', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const providerData = req.body;

    console.log(`🏥 Adding provider for client: ${clientID}`);

    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .input('agency', sql.NVarChar, providerData.agency)
      .input('worker', sql.NVarChar, providerData.worker)
      .input('phone', sql.VarChar, providerData.phone)
      .input('lastAppointment', sql.Date, providerData.lastAppointment || null)
      .input('nextAppointment', sql.Date, providerData.nextAppointment || null)
      .input('createdBy', sql.VarChar, providerData.createdBy || 'unknown')
      .query(`
        INSERT INTO MentalHealthProviders (
          clientID, agency, worker, phone, lastAppointment, nextAppointment, 
          active, createdBy, createdAt
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @agency, @worker, @phone, @lastAppointment, @nextAppointment, 
          1, @createdBy, GETDATE()
        )
      `);

    console.log(`✅ Provider added for client ${clientID}`);
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('⚠️ Error adding provider:', error);
    res.status(500).json({ 
      error: 'Failed to add provider',
      message: error.message 
    });
  }
});

// DELETE /api/mental-health/:clientID/providers/:providerID
router.delete('/:clientID/providers/:providerID', async (req, res) => {
  try {
    const pool = await getPool();
    const { providerID } = req.params;
    
    console.log(`🗑️ Removing provider: ${providerID}`);
    
    await pool.request()
      .input('providerID', sql.VarChar, providerID)
      .query('UPDATE MentalHealthProviders SET active = 0 WHERE providerID = @providerID');
    
    console.log(`✅ Provider ${providerID} deactivated`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('⚠️ Error removing provider:', error);
    res.status(500).json({ 
      error: 'Failed to remove provider',
      message: error.message 
    });
  }
});

// POST /api/mental-health/:clientID/hospitalizations - Add hospitalization
router.post('/mental-health/:clientID/hospitalizations', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const hospitalizationData = req.body;

    console.log(`🏥 Adding hospitalization for client: ${clientID}`);

    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .input('location', sql.NVarChar, hospitalizationData.location)
      .input('reasons', sql.NVarChar, hospitalizationData.reasons)
      .input('hospitalizationDate', sql.Date, hospitalizationData.date)
      .input('createdBy', sql.VarChar, hospitalizationData.createdBy || 'unknown')
      .query(`
        INSERT INTO MentalHealthHospitalizations (
          clientID, location, reasons, hospitalizationDate, createdBy, createdAt
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @location, @reasons, @hospitalizationDate, @createdBy, GETDATE()
        )
      `);

    console.log(`✅ Hospitalization added for client ${clientID}`);
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('⚠️ Error adding hospitalization:', error);
    res.status(500).json({ 
      error: 'Failed to add hospitalization',
      message: error.message 
    });
  }
});

// POST /api/mental-health/:clientID/medications - Add medication
router.post('/mental-health/:clientID/medications', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const medicationData = req.body;

    console.log(`💊 Adding medication for client: ${clientID}`);

    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .input('name', sql.NVarChar, medicationData.name)
      .input('dose', sql.NVarChar, medicationData.dose)
      .input('sideEffects', sql.NVarChar, medicationData.sideEffects)
      .input('createdBy', sql.VarChar, medicationData.createdBy || 'unknown')
      .query(`
        INSERT INTO MentalHealthMedications (
          clientID, name, dose, sideEffects, active, createdBy, createdAt
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @name, @dose, @sideEffects, 1, @createdBy, GETDATE()
        )
      `);

    console.log(`✅ Medication added for client ${clientID}`);
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('⚠️ Error adding medication:', error);
    res.status(500).json({ 
      error: 'Failed to add medication',
      message: error.message 
    });
  }
});

// GET /api/mental-health/:clientID/arrests - Fetch arrest records
router.get('/mental-health/:clientID/arrests', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`👮 Fetching arrest records for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(`
        SELECT * FROM ArrestRecords 
        WHERE clientID = @clientID 
        ORDER BY arrestDate DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} arrest records for client ${clientID}`);
    res.json(result.recordset);
    
  } catch (error) {
    console.error('⚠️ Error fetching arrest data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch arrest data',
      message: error.message 
    });
  }
});

// POST /api/mental-health/:clientID/arrests - Add arrest record
router.post('/mental-health/:clientID/arrests', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const arrestData = req.body;

    console.log(`👮 Adding arrest record for client: ${clientID}`);

    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .input('arrestDate', sql.Date, arrestData.mhaDate)
      .input('charge', sql.NVarChar, arrestData.mhaCharge)
      .input('misdemeanorOrFelony', sql.VarChar, arrestData.mhaMF)
      .input('location', sql.NVarChar, arrestData.mhaLoc)
      .input('timeServed', sql.NVarChar, arrestData.mhaTime)
      .input('result', sql.NVarChar, arrestData.mhaResult)
      .input('createdBy', sql.VarChar, arrestData.createdBy || 'unknown')
      .query(`
        INSERT INTO ArrestRecords (
          clientID, arrestDate, charge, misdemeanorOrFelony, location, 
          timeServed, result, createdBy, createdAt
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @arrestDate, @charge, @misdemeanorOrFelony, @location,
          @timeServed, @result, @createdBy, GETDATE()
        )
      `);

    console.log(`✅ Arrest record added for client ${clientID}`);
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('⚠️ Error saving arrest data:', error);
    res.status(500).json({ 
      error: 'Failed to save arrest data',
      message: error.message 
    });
  }
});

// DELETE /api/mental-health/:clientID/arrests/:arrestID
router.delete('/mental-health/:clientID/arrests/:arrestID', async (req, res) => {
  try {
    const pool = await getPool();
    const { arrestID } = req.params;
    
    console.log(`🗑️ Deleting arrest record: ${arrestID}`);
    
    await pool.request()
      .input('arrestID', sql.VarChar, arrestID)
      .query('DELETE FROM ArrestRecords WHERE arrestID = @arrestID');
    
    console.log(`✅ Arrest record ${arrestID} deleted`);
    res.json({ success: true, deletedId: arrestID });
    
  } catch (error) {
    console.error('⚠️ Error deleting arrest record:', error);
    res.status(500).json({ 
      error: 'Failed to delete arrest record',
      message: error.message 
    });
  }
});

// GET /api/mental-health/:clientID/summary - Get mental health summary
router.get('/mental-health/:clientID/summary', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📊 Fetching mental health summary for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(`
        SELECT 
          COUNT(DISTINCT mh.mentalHealthID) as totalAssessments,
          mh.riskLevel,
          mh.completionStatus,
          mh.completionPercentage,
          COUNT(DISTINCT p.providerID) as activeProviders,
          COUNT(DISTINCT h.hospitalizationID) as totalHospitalizations,
          COUNT(DISTINCT m.medicationID) as activeMedications,
          COUNT(DISTINCT ar.arrestID) as totalArrests,
          MAX(mh.updatedAt) as lastActivity
        FROM MentalHealthAssessments mh
        LEFT JOIN MentalHealthProviders p ON p.clientID = mh.clientID AND p.active = 1
        LEFT JOIN MentalHealthHospitalizations h ON h.clientID = mh.clientID
        LEFT JOIN MentalHealthMedications m ON m.clientID = mh.clientID AND m.active = 1
        LEFT JOIN ArrestRecords ar ON ar.clientID = mh.clientID
        WHERE mh.clientID = @clientID
        GROUP BY mh.riskLevel, mh.completionStatus, mh.completionPercentage
      `);
    
    console.log(`✅ Mental health summary retrieved for client ${clientID}`);
    res.json(result.recordset[0] || {});
    
  } catch (error) {
    console.error('⚠️ Error fetching mental health summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mental health summary',
      message: error.message 
    });
  }
});

module.exports = router;