const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { connectToAzureSQL } = require("../db");

// GET /api/encounter-notes/:clientID - Get all encounter notes for a client
router.get("/:clientID", async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await connectToAzureSQL();
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .query(`
        SELECT 
          encounterNoteID as _id,
          clientID,
          careNoteDate,
          careNoteType,
          careNoteSite,
          careNote,
          createdBy,
          createdAt,
          updatedBy,
          updatedAt
        FROM EncounterNotes 
        WHERE clientID = @clientID 
        ORDER BY careNoteDate DESC, createdAt DESC
      `);
    
    res.json(result.recordset);
    
  } catch (err) {
    console.error("❌ Error fetching encounter notes:", err);
    res.status(500).json({ 
      error: "Error fetching encounter notes",
      details: err.message 
    });
  }
});

// POST /api/encounter-notes/:clientID - Add new encounter note
router.post("/:clientID", async (req, res) => {
  const { clientID } = req.params;
  const {
    careNoteDate,
    careNoteType,
    careNoteSite,
    careNote,
    createdBy
  } = req.body;

  // Validation
  if (!careNoteDate || !careNoteType || !careNote || !createdBy) {
    return res.status(400).json({ 
      error: "Missing required fields: careNoteDate, careNoteType, careNote, createdBy" 
    });
  }

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("clientID", sql.NVarChar, clientID)
      .input("careNoteDate", sql.Date, careNoteDate)
      .input("careNoteType", sql.NVarChar, careNoteType)
      .input("careNoteSite", sql.NVarChar, careNoteSite || null)
      .input("careNote", sql.NVarChar(sql.MAX), careNote)
      .input("createdBy", sql.NVarChar, createdBy)
      .input("createdAt", sql.DateTime, new Date())
      .query(`
        INSERT INTO EncounterNotes (
          clientID, 
          careNoteDate, 
          careNoteType, 
          careNoteSite, 
          careNote, 
          createdBy, 
          createdAt
        ) 
        OUTPUT INSERTED.encounterNoteID as _id,
               INSERTED.clientID,
               INSERTED.careNoteDate,
               INSERTED.careNoteType,
               INSERTED.careNoteSite,
               INSERTED.careNote,
               INSERTED.createdBy,
               INSERTED.createdAt,
               INSERTED.updatedBy,
               INSERTED.updatedAt
        VALUES (
          @clientID, 
          @careNoteDate, 
          @careNoteType, 
          @careNoteSite, 
          @careNote, 
          @createdBy, 
          @createdAt
        )
      `);

    res.status(201).json(result.recordset[0]);
    
  } catch (err) {
    console.error("❌ Error adding encounter note:", err);
    res.status(500).json({ 
      error: "Error adding encounter note",
      details: err.message 
    });
  }
});

// PUT /api/encounter-notes/:noteId - Update existing encounter note
router.put("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const {
    careNoteDate,
    careNoteType,
    careNoteSite,
    careNote,
    updatedBy
  } = req.body;

  // Validation
  if (!careNoteDate || !careNoteType || !careNote || !updatedBy) {
    return res.status(400).json({ 
      error: "Missing required fields: careNoteDate, careNoteType, careNote, updatedBy" 
    });
  }

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("noteId", sql.Int, noteId)
      .input("careNoteDate", sql.Date, careNoteDate)
      .input("careNoteType", sql.NVarChar, careNoteType)
      .input("careNoteSite", sql.NVarChar, careNoteSite || null)
      .input("careNote", sql.NVarChar(sql.MAX), careNote)
      .input("updatedBy", sql.NVarChar, updatedBy)
      .input("updatedAt", sql.DateTime, new Date())
      .query(`
        UPDATE EncounterNotes 
        SET 
          careNoteDate = @careNoteDate,
          careNoteType = @careNoteType,
          careNoteSite = @careNoteSite,
          careNote = @careNote,
          updatedBy = @updatedBy,
          updatedAt = @updatedAt
        OUTPUT INSERTED.encounterNoteID as _id,
               INSERTED.clientID,
               INSERTED.careNoteDate,
               INSERTED.careNoteType,
               INSERTED.careNoteSite,
               INSERTED.careNote,
               INSERTED.createdBy,
               INSERTED.createdAt,
               INSERTED.updatedBy,
               INSERTED.updatedAt
        WHERE encounterNoteID = @noteId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: "Encounter note not found" 
      });
    }

    res.json(result.recordset[0]);
    
  } catch (err) {
    console.error("❌ Error updating encounter note:", err);
    res.status(500).json({ 
      error: "Error updating encounter note",
      details: err.message 
    });
  }
});

// DELETE /api/encounter-notes/:noteId - Delete encounter note
router.delete("/:noteId", async (req, res) => {
  const { noteId } = req.params;

  try {
    const pool = await connectToAzureSQL();
    
    const result = await pool
      .request()
      .input("noteId", sql.Int, noteId)
      .query(`
        DELETE FROM EncounterNotes 
        WHERE encounterNoteID = @noteId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        error: "Encounter note not found" 
      });
    }

    res.status(200).json({ 
      message: "Encounter note deleted successfully",
      noteId: noteId 
    });
    
  } catch (err) {
    console.error("❌ Error deleting encounter note:", err);
    res.status(500).json({ 
      error: "Error deleting encounter note",
      details: err.message 
    });
  }
});

module.exports = router;