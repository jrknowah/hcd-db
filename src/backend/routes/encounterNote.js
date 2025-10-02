// routes/encounterNotes.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Try to load azureSql module (following your existing pattern)
let getPool;
try {
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ azureSql loaded for EncounterNotes routes');
} catch (err) {
  console.error('❌ Could not load azureSql module:', err.message);
  throw new Error('azureSql module not found');
}

// Generate unique encounter note ID
const generateEncounterNoteID = (clientID) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EN-${clientID}-${timestamp}-${random}`;
};

// Validation helper
const validateEncounterNoteData = (data, isUpdate = false) => {
  const errors = {};
  
  if (!isUpdate || data.careNoteDate !== undefined) {
    if (!data.careNoteDate) {
      errors.careNoteDate = 'Note date is required';
    } else if (isNaN(new Date(data.careNoteDate).getTime())) {
      errors.careNoteDate = 'Invalid date format';
    }
  }
  
  if (!isUpdate || data.careNoteType !== undefined) {
    if (!data.careNoteType || data.careNoteType.trim() === '') {
      errors.careNoteType = 'Note type is required';
    } else if (!['Individual', 'Crisis', 'Group', 'Summary', 'Intake'].includes(data.careNoteType)) {
      errors.careNoteType = 'Invalid note type';
    }
  }
  
  if (!isUpdate || data.careNote !== undefined) {
    if (!data.careNote || data.careNote.trim() === '') {
      errors.careNote = 'Note content is required';
    } else if (data.careNote.length < 10) {
      errors.careNote = 'Note content must be at least 10 characters';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// GET /api/encounter-notes/:clientID - Fetch encounter notes for client
router.get('/encounter-notes/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📋 Fetching encounter notes for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT 
          Id as _id, 
          ClientID, 
          CareNoteDate, 
          CareNoteType, 
          CareNoteSite, 
          CareNote, 
          CreatedBy, 
          CreatedAt, 
          UpdatedBy, 
          UpdatedAt
        FROM EncounterNotes 
        WHERE ClientID = @clientID 
        ORDER BY CareNoteDate DESC, CreatedAt DESC
      `);
    
    // Map column names to match frontend expectations
    const mappedNotes = result.recordset.map(note => ({
      _id: note._id,
      clientID: note.ClientID,
      careNoteDate: note.CareNoteDate,
      careNoteType: note.CareNoteType,
      careNoteSite: note.CareNoteSite,
      careNote: note.CareNote,
      createdBy: note.CreatedBy,
      createdAt: note.CreatedAt,
      updatedBy: note.UpdatedBy,
      updatedAt: note.UpdatedAt
    }));
    
    console.log(`✅ Found ${mappedNotes.length} encounter notes for client ${clientID}`);
    res.json(mappedNotes);
  } catch (err) {
    console.error('❌ Error fetching encounter notes:', err);
    res.status(500).json({ 
      error: 'Failed to fetch encounter notes',
      message: err.message 
    });
  }
});

// POST /api/encounter-notes/:clientID - Create new encounter note
router.post('/encounter-notes/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const noteData = req.body;
    
    // Validation
    const validationErrors = validateEncounterNoteData(noteData);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log(`📝 Creating encounter note for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('careNoteDate', sql.Date, noteData.careNoteDate)
      .input('careNoteType', sql.NVarChar, noteData.careNoteType)
      .input('careNoteSite', sql.NVarChar, noteData.careNoteSite || null)
      .input('careNote', sql.NVarChar, noteData.careNote)
      .input('createdBy', sql.NVarChar, noteData.createdBy || 'unknown')
      .query(`
        INSERT INTO EncounterNotes (
          ClientID, CareNoteDate, CareNoteType, CareNoteSite, CareNote, CreatedBy
        )
        OUTPUT 
          INSERTED.Id as _id,
          INSERTED.ClientID,
          INSERTED.CareNoteDate,
          INSERTED.CareNoteType,
          INSERTED.CareNoteSite,
          INSERTED.CareNote,
          INSERTED.CreatedBy,
          INSERTED.CreatedAt,
          INSERTED.UpdatedBy,
          INSERTED.UpdatedAt
        VALUES (
          @clientID, @careNoteDate, @careNoteType, @careNoteSite, @careNote, @createdBy
        )
      `);
    
    // Map column names to match frontend expectations
    const createdNote = result.recordset[0];
    const mappedNote = {
      _id: createdNote._id,
      clientID: createdNote.ClientID,
      careNoteDate: createdNote.CareNoteDate,
      careNoteType: createdNote.CareNoteType,
      careNoteSite: createdNote.CareNoteSite,
      careNote: createdNote.CareNote,
      createdBy: createdNote.CreatedBy,
      createdAt: createdNote.CreatedAt,
      updatedBy: createdNote.UpdatedBy,
      updatedAt: createdNote.UpdatedAt
    };
    
    console.log(`✅ Encounter note created: ${mappedNote._id}`);
    res.status(201).json(mappedNote);
  } catch (err) {
    console.error('❌ Error creating encounter note:', err);
    res.status(500).json({ 
      error: 'Failed to create encounter note',
      message: err.message 
    });
  }
});

// PUT /api/encounter-notes/:noteId - Update encounter note
router.put('/encounter-notes/:noteId', async (req, res) => {
  try {
    const pool = await getPool();
    const { noteId } = req.params;
    const updateData = req.body;
    
    // Validation
    const validationErrors = validateEncounterNoteData(updateData, true);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log(`📝 Updating encounter note: ${noteId}`);
    
    // Check if note exists
    const checkResult = await pool.request()
      .input('noteId', sql.UniqueIdentifier, noteId)
      .query('SELECT Id FROM EncounterNotes WHERE Id = @noteId');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Encounter note not found' });
    }
    
    const result = await pool.request()
      .input('noteId', sql.UniqueIdentifier, noteId)
      .input('careNoteDate', sql.Date, updateData.careNoteDate)
      .input('careNoteType', sql.NVarChar, updateData.careNoteType)
      .input('careNoteSite', sql.NVarChar, updateData.careNoteSite || null)
      .input('careNote', sql.NVarChar, updateData.careNote)
      .input('updatedBy', sql.NVarChar, updateData.updatedBy || 'unknown')
      .query(`
        UPDATE EncounterNotes 
        SET 
          CareNoteDate = @careNoteDate, 
          CareNoteType = @careNoteType, 
          CareNoteSite = @careNoteSite, 
          CareNote = @careNote, 
          UpdatedBy = @updatedBy, 
          UpdatedAt = GETUTCDATE()
        WHERE Id = @noteId;
        
        SELECT 
          Id as _id,
          ClientID,
          CareNoteDate,
          CareNoteType,
          CareNoteSite,
          CareNote,
          CreatedBy,
          CreatedAt,
          UpdatedBy,
          UpdatedAt
        FROM EncounterNotes 
        WHERE Id = @noteId;
      `);
    
    // Map column names to match frontend expectations
    const updatedNote = result.recordset[0];
    const mappedNote = {
      _id: updatedNote._id,
      clientID: updatedNote.ClientID,
      careNoteDate: updatedNote.CareNoteDate,
      careNoteType: updatedNote.CareNoteType,
      careNoteSite: updatedNote.CareNoteSite,
      careNote: updatedNote.CareNote,
      createdBy: updatedNote.CreatedBy,
      createdAt: updatedNote.CreatedAt,
      updatedBy: updatedNote.UpdatedBy,
      updatedAt: updatedNote.UpdatedAt
    };
    
    console.log(`✅ Encounter note updated: ${noteId}`);
    res.json(mappedNote);
  } catch (err) {
    console.error('❌ Error updating encounter note:', err);
    res.status(500).json({ 
      error: 'Failed to update encounter note',
      message: err.message 
    });
  }
});

// DELETE /api/encounter-notes/:noteId - Delete encounter note
router.delete('/encounter-notes/:noteId', async (req, res) => {
  try {
    const pool = await getPool();
    const { noteId } = req.params;
    
    console.log(`🗑️ Deleting encounter note: ${noteId}`);
    
    // Check if note exists
    const checkResult = await pool.request()
      .input('noteId', sql.UniqueIdentifier, noteId)
      .query('SELECT Id FROM EncounterNotes WHERE Id = @noteId');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Encounter note not found' });
    }
    
    await pool.request()
      .input('noteId', sql.UniqueIdentifier, noteId)
      .query('DELETE FROM EncounterNotes WHERE Id = @noteId');
    
    console.log(`✅ Encounter note deleted: ${noteId}`);
    res.json({ message: 'Encounter note deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting encounter note:', err);
    res.status(500).json({ 
      error: 'Failed to delete encounter note',
      message: err.message 
    });
  }
});

// GET /api/encounter-notes/summary/:clientID - Get encounter notes summary for client
router.get('/summary/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📊 Fetching encounter notes summary for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT 
          COUNT(*) as totalNotes,
          SUM(CASE WHEN CareNoteType = 'Individual' THEN 1 ELSE 0 END) as individualNotes,
          SUM(CASE WHEN CareNoteType = 'Crisis' THEN 1 ELSE 0 END) as crisisNotes,
          SUM(CASE WHEN CareNoteType = 'Group' THEN 1 ELSE 0 END) as groupNotes,
          SUM(CASE WHEN CareNoteDate >= DATEADD(day, -30, GETDATE()) THEN 1 ELSE 0 END) as notesLast30Days,
          MAX(CareNoteDate) as lastNoteDate,
          MAX(UpdatedAt) as lastActivity
        FROM EncounterNotes 
        WHERE ClientID = @clientID
      `);
    
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error fetching encounter notes summary:', err);
    res.status(500).json({ 
      error: 'Failed to fetch encounter notes summary',
      message: err.message 
    });
  }
});

// GET /api/encounter-notes/bytype/:clientID/:noteType - Get notes by type
router.get('/encounter-notes/bytype/:clientID/:noteType', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID, noteType } = req.params;
    
    console.log(`📋 Fetching ${noteType} notes for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('noteType', sql.NVarChar, noteType)
      .query(`
        SELECT 
          Id as _id, 
          ClientID, 
          CareNoteDate, 
          CareNoteType, 
          CareNoteSite, 
          CareNote, 
          CreatedBy, 
          CreatedAt, 
          UpdatedBy, 
          UpdatedAt
        FROM EncounterNotes 
        WHERE ClientID = @clientID AND CareNoteType = @noteType
        ORDER BY CareNoteDate DESC, CreatedAt DESC
      `);
    
    // Map column names to match frontend expectations
    const mappedNotes = result.recordset.map(note => ({
      _id: note._id,
      clientID: note.ClientID,
      careNoteDate: note.CareNoteDate,
      careNoteType: note.CareNoteType,
      careNoteSite: note.CareNoteSite,
      careNote: note.CareNote,
      createdBy: note.CreatedBy,
      createdAt: note.CreatedAt,
      updatedBy: note.UpdatedBy,
      updatedAt: note.UpdatedAt
    }));
    
    res.json(mappedNotes);
  } catch (err) {
    console.error('❌ Error fetching encounter notes by type:', err);
    res.status(500).json({ 
      error: 'Failed to fetch encounter notes by type',
      message: err.message 
    });
  }
});

module.exports = router;
