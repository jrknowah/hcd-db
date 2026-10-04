// routes/carePlans.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Try to load azureSql module (following your existing pattern)
let getPool;
try {
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ azureSql loaded for CarePlans routes');
} catch (err) {
  console.error('❌ Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

const authMiddleware = require('../middleware/auth.js');
const { requireUnlockPermission, canUnlockSignedForms } = require('../middleware/signedFormUnlock');
const {
  DRAFT, SUBMITTED, isSubmitted, wantsSubmit, lockedResponse, getCurrentUser,
  parseUnlockReason, archiveVersion, auditAction, deleteNotPermittedResponse,
} = require('../utils/section4Lock');

const PLAN_COLUMNS = `
  carePlanID as _id,
  clientID,
  careGoal,
  careSteps,
  careClientAct,
  careCmAct,
  careOutcome,
  status,
  priority,
  targetDate,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  submissionStatus,
  submittedBy,
  submittedAt,
  unlockedBy,
  unlockedAt,
  unlockReason`;

const mapPlan = (plan) => ({
  ...plan,
  submissionStatus: plan.submissionStatus || SUBMITTED,
  locked: isSubmitted(plan.submissionStatus),
});

// Generate unique carePlanID
const generateCarePlanID = (clientID) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CP-${clientID}-${timestamp}-${random}`;
};

// Validation helper. A draft needs a goal; submitting also needs the steps.
const validateCarePlanData = (data, submit) => {
  const errors = {};
  
  if (!data.careGoal || data.careGoal.trim() === '') {
    errors.careGoal = 'Care goal is required';
  }
  
  if (submit && (!data.careSteps || data.careSteps.trim() === '')) {
    errors.careSteps = 'Care steps are required to submit';
  }
  
  if (data.status && !['Planning', 'Active', 'In Progress', 'On Hold', 'Completed'].includes(data.status)) {
    errors.status = 'Invalid status value';
  }
  
  if (data.priority && !['High', 'Medium', 'Low'].includes(data.priority)) {
    errors.priority = 'Invalid priority value';
  }
  
  if (data.targetDate && isNaN(new Date(data.targetDate).getTime())) {
    errors.targetDate = 'Invalid target date format';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// GET /api/care-plans/:clientID - Fetch care plans for client
router.get('/care-plans/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📋 Fetching care plans for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(`
        SELECT ${PLAN_COLUMNS}
        FROM CarePlans 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} care plans for client ${clientID}`);
    res.json(result.recordset.map(mapPlan));
  } catch (err) {
    console.error('❌ Error fetching care plans:', err);
    res.status(500).json({ 
      error: 'Failed to fetch care plans',
      message: err.message 
    });
  }
});

// POST /api/care-plans/:clientID - Create new care plan
// { submit: true } submits (locks) the plan; otherwise it is saved as a draft.
router.post('/care-plans/:clientID', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const planData = req.body;
    const submit = wantsSubmit(planData);
    
    // Validation
    const validationErrors = validateCarePlanData(planData, submit);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const carePlanID = generateCarePlanID(clientID);
    // Recorded from the signed-in user, never from the request body
    const createdBy = getCurrentUser(req);
    
    console.log(`📝 Creating ${submit ? 'submitted' : 'draft'} care plan: ${carePlanID} for client: ${clientID}`);
    
    const result = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .input('clientID', sql.VarChar, clientID)
      .input('careGoal', sql.NVarChar, planData.careGoal)
      .input('careSteps', sql.NVarChar, planData.careSteps || '')
      .input('careClientAct', sql.NVarChar, planData.careClientAct || null)
      .input('careCmAct', sql.NVarChar, planData.careCmAct || null)
      .input('careOutcome', sql.NVarChar, planData.careOutcome || null)
      .input('status', sql.VarChar, planData.status || 'Planning')
      .input('priority', sql.VarChar, planData.priority || 'Medium')
      .input('targetDate', sql.Date, planData.targetDate || null)
      .input('createdBy', sql.VarChar, createdBy)
      .input('submissionStatus', sql.NVarChar(20), submit ? SUBMITTED : DRAFT)
      .input('submittedBy', sql.NVarChar, submit ? createdBy : null)
      .input('submittedAt', sql.DateTime2, submit ? new Date() : null)
      .query(`
        INSERT INTO CarePlans (
          carePlanID, clientID, careGoal, careSteps, careClientAct, 
          careCmAct, careOutcome, status, priority, targetDate, createdBy,
          submissionStatus, submittedBy, submittedAt
        )
        VALUES (
          @carePlanID, @clientID, @careGoal, @careSteps, @careClientAct, 
          @careCmAct, @careOutcome, @status, @priority, @targetDate, @createdBy,
          @submissionStatus, @submittedBy, @submittedAt
        );
        
        SELECT ${PLAN_COLUMNS}
        FROM CarePlans 
        WHERE carePlanID = @carePlanID;
      `);
    
    console.log(`✅ Care plan created: ${carePlanID}`);
    res.status(201).json(mapPlan(result.recordset[0]));
  } catch (err) {
    console.error('❌ Error creating care plan:', err);
    res.status(500).json({ 
      error: 'Failed to create care plan',
      message: err.message 
    });
  }
});

// PUT /api/care-plans/:carePlanID - Update a draft care plan
// { submit: true } submits (locks) it. Submitted plans return 409 RECORD_LOCKED.
router.put('/care-plans/:carePlanID', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const { carePlanID } = req.params;
    const updateData = req.body;
    const submit = wantsSubmit(updateData);
    
    // Validation
    const validationErrors = validateCarePlanData(updateData, submit);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log(`📝 Updating care plan: ${carePlanID}`);
    
    // Check if care plan exists and is still a draft
    const checkResult = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .query('SELECT carePlanID, submissionStatus FROM CarePlans WHERE carePlanID = @carePlanID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Care plan not found' });
    }
    if (isSubmitted(checkResult.recordset[0].submissionStatus)) {
      return lockedResponse(res, 'care plan');
    }
    
    // Recorded from the signed-in user, never from the request body
    const updatedBy = getCurrentUser(req);
    // The status guard in the WHERE clause stops a save that races a submit
    const result = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .input('careGoal', sql.NVarChar, updateData.careGoal)
      .input('careSteps', sql.NVarChar, updateData.careSteps || '')
      .input('careClientAct', sql.NVarChar, updateData.careClientAct || null)
      .input('careCmAct', sql.NVarChar, updateData.careCmAct || null)
      .input('careOutcome', sql.NVarChar, updateData.careOutcome || null)
      .input('status', sql.VarChar, updateData.status || 'Planning')
      .input('priority', sql.VarChar, updateData.priority || 'Medium')
      .input('targetDate', sql.Date, updateData.targetDate || null)
      .input('updatedBy', sql.VarChar, updatedBy)
      .input('submissionStatus', sql.NVarChar(20), submit ? SUBMITTED : DRAFT)
      .input('submittedBy', sql.NVarChar, submit ? updatedBy : null)
      .input('submittedAt', sql.DateTime2, submit ? new Date() : null)
      .query(`
        UPDATE CarePlans 
        SET 
          careGoal = @careGoal, 
          careSteps = @careSteps, 
          careClientAct = @careClientAct,
          careCmAct = @careCmAct, 
          careOutcome = @careOutcome, 
          status = @status,
          priority = @priority, 
          targetDate = @targetDate, 
          submissionStatus = @submissionStatus,
          submittedBy = @submittedBy,
          submittedAt = @submittedAt,
          updatedBy = @updatedBy, 
          updatedAt = GETDATE()
        WHERE carePlanID = @carePlanID AND submissionStatus = '${DRAFT}';
        
        SELECT ${PLAN_COLUMNS}
        FROM CarePlans 
        WHERE carePlanID = @carePlanID;
      `);
    
    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return lockedResponse(res, 'care plan');
    }

    console.log(`✅ Care plan updated: ${carePlanID}`);
    res.json(mapPlan(result.recordset[0]));
  } catch (err) {
    console.error('❌ Error updating care plan:', err);
    res.status(500).json({ 
      error: 'Failed to update care plan',
      message: err.message 
    });
  }
});

// PATCH /api/care-plans/:carePlanID/status - Update status only (drafts only)
router.patch('/care-plans/:carePlanID/status', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const { carePlanID } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    if (!['Planning', 'Active', 'In Progress', 'On Hold', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    console.log(`📊 Updating care plan status: ${carePlanID} -> ${status}`);
    
    const result = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .input('status', sql.VarChar, status)
      .input('updatedBy', sql.VarChar, getCurrentUser(req))
      .query(`
        UPDATE CarePlans 
        SET 
          status = @status, 
          updatedBy = @updatedBy, 
          updatedAt = GETDATE()
        WHERE carePlanID = @carePlanID AND submissionStatus = '${DRAFT}';
        
        SELECT ${PLAN_COLUMNS}
        FROM CarePlans 
        WHERE carePlanID = @carePlanID;
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Care plan not found' });
    }
    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return lockedResponse(res, 'care plan');
    }
    
    console.log(`✅ Care plan status updated: ${carePlanID} -> ${status}`);
    res.json(mapPlan(result.recordset[0]));
  } catch (err) {
    console.error('❌ Error updating care plan status:', err);
    res.status(500).json({ 
      error: 'Failed to update care plan status',
      message: err.message 
    });
  }
});

// POST /api/care-plans/:carePlanID/unlock - IT Admin / Level 1 only.
// Archives the submitted plan and returns it to draft so it can be edited.
router.post(
  '/care-plans/:carePlanID/unlock',
  authMiddleware,
  requireUnlockPermission('a submitted care plan'),
  async (req, res) => {
    const { carePlanID } = req.params;
    const reason = parseUnlockReason(req.body);
    if (!reason) {
      return res.status(422).json({ message: 'A reason between 5 and 500 characters is required to unlock a submitted care plan' });
    }

    const currentUser = getCurrentUser(req);
    const now = new Date();

    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      let plan;
      try {
        // UPDLOCK so a concurrent save or unlock can't slip in between read and write
        const existing = await transaction.request()
          .input('carePlanID', sql.VarChar, carePlanID)
          .query(`
            SELECT ${PLAN_COLUMNS}
            FROM CarePlans WITH (UPDLOCK, HOLDLOCK)
            WHERE carePlanID = @carePlanID
          `);

        plan = existing.recordset[0];
        if (!plan) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Care plan not found' });
        }
        if (!isSubmitted(plan.submissionStatus)) {
          await transaction.rollback();
          return res.status(409).json({ code: 'RECORD_NOT_LOCKED', message: 'Care plan is not submitted or locked' });
        }

        await archiveVersion(transaction, {
          action: 'unlock',
          recordType: 'CarePlan',
          recordID: plan._id,
          clientID: plan.clientID,
          snapshot: mapPlan(plan),
          submittedBy: plan.submittedBy,
          submittedAt: plan.submittedAt,
          archivedBy: currentUser,
          archivedAt: now,
          reason,
        });

        await transaction.request()
          .input('carePlanID', sql.VarChar, carePlanID)
          .input('unlockedBy', sql.NVarChar, currentUser)
          .input('unlockedAt', sql.DateTime2, now)
          .input('unlockReason', sql.NVarChar(500), reason)
          .query(`
            UPDATE CarePlans
            SET submissionStatus = '${DRAFT}',
                submittedBy  = NULL,
                submittedAt  = NULL,
                unlockedBy   = @unlockedBy,
                unlockedAt   = @unlockedAt,
                unlockReason = @unlockReason,
                updatedBy    = @unlockedBy,
                updatedAt    = @unlockedAt
            WHERE carePlanID = @carePlanID
          `);

        await transaction.commit();
      } catch (err) {
        await transaction.rollback().catch(() => {});
        throw err;
      }

      await auditAction(pool, {
        action: 'UNLOCK_SUBMITTED_RECORD',
        userID: currentUser,
        tableName: 'CarePlans',
        recordID: plan._id,
        clientID: plan.clientID,
        timestamp: now,
      });

      res.json(mapPlan({
        ...plan,
        submissionStatus: DRAFT,
        submittedBy: null,
        submittedAt: null,
        unlockedBy: currentUser,
        unlockedAt: now,
        unlockReason: reason,
        updatedBy: currentUser,
        updatedAt: now,
      }));
    } catch (err) {
      console.error('❌ Error unlocking care plan:', err.message);
      res.status(500).json({ message: 'Error unlocking care plan' });
    }
  }
);

// DELETE /api/care-plans/:carePlanID - Delete a care plan
// Drafts: any signed-in user. Submitted (locked): IT Admin / Level 1 only,
// with { reason }. A copy is archived to Section4RecordVersions first.
router.delete('/care-plans/:carePlanID', authMiddleware, async (req, res) => {
  const { carePlanID } = req.params;
  const canDeleteSubmitted = canUnlockSignedForms(req.user);
  const reason = parseUnlockReason(req.body);
  const currentUser = getCurrentUser(req);
  const now = new Date();

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    let plan;
    try {
      // UPDLOCK so a concurrent submit or unlock can't slip in between read and delete
      const existing = await transaction.request()
        .input('carePlanID', sql.VarChar, carePlanID)
        .query(`
          SELECT ${PLAN_COLUMNS}
          FROM CarePlans WITH (UPDLOCK, HOLDLOCK)
          WHERE carePlanID = @carePlanID
        `);

      plan = existing.recordset[0];
      if (!plan) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Care plan not found' });
      }

      const submitted = isSubmitted(plan.submissionStatus);
      if (submitted && !canDeleteSubmitted) {
        await transaction.rollback();
        return deleteNotPermittedResponse(res, 'care plan');
      }
      if (submitted && !reason) {
        await transaction.rollback();
        return res.status(422).json({ message: 'A reason between 5 and 500 characters is required to delete a submitted care plan' });
      }

      console.log(`🗑️ Deleting ${submitted ? 'submitted' : 'draft'} care plan: ${carePlanID}`);

      await archiveVersion(transaction, {
        action: 'delete',
        recordType: 'CarePlan',
        recordID: plan._id,
        clientID: plan.clientID,
        snapshot: mapPlan(plan),
        submittedBy: plan.submittedBy,
        submittedAt: plan.submittedAt,
        archivedBy: currentUser,
        archivedAt: now,
        reason,
      });

      await transaction.request()
        .input('carePlanID', sql.VarChar, carePlanID)
        .query('DELETE FROM CarePlans WHERE carePlanID = @carePlanID');

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }

    await auditAction(pool, {
      action: 'DELETE_SECTION4_RECORD',
      userID: currentUser,
      tableName: 'CarePlans',
      recordID: plan._id,
      clientID: plan.clientID,
      timestamp: now,
    });

    console.log(`✅ Care plan deleted: ${carePlanID}`);
    res.json({ message: 'Care plan deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting care plan:', err);
    res.status(500).json({
      error: 'Failed to delete care plan',
      message: err.message
    });
  }
});

// GET /api/care-plans/:clientID/summary - Get care plan summary for client
router.get('/:clientID/summary', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📊 Fetching care plan summary for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.VarChar, clientID)
      .query(`
        SELECT 
          COUNT(*) as totalPlans,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedPlans,
          SUM(CASE WHEN status IN ('Active', 'In Progress') THEN 1 ELSE 0 END) as activePlans,
          SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as highPriorityPlans,
          MAX(updatedAt) as lastActivity
        FROM CarePlans 
        WHERE clientID = @clientID
      `);
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error fetching care plan summary:', err);
    res.status(500).json({ 
      error: 'Failed to fetch care plan summary',
      message: err.message 
    });
  }
});

module.exports = router;
module.exports.validateCarePlanData = validateCarePlanData;