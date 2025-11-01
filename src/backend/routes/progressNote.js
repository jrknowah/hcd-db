const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getConnection } = require('../store/azureSql');

/**
 * Progress Notes Routes
 * Handles nursing progress notes for clients with CRUD operations
 */

// ============================================================================
// GET ROUTES
// ============================================================================

/**
 * @route   GET /api/progress-notes/:clientID/summary
 * @desc    Get summary of progress notes for a client (count, latest date, etc.)
 * @access  Private
 */
router.get('/progress-notes/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;

    console.log(`${new Date().toISOString()} - GET /api/progress-notes/${clientID}/summary`);

    const pool = await getConnection();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT 
          COUNT(*) as totalNotes,
          MAX(nurseNoteDate) as lastNoteDate,
          SUM(CASE WHEN requiresFollowUp = 1 AND noteStatus != 'Completed' THEN 1 ELSE 0 END) as pendingFollowUps,
          SUM(CASE WHEN noteStatus = 'Active' THEN 1 ELSE 0 END) as activeNotes
        FROM dbo.progress_notes
        WHERE clientID = @clientID
      `);

    const summary = result.recordset[0] || {
      totalNotes: 0,
      lastNoteDate: null,
      pendingFollowUps: 0,
      activeNotes: 0
    };

    console.log('✅ Progress notes summary retrieved:', summary);
    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Error fetching progress notes summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress notes summary',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/progress-notes/:clientID
 * @desc    Get all progress notes for a specific client
 * @access  Private
 * @query   limit - Number of records to return (default: 100)
 * @query   offset - Number of records to skip (default: 0)
 * @query   category - Filter by note category
 * @query   priority - Filter by note priority
 * @query   status - Filter by note status
 */
router.get('/progress-notes/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { 
      limit = 100, 
      offset = 0, 
      category, 
      priority, 
      status 
    } = req.query;

    console.log(`${new Date().toISOString()} - GET /api/progress-notes/${clientID}`);
    console.log('Query params:', { limit, offset, category, priority, status });

    const pool = await getConnection();
    const request = pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset));

    // Build dynamic WHERE clause
    let whereClause = 'WHERE clientID = @clientID';
    
    if (category) {
      request.input('category', sql.VarChar(100), category);
      whereClause += ' AND noteCategory = @category';
    }
    
    if (priority) {
      request.input('priority', sql.VarChar(50), priority);
      whereClause += ' AND notePriority = @priority';
    }
    
    if (status) {
      request.input('status', sql.VarChar(50), status);
      whereClause += ' AND noteStatus = @status';
    }

    const result = await request.query(`
      SELECT *
      FROM dbo.progress_notes
      ${whereClause}
      ORDER BY nurseNoteDate DESC, createdAt DESC
      OFFSET @offset ROWS 
      FETCH NEXT @limit ROWS ONLY
    `);

    console.log(`✅ Retrieved ${result.recordset.length} progress notes`);
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('❌ Error fetching progress notes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress notes',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/progress-notes/:clientID/:noteID
 * @desc    Get a specific progress note by ID
 * @access  Private
 */
router.get('/progress-notes/:clientID/:noteID', async (req, res) => {
  try {
    const { clientID, noteID } = req.params;

    console.log(`${new Date().toISOString()} - GET /api/progress-notes/${clientID}/${noteID}`);

    const pool = await getConnection();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('noteID', sql.Int, parseInt(noteID))
      .query(`
        SELECT *
        FROM dbo.progress_notes
        WHERE clientID = @clientID AND id = @noteID
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Progress note not found'
      });
    }

    console.log('✅ Progress note retrieved');
    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error fetching progress note:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress note',
      error: error.message
    });
  }
});

// ============================================================================
// POST ROUTES
// ============================================================================

/**
 * @route   POST /api/progress-notes
 * @desc    Create a new progress note
 * @access  Private
 * @body    {
 *   clientID: string (required),
 *   nurseNoteDate: date (required),
 *   nurseNoteSite: string (optional),
 *   nurseNote: string (required),
 *   noteCategory: string (optional),
 *   notePriority: string (optional),
 *   requiresFollowUp: boolean (optional),
 *   followUpDate: date (optional),
 *   noteStatus: string (optional),
 *   createdBy: string (required)
 * }
 */
router.post('/progress-notes', async (req, res) => {
  try {
    const {
      clientID,
      nurseNoteDate,
      nurseNoteSite = '',
      nurseNote,
      noteCategory = 'General',
      notePriority = 'Normal',
      requiresFollowUp = false,
      followUpDate = null,
      noteStatus = 'Active',
      createdBy
    } = req.body;

    console.log(`${new Date().toISOString()} - POST /api/progress-notes`);
    console.log('📤 Request body:', req.body);

    // Validation
    if (!clientID || !nurseNoteDate || !nurseNote || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: clientID, nurseNoteDate, nurseNote, createdBy'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .input('nurseNoteDate', sql.Date, new Date(nurseNoteDate))
      .input('nurseNoteSite', sql.VarChar(200), nurseNoteSite)
      .input('nurseNote', sql.Text, nurseNote)
      .input('noteCategory', sql.VarChar(100), noteCategory)
      .input('notePriority', sql.VarChar(50), notePriority)
      .input('requiresFollowUp', sql.Bit, requiresFollowUp)
      .input('followUpDate', sql.Date, followUpDate)
      .input('noteStatus', sql.VarChar(50), noteStatus)
      .input('createdBy', sql.VarChar(200), createdBy)
      .query(`
        INSERT INTO dbo.progress_notes (
          clientID, nurseNoteDate, nurseNoteSite, nurseNote,
          noteCategory, notePriority, requiresFollowUp, followUpDate,
          noteStatus, createdBy, createdAt
        )
        OUTPUT INSERTED.*
        VALUES (
          @clientID, @nurseNoteDate, @nurseNoteSite, @nurseNote,
          @noteCategory, @notePriority, @requiresFollowUp, @followUpDate,
          @noteStatus, @createdBy, GETDATE()
        )
      `);

    console.log('✅ Progress note created:', result.recordset[0].id);
    res.status(201).json({
      success: true,
      message: 'Progress note created successfully',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error creating progress note:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating progress note',
      error: error.message
    });
  }
});

// ============================================================================
// PUT ROUTES
// ============================================================================

/**
 * @route   PUT /api/progress-notes/:noteID
 * @desc    Update an existing progress note
 * @access  Private
 * @body    {
 *   nurseNoteDate: date (optional),
 *   nurseNoteSite: string (optional),
 *   nurseNote: string (optional),
 *   noteCategory: string (optional),
 *   notePriority: string (optional),
 *   requiresFollowUp: boolean (optional),
 *   followUpDate: date (optional),
 *   noteStatus: string (optional),
 *   updatedBy: string (required)
 * }
 */
router.put('/progress-notes/:noteID', async (req, res) => {
  try {
    const { noteID } = req.params;
    const {
      nurseNoteDate,
      nurseNoteSite,
      nurseNote,
      noteCategory,
      notePriority,
      requiresFollowUp,
      followUpDate,
      noteStatus,
      updatedBy
    } = req.body;

    console.log(`${new Date().toISOString()} - PUT /api/progress-notes/${noteID}`);
    console.log('📤 Request body:', req.body);

    // Validation
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'updatedBy is required'
      });
    }

    const pool = await getConnection();
    
    // Check if note exists
    const checkResult = await pool.request()
      .input('noteID', sql.Int, parseInt(noteID))
      .query('SELECT id FROM dbo.progress_notes WHERE id = @noteID');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Progress note not found'
      });
    }

    // Build dynamic UPDATE query
    const updates = [];
    const request = pool.request().input('noteID', sql.Int, parseInt(noteID));

    if (nurseNoteDate !== undefined) {
      updates.push('nurseNoteDate = @nurseNoteDate');
      request.input('nurseNoteDate', sql.Date, new Date(nurseNoteDate));
    }
    if (nurseNoteSite !== undefined) {
      updates.push('nurseNoteSite = @nurseNoteSite');
      request.input('nurseNoteSite', sql.VarChar(200), nurseNoteSite);
    }
    if (nurseNote !== undefined) {
      updates.push('nurseNote = @nurseNote');
      request.input('nurseNote', sql.Text, nurseNote);
    }
    if (noteCategory !== undefined) {
      updates.push('noteCategory = @noteCategory');
      request.input('noteCategory', sql.VarChar(100), noteCategory);
    }
    if (notePriority !== undefined) {
      updates.push('notePriority = @notePriority');
      request.input('notePriority', sql.VarChar(50), notePriority);
    }
    if (requiresFollowUp !== undefined) {
      updates.push('requiresFollowUp = @requiresFollowUp');
      request.input('requiresFollowUp', sql.Bit, requiresFollowUp);
    }
    if (followUpDate !== undefined) {
      updates.push('followUpDate = @followUpDate');
      request.input('followUpDate', sql.Date, followUpDate);
    }
    if (noteStatus !== undefined) {
      updates.push('noteStatus = @noteStatus');
      request.input('noteStatus', sql.VarChar(50), noteStatus);
    }

    updates.push('updatedBy = @updatedBy');
    updates.push('updatedAt = GETDATE()');
    request.input('updatedBy', sql.VarChar(200), updatedBy);

    const result = await request.query(`
      UPDATE dbo.progress_notes
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @noteID
    `);

    console.log('✅ Progress note updated');
    res.json({
      success: true,
      message: 'Progress note updated successfully',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Error updating progress note:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress note',
      error: error.message
    });
  }
});

// ============================================================================
// DELETE ROUTES
// ============================================================================

/**
 * @route   DELETE /api/progress-notes/:noteID
 * @desc    Delete a progress note (soft delete by setting status to 'Archived')
 * @access  Private
 * @query   permanent - Set to 'true' for hard delete (optional)
 */
router.delete('/progress-notes/:noteID', async (req, res) => {
  try {
    const { noteID } = req.params;
    const { permanent = 'false' } = req.query;

    console.log(`${new Date().toISOString()} - DELETE /api/progress-notes/${noteID}`);
    console.log('Permanent delete:', permanent === 'true');

    const pool = await getConnection();

    if (permanent === 'true') {
      // Hard delete
      const result = await pool.request()
        .input('noteID', sql.Int, parseInt(noteID))
        .query(`
          DELETE FROM dbo.progress_notes
          WHERE id = @noteID
        `);

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({
          success: false,
          message: 'Progress note not found'
        });
      }

      console.log('✅ Progress note permanently deleted');
      res.json({
        success: true,
        message: 'Progress note permanently deleted'
      });

    } else {
      // Soft delete - archive the note
      const result = await pool.request()
        .input('noteID', sql.Int, parseInt(noteID))
        .query(`
          UPDATE dbo.progress_notes
          SET noteStatus = 'Archived', updatedAt = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @noteID
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Progress note not found'
        });
      }

      console.log('✅ Progress note archived');
      res.json({
        success: true,
        message: 'Progress note archived successfully',
        data: result.recordset[0]
      });
    }

  } catch (error) {
    console.error('❌ Error deleting progress note:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting progress note',
      error: error.message
    });
  }
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * @route   GET /api/progress-notes/:clientID/categories
 * @desc    Get all unique categories used for this client
 * @access  Private
 */
router.get('/progress-notes/:clientID/categories', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await getConnection();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT DISTINCT noteCategory
        FROM dbo.progress_notes
        WHERE clientID = @clientID AND noteCategory IS NOT NULL
        ORDER BY noteCategory
      `);

    res.json({
      success: true,
      data: result.recordset.map(r => r.noteCategory)
    });

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/progress-notes/:clientID/follow-ups
 * @desc    Get all notes requiring follow-up for this client
 * @access  Private
 */
router.get('/progress-notes/:clientID/follow-ups', async (req, res) => {
  try {
    const { clientID } = req.params;

    const pool = await getConnection();
    const result = await pool.request()
      .input('clientID', sql.VarChar(50), clientID)
      .query(`
        SELECT *
        FROM dbo.progress_notes
        WHERE clientID = @clientID 
          AND requiresFollowUp = 1 
          AND noteStatus != 'Completed'
        ORDER BY followUpDate ASC, nurseNoteDate DESC
      `);

    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });

  } catch (error) {
    console.error('❌ Error fetching follow-ups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching follow-ups',
      error: error.message
    });
  }
});

module.exports = router;