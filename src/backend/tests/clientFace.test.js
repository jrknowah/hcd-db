// backend/tests/clientFace.test.js
const request = require('supertest');
const app = require('../server.cjs'); // Note: .cjs extension!

describe('ClientFace API Tests', () => {
  const timestamp = Date.now();
  const testClientID = 'TEST-FACE-' + timestamp;

  // Create test client before running tests
  beforeAll(async () => {
    console.log('🔧 Setting up test client for ClientFace tests...');
    
    await request(app)
      .post('/api/clients')
      .send({
        clientID: testClientID,
        clientFirstName: 'Face',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Test Site'
      })
      .expect(201);
    
    console.log('✅ Test client created:', testClientID);
  }, 30000);

  describe('POST /api/saveClientFace - should save data', () => {
    
    test('should save complete client face sheet data', async () => {
      const testData = {
        clientID: testClientID,
        // Contact Information
        clientContactNum: '(555) 123-4567',
        clientContactAltNum: '(555) 987-6543',
        clientEmail: 'test@example.com',
        
        // Emergency Contact
        clientEmgContactName: 'Emergency Contact',
        clientEmgContactNum: '(555) 111-2222',
        clientEmgContactRel: 'Spouse',
        clientEmgContactAddress: '123 Main St',
        
        // Medical Insurance
        clientMedInsType: 'Medicare',
        clientMedCarrier: 'Blue Cross',
        clientMedInsNum: 'MED123456',
        clientMedPrimaryPhy: 'Dr. Smith',
        clientMedPrimaryPhyPhone: '(555) 444-5555',
        
        // Allergies
        clientAllergies: JSON.stringify(['Penicillin', 'Peanuts']),
        clientAllergyComments: 'Severe reaction to penicillin'
      };

      const response = await request(app)
        .post('/api/saveClientFace')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    }, 15000);

    test('should save minimal client face data', async () => {
      const minimalClientID = testClientID + '-MIN';
      
      // Create client first
      await request(app)
        .post('/api/clients')
        .send({
          clientID: minimalClientID,
          clientFirstName: 'Minimal',
          clientLastName: 'Face',
          clientDOB: '1990-01-01',
          clientGender: 'Female',
          clientSite: 'Test'
        })
        .expect(201);

      const minimalData = {
        clientID: minimalClientID,
        clientContactNum: '(555) 123-4567'
      };

      const response = await request(app)
        .post('/api/saveClientFace')
        .send(minimalData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    }, 15000);

    test('should update existing client face data', async () => {
      const updateData = {
        clientID: testClientID,
        clientEmail: 'updated@example.com',
        clientMedCarrier: 'Updated Carrier'
      };

      const response = await request(app)
        .post('/api/saveClientFace')
        .send(updateData)
        .expect(200);

      expect(response.body.message).toContain('success');
    });

    test('should require clientID', async () => {
      const invalidData = {
        clientContactNum: '(555) 123-4567'
      };

      await request(app)
        .post('/api/saveClientFace')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/getClientFace/:clientID - should retrieve data', () => {
    
    test('should retrieve complete client face data', async () => {
      const response = await request(app)
        .get(`/api/getClientFace/${testClientID}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.clientContactNum).toBe('(555) 123-4567');
      expect(response.body.clientEmail).toBe('updated@example.com'); // From update test
      expect(response.body.clientMedCarrier).toBe('Updated Carrier');
    });

    test('should return empty object for non-existent client', async () => {
      const response = await request(app)
        .get('/api/getClientFace/NONEXISTENT')
        .expect(200);

      expect(response.body).toEqual({});
    });

  });

  describe('Phone Number Validation', () => {
    
    test('should accept valid phone formats', async () => {
      const validPhones = [
        '(555) 123-4567',
        '555-123-4567',
        '5551234567'
      ];

      for (const phone of validPhones) {
        const phoneClientID = testClientID + '-PHONE-' + Math.random();
        
        await request(app).post('/api/clients').send({
          clientID: phoneClientID,
          clientFirstName: 'Phone',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Test'
        }).expect(201);

        await request(app)
          .post('/api/saveClientFace')
          .send({
            clientID: phoneClientID,
            clientContactNum: phone
          })
          .expect(200);
      }
    }, 30000);

    test('should reject invalid phone formats', async () => {
      const invalidPhones = [
        '123',              // Too short
        'abc-def-ghij',     // Letters
        '(555) 123-456'     // Too short
      ];

      for (const phone of invalidPhones) {
        await request(app)
          .post('/api/saveClientFace')
          .send({
            clientID: testClientID,
            clientContactNum: phone
          })
          .expect(400);
      }
    });
  });

  describe('Email Validation', () => {
    
    test('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@test-domain.org'
      ];

      for (const email of validEmails) {
        await request(app)
          .post('/api/saveClientFace')
          .send({
            clientID: testClientID,
            clientEmail: email
          })
          .expect(200);
      }
    });

    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user name@example.com'
      ];

      for (const email of invalidEmails) {
        await request(app)
          .post('/api/saveClientFace')
          .send({
            clientID: testClientID,
            clientEmail: email
          })
          .expect(400);
      }
    });
  });


  describe('Special Characters Handling', () => {
    
    test('should handle special characters in text fields', async () => {
      const specialData = {
        clientID: testClientID,
        clientEmgContactName: "O'Brien & Associates",
        clientEmgContactAddress: '123 "Main" St, Apt #5',
        clientAllergyComments: 'Notes with <special> & "quoted" text'
      };

      await request(app)
        .post('/api/saveClientFace')
        .send(specialData)
        .expect(200);

      const response = await request(app)
        .get(`/api/getClientFace/${testClientID}`);

      expect(response.body.clientEmgContactName).toContain("O'Brien");
      expect(response.body.clientAllergyComments).toContain('&');
    });
  });

  describe('Long Text Handling', () => {
    
    test('should handle very long comments', async () => {
      const longComment = 'A'.repeat(2000);

      await request(app)
        .post('/api/saveClientFace')
        .send({
          clientID: testClientID,
          clientAllergyComments: longComment
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/getClientFace/${testClientID}`);

      expect(response.body.clientAllergyComments).toHaveLength(2000);
    });
  });

  describe('Data Persistence', () => {
    
    test('should maintain data consistency across saves', async () => {
      const persistClientID = testClientID + '-PERSIST';
      
      await request(app).post('/api/clients').send({
        clientID: persistClientID,
        clientFirstName: 'Persist',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Test'
      }).expect(201);

      // First save
      await request(app).post('/api/saveClientFace').send({
        clientID: persistClientID,
        clientContactNum: '(555) 111-1111',
        clientEmail: 'persist@test.com'
      }).expect(200);

      // Second save with update
      await request(app).post('/api/saveClientFace').send({
        clientID: persistClientID,
        clientContactNum: '(555) 222-2222' // Update
      }).expect(200);

      // Verify persistence
      const response = await request(app)
        .get(`/api/getClientFace/${persistClientID}`)
        .expect(200);

      expect(response.body.clientContactNum).toBe('(555) 222-2222');
      expect(response.body.clientEmail).toBe('persist@test.com'); // Should still exist
    }, 20000);
  });

  describe('Null and Empty Values', () => {
    
    test('should handle null values in optional fields', async () => {
      await request(app)
        .post('/api/saveClientFace')
        .send({
          clientID: testClientID,
          clientContactAltNum: null,
          clientEmgContactAddress: null
        })
        .expect(200);
    });

    test('should handle empty strings', async () => {
      await request(app)
        .post('/api/saveClientFace')
        .send({
          clientID: testClientID,
          clientAllergyComments: ''
        })
        .expect(200);
    });
  });
});

console.log('✅ ClientFace test suite completed');