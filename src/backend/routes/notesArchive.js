// routes/noteArchive.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Mock storage for development
let uploadedFiles = {};

// POST /api/note-archive/upload
router.post('note-archive/upload', upload.single('noteFile'), (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileRecord = {
      fileId: Date.now().toString(),
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      fileUrl: `/uploads/${file.filename}`
    };
    
    uploadedFiles[fileRecord.fileId] = fileRecord;
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      ...fileRecord
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;