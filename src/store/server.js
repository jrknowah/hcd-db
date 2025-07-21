const express = require('express');
const app = express();
const { connectToAzureSQL } = require("./db/azureSql");
const clientsRouter = require('../routes/clients');
const mentalHealthRoutes = require('./routes/mentalHealthRoutes');
const cors = require('cors');

connectToAzureSQL(); // initialize DB connection at app startup

app.use(cors());
app.use(express.json());

const clientRoutes = require("./routes/clientRoutes");
app.use('/api/clients', clientsRouter);
app.use('/api/mental-health', mentalHealthRoutes);
app.use('/api', mentalHealthRoutes); // For arrest routes that start with /api/arrests
const medicalRouter = require('./routes/medical');
app.use('/api/medical', medicalRouter);

//Section 2
// server.js or app.js
const authorizationRoutes = require('./routes/authorizationRoutes');
app.use('/api/authorization', authorizationRoutes);

//Section 3
// app.js
const assessmentCarePlansRouter = require('./routes/assessmentCarePlans');
app.use('/api/assessment-care-plans', assessmentCarePlansRouter);

// app.js
const assessmentCarePlansRouter = require('./routes/assessmentCarePlans');
app.use('/api/assessment-care-plans', assessmentCarePlansRouter);

//Section 4

// Import and mount the encounter notes routes
const encounterNotesRouter = require('./routes/encounterNotes');
app.use('/api/encounter-notes', encounterNotesRouter);

// Your existing routes
const clientDischargeRouter = require('./routes/clientDischarge');
app.use('/api/client-discharge', clientDischargeRouter);

//Section 5
const medFaceSheetRouter = require('./routes/medFaceSheet');
app.use('/api/med-face-sheet', medFaceSheetRouter);

const nursingAdmissionRouter = require('./routes/nursingAdmission');
app.use('/api/nursing-admission', nursingAdmissionRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

//

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(5000, () => console.log('Server running on port 5000'));
