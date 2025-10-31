const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { connectToAzureSQL } = require('../store/azureSql');

// GET /api/idt-nursing/:clientID - Get ALL IDT nursing notes for client
router.get('/idt-nursing/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    console.log(`📡 Fetching IDT nursing notes for client: ${clientID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset))
      .query(`
        SELECT *
        FROM idt_nursing_notes 
        WHERE clientID = @clientID 
        ORDER BY createdAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    
    console.log(`✅ Found ${result.recordset.length} IDT nursing notes`);
    res.json(result.recordset);
    
  } catch (error) {
    console.error('❌ Error fetching IDT nursing notes:', error);
    res.status(500).json({ 
      message: 'Failed to fetch IDT nursing notes', 
      error: error.message 
    });
  }
});

// GET /api/idt-nursing/note/:idtNursingID - Get specific IDT nursing note
router.get('/idt-nursing/note/:idtNursingID', async (req, res) => {
  try {
    const { idtNursingID } = req.params;
    
    console.log(`📡 Fetching IDT nursing note: ${idtNursingID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('idtNursingID', sql.Int, idtNursingID)
      .query(`
        SELECT *
        FROM idt_nursing_notes 
        WHERE idtNursingID = @idtNursingID
      `);
    
    if (result.recordset.length === 0) {
      console.log(`⚠️ IDT nursing note not found: ${idtNursingID}`);
      return res.status(404).json({ 
        message: 'IDT nursing note not found'
      });
    }
    
    console.log(`✅ IDT nursing note found: ${idtNursingID}`);
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Error fetching IDT nursing note:', error);
    res.status(500).json({ 
      message: 'Failed to fetch IDT nursing note', 
      error: error.message 
    });
  }
});

// POST /api/idt-nursing/:clientID - Create new IDT nursing note (always INSERT)
router.post('/idt-nursing/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const noteData = req.body;
    
    console.log(`📡 Creating IDT nursing note for client: ${clientID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('idtNursingAppointYN', sql.NVarChar(sql.MAX), noteData.idtNursingAppointYN || null)
      .input('idtNursingAppoint', sql.NVarChar(sql.MAX), noteData.idtNursingAppoint || null)
      .input('idtNursingProb', sql.NVarChar(sql.MAX), noteData.idtNursingProb || null)
      .input('idtNursingGoal', sql.NVarChar(sql.MAX), noteData.idtNursingGoal || null)
      .input('idtNursingCompliant', sql.NVarChar(sql.MAX), noteData.idtNursingCompliant || null)
      .input('idtNursingInfo', sql.NVarChar(sql.MAX), noteData.idtNursingInfo || null)
      .input('goalStatus', sql.NVarChar(50), noteData.goalStatus || null)
      .input('goalPriority', sql.NVarChar(50), noteData.goalPriority || null)
      .input('goalTargetDate', sql.Date, noteData.goalTargetDate || null)
      .input('complianceScore', sql.Int, noteData.complianceScore || null)
      .input('createdBy', sql.NVarChar(100), noteData.createdBy || 'System')
      .query(`
        INSERT INTO idt_nursing_notes (
          clientID, idtNursingAppointYN, idtNursingAppoint, idtNursingProb,
          idtNursingGoal, idtNursingCompliant, idtNursingInfo,
          goalStatus, goalPriority, goalTargetDate, complianceScore,
          createdBy, createdAt, updatedBy, updatedAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @idtNursingAppointYN, @idtNursingAppoint, @idtNursingProb,
          @idtNursingGoal, @idtNursingCompliant, @idtNursingInfo,
          @goalStatus, @goalPriority, @goalTargetDate, @complianceScore,
          @createdBy, GETDATE(), @createdBy, GETDATE()
        )
      `);
    
    console.log(`✅ IDT nursing note created successfully: ${result.recordset[0].idtNursingID}`);
    res.status(201).json(result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Error creating IDT nursing note:', error);
    res.status(500).json({ 
      message: 'Failed to create IDT nursing note', 
      error: error.message 
    });
  }
});

// PUT /api/idt-nursing/note/:idtNursingID - Update existing IDT nursing note
router.put('/idt-nursing/note/:idtNursingID', async (req, res) => {
  try {
    const { idtNursingID } = req.params;
    const updates = req.body;
    
    console.log(`📡 Updating IDT nursing note: ${idtNursingID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('idtNursingID', sql.Int, idtNursingID)
      .input('idtNursingAppointYN', sql.NVarChar(sql.MAX), updates.idtNursingAppointYN || null)
      .input('idtNursingAppoint', sql.NVarChar(sql.MAX), updates.idtNursingAppoint || null)
      .input('idtNursingProb', sql.NVarChar(sql.MAX), updates.idtNursingProb || null)
      .input('idtNursingGoal', sql.NVarChar(sql.MAX), updates.idtNursingGoal || null)
      .input('idtNursingCompliant', sql.NVarChar(sql.MAX), updates.idtNursingCompliant || null)
      .input('idtNursingInfo', sql.NVarChar(sql.MAX), updates.idtNursingInfo || null)
      .input('goalStatus', sql.NVarChar(50), updates.goalStatus || null)
      .input('goalPriority', sql.NVarChar(50), updates.goalPriority || null)
      .input('goalTargetDate', sql.Date, updates.goalTargetDate || null)
      .input('complianceScore', sql.Int, updates.complianceScore || null)
      .input('updatedBy', sql.NVarChar(100), updates.updatedBy || 'System')
      .query(`
        UPDATE idt_nursing_notes
        SET 
          idtNursingAppointYN = @idtNursingAppointYN,
          idtNursingAppoint = @idtNursingAppoint,
          idtNursingProb = @idtNursingProb,
          idtNursingGoal = @idtNursingGoal,
          idtNursingCompliant = @idtNursingCompliant,
          idtNursingInfo = @idtNursingInfo,
          goalStatus = @goalStatus,
          goalPriority = @goalPriority,
          goalTargetDate = @goalTargetDate,
          complianceScore = @complianceScore,
          updatedBy = @updatedBy,
          updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE idtNursingID = @idtNursingID
      `);
    
    if (result.recordset.length === 0) {
      console.log(`⚠️ IDT nursing note not found: ${idtNursingID}`);
      return res.status(404).json({ 
        message: 'IDT nursing note not found'
      });
    }
    
    console.log(`✅ IDT nursing note updated successfully: ${idtNursingID}`);
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Error updating IDT nursing note:', error);
    res.status(500).json({ 
      message: 'Failed to update IDT nursing note', 
      error: error.message 
    });
  }
});

// DELETE /api/idt-nursing/note/:idtNursingID - Delete IDT nursing note
router.delete('/idt-nursing/note/:idtNursingID', async (req, res) => {
  try {
    const { idtNursingID } = req.params;
    
    console.log(`📡 Deleting IDT nursing note: ${idtNursingID}`);
    
    const pool = await connectToAzureSQL();
    const result = await pool.request()
      .input('idtNursingID', sql.Int, idtNursingID)
      .query(`
        DELETE FROM idt_nursing_notes
        WHERE idtNursingID = @idtNursingID
      `);
    
    if (result.rowsAffected[0] === 0) {
      console.log(`⚠️ IDT nursing note not found: ${idtNursingID}`);
      return res.status(404).json({ 
        message: 'IDT nursing note not found'
      });
    }
    
    console.log(`✅ IDT nursing note deleted successfully: ${idtNursingID}`);
    res.json({ 
      message: 'IDT nursing note deleted successfully',
      idtNursingID: parseInt(idtNursingID)
    });
    
  } catch (error) {
    console.error('❌ Error deleting IDT nursing note:', error);
    res.status(500).json({ 
      message: 'Failed to delete IDT nursing note', 
      error: error.message 
    });
  }
});

module.exports = router;