// backend/routes/mentalHealthRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Your database connection

// =========================================
// MENTAL HEALTH ROUTES
// =========================================

// GET /api/mental-health/:clientId - Fetch complete mental health assessment
router.get('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get main mental health assessment
    const [assessmentRows] = await db.execute(
      `SELECT * FROM mental_health_assessments WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    );

    if (assessmentRows.length === 0) {
      return res.json({});
    }

    const assessment = assessmentRows[0];

    // Get related data
    const [providers] = await db.execute(
      `SELECT * FROM mental_health_providers WHERE client_id = ? AND active = 1`,
      [clientId]
    );

    const [hospitalizations] = await db.execute(
      `SELECT * FROM mental_health_hospitalizations WHERE client_id = ?`,
      [clientId]
    );

    const [medications] = await db.execute(
      `SELECT * FROM mental_health_medications WHERE client_id = ? AND active = 1`,
      [clientId]
    );

    const [substanceData] = await db.execute(
      `SELECT * FROM substance_abuse_data WHERE client_id = ?`,
      [clientId]
    );

    // Parse JSON fields
    const parseJsonField = (field) => {
      try {
        return field ? JSON.parse(field) : [];
      } catch (e) {
        return [];
      }
    };

    // Combine all data
    const completeData = {
      ...assessment,
      // Parse JSON arrays
      mentalHealthDiagnosis: parseJsonField(assessment.mental_health_diagnosis),
      mhAbuse: parseJsonField(assessment.mh_abuse),
      clientRisk: parseJsonField(assessment.client_risk),
      clientLegalIssues: parseJsonField(assessment.client_legal_issues),
      clientPatFamNeeds: parseJsonField(assessment.client_pat_fam_needs),
      cmOb1: parseJsonField(assessment.cm_ob1),
      cmOb2: parseJsonField(assessment.cm_ob2),
      cmOb3: parseJsonField(assessment.cm_ob3),
      cmOb4: parseJsonField(assessment.cm_ob4),
      cmOb5: parseJsonField(assessment.cm_ob5),
      cmOb6: parseJsonField(assessment.cm_ob6),
      cmOb7: parseJsonField(assessment.cm_ob7),
      cmOb8: parseJsonField(assessment.cm_ob8),
      cmOb9: parseJsonField(assessment.cm_ob9),
      cmOb10: parseJsonField(assessment.cm_ob10),
      cmOb11: parseJsonField(assessment.cm_ob11),
      cmObNone: parseJsonField(assessment.cm_ob_none),
      // Related data
      currentProvider: providers,
      hospitalizations: hospitalizations,
      medications: medications,
      substanceData: substanceData.reduce((acc, item) => {
        acc[item.substance_name] = {
          use: item.substance_use,
          frequency: item.frequency,
          method: item.method,
          yearStarted: item.year_started,
          yearQuit: item.year_quit
        };
        return acc;
      }, {})
    };

    res.json(completeData);
  } catch (error) {
    console.error('Error fetching mental health data:', error);
    res.status(500).json({ error: 'Failed to fetch mental health data' });
  }
});

// POST /api/mental-health/:clientId - Save mental health assessment
router.post('/:clientId', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { clientId } = req.params;
    const formData = req.body;

    // Prepare data for database
    const assessmentData = {
      client_id: clientId,
      // Basic mental health history
      mental_health_history: formData.mentalHealthHistory,
      mental_health_diagnosis: JSON.stringify(formData.mentalHealthDiagnosis || []),
      mental_health_treatment: formData.mentalHealthTreatment,
      mental_health_current_treatment: formData.mentalHealthCurrentTreatment,
      
      // Symptom assessment
      mh_sad: formData.mhSad,
      mh_anxious: formData.mhAnxious,
      mh_sleep_pattern: formData.mhSleepPattern,
      mh_energy_level: formData.mhEnergyLevel,
      mh_concentrate: formData.mhConcentrate,
      mh_thoughts: formData.mhThoughts,
      mh_voices: formData.mhVoices,
      mh_voices_say: formData.mhVoicesSay,
      mh_following: formData.mhFollowing,
      mh_someone: formData.mhSomeone,
      mh_fam_history: formData.mhFamHistory,
      mh_summary: formData.mhSummary,
      
      // Risk assessment
      mh_abuse: JSON.stringify(formData.mhAbuse || []),
      client_risk: JSON.stringify(formData.clientRisk || []),
      mh_self_harm: formData.mhSelfHarm,
      mh_self_harm_occurrence: formData.mhSelfHarmOccurrence,
      mh_suicide: formData.mhSuicide,
      mh_suicide_last: formData.mhSuicideLast,
      mh_risk_summary: formData.mhRiskSummary,
      
      // Substance abuse
      mh_sub_abuse_help: formData.mhSubAbuseHelp,
      mh_sub_ab_sum: formData.mhSubAbSum,
      
      // Legal
      client_legal_issues: JSON.stringify(formData.clientLegalIssues || []),
      client_legal_probation: formData.clientLegalProbation,
      client_legal_parole: formData.clientLegalParole,
      arrest_meth: formData.arrestMeth,
      arrest_drug_alcohol: formData.arrestDrugAlcohol,
      arrest_violent: formData.arrestViolent,
      arrest_arson: formData.arrestArson,
      arrest_sex_crime: formData.arrestSexCrime,
      reg_sex_offender: formData.regSexOffender,
      arrest_crime: formData.arrestCrime,
      mh_legal_sum: formData.mhLegalSum,
      
      // Needs assessment
      client_pat_fam_needs: JSON.stringify(formData.clientPatFamNeeds || []),
      mh_needs_sum: formData.mhNeedsSum,
      
      // Case manager observations
      cm_ob1: JSON.stringify(formData.cmOb1 || []),
      cm_ob2: JSON.stringify(formData.cmOb2 || []),
      cm_ob3: JSON.stringify(formData.cmOb3 || []),
      cm_ob4: JSON.stringify(formData.cmOb4 || []),
      cm_ob5: JSON.stringify(formData.cmOb5 || []),
      cm_ob6: JSON.stringify(formData.cmOb6 || []),
      cm_ob7: JSON.stringify(formData.cmOb7 || []),
      cm_ob8: JSON.stringify(formData.cmOb8 || []),
      cm_ob9: JSON.stringify(formData.cmOb9 || []),
      cm_ob10: JSON.stringify(formData.cmOb10 || []),
      cm_ob11: JSON.stringify(formData.cmOb11 || []),
      cm_ob_none: JSON.stringify(formData.cmObNone || []),
      cm_obv_sum: formData.cmObvSum,
      
      // Metadata
      updated_by: formData.updatedBy,
      updated_at: new Date()
    };

    // Insert or update main assessment
    const [existingAssessment] = await connection.execute(
      `SELECT id FROM mental_health_assessments WHERE client_id = ?`,
      [clientId]
    );

    let assessmentId;
    if (existingAssessment.length > 0) {
      // Update existing
      assessmentId = existingAssessment[0].id;
      const updateFields = Object.keys(assessmentData).map(key => `${key} = ?`).join(', ');
      const updateValues = Object.values(assessmentData);
      
      await connection.execute(
        `UPDATE mental_health_assessments SET ${updateFields} WHERE id = ?`,
        [...updateValues, assessmentId]
      );
    } else {
      // Insert new
      assessmentData.created_at = new Date();
      assessmentData.created_by = formData.updatedBy;
      
      const insertFields = Object.keys(assessmentData).join(', ');
      const insertPlaceholders = Object.keys(assessmentData).map(() => '?').join(', ');
      const insertValues = Object.values(assessmentData);
      
      const [result] = await connection.execute(
        `INSERT INTO mental_health_assessments (${insertFields}) VALUES (${insertPlaceholders})`,
        insertValues
      );
      assessmentId = result.insertId;
    }

    // Save substance abuse data
    if (formData.substanceData) {
      // Clear existing substance data
      await connection.execute(
        `DELETE FROM substance_abuse_data WHERE client_id = ?`,
        [clientId]
      );

      // Insert new substance data
      for (const [substanceName, data] of Object.entries(formData.substanceData)) {
        if (data.use || data.frequency || data.method || data.yearStarted || data.yearQuit) {
          await connection.execute(
            `INSERT INTO substance_abuse_data (client_id, substance_name, substance_use, frequency, method, year_started, year_quit, created_at, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [clientId, substanceName, data.use || '', data.frequency || '', data.method || '', data.yearStarted || '', data.yearQuit || '', formData.updatedBy]
          );
        }
      }
    }

    await connection.commit();
    
    res.json({ 
      success: true, 
      assessmentId,
      message: 'Mental health assessment saved successfully' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error saving mental health data:', error);
    res.status(500).json({ error: 'Failed to save mental health data' });
  } finally {
    connection.release();
  }
});

// POST /api/mental-health/:clientId/providers - Add mental health provider
router.post('/:clientId/providers', async (req, res) => {
  try {
    const { clientId } = req.params;
    const providerData = req.body;

    const [result] = await db.execute(
      `INSERT INTO mental_health_providers (client_id, agency, worker, phone, last_appointment, next_appointment, active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [clientId, providerData.agency, providerData.worker, providerData.phone, providerData.lastAppointment, providerData.nextAppointment]
    );

    const newProvider = {
      id: result.insertId,
      ...providerData
    };

    res.json(newProvider);
  } catch (error) {
    console.error('Error adding provider:', error);
    res.status(500).json({ error: 'Failed to add provider' });
  }
});

// DELETE /api/mental-health/:clientId/providers/:providerId
router.delete('/:clientId/providers/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    
    await db.execute(
      `UPDATE mental_health_providers SET active = 0 WHERE id = ?`,
      [providerId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing provider:', error);
    res.status(500).json({ error: 'Failed to remove provider' });
  }
});

// POST /api/mental-health/:clientId/hospitalizations - Add hospitalization
router.post('/:clientId/hospitalizations', async (req, res) => {
  try {
    const { clientId } = req.params;
    const hospitalizationData = req.body;

    const [result] = await db.execute(
      `INSERT INTO mental_health_hospitalizations (client_id, location, reasons, date, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [clientId, hospitalizationData.location, hospitalizationData.reasons, hospitalizationData.date]
    );

    const newHospitalization = {
      id: result.insertId,
      ...hospitalizationData
    };

    res.json(newHospitalization);
  } catch (error) {
    console.error('Error adding hospitalization:', error);
    res.status(500).json({ error: 'Failed to add hospitalization' });
  }
});

// POST /api/mental-health/:clientId/medications - Add medication
router.post('/:clientId/medications', async (req, res) => {
  try {
    const { clientId } = req.params;
    const medicationData = req.body;

    const [result] = await db.execute(
      `INSERT INTO mental_health_medications (client_id, name, dose, side_effects, active, created_at) 
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [clientId, medicationData.name, medicationData.dose, medicationData.sideEffects]
    );

    const newMedication = {
      id: result.insertId,
      ...medicationData
    };

    res.json(newMedication);
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// =========================================
// ARREST ROUTES
// =========================================

// GET /api/arrests/:clientId - Fetch arrest records
router.get('/arrests/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const [arrests] = await db.execute(
      `SELECT * FROM arrest_records WHERE client_id = ? ORDER BY date DESC`,
      [clientId]
    );
    
    res.json(arrests);
  } catch (error) {
    console.error('Error fetching arrest data:', error);
    res.status(500).json({ error: 'Failed to fetch arrest data' });
  }
});

// POST /api/arrests/:clientId - Add arrest record
router.post('/arrests/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const arrestData = req.body;

    const [result] = await db.execute(
      `INSERT INTO arrest_records (client_id, date, charge, misdemeanor_or_felony, location, time_served, result, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        clientId,
        arrestData.mhaDate,
        arrestData.mhaCharge,
        arrestData.mhaMF,
        arrestData.mhaLoc,
        arrestData.mhaTime,
        arrestData.mhaResult,
        arrestData.createdBy
      ]
    );

    const newArrest = {
      id: result.insertId,
      clientID: clientId,
      date: arrestData.mhaDate,
      charge: arrestData.mhaCharge,
      misdemeanorOrFelony: arrestData.mhaMF,
      location: arrestData.mhaLoc,
      timeServed: arrestData.mhaTime,
      result: arrestData.mhaResult
    };

    res.json(newArrest);
  } catch (error) {
    console.error('Error saving arrest data:', error);
    res.status(500).json({ error: 'Failed to save arrest data' });
  }
});

// DELETE /api/arrests/:clientId/records/:arrestId
router.delete('/arrests/:clientId/records/:arrestId', async (req, res) => {
  try {
    const { arrestId } = req.params;
    
    await db.execute(
      `DELETE FROM arrest_records WHERE id = ?`,
      [arrestId]
    );
    
    res.json({ success: true, deletedId: parseInt(arrestId) });
  } catch (error) {
    console.error('Error deleting arrest record:', error);
    res.status(500).json({ error: 'Failed to delete arrest record' });
  }
});

module.exports = router;

// =========================================
// SERVER SETUP EXAMPLE
// =========================================

/*
// backend/server.js (example integration)
const express = require('express');
const cors = require('cors');
const mentalHealthRoutes = require('./routes/mentalHealthRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/mental-health', mentalHealthRoutes);
app.use('/api', mentalHealthRoutes); // For arrest routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Mental Health API server running on port ${PORT}`);
});
*/