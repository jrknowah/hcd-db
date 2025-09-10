const express = require('express');
const router = express.Router();
const sql = require('mssql');

// ✅ FIXED: Try multiple paths to find azureSql module
let getPool;
try {
  // Try current directory first
  const azureSql = require('../store/azureSql');
  getPool = azureSql.getPool;
  console.log('✅ azureSql loaded from ../store/azureSql');
} catch (err) {
  try {
    // Try store directory
    const azureSql = require('../store/azureSql');
    getPool = azureSql.getPool;
    console.log('✅ azureSql loaded from ../store/azureSql');
  } catch (err2) {
    console.error('❌ Could not load azureSql module:', err2.message);
    throw new Error('azureSql module not found');
  }
}

// Generate client ID helper
const generateClientID = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CL-${timestamp}-${random}`;
};

// ✅ Helper function to map client fields for authorization forms compatibility
const mapClientForAuthForms = (client) => {
  if (!client) return null;
  
  return {
    ...client, // Keep all original fields
    // Add mapped fields for authorization forms
    firstName: client.clientFirstName,
    lastName: client.clientLastName,
    fullName: `${client.clientFirstName || ''} ${client.clientLastName || ''}`.trim(),
    dateOfBirth: client.clientDOB,
    admitDate: client.clientAdmitDate,
    // Add computed status if needed
    status: client.status || 'active'
  };
};

// ✅ Enhanced validation (keep from previous changes)
const validateClientData = (clientData, isUpdate = false) => {
  const errors = {};
  
  if (!isUpdate) {
    // Required fields for creation
    if (!clientData.clientFirstName || clientData.clientFirstName.trim() === '') {
      errors.clientFirstName = 'First name is required';
    }
    
    if (!clientData.clientLastName || clientData.clientLastName.trim() === '') {
      errors.clientLastName = 'Last name is required';
    }
  }
  
  // Validate DOB format if provided
  if (clientData.clientDOB) {
    const dob = new Date(clientData.clientDOB);
    if (isNaN(dob.getTime())) {
      errors.clientDOB = 'Invalid date of birth format';
    } else if (dob > new Date()) {
      errors.clientDOB = 'Date of birth cannot be in the future';
    }
  }
  
  // Validate admit date if provided
  if (clientData.clientAdmitDate) {
    const admitDate = new Date(clientData.clientAdmitDate);
    if (isNaN(admitDate.getTime())) {
      errors.clientAdmitDate = 'Invalid admit date format';
    }
  }
  
  // Validate SSN format if provided
  if (clientData.clientSSN && clientData.clientSSN.length > 0) {
    const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssnPattern.test(clientData.clientSSN)) {
      errors.clientSSN = 'Invalid SSN format (expected: XXX-XX-XXXX)';
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

// Create new client
router.post('/', async (req, res) => {
  try {
    const pool = await getPool();
    const client = req.body;
    
    // ✅ Enhanced validation
    const validationErrors = validateClientData(client);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Generate clientID if not provided
    const clientID = client.clientID || generateClientID();
    
    console.log(`Creating client: ${clientID} - ${client.clientFirstName} ${client.clientLastName}`);
    
    // Check if clientID already exists
    const existingClient = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .query('SELECT clientID FROM Clients WHERE clientID = @clientID');
    
    if (existingClient.recordset.length > 0) {
      return res.status(409).json({
        error: 'Client ID already exists',
        clientID: clientID
      });
    }
    
    const result = await pool.request()
      .input('clientID', sql.NVarChar(50), clientID)
      .input('clientAdmitDate', sql.Date, client.clientAdmitDate || null)
      .input('clientDOB', sql.Date, client.clientDOB || null)
      .input('clientSite', sql.NVarChar(100), client.clientSite || null)
      .input('clientFirstName', sql.NVarChar(100), client.clientFirstName || null)
      .input('clientMiddleName', sql.NVarChar(100), client.clientMiddleName || null)
      .input('clientLastName', sql.NVarChar(100), client.clientLastName || null)
      .input('clientAliases', sql.NVarChar(500), client.clientAliases || null)
      .input('clientCitizenship', sql.NVarChar(100), client.clientCitizenship || null)
      .input('clientVetStatus', sql.NVarChar(100), client.clientVetStatus || null)
      .input('clientSSN', sql.NVarChar(20), client.clientSSN || null)
      .input('clientGender', sql.NVarChar(50), client.clientGender || null)
      .input('clientPronouns', sql.NVarChar(50), client.clientPronouns || null)
      .input('clientEthnicity', sql.NVarChar(100), client.clientEthnicity || null)
      .input('clientRace', sql.NVarChar(100), client.clientRace || null)
      .input('clientPrimaryLang', sql.NVarChar(100), client.clientPrimaryLang || null)
      .input('clientMaritalStatus', sql.NVarChar(100), client.clientMaritalStatus || null)
      .input('clientReligiousPref', sql.NVarChar(100), client.clientReligiousPref || null)
      .input('clientHighEd', sql.NVarChar(100), client.clientHighEd || null)
      .query(`
        INSERT INTO Clients (
          clientID, clientAdmitDate, clientDOB, clientSite,
          clientFirstName, clientMiddleName, clientLastName, clientAliases,
          clientCitizenship, clientVetStatus, clientSSN,
          clientGender, clientPronouns, clientEthnicity, clientRace,
          clientPrimaryLang, clientMaritalStatus, clientReligiousPref, clientHighEd,
          createdAt, updatedAt
        )
        VALUES (
          @clientID, @clientAdmitDate, @clientDOB, @clientSite,
          @clientFirstName, @clientMiddleName, @clientLastName, @clientAliases,
          @clientCitizenship, @clientVetStatus, @clientSSN,
          @clientGender, @clientPronouns, @clientEthnicity, @clientRace,
          @clientPrimaryLang, @clientMaritalStatus, @clientReligiousPref, @clientHighEd,
          GETDATE(), GETDATE()
        );
        
        SELECT * FROM Clients WHERE clientID = @clientID;
      `);

    console.log(`✅ Client created: ${clientID}`);
    
    // ✅ Return mapped response for authorization forms compatibility
    const createdClient = result.recordset[0];
    const mappedClient = mapClientForAuthForms(createdClient);
    
    res.status(201).json({ 
      clientID: mappedClient.clientID,
      firstName: mappedClient.firstName,
      lastName: mappedClient.lastName,
      fullName: mappedClient.fullName,
      message: 'Client created successfully',
      data: mappedClient
    });
  } catch (err) {
    console.error('❌ Error creating client:', err);
    res.status(500).json({ 
      error: 'Failed to create client',
      message: err.message 
    });
  }
});

// Fetch all clients
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM Clients 
      ORDER BY createdAt DESC
    `);
    
    // ✅ Map all clients for authorization forms compatibility
    const mappedClients = result.recordset.map(mapClientForAuthForms);
    
    console.log(`📋 Fetched ${mappedClients.length} clients from Clients table`);
    res.json(mappedClients);
  } catch (err) {
    console.error('❌ Error fetching clients:', err);
    res.status(500).json({ 
      error: 'Failed to fetch clients',
      message: err.message 
    });
  }
});

// Get specific client
router.get('/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('clientID', sql.NVarChar, req.params.clientID)
      .query('SELECT * FROM Clients WHERE clientID = @clientID');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // ✅ Map client for authorization forms compatibility
    const mappedClient = mapClientForAuthForms(result.recordset[0]);
    
    console.log(`👤 Fetched client: ${req.params.clientID} - ${mappedClient.firstName} ${mappedClient.lastName}`);
    res.json(mappedClient);
  } catch (err) {
    console.error('❌ Error fetching client:', err);
    res.status(500).json({ 
      error: 'Failed to fetch client',
      message: err.message 
    });
  }
});

// ✅ Enhanced update client
router.put('/:clientID', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    const updates = req.body;
    
    // ✅ Enhanced validation
    const validationErrors = validateClientData(updates, true);
    if (validationErrors) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationErrors
      });
    }
    
    console.log(`🔄 Updating client: ${clientID}`);
    console.log(`🔄 Update data:`, updates);
    
    // First check if client exists
    const checkResult = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT * FROM Clients WHERE clientID = @clientID');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Build update query
    const request = pool.request();
    request.input('clientID', sql.NVarChar, clientID);
    
    let updateFields = [];
    if (updates.clientAdmitDate !== undefined) {
      request.input('clientAdmitDate', sql.Date, updates.clientAdmitDate);
      updateFields.push('clientAdmitDate = @clientAdmitDate');
    }
    if (updates.clientDOB !== undefined) {
      request.input('clientDOB', sql.Date, updates.clientDOB);
      updateFields.push('clientDOB = @clientDOB');
    }
    if (updates.clientSite !== undefined) {
      request.input('clientSite', sql.NVarChar(100), updates.clientSite);
      updateFields.push('clientSite = @clientSite');
    }
    if (updates.clientFirstName !== undefined) {
      request.input('clientFirstName', sql.NVarChar(100), updates.clientFirstName);
      updateFields.push('clientFirstName = @clientFirstName');
    }
    if (updates.clientMiddleName !== undefined) {
      request.input('clientMiddleName', sql.NVarChar(100), updates.clientMiddleName);
      updateFields.push('clientMiddleName = @clientMiddleName');
    }
    if (updates.clientLastName !== undefined) {
      request.input('clientLastName', sql.NVarChar(100), updates.clientLastName);
      updateFields.push('clientLastName = @clientLastName');
    }
    if (updates.clientAliases !== undefined) {
      request.input('clientAliases', sql.NVarChar(500), updates.clientAliases);
      updateFields.push('clientAliases = @clientAliases');
    }
    if (updates.clientCitizenship !== undefined) {
      request.input('clientCitizenship', sql.NVarChar(100), updates.clientCitizenship);
      updateFields.push('clientCitizenship = @clientCitizenship');
    }
    if (updates.clientVetStatus !== undefined) {
      request.input('clientVetStatus', sql.NVarChar(100), updates.clientVetStatus);
      updateFields.push('clientVetStatus = @clientVetStatus');
    }
    if (updates.clientSSN !== undefined) {
      request.input('clientSSN', sql.NVarChar(20), updates.clientSSN);
      updateFields.push('clientSSN = @clientSSN');
    }
    if (updates.clientGender !== undefined) {
      request.input('clientGender', sql.NVarChar(50), updates.clientGender);
      updateFields.push('clientGender = @clientGender');
    }
    if (updates.clientPronouns !== undefined) {
      request.input('clientPronouns', sql.NVarChar(50), updates.clientPronouns);
      updateFields.push('clientPronouns = @clientPronouns');
    }
    if (updates.clientEthnicity !== undefined) {
      request.input('clientEthnicity', sql.NVarChar(100), updates.clientEthnicity);
      updateFields.push('clientEthnicity = @clientEthnicity');
    }
    if (updates.clientRace !== undefined) {
      request.input('clientRace', sql.NVarChar(100), updates.clientRace);
      updateFields.push('clientRace = @clientRace');
    }
    if (updates.clientPrimaryLang !== undefined) {
      request.input('clientPrimaryLang', sql.NVarChar(100), updates.clientPrimaryLang);
      updateFields.push('clientPrimaryLang = @clientPrimaryLang');
    }
    if (updates.clientMaritalStatus !== undefined) {
      request.input('clientMaritalStatus', sql.NVarChar(100), updates.clientMaritalStatus);
      updateFields.push('clientMaritalStatus = @clientMaritalStatus');
    }
    if (updates.clientReligiousPref !== undefined) {
      request.input('clientReligiousPref', sql.NVarChar(100), updates.clientReligiousPref);
      updateFields.push('clientReligiousPref = @clientReligiousPref');
    }
    if (updates.clientHighEd !== undefined) {
      request.input('clientHighEd', sql.NVarChar(100), updates.clientHighEd);
      updateFields.push('clientHighEd = @clientHighEd');
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Execute update
    const updateQuery = `
      UPDATE Clients 
      SET ${updateFields.join(', ')}, updatedAt = GETDATE()
      WHERE clientID = @clientID;
      
      SELECT * FROM Clients WHERE clientID = @clientID;
    `;
    
    const updateResult = await request.query(updateQuery);
    
    // ✅ Map updated client for authorization forms compatibility
    const updatedClient = mapClientForAuthForms(updateResult.recordset[0]);
    
    console.log(`✅ Client updated: ${clientID} - ${updatedClient.firstName} ${updatedClient.lastName}`);
    res.json(updatedClient);
  } catch (err) {
    console.error('❌ Error updating client:', err);
    res.status(500).json({ 
      error: 'Failed to update client',
      message: err.message 
    });
  }
});

// ✅ NEW: Get client's authorization forms progress (useful for dashboard)
router.get('/:clientID/authorization-progress', async (req, res) => {
  try {
    const pool = await getPool();
    const { clientID } = req.params;
    
    // Check if client exists
    const clientCheck = await pool.request()
      .input('clientID', sql.NVarChar, clientID)
      .query('SELECT clientFirstName, clientLastName FROM Clients WHERE clientID = @clientID');
    
    if (clientCheck.recordset.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Get authorization forms if the table exists
    let forms = [];
    let summary = {
      totalForms: 0,
      completedForms: 0,
      inProgressForms: 0,
      draftForms: 0,
      overallCompletion: 0,
      lastActivity: null
    };
    
    try {
      const result = await pool.request()
        .input('clientID', sql.NVarChar, clientID)
        .query(`
          SELECT 
            formType,
            status,
            completionPercentage,
            signature,
            completedAt,
            completedBy,
            createdAt,
            updatedAt,
            priority
          FROM AuthorizationForms 
          WHERE clientID = @clientID
          ORDER BY priority DESC, updatedAt DESC
        `);
      
      forms = result.recordset;
      
      // Calculate summary statistics
      summary = {
        totalForms: forms.length,
        completedForms: forms.filter(f => f.status === 'completed').length,
        inProgressForms: forms.filter(f => f.status === 'in_progress').length,
        draftForms: forms.filter(f => f.status === 'draft').length,
        overallCompletion: forms.length > 0 
          ? Math.round(forms.reduce((sum, f) => sum + (f.completionPercentage || 0), 0) / forms.length)
          : 0,
        lastActivity: forms.length > 0 
          ? Math.max(...forms.map(f => new Date(f.updatedAt).getTime()))
          : null
      };
    } catch (authFormsError) {
      // AuthorizationForms table might not exist yet - that's ok
      console.log('AuthorizationForms table not found - returning empty progress');
    }
    
    const client = clientCheck.recordset[0];
    const mappedClient = mapClientForAuthForms(client);
    
    res.json({
      clientID,
      clientName: mappedClient.fullName,
      summary,
      forms
    });
    
  } catch (err) {
    console.error('❌ Error fetching authorization progress:', err);
    res.status(500).json({ 
      error: 'Failed to fetch authorization progress',
      message: err.message 
    });
  }
});

module.exports = router;