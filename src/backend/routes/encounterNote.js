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

const authMiddleware = require('../middleware/auth.js');
const { requireUnlockPermission, canUnlockSignedForms } = require('../middleware/signedFormUnlock');
const {
  DRAFT, SUBMITTED, isSubmitted, wantsSubmit, lockedResponse, getCurrentUser,
  parseUnlockReason, archiveVersion, auditAction, deleteNotPermittedResponse,
} = require('../utils/section4Lock');

// =====================================================================
// ⚠️  DB MIGRATION REQUIRED if you haven't run this yet:
//   ALTER TABLE EncounterNotes
//     DROP CONSTRAINT <your_existing_careNoteType_check>;
//   ALTER TABLE EncounterNotes
//     ADD CONSTRAINT CK_EncounterNotes_CareNoteType
//     CHECK (CareNoteType IN (
//       'Individual','Crisis','Group','Summary','Intake',
//       'MHA','Care Plan','Discharge','Case Conference'
//     ));
// =====================================================================

const VALID_NOTE_TYPES = [
  'Individual', 'Crisis', 'Group', 'Summary', 'Intake',
  'MHA', 'Care Plan', 'Discharge', 'Case Conference'
];

const NOTE_COLUMNS = `
  Id as _id,
  ClientID,
  CareNoteDate,
  CareNoteType,
  CareNoteSite,
  CareNote,
  CreatedBy,
  CreatedAt,
  UpdatedBy,
  UpdatedAt,
  SubmissionStatus,
  SubmittedBy,
  SubmittedAt,
  UnlockedBy,
  UnlockedAt,
  UnlockReason`;

// Map column names to match frontend expectations
const mapNote = (note) => ({
  _id: note._id,
  clientID: note.ClientID,
  careNoteDate: note.CareNoteDate,
  careNoteType: note.CareNoteType,
  careNoteSite: note.CareNoteSite,
  careNote: note.CareNote,
  createdBy: note.CreatedBy,
  createdAt: note.CreatedAt,
  updatedBy: note.UpdatedBy,
  updatedAt: note.UpdatedAt,
  submissionStatus: note.SubmissionStatus || SUBMITTED,
  submittedBy: note.SubmittedBy || null,
  submittedAt: note.SubmittedAt || null,
  unlockedBy: note.UnlockedBy || null,
  unlockedAt: note.UnlockedAt || null,
  unlockReason: note.UnlockReason || null,
  locked: isSubmitted(note.SubmissionStatus),
});

// A submitted note needs its content; a draft only needs what the table requires
const validateNote = (data, submit) => {
  if (!data.careNoteDate || isNaN(new Date(data.careNoteDate).getTime())) {
    return 'Note date is required';
  }
  if (!data.careNoteType) {
    return 'Note type is required';
  }
  if (data.careNoteType && !VALID_NOTE_TYPES.includes(data.careNoteType)) {
    return `Invalid note type '${data.careNoteType}'. Allowed: ${VALID_NOTE_TYPES.join(', ')}`;
  }
  if (submit && (typeof data.careNote !== 'string' || !data.careNote.trim())) {
    return 'Note content is required to submit';
  }
  return null;
};

// Generate unique encounter note ID
const generateEncounterNoteID = (clientID) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EN-${clientID}-${timestamp}-${random}`;
};

// Validation helper
// const validateEncounterNoteData = (data, isUpdate = false) => {
//   const errors = {};
  
//   if (!isUpdate || data.careNoteDate !== undefined) {
//     if (!data.careNoteDate) {
//       errors.careNoteDate = 'Note date is required';
//     } else if (isNaN(new Date(data.careNoteDate).getTime())) {
//       errors.careNoteDate = 'Invalid date format';
//     }
//   }
  
//   if (!isUpdate || data.careNoteType !== undefined) {
//     if (!data.careNoteType || data.careNoteType.trim() === '') {
//       errors.careNoteType = 'Note type is required';
//     } else if (!['Individual', 'Crisis', 'Group', 'Summary', 'Intake'].includes(data.careNoteType)) {
//       errors.careNoteType = 'Invalid note type';
//     }
//   }
  
//   if (!isUpdate || data.careNote !== undefined) {
//     if (!data.careNote || data.careNote.trim() === '') {
//       errors.careNote = 'Note content is required';
//     } else if (data.careNote.length < 10) {
//       errors.careNote = 'Note content must be at least 10 characters';
//     }
//   }
  
//   return Object.keys(errors).length > 0 ? errors : null;
// };

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
        SELECT ${NOTE_COLUMNS}
        FROM EncounterNotes 
        WHERE ClientID = @clientID AND CareNoteType = @noteType
        ORDER BY CareNoteDate DESC, CreatedAt DESC
      `);
    
    res.json(result.recordset.map(mapNote));
  } catch (err) {
    console.error('❌ Error fetching encounter notes by type:', err);
    res.status(500).json({ 
      error: 'Failed to fetch encounter notes by type',
      message: err.message 
    });
  }
});


// GET /api/encounter-notes/summary/:clientID - Get encounter notes summary for client
router.get('/encounter-notes/summary/:clientID', async (req, res) => {
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

// GET /api/encounter-notes/:clientID - Fetch encounter notes for client
router.get('/encounter-notes/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    console.log(`📋 Fetching encounter notes for client: ${clientID}`);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(`
        SELECT ${NOTE_COLUMNS}
        FROM EncounterNotes 
        WHERE ClientID = @clientID 
        ORDER BY CareNoteDate DESC, CreatedAt DESC
      `);
    
    const mappedNotes = result.recordset.map(mapNote);
    
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
// { submit: true } submits (locks) the note; otherwise it is saved as a draft.
router.post('/encounter-notes/:clientID', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const noteData = req.body;
    const submit = wantsSubmit(noteData);

    const validationError = validateNote(noteData, submit);
    if (validationError) {
      return res.status(400).json({ error: 'Validation failed', message: validationError });
    }

    console.log(`📝 Creating ${submit ? 'submitted' : 'draft'} encounter note for client: ${clientID}`);
    
    // Recorded from the signed-in user, never from the request body
    const createdBy = getCurrentUser(req);
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('careNoteDate', sql.Date, noteData.careNoteDate)
      .input('careNoteType', sql.NVarChar, noteData.careNoteType)
      .input('careNoteSite', sql.NVarChar, noteData.careNoteSite || null)
      .input('careNote', sql.NVarChar, noteData.careNote || '')
      .input('createdBy', sql.NVarChar, createdBy)
      .input('submissionStatus', sql.NVarChar(20), submit ? SUBMITTED : DRAFT)
      .input('submittedBy', sql.NVarChar, submit ? createdBy : null)
      .input('submittedAt', sql.DateTime2, submit ? new Date() : null)
      .query(`
        INSERT INTO EncounterNotes (
          ClientID, CareNoteDate, CareNoteType, CareNoteSite, CareNote, CreatedBy,
          SubmissionStatus, SubmittedBy, SubmittedAt
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
          INSERTED.UpdatedAt,
          INSERTED.SubmissionStatus,
          INSERTED.SubmittedBy,
          INSERTED.SubmittedAt,
          INSERTED.UnlockedBy,
          INSERTED.UnlockedAt,
          INSERTED.UnlockReason
        VALUES (
          @clientID, @careNoteDate, @careNoteType, @careNoteSite, @careNote, @createdBy,
          @submissionStatus, @submittedBy, @submittedAt
        )
      `);
    
    const mappedNote = mapNote(result.recordset[0]);
    
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

// PUT /api/encounter-notes/:noteId - Update a draft encounter note
// { submit: true } submits (locks) it. Submitted notes return 409 RECORD_LOCKED.
router.put('/encounter-notes/:noteId', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const { noteId } = req.params;
    const updateData = req.body;
    const submit = wantsSubmit(updateData);

    const validationError = validateNote(updateData, submit);
    if (validationError) {
      return res.status(400).json({ error: 'Validation failed', message: validationError });
    }

    console.log(`📝 Updating encounter note: ${noteId}`);
    
    // Check if note exists and is still a draft
    const checkResult = await pool.request()
      .input('noteId', sql.UniqueIdentifier, noteId)
      .query('SELECT Id, SubmissionStatus FROM EncounterNotes WHERE Id = @noteId');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Encounter note not found' });
    }
    if (isSubmitted(checkResult.recordset[0].SubmissionStatus)) {
      return lockedResponse(res, 'note');
    }
    
    // Recorded from the signed-in user, never from the request body
    const updatedBy = getCurrentUser(req);
    // The status guard in the WHERE clause stops a save that races a submit
    const result = await pool.request()
      .input('noteId', sql.UniqueIdentifier, noteId)
      .input('careNoteDate', sql.Date, updateData.careNoteDate)
      .input('careNoteType', sql.NVarChar, updateData.careNoteType)
      .input('careNoteSite', sql.NVarChar, updateData.careNoteSite || null)
      .input('careNote', sql.NVarChar, updateData.careNote || '')
      .input('updatedBy', sql.NVarChar, updatedBy)
      .input('submissionStatus', sql.NVarChar(20), submit ? SUBMITTED : DRAFT)
      .input('submittedBy', sql.NVarChar, submit ? updatedBy : null)
      .input('submittedAt', sql.DateTime2, submit ? new Date() : null)
      .query(`
        UPDATE EncounterNotes 
        SET 
          CareNoteDate = @careNoteDate, 
          CareNoteType = @careNoteType, 
          CareNoteSite = @careNoteSite, 
          CareNote = @careNote, 
          SubmissionStatus = @submissionStatus,
          SubmittedBy = @submittedBy,
          SubmittedAt = @submittedAt,
          UpdatedBy = @updatedBy, 
          UpdatedAt = GETUTCDATE()
        WHERE Id = @noteId AND SubmissionStatus = '${DRAFT}';
        
        SELECT ${NOTE_COLUMNS}
        FROM EncounterNotes 
        WHERE Id = @noteId;
      `);
    
    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return lockedResponse(res, 'note');
    }

    console.log(`✅ Encounter note updated: ${noteId}`);
    res.json(mapNote(result.recordset[0]));
  } catch (err) {
    console.error('❌ Error updating encounter note:', err);
    res.status(500).json({ 
      error: 'Failed to update encounter note',
      message: err.message 
    });
  }
});

// POST /api/encounter-notes/:noteId/unlock - IT Admin / Level 1 only.
// Archives the submitted note and returns it to draft so it can be edited.
router.post(
  '/encounter-notes/:noteId/unlock',
  authMiddleware,
  requireUnlockPermission('a submitted note'),
  async (req, res) => {
    const { noteId } = req.params;
    const reason = parseUnlockReason(req.body);
    if (!reason) {
      return res.status(422).json({ message: 'A reason between 5 and 500 characters is required to unlock a submitted note' });
    }

    const currentUser = getCurrentUser(req);
    const now = new Date();

    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      let note;
      try {
        // UPDLOCK so a concurrent save or unlock can't slip in between read and write
        const existing = await transaction.request()
          .input('noteId', sql.UniqueIdentifier, noteId)
          .query(`
            SELECT ${NOTE_COLUMNS}
            FROM EncounterNotes WITH (UPDLOCK, HOLDLOCK)
            WHERE Id = @noteId
          `);

        note = existing.recordset[0];
        if (!note) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Encounter note not found' });
        }
        if (!isSubmitted(note.SubmissionStatus)) {
          await transaction.rollback();
          return res.status(409).json({ code: 'RECORD_NOT_LOCKED', message: 'Note is not submitted or locked' });
        }

        await archiveVersion(transaction, {
          action: 'unlock',
          recordType: 'EncounterNote',
          recordID: note._id,
          clientID: note.ClientID,
          snapshot: mapNote(note),
          submittedBy: note.SubmittedBy,
          submittedAt: note.SubmittedAt,
          archivedBy: currentUser,
          archivedAt: now,
          reason,
        });

        await transaction.request()
          .input('noteId', sql.UniqueIdentifier, noteId)
          .input('unlockedBy', sql.NVarChar, currentUser)
          .input('unlockedAt', sql.DateTime2, now)
          .input('unlockReason', sql.NVarChar(500), reason)
          .query(`
            UPDATE EncounterNotes
            SET SubmissionStatus = '${DRAFT}',
                SubmittedBy  = NULL,
                SubmittedAt  = NULL,
                UnlockedBy   = @unlockedBy,
                UnlockedAt   = @unlockedAt,
                UnlockReason = @unlockReason,
                UpdatedBy    = @unlockedBy,
                UpdatedAt    = @unlockedAt
            WHERE Id = @noteId
          `);

        await auditAction(transaction, {
          action: 'UNLOCK_ENCOUNTER_NOTE',
          req,
          tableName: 'EncounterNotes',
          recordID: note._id,
          clientID: note.ClientID,
          timestamp: now,
        });

        await transaction.commit();
      } catch (err) {
        await transaction.rollback().catch(() => {});
        throw err;
      }

      res.json(mapNote({
        ...note,
        SubmissionStatus: DRAFT,
        SubmittedBy: null,
        SubmittedAt: null,
        UnlockedBy: currentUser,
        UnlockedAt: now,
        UnlockReason: reason,
        UpdatedBy: currentUser,
        UpdatedAt: now,
      }));
    } catch (err) {
      console.error('❌ Error unlocking encounter note:', err.message);
      res.status(500).json({ message: 'Error unlocking encounter note' });
    }
  }
);

// DELETE /api/encounter-notes/:noteId - Delete a note
// Drafts: any signed-in user. Submitted (locked): IT Admin / Level 1 only,
// with { reason }. A copy is archived to Section4RecordVersions first.
router.delete('/encounter-notes/:noteId', authMiddleware, async (req, res) => {
  const { noteId } = req.params;
  const canDeleteSubmitted = canUnlockSignedForms(req.user);
  const reason = parseUnlockReason(req.body);
  const currentUser = getCurrentUser(req);
  const now = new Date();

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    let note;
    try {
      // UPDLOCK so a concurrent submit or unlock can't slip in between read and delete
      const existing = await transaction.request()
        .input('noteId', sql.UniqueIdentifier, noteId)
        .query(`
          SELECT ${NOTE_COLUMNS}
          FROM EncounterNotes WITH (UPDLOCK, HOLDLOCK)
          WHERE Id = @noteId
        `);

      note = existing.recordset[0];
      if (!note) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Encounter note not found' });
      }

      const submitted = isSubmitted(note.SubmissionStatus);
      if (submitted && !canDeleteSubmitted) {
        await transaction.rollback();
        return deleteNotPermittedResponse(res, 'note');
      }
      if (submitted && !reason) {
        await transaction.rollback();
        return res.status(422).json({ message: 'A reason between 5 and 500 characters is required to delete a submitted note' });
      }

      console.log(`🗑️ Deleting ${submitted ? 'submitted' : 'draft'} note: ${noteId}`);

      await archiveVersion(transaction, {
        action: 'delete',
        recordType: 'EncounterNote',
        recordID: note._id,
        clientID: note.ClientID,
        snapshot: mapNote(note),
        submittedBy: note.SubmittedBy,
        submittedAt: note.SubmittedAt,
        archivedBy: currentUser,
        archivedAt: now,
        reason,
      });

      await transaction.request()
        .input('noteId', sql.UniqueIdentifier, noteId)
        .query('DELETE FROM EncounterNotes WHERE Id = @noteId');

      await auditAction(transaction, {
        action: 'DELETE_ENCOUNTER_NOTE',
        req,
        tableName: 'EncounterNotes',
        recordID: note._id,
        clientID: note.ClientID,
        details: { submissionStatus: submitted ? 'submitted' : 'draft' },
        timestamp: now,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback().catch(() => {});
      throw err;
    }

    console.log(`✅ Encounter note deleted: ${noteId}`);
    res.json({ message: 'Encounter note deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting note:', err);
    res.status(500).json({
      error: 'Failed to delete note',
      message: err.message
    });
  }
});

module.exports = router;
module.exports.validateNote = validateNote;
