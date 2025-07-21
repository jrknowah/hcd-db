const express = require('express');
const router = express.Router();
const db = require('../db'); // Your DB connection utility (e.g., using mssql or tedious)
const logger = require('../middleware/logger'); // Optional logger middleware

// Create new client
router.post('/', async (req, res) => {
  const client = req.body;
  try {
    const request = db.request();
    request.input('clientID', client.clientID || null);
    request.input('clientAdmitDate', client.clientAdmitDate || null);
    request.input('clientDOB', client.clientDOB || null);
    request.input('clientSite', client.clientSite || null);
    request.input('clientFirstName', client.clientFirstName || null);
    request.input('clientMiddleName', client.clientMiddleName || null);
    request.input('clientLastName', client.clientLastName || null);
    request.input('clientAliases', client.clientAliases || null);
    request.input('clientCitizenship', client.clientCitizenship || null);
    request.input('clientVetStatus', client.clientVetStatus || null);
    request.input('clientSSN', client.clientSSN || null);
    request.input('clientGender', client.clientGender || null);
    request.input('clientPronouns', client.clientPronouns || null);
    request.input('clientEthnicity', client.clientEthnicity || null);
    request.input('clientRace', client.clientRace || null);
    request.input('clientPrimaryLang', client.clientPrimaryLang || null);
    request.input('clientMaritalStatus', client.clientMaritalStatus || null);
    request.input('clientReligiousPref', client.clientReligiousPref || null);
    request.input('clientHighEd', client.clientHighEd || null);

    await request.query(`
      INSERT INTO Clients (
        clientID, clientAdmitDate, clientDOB, clientSite,
        clientFirstName, clientMiddleName, clientLastName, clientAliases,
        clientCitizenship, clientVetStatus, clientSSN,
        clientGender, clientPronouns, clientEthnicity, clientRace,
        clientPrimaryLang, clientMaritalStatus, clientReligiousPref, clientHighEd
      )
      VALUES (
        @clientID, @clientAdmitDate, @clientDOB, @clientSite,
        @clientFirstName, @clientMiddleName, @clientLastName, @clientAliases,
        @clientCitizenship, @clientVetStatus, @clientSSN,
        @clientGender, @clientPronouns, @clientEthnicity, @clientRace,
        @clientPrimaryLang, @clientMaritalStatus, @clientReligiousPref, @clientHighEd
      )
    `);

    logger.info(`Client created: ${client.clientID}`);
    res.status(201).json({ clientID: client.clientID });
  } catch (err) {
    logger.error(`Error creating client: ${err.message}`);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Fetch all clients
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM Clients`);
    res.json(result.recordset);
  } catch (err) {
    logger.error(`Error fetching clients: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

module.exports = router;
