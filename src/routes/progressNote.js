const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Database connection - adjust config as needed
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
  },
};

// Utility function to handle database errors
const handleDatabaseError = (error, res, operation) => {
  console.error(`Database error during ${operation}:`, error);
  res.status(500).json({
    error: 'Database operation failed',
    message: error.message,
    operation: operation
  });
};

// Utility function to validate required fields
const validateProgressNote = (noteData) => {
  const required = ['nurseNoteDate', 'nurseNoteSite', 'nurseNote'];
  const missing = required.filter(field => !noteData[field]);
  
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  
  // Validate date format
  if (noteData.nurseNoteDate && isNaN(Date.parse(noteData.nurseNoteDate))) {
    return { valid: false, message: 'Invalid date format for nurseNoteDate' };
  }
  
  // Validate follow-up date if provided
  if (noteData.followUpDate && isNaN(Date.parse(noteData.followUpDate))) {
    return { valid: false, message: 'Invalid date format for followUpDate' };
  }
  
  return { valid: true };
};

// GET /api/progress-notes/:clientID - Get all progress notes for a client
router.get('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { limit = 100, offset = 0, site, category, priority, startDate, endDate } = req.query;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT 
        noteID as _id,
        clientID,
        nurseNoteDate,
        nurseNoteSite,
        nurseNote,
        noteCategory,
        notePriority,
        requiresFollowUp,
        followUpDate,
        noteStatus,
        createdBy,
        createdAt,
        updatedBy,
        updatedAt,
        lastViewedBy,
        lastViewedAt
      FROM ProgressNotes 
      WHERE clientID = @clientID
    `;
    
    const request = pool.request();
    request.input('clientID', sql.NVarChar, clientID);
    
    // Add optional filters
    if (site) {
      query += ' AND nurseNoteSite = @site';
      request.input('site', sql.NVarChar, site);
    }
    
    if (category) {
      query += ' AND noteCategory = @category';
      request.input('category', sql.NVarChar, category);
    }
    
    if (priority) {
      query += ' AND notePriority = @priority';
      request.input('priority', sql.NVarChar, priority);
    }
    
    if (startDate) {
      query += ' AND nurseNoteDate >= @startDate';
      request.input('startDate', sql.Date, startDate);
    }
    
    if (endDate) {
      query += ' AND nurseNoteDate <= @endDate';
      request.input('endDate', sql.Date, endDate);
    }
    
    query += ' ORDER BY nurseNoteDate DESC, createdAt DESC';
    query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    
    request.input('limit', sql.Int, parseInt(limit));
    request.input('offset', sql.Int, parseInt(offset));
    
    const result = await request.query(query);
    
    // Update last viewed timestamp for audit
    await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('viewedBy', sql.NVarChar, req.user?.email || 'system')
      .input('viewedAt', sql.DateTime2, new Date())
      .query(`
        UPDATE ProgressNotes 
        SET lastViewedBy = @viewedBy, lastViewedAt = @viewedAt 
        WHERE clientID = @clientID
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching progress notes');
  }
});

// POST /api/progress-notes/:clientID - Create new progress note
router.post('/:clientID', async (req, res) => {
  try {
    const { clientID } = req.params;
    const noteData = req.body;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    // Validate required fields
    const validation = validateProgressNote(noteData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message });
    }
    
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    
    // Insert new progress note
    const insertQuery = `
      INSERT INTO ProgressNotes (
        clientID, nurseNoteDate, nurseNoteSite, nurseNote,
        noteCategory, notePriority, requiresFollowUp, followUpDate,
        noteStatus, createdBy, createdAt
      )
      OUTPUT INSERTED.noteID as _id, INSERTED.*
      VALUES (
        @clientID, @nurseNoteDate, @nurseNoteSite, @nurseNote,
        @noteCategory, @notePriority, @requiresFollowUp, @followUpDate,
        @noteStatus, @createdBy, @createdAt
      )
    `;
    
    request.input('clientID', sql.NVarChar, clientID);
    request.input('nurseNoteDate', sql.Date, noteData.nurseNoteDate);
    request.input('nurseNoteSite', sql.NVarChar, noteData.nurseNoteSite);
    request.input('nurseNote', sql.NVarChar(sql.MAX), noteData.nurseNote);
    request.input('noteCategory', sql.NVarChar, noteData.noteCategory || 'General');
    request.input('notePriority', sql.NVarChar, noteData.notePriority || 'Medium');
    request.input('requiresFollowUp', sql.Bit, noteData.requiresFollowUp || false);
    request.input('followUpDate', sql.Date, noteData.followUpDate || null);
    request.input('noteStatus', sql.NVarChar, noteData.noteStatus || 'Active');
    request.input('createdBy', sql.NVarChar, noteData.createdBy);
    request.input('createdAt', sql.DateTime2, new Date());
    
    const result = await request.query(insertQuery);
    
    if (result.recordset.length > 0) {
      res.status(201).json(result.recordset[0]);
    } else {
      res.status(500).json({ error: 'Failed to create progress note' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'creating progress note');
  }
});

// PUT /api/progress-notes/:noteID - Update specific progress note
router.put('/:noteID', async (req, res) => {
  try {
    const { noteID } = req.params;
    const updateData = req.body;
    
    if (!noteID) {
      return res.status(400).json({ error: 'Note ID is required' });
    }
    
    // Validate fields if they're being updated
    if (updateData.nurseNoteDate || updateData.nurseNoteSite || updateData.nurseNote) {
      const validation = validateProgressNote(updateData);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Check if note exists
    const checkResult = await pool.request()
      .input('noteID', sql.Int, noteID)
      .query('SELECT noteID FROM ProgressNotes WHERE noteID = @noteID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Progress note not found' });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const request = pool.request();
    request.input('noteID', sql.Int, noteID);
    request.input('updatedBy', sql.NVarChar, updateData.updatedBy);
    request.input('updatedAt', sql.DateTime2, new Date());
    
    if (updateData.nurseNoteDate) {
      updateFields.push('nurseNoteDate = @nurseNoteDate');
      request.input('nurseNoteDate', sql.Date, updateData.nurseNoteDate);
    }
    
    if (updateData.nurseNoteSite) {
      updateFields.push('nurseNoteSite = @nurseNoteSite');
      request.input('nurseNoteSite', sql.NVarChar, updateData.nurseNoteSite);
    }
    
    if (updateData.nurseNote) {
      updateFields.push('nurseNote = @nurseNote');
      request.input('nurseNote', sql.NVarChar(sql.MAX), updateData.nurseNote);
    }
    
    if (updateData.noteCategory) {
      updateFields.push('noteCategory = @noteCategory');
      request.input('noteCategory', sql.NVarChar, updateData.noteCategory);
    }
    
    if (updateData.notePriority) {
      updateFields.push('notePriority = @notePriority');
      request.input('notePriority', sql.NVarChar, updateData.notePriority);
    }
    
    if (updateData.hasOwnProperty('requiresFollowUp')) {
      updateFields.push('requiresFollowUp = @requiresFollowUp');
      request.input('requiresFollowUp', sql.Bit, updateData.requiresFollowUp);
    }
    
    if (updateData.followUpDate !== undefined) {
      updateFields.push('followUpDate = @followUpDate');
      request.input('followUpDate', sql.Date, updateData.followUpDate);
    }
    
    if (updateData.noteStatus) {
      updateFields.push('noteStatus = @noteStatus');
      request.input('noteStatus', sql.NVarChar, updateData.noteStatus);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    
    const updateQuery = `
      UPDATE ProgressNotes 
      SET ${updateFields.join(', ')}, updatedBy = @updatedBy, updatedAt = @updatedAt
      OUTPUT INSERTED.noteID as _id, INSERTED.*
      WHERE noteID = @noteID
    `;
    
    const result = await request.query(updateQuery);
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(500).json({ error: 'Failed to update progress note' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'updating progress note');
  }
});

// DELETE /api/progress-notes/:noteID - Delete progress note
router.delete('/:noteID', async (req, res) => {
  try {
    const { noteID } = req.params;
    
    if (!noteID) {
      return res.status(400).json({ error: 'Note ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Check if note exists
    const checkResult = await pool.request()
      .input('noteID', sql.Int, noteID)
      .query('SELECT noteID, clientID FROM ProgressNotes WHERE noteID = @noteID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Progress note not found' });
    }
    
    // Soft delete by updating status (recommended) or hard delete
    const deleteQuery = `
      UPDATE ProgressNotes 
      SET noteStatus = 'Deleted', 
          updatedBy = @deletedBy, 
          updatedAt = @deletedAt
      WHERE noteID = @noteID
    `;
    
    // For hard delete, use this instead:
    // const deleteQuery = 'DELETE FROM ProgressNotes WHERE noteID = @noteID';
    
    const result = await pool.request()
      .input('noteID', sql.Int, noteID)
      .input('deletedBy', sql.NVarChar, req.user?.email || 'system')
      .input('deletedAt', sql.DateTime2, new Date())
      .query(deleteQuery);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ message: 'Progress note deleted successfully', noteID });
    } else {
      res.status(500).json({ error: 'Failed to delete progress note' });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'deleting progress note');
  }
});

// GET /api/progress-notes/:clientID/summary - Get notes summary and statistics
router.get('/:clientID/summary', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    // Get comprehensive summary using SQL analytics
    const summaryQuery = `
      WITH NoteCounts AS (
        SELECT 
          COUNT(*) as totalNotes,
          COUNT(CASE WHEN noteStatus = 'Active' THEN 1 END) as activeNotes,
          COUNT(CASE WHEN requiresFollowUp = 1 THEN 1 END) as followUpRequired,
          COUNT(CASE WHEN createdAt >= DATEADD(day, -30, GETDATE()) THEN 1 END) as recentActivity
        FROM ProgressNotes 
        WHERE clientID = @clientID AND noteStatus != 'Deleted'
      ),
      SiteCounts AS (
        SELECT 
          nurseNoteSite,
          COUNT(*) as count
        FROM ProgressNotes 
        WHERE clientID = @clientID AND noteStatus != 'Deleted'
        GROUP BY nurseNoteSite
      ),
      PriorityCounts AS (
        SELECT 
          notePriority,
          COUNT(*) as count
        FROM ProgressNotes 
        WHERE clientID = @clientID AND noteStatus != 'Deleted'
        GROUP BY notePriority
      ),
      CategoryCounts AS (
        SELECT 
          noteCategory,
          COUNT(*) as count
        FROM ProgressNotes 
        WHERE clientID = @clientID AND noteStatus != 'Deleted'
        GROUP BY noteCategory
      )
      SELECT 
        (SELECT totalNotes FROM NoteCounts) as totalNotes,
        (SELECT activeNotes FROM NoteCounts) as activeNotes,
        (SELECT followUpRequired FROM NoteCounts) as followUpRequired,
        (SELECT recentActivity FROM NoteCounts) as recentActivity,
        (
          SELECT nurseNoteSite, count 
          FROM SiteCounts 
          FOR JSON PATH
        ) as notesBySite,
        (
          SELECT notePriority, count 
          FROM PriorityCounts 
          FOR JSON PATH
        ) as notesByPriority,
        (
          SELECT noteCategory, count 
          FROM CategoryCounts 
          FOR JSON PATH
        ) as notesByCategory
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(summaryQuery);
    
    if (result.recordset.length > 0) {
      const summary = result.recordset[0];
      
      // Parse JSON fields and convert to objects
      const notesBySite = {};
      const notesByPriority = {};
      const notesByCategory = {};
      
      if (summary.notesBySite) {
        JSON.parse(summary.notesBySite).forEach(item => {
          notesBySite[item.nurseNoteSite] = item.count;
        });
      }
      
      if (summary.notesByPriority) {
        JSON.parse(summary.notesByPriority).forEach(item => {
          notesByPriority[item.notePriority] = item.count;
        });
      }
      
      if (summary.notesByCategory) {
        JSON.parse(summary.notesByCategory).forEach(item => {
          notesByCategory[item.noteCategory] = item.count;
        });
      }
      
      res.json({
        totalNotes: summary.totalNotes || 0,
        activeNotes: summary.activeNotes || 0,
        followUpRequired: summary.followUpRequired || 0,
        recentActivity: summary.recentActivity || 0,
        notesBySite,
        notesByPriority,
        notesByCategory
      });
    } else {
      res.json({
        totalNotes: 0,
        activeNotes: 0,
        followUpRequired: 0,
        recentActivity: 0,
        notesBySite: {},
        notesByPriority: {},
        notesByCategory: {}
      });
    }
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching notes summary');
  }
});

// GET /api/progress-notes/:clientID/recent - Get recent notes (last 30 days)
router.get('/:clientID/recent', async (req, res) => {
  try {
    const { clientID } = req.params;
    const { days = 30 } = req.query;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        noteID as _id,
        clientID,
        nurseNoteDate,
        nurseNoteSite,
        nurseNote,
        noteCategory,
        notePriority,
        requiresFollowUp,
        followUpDate,
        createdBy,
        createdAt
      FROM ProgressNotes 
      WHERE clientID = @clientID 
        AND noteStatus != 'Deleted'
        AND createdAt >= DATEADD(day, -@days, GETDATE())
      ORDER BY createdAt DESC
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .input('days', sql.Int, parseInt(days))
      .query(query);
    
    res.json(result.recordset);
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching recent notes');
  }
});

// GET /api/progress-notes/site/:siteID - Get notes by site
router.get('/site/:siteID', async (req, res) => {
  try {
    const { siteID } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    if (!siteID) {
      return res.status(400).json({ error: 'Site ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        noteID as _id,
        clientID,
        nurseNoteDate,
        nurseNoteSite,
        nurseNote,
        noteCategory,
        notePriority,
        requiresFollowUp,
        followUpDate,
        createdBy,
        createdAt
      FROM ProgressNotes 
      WHERE nurseNoteSite = @siteID 
        AND noteStatus != 'Deleted'
      ORDER BY nurseNoteDate DESC, createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    
    const result = await pool.request()
      .input('siteID', sql.NVarChar, decodeURIComponent(siteID))
      .input('limit', sql.Int, parseInt(limit))
      .input('offset', sql.Int, parseInt(offset))
      .query(query);
    
    res.json(result.recordset);
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching notes by site');
  }
});

// GET /api/progress-notes/:clientID/follow-ups - Get notes requiring follow-up
router.get('/:clientID/follow-ups', async (req, res) => {
  try {
    const { clientID } = req.params;
    
    if (!clientID) {
      return res.status(400).json({ error: 'Client ID is required' });
    }
    
    const pool = await sql.connect(dbConfig);
    
    const query = `
      SELECT 
        noteID as _id,
        clientID,
        nurseNoteDate,
        nurseNoteSite,
        nurseNote,
        noteCategory,
        notePriority,
        followUpDate,
        createdBy,
        createdAt,
        CASE 
          WHEN followUpDate < GETDATE() THEN 'Overdue'
          WHEN followUpDate = CAST(GETDATE() AS DATE) THEN 'Due Today'
          WHEN followUpDate <= DATEADD(day, 7, GETDATE()) THEN 'Due Soon'
          ELSE 'Scheduled'
        END as followUpStatus
      FROM ProgressNotes 
      WHERE clientID = @clientID 
        AND requiresFollowUp = 1
        AND noteStatus = 'Active'
      ORDER BY followUpDate ASC, createdAt DESC
    `;
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query(query);
    
    res.json(result.recordset);
    
  } catch (error) {
    handleDatabaseError(error, res, 'fetching follow-up notes');
  }
});

module.exports = router;