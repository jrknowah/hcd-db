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

// Generate unique carePlanID
const generateCarePlanID = (clientID) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CP-${clientID}-${timestamp}-${random}`;
};

// Validation helper
const validateCarePlanData = (data, isUpdate = false) => {
  const errors = {};
  
  if (!isUpdate || data.careGoal !== undefined) {
    if (!data.careGoal || data.careGoal.trim() === '') {
      errors.careGoal = 'Care goal is required';
    }
  }
  
  if (!isUpdate || data.careSteps !== undefined) {
    if (!data.careSteps || data.careSteps.trim() === '') {
      errors.careSteps = 'Care steps are required';
    }
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
        SELECT 
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
          updatedAt
        FROM CarePlans 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
      `);
    
    console.log(`✅ Found ${result.recordset.length} care plans for client ${clientID}`);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching care plans:', err);
    res.status(500).json({ 
      error: 'Failed to fetch care plans',
      message: err.message 
    });
  }
});

// POST /api/care-plans/:clientID - Create new care plan
router.post('/care-plans/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const planData = req.body;
    
    // Validation
    const validationErrors = validateCarePlanData(planData);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const carePlanID = generateCarePlanID(clientID);
    
    console.log(`📝 Creating care plan: ${carePlanID} for client: ${clientID}`);
    
    const result = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .input('clientID', sql.VarChar, clientID)
      .input('careGoal', sql.NVarChar, planData.careGoal)
      .input('careSteps', sql.NVarChar, planData.careSteps)
      .input('careClientAct', sql.NVarChar, planData.careClientAct || null)
      .input('careCmAct', sql.NVarChar, planData.careCmAct || null)
      .input('careOutcome', sql.NVarChar, planData.careOutcome || null)
      .input('status', sql.VarChar, planData.status || 'Planning')
      .input('priority', sql.VarChar, planData.priority || 'Medium')
      .input('targetDate', sql.Date, planData.targetDate || null)
      .input('createdBy', sql.VarChar, planData.createdBy || 'unknown')
      .query(`
        INSERT INTO CarePlans (
          carePlanID, clientID, careGoal, careSteps, careClientAct, 
          careCmAct, careOutcome, status, priority, targetDate, createdBy
        )
        VALUES (
          @carePlanID, @clientID, @careGoal, @careSteps, @careClientAct, 
          @careCmAct, @careOutcome, @status, @priority, @targetDate, @createdBy
        );
        
        SELECT 
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
          updatedAt
        FROM CarePlans 
        WHERE carePlanID = @carePlanID;
      `);
    
    console.log(`✅ Care plan created: ${carePlanID}`);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error creating care plan:', err);
    res.status(500).json({ 
      error: 'Failed to create care plan',
      message: err.message 
    });
  }
});

// PUT /api/care-plans/:carePlanID - Update care plan
router.put('/care-plans/:carePlanID', async (req, res) => {
  try {
    const pool = await getPool();
    const { carePlanID } = req.params;
    const updateData = req.body;
    
    // Validation
    const validationErrors = validateCarePlanData(updateData, true);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log(`📝 Updating care plan: ${carePlanID}`);
    
    // Check if care plan exists
    const checkResult = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .query('SELECT carePlanID FROM CarePlans WHERE carePlanID = @carePlanID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Care plan not found' });
    }
    
    const result = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .input('careGoal', sql.NVarChar, updateData.careGoal)
      .input('careSteps', sql.NVarChar, updateData.careSteps)
      .input('careClientAct', sql.NVarChar, updateData.careClientAct || null)
      .input('careCmAct', sql.NVarChar, updateData.careCmAct || null)
      .input('careOutcome', sql.NVarChar, updateData.careOutcome || null)
      .input('status', sql.VarChar, updateData.status)
      .input('priority', sql.VarChar, updateData.priority)
      .input('targetDate', sql.Date, updateData.targetDate || null)
      .input('updatedBy', sql.VarChar, updateData.updatedBy || 'unknown')
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
          updatedBy = @updatedBy, 
          updatedAt = GETDATE()
        WHERE carePlanID = @carePlanID;
        
        SELECT 
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
          updatedAt
        FROM CarePlans 
        WHERE carePlanID = @carePlanID;
      `);
    
    console.log(`✅ Care plan updated: ${carePlanID}`);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error updating care plan:', err);
    res.status(500).json({ 
      error: 'Failed to update care plan',
      message: err.message 
    });
  }
});

// PATCH /api/care-plans/:carePlanID/status - Update status only
router.patch('/care-plans/:carePlanID/status', async (req, res) => {
  try {
    const pool = await getPool();
    const { carePlanID } = req.params;
    const { status, updatedBy } = req.body;
    
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
      .input('updatedBy', sql.VarChar, updatedBy || 'unknown')
      .query(`
        UPDATE CarePlans 
        SET 
          status = @status, 
          updatedBy = @updatedBy, 
          updatedAt = GETDATE()
        WHERE carePlanID = @carePlanID;
        
        SELECT 
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
          updatedAt
        FROM CarePlans 
        WHERE carePlanID = @carePlanID;
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Care plan not found' });
    }
    
    console.log(`✅ Care plan status updated: ${carePlanID} -> ${status}`);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error updating care plan status:', err);
    res.status(500).json({ 
      error: 'Failed to update care plan status',
      message: err.message 
    });
  }
});

// DELETE /api/care-plans/:carePlanID - Delete care plan
router.delete('/care-plans/:carePlanID', async (req, res) => {
  try {
    const pool = await getPool();
    const { carePlanID } = req.params;
    
    console.log(`🗑️ Deleting care plan: ${carePlanID}`);
    
    // Check if care plan exists
    const checkResult = await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .query('SELECT carePlanID FROM CarePlans WHERE carePlanID = @carePlanID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Care plan not found' });
    }
    
    await pool.request()
      .input('carePlanID', sql.VarChar, carePlanID)
      .query('DELETE FROM CarePlans WHERE carePlanID = @carePlanID');
    
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