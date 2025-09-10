const express = require('express');
const router = express.Router();

// Health check
router.get('/mental-health', (req, res) => {
  res.json({ message: 'Mental health routes working' });
});

module.exports = router;