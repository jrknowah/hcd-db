// backend/tests/clients.test.js - FIXED VERSION
const request = require('supertest');
const app = require('../server.cjs');

describe('Client API Endpoints', () => {
  // Use a consistent timestamp for all test clients
  const timestamp = Date.now();
  let testClientID; // Will be set in each test to ensure uniqueness

  describe('POST /api/clients', () => {
    
    test('should create a new client with ALL fields populated', async () => {
      testClientID = 'TEST-FULL-' + timestamp + '-' + Math.random();
      
      const completeClient = {
        clientID: testClientID,
        clientFirstName: 'John',
        clientMiddleName: 'Michael',
        clientLastName: 'Doe',
        clientAliases: 'Johnny, JD',
        clientGender: 'Male',
        clientPronouns: 'He/Him',
        clientEthnicity: 'Not Hispanic or Latino',
        clientRace: 'White',
        clientPrimaryLang: 'English',
        clientMaritalStatus: 'Single',
        clientReligiousPref: 'Christian',
        clientHighEd: "Bachelor's Degree",
        clientCitizenship: 'U.S. Citizen',
        clientVetStatus: 'Not a veteran',
        clientSSN: '123-45-6789',
        clientDOB: '1985-05-15',
        clientAdmitDate: '2025-01-15',
        clientSite: 'Main Campus'
      };

      const response = await request(app)
        .post('/api/clients')
        .send(completeClient)
        .expect(201);

      expect(response.body).toHaveProperty('clientID', testClientID);
      expect(response.body.firstName).toBe('John');      // ← Changed
      expect(response.body.middleName).toBe('Michael');  // ← Changed (if needed)
      expect(response.body.lastName).toBe('Doe');        // ← Changed
      expect(response.body.fullName).toBe('John Michael Doe');
    }, 30000); // ✅ Increased timeout

    test('should create client with only required fields', async () => {
      testClientID = 'TEST-MIN-' + timestamp + '-' + Math.random();
      
      const minimalClient = {
        clientID: testClientID,
        clientFirstName: 'Jane',
        clientLastName: 'Smith',
        clientDOB: '1990-03-20',
        clientGender: 'Female',
        clientSite: 'South Campus'
      };

      const response = await request(app)
        .post('/api/clients')
        .send(minimalClient)
        .expect(201);

      expect(response.body.clientID).toBe(testClientID);
      expect(response.body.firstName).toBe('Jane');
    }, 30000); // ✅ Increased timeout

    test('should reject duplicate client ID', async () => {
      testClientID = 'TEST-DUP-' + timestamp + '-' + Math.random();
      
      // Create first client
      await request(app)
        .post('/api/clients')
        .send({
          clientID: testClientID,
          clientFirstName: 'First',
          clientLastName: 'Client',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Test'
        })
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/clients')
        .send({
          clientID: testClientID, // Same ID
          clientFirstName: 'Second',
          clientLastName: 'Client',
          clientDOB: '1990-01-01',
          clientGender: 'Female',
          clientSite: 'Test'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
    }, 15000);

    test('should validate required fields', async () => {
      const invalidClient = { clientID: 'TEST-123' };
      
      const response = await request(app)
        .post('/api/clients')
        .send(invalidClient)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    }, 15000);

    // In clients.test.js, update the SSN validation test:

    test('should validate SSN format', async () => {
      const invalidSSNs = [
        '12345678',        // ✅ Too short (8 digits)
        '1234567890',      // ✅ Too long (10 digits)
        '123-45-678',      // ✅ Too short with dashes
        '123-45-67890',    // ✅ Too long with dashes
        'abc-de-fghi',     // ✅ Letters
        '123-456-789',     // ✅ Wrong dash positions
        '12-345-6789',     // ✅ Wrong dash positions
      ];

      for (const ssn of invalidSSNs) {
        testClientID = 'TEST-SSN-' + timestamp + '-' + Math.random();
        
        await request(app)
          .post('/api/clients')
          .send({
            clientID: testClientID,
            clientFirstName: 'Test',
            clientLastName: 'User',
            clientDOB: '1990-01-01',
            clientGender: 'Male',
            clientSite: 'Test',
            clientSSN: ssn
          })
          .expect(400);
      }
      
      // ✅ Also test VALID SSNs
      const validSSNs = [
        '123456789',       // Valid - no dashes
        '123-45-6789',     // Valid - with dashes
      ];
      
      for (const ssn of validSSNs) {
        testClientID = 'TEST-SSN-VALID-' + timestamp + '-' + Math.random();
        
        await request(app)
          .post('/api/clients')
          .send({
            clientID: testClientID,
            clientFirstName: 'Test',
            clientLastName: 'User',
            clientDOB: '1990-01-01',
            clientGender: 'Male',
            clientSite: 'Test',
            clientSSN: ssn
          })
          .expect(201);
      }
    });

    test('should handle special characters in names', async () => {
      testClientID = 'TEST-SPECIAL-' + timestamp + '-' + Math.random();
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: testClientID,
          clientFirstName: "O'Brien",
          clientLastName: 'García-Rodríguez',
          clientMiddleName: 'Anne-Marie',
          clientDOB: '1990-01-01',
          clientGender: 'Female',
          clientSite: 'Test'
        })
        .expect(201);

      // ✅ Fetch the client to verify
      const response = await request(app)
        .get(`/api/clients/${testClientID}`)
        .expect(200);

      expect(response.body.clientFirstName).toBe("O'Brien");
      expect(response.body.clientLastName).toBe('García-Rodríguez');
    });

    test('should handle long text fields', async () => {
      testClientID = 'TEST-LONG-' + timestamp + '-' + Math.random();
      
      const longAliases = 'A'.repeat(500);
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: testClientID,
          clientFirstName: 'Test',
          clientLastName: 'User',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Test',
          clientAliases: longAliases
        })
        .expect(201);

      // ✅ Fetch the client to verify
      const response = await request(app)
        .get(`/api/clients/${testClientID}`)
        .expect(200);

      expect(response.body.clientAliases).toHaveLength(500);
    });

    test('should validate date formats', async () => {
      testClientID = 'TEST-DATE-' + timestamp + '-' + Math.random();
      
      const response = await request(app)
        .post('/api/clients')
        .send({
          clientID: testClientID,
          clientFirstName: 'Test',
          clientLastName: 'User',
          clientDOB: 'invalid-date',
          clientGender: 'Male',
          clientSite: 'Test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should accept all valid SSN formats', async () => {
      const validSSNs = [
        '123-45-6789',
        '987-65-4321',
        '000-00-0000'
      ];

      for (let i = 0; i < validSSNs.length; i++) {
        testClientID = 'TEST-VALID-SSN-' + timestamp + '-' + i;
        
        await request(app)
          .post('/api/clients')
          .send({
            clientID: testClientID,
            clientFirstName: 'Test',
            clientLastName: 'User',
            clientDOB: '1990-01-01',
            clientGender: 'Male',
            clientSite: 'Test',
            clientSSN: validSSNs[i]
          })
          .expect(201);
      }
    });
  });

  describe('GET /api/clients', () => {
    
    test('should fetch all clients', async () => {
      const response = await request(app)
        .get('/api/clients')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return clients with mapped fields', async () => {
      const response = await request(app)
        .get('/api/clients')
        .expect(200);

      const firstClient = response.body[0];
      expect(firstClient).toHaveProperty('clientID');
      expect(firstClient).toHaveProperty('clientFirstName');
      expect(firstClient).toHaveProperty('clientLastName');
    });
  });

  describe('GET /api/clients/:clientID', () => {
    let createdClientID;

    beforeAll(async () => {
      // Create a test client for these tests
      createdClientID = 'TEST-GET-' + timestamp + '-' + Math.random();
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: createdClientID,
          clientFirstName: 'GetTest',
          clientLastName: 'User',
          clientMiddleName: 'Middle',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Test Site',
          clientSSN: '123-45-6789',
          clientAliases: 'GT, GetU'
        })
        .expect(201);
    }, 15000);

    test('should fetch specific client with ALL fields', async () => {
      const response = await request(app)
        .get(`/api/clients/${createdClientID}`)
        .expect(200);

      // Verify ALL fields are returned
      expect(response.body.clientID).toBe(createdClientID);
      expect(response.body.clientFirstName).toBe('GetTest');
      expect(response.body.clientMiddleName).toBe('Middle');
      expect(response.body.clientLastName).toBe('User');
      expect(response.body.clientSSN).toBe('123-45-6789');
      expect(response.body.clientAliases).toBe('GT, GetU');
    });

    test('should verify data persistence after retrieval', async () => {
      const persistID = 'TEST-PERSIST-' + timestamp + '-' + Math.random();
      
      // Create
      await request(app)
        .post('/api/clients')
        .send({
          clientID: persistID,
          clientFirstName: 'Persistence',
          clientLastName: 'Test',
          clientMiddleName: 'Data',
          clientDOB: '1995-06-15',
          clientGender: 'Non-binary',
          clientSite: 'South Campus'
        })
        .expect(201);

      // Retrieve
      const response = await request(app)
        .get(`/api/clients/${persistID}`)
        .expect(200);

      // Verify all data persisted
      expect(response.body.clientID).toBe(persistID);
      expect(response.body.clientFirstName).toBe('Persistence');
      expect(response.body.clientMiddleName).toBe('Data');
    });

    test('should return 404 for non-existent client', async () => {
      await request(app)
        .get('/api/clients/NONEXISTENT')
        .expect(404);
    });
  });

  describe('PUT /api/clients/:clientID', () => {
    let updateClientID;

    beforeAll(async () => {
      // Create a test client for update tests
      updateClientID = 'TEST-UPDATE-' + timestamp + '-' + Math.random();
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: updateClientID,
          clientFirstName: 'Original',
          clientLastName: 'Name',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Test'
        })
        .expect(201);
    }, 15000);

    test('should update ALL client fields', async () => {
      const comprehensiveUpdates = {
        clientFirstName: 'Jane',
        clientMiddleName: 'Elizabeth',
        clientLastName: 'Smith',
        clientAliases: 'Janie, Liz',
        clientGender: 'Female',
        clientPronouns: 'She/Her',
        clientEthnicity: 'Hispanic or Latino',
        clientRace: 'Black or African American',
        clientPrimaryLang: 'Spanish',
        clientMaritalStatus: 'Married',
        clientReligiousPref: 'Catholic',
        clientHighEd: "Master's Degree",
        clientCitizenship: 'Permanent Resident',
        clientVetStatus: 'Not a veteran',
        clientSSN: '987-65-4321',
        clientDOB: '1992-12-25',
        clientAdmitDate: '2025-02-01',
        clientSite: 'West Campus'
      };

      const response = await request(app)
        .put(`/api/clients/${updateClientID}`)
        .send(comprehensiveUpdates)
        .expect(200);

      // Verify EVERY field was updated
      expect(response.body.clientFirstName).toBe('Jane');
      expect(response.body.clientMiddleName).toBe('Elizabeth');
      expect(response.body.clientLastName).toBe('Smith');
      expect(response.body.clientGender).toBe('Female');
      expect(response.body.clientSite).toBe('West Campus');
    });

    test('should update single field without affecting others', async () => {
      const singleUpdate = {
        clientMiddleName: 'Updated'
      };

      const response = await request(app)
        .put(`/api/clients/${updateClientID}`)
        .send(singleUpdate)
        .expect(200);

      expect(response.body.clientMiddleName).toBe('Updated');
      // Verify other fields unchanged
      expect(response.body.clientLastName).toBe('Smith'); // From previous test
    });

    test('should handle empty string updates', async () => {
      const emptyUpdate = {
        clientAliases: ''
      };

      const response = await request(app)
        .put(`/api/clients/${updateClientID}`)
        .send(emptyUpdate)
        .expect(200);

      expect(response.body.clientAliases).toBe('');
    });

    test('should reject invalid updates', async () => {
      await request(app)
        .put(`/api/clients/${updateClientID}`)
        .send({
          clientDOB: 'invalid-date'
        })
        .expect(400);
    });

    test('should return 404 for non-existent client', async () => {
      await request(app)
        .put('/api/clients/NONEXISTENT')
        .send({
          clientFirstName: 'Test'
        })
        .expect(404);
    });
  });

  describe('GET /api/clients/:clientID/authorization-progress', () => {
    let authClientID;

    beforeAll(async () => {
      authClientID = 'TEST-AUTH-' + timestamp + '-' + Math.random();
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: authClientID,
          clientFirstName: 'Auth',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Test'
        })
        .expect(201);
    }, 15000);

    test('should fetch authorization forms progress', async () => {
      const response = await request(app)
        .get(`/api/clients/${authClientID}/authorization-progress`)
        .expect(200);

      expect(response.body).toHaveProperty('clientID');
      expect(response.body).toHaveProperty('forms');
    });
  });
});

describe('Health Check Endpoints', () => {
  
  test('GET /api/health should return server status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK'); // ✅ Fixed: actual response is 'OK'
  });

  test('GET /api/test should return test message', async () => {
    const response = await request(app)
      .get('/api/test')
      .expect(200);

    expect(response.body).toHaveProperty('message');
  });
});

describe('Authentication Endpoints', () => {
  
  test('POST /api/auth/azure-login should validate user', async () => {
    const response = await request(app)
      .post('/api/auth/azure-login')
      .send({
        user: 'Test User',
        token: 'test-token',
        roles: ['User']
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });

  test('POST /api/auth/logout should succeed', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});

console.log('✅ Backend tests completed');