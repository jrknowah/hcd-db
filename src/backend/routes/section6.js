const express = require('express');
const router = express.Router();
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ✅ FIXED: Use consistent database connection
const { getPool } = require('../store/azureSql');

// ✅ FIXED: Add consistent logging middleware
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ FIXED: Consistent multer configuration (matches existing pattern)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/section6');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype.includes('officedocument');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents and images are allowed'));
    }
  }
});

// ===================================================================
// IDT CASE MANAGER ROUTES (FIXED)
// ===================================================================

router.get('/idt-case-manager/:clientID', async (req, res) => {
  const { clientID } = req.params;
  
  try {
    const pool = await getPool(); // ✅ FIXED: Use consistent connection
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query(`SELECT * FROM dbo.IDTCaseManager WHERE clientID = @clientID`);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        error: 'IDT Case Manager record not found for this client' // ✅ FIXED: Consistent error format
      });
    }

    const record = result.recordset[0];
    
    // Parse JSON fields
    if (record.clientGovIssued) {
      try {
        record.clientGovIssued = JSON.parse(record.clientGovIssued);
      } catch (e) {
        record.clientGovIssued = [];
      }
    }

    console.log(`✅ Retrieved IDT data for client ${clientID}`); // ✅ FIXED: Consistent logging
    res.json(record);
  } catch (error) {
    console.error('❌ Error fetching IDT Case Manager data:', error);
    res.status(500).json({ 
      error: 'Error fetching IDT Case Manager data', // ✅ FIXED: Consistent error format
      details: error.message 
    });
  }
});

router.post('/idt-case-manager/:clientID', async (req, res) => {
  const { clientID } = req.params;
  const data = req.body;

  try {
    const pool = await getPool(); // ✅ FIXED: Use consistent connection
    
    // Validation (following medical.js pattern)
    if (!data.idtMemberSituation && !data.idtMemberSupport) {
      return res.status(400).json({ 
        error: 'Missing required fields: member situation or support system' 
      });
    }

    const assessmentScore = calculateAssessmentScore(data);
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('idtMemberSituation', sql.NVarChar(sql.MAX), data.idtMemberSituation || '')
      .input('idtMemberSupport', sql.NVarChar(sql.MAX), data.idtMemberSupport || '')
      .input('idtIncomeSource', sql.NVarChar(500), data.idtIncomeSource || '')
      .input('clientGovIssued', sql.NVarChar(sql.MAX), JSON.stringify(data.clientGovIssued || []))
      .input('idtResources', sql.NVarChar(sql.MAX), data.idtResources || '')
      .input('idtHfhCM', sql.NVarChar(200), data.idtHfhCM || '')
      .input('idtRecommend', sql.NVarChar(sql.MAX), data.idtRecommend || '')
      .input('clientHighEnd', sql.NVarChar(100), data.clientHighEnd || '')
      .input('idtGoals', sql.NVarChar(sql.MAX), data.idtGoals || '')
      .input('clientPayeeBarriers', sql.NVarChar(sql.MAX), data.clientPayeeBarriers || '')
      .input('clientPayeeAssistance', sql.NVarChar(sql.MAX), data.clientPayeeAssistance || '')
      .input('assessmentScore', sql.Decimal(5,2), assessmentScore)
      .input('updatedBy', sql.NVarChar(100), data.updatedBy || 'system')
      .input('createdBy', sql.NVarChar(100), data.createdBy || data.updatedBy || 'system')
      .input('createdAt', sql.DateTime, new Date())
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        MERGE dbo.IDTCaseManager AS target
        USING (SELECT @clientID AS clientID) AS source
        ON target.clientID = source.clientID
        WHEN MATCHED THEN
          UPDATE SET
            idtMemberSituation = @idtMemberSituation,
            idtMemberSupport = @idtMemberSupport,
            idtIncomeSource = @idtIncomeSource,
            clientGovIssued = @clientGovIssued,
            idtResources = @idtResources,
            idtHfhCM = @idtHfhCM,
            idtRecommend = @idtRecommend,
            clientHighEnd = @clientHighEnd,
            idtGoals = @idtGoals,
            clientPayeeBarriers = @clientPayeeBarriers,
            clientPayeeAssistance = @clientPayeeAssistance,
            assessmentScore = @assessmentScore,
            lastAssessmentDate = GETDATE(),
            nextFollowUpDate = DATEADD(month, 1, GETDATE()),
            updatedBy = @updatedBy,
            updatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (
            clientID, idtMemberSituation, idtMemberSupport, idtIncomeSource,
            clientGovIssued, idtResources, idtHfhCM, idtRecommend,
            clientHighEnd, idtGoals, clientPayeeBarriers, clientPayeeAssistance,
            assessmentScore, lastAssessmentDate, nextFollowUpDate,
            createdBy, createdAt, updatedBy, updatedAt
          )
          VALUES (
            @clientID, @idtMemberSituation, @idtMemberSupport, @idtIncomeSource,
            @clientGovIssued, @idtResources, @idtHfhCM, @idtRecommend,
            @clientHighEnd, @idtGoals, @clientPayeeBarriers, @clientPayeeAssistance,
            @assessmentScore, GETDATE(), DATEADD(month, 1, GETDATE()),
            @createdBy, @createdAt, @updatedBy, @updatedAt
          )
        OUTPUT inserted.*;
      `);

    const savedRecord = result.recordset[0];
    
    if (savedRecord.clientGovIssued) {
      savedRecord.clientGovIssued = JSON.parse(savedRecord.clientGovIssued);
    }

    console.log(`✅ Saved IDT data for client ${clientID}`); // ✅ FIXED: Consistent logging
    res.json(savedRecord);
  } catch (error) {
    console.error('❌ Error saving IDT Case Manager data:', error);
    res.status(500).json({ 
      error: 'Error saving IDT Case Manager data', // ✅ FIXED: Consistent error format
      details: error.message 
    });
  }
});

// ✅ FIXED: Add error handling middleware (like medical.js)
router.use((error, req, res, next) => {
  console.error('❌ Section 6 Routes Error:', error);
  res.status(500).json({
    error: 'Internal server error in Section 6 routes',
    details: error.message
  });
});

// Helper function (unchanged)
const calculateAssessmentScore = (data) => {
  const fields = [
    'idtMemberSituation', 'idtMemberSupport', 'idtIncomeSource',
    'idtResources', 'idtHfhCM', 'idtRecommend', 'clientHighEnd',
    'idtGoals', 'clientPayeeBarriers', 'clientPayeeAssistance'
  ];
  
  let completed = 0;
  fields.forEach(field => {
    if (data[field] && data[field].trim() !== '') {
      completed++;
    }
  });
  
  if (data.clientGovIssued && data.clientGovIssued.length > 0) {
    completed++;
  }
  
  return Math.round((completed / (fields.length + 1)) * 100);
};

module.exports = router;