// backend/tests/allergyIntegration.test.js - Test Unified Allergy System
const request = require('supertest');
const app = require('../server.cjs');

describe('Unified Allergy System Integration Tests', () => {
  const timestamp = Date.now();
  const testClientID = 'TEST-ALLERGY-' + timestamp;

  beforeAll(async () => {
    console.log('🔧 Setting up test client for allergy integration tests...');
    
    // Create test client
    await request(app)
      .post('/api/clients')
      .send({
        clientID: testClientID,
        clientFirstName: 'Allergy',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Test Site'
      })
      .expect(201);
    
    console.log('✅ Test client created:', testClientID);
  }, 30000);

  describe('Allergy Storage in medical_face_sheet', () => {
    
    test('should save allergies to medical_face_sheet table', async () => {
      const medicalData = {
        clientMedConditions: [],
        clientAddMedHistory: 'Test medical history',
        clientMedPertinent: 'Test pertinent info',
        clientPreviousLab: 'Yes',
        clientAllergies: [
          { value: 'penicillin', label: 'Penicillin' },
          { value: 'shellfish', label: 'Shellfish' },
          { value: 'peanuts', label: 'Peanuts' }
        ]
      };

      const response = await request(app)
        .post(`/api/medical/info/${testClientID}`)
        .send(medicalData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.clientAllergies).toBeDefined();
      expect(Array.isArray(response.body.clientAllergies)).toBe(true);
      expect(response.body.clientAllergies.length).toBe(3);
    });

    test('should retrieve allergies from medical_face_sheet', async () => {
      const response = await request(app)
        .get(`/api/medical/info/${testClientID}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.clientAllergies).toBeDefined();
      expect(Array.isArray(response.body.clientAllergies)).toBe(true);
      expect(response.body.clientAllergies.length).toBe(3);
      
      // Verify specific allergies
      const allergyValues = response.body.clientAllergies.map(a => a.value);
      expect(allergyValues).toContain('penicillin');
      expect(allergyValues).toContain('shellfish');
      expect(allergyValues).toContain('peanuts');
    });

    test('should update allergies in medical_face_sheet', async () => {
      const updatedData = {
        clientAllergies: [
          { value: 'penicillin', label: 'Penicillin' },
          { value: 'latex', label: 'Latex' }
        ]
      };

      await request(app)
        .post(`/api/medical/info/${testClientID}`)
        .send(updatedData)
        .expect(200);

      // Verify update
      const response = await request(app)
        .get(`/api/medical/info/${testClientID}`)
        .expect(200);

      expect(response.body.clientAllergies.length).toBe(2);
      const allergyValues = response.body.clientAllergies.map(a => a.value);
      expect(allergyValues).toContain('penicillin');
      expect(allergyValues).toContain('latex');
      expect(allergyValues).not.toContain('shellfish');
    });

    test('should handle empty allergy list', async () => {
      const noAllergiesClientID = testClientID + '-NO-ALLERGY';
      
      // Create client
      await request(app).post('/api/clients').send({
        clientID: noAllergiesClientID,
        clientFirstName: 'No',
        clientLastName: 'Allergy',
        clientDOB: '1990-01-01',
        clientGender: 'Female',
        clientSite: 'Test'
      }).expect(201);

      const medicalData = {
        clientAllergies: []
      };

      const response = await request(app)
        .post(`/api/medical/info/${noAllergiesClientID}`)
        .send(medicalData)
        .expect(200);

      expect(response.body.clientAllergies).toBeDefined();
      expect(Array.isArray(response.body.clientAllergies)).toBe(true);
      expect(response.body.clientAllergies.length).toBe(0);
    }, 15000);
  });

  describe('ClientFace Should Not Contain Allergies', () => {
    
    test('should not save allergies to ClientFace table', async () => {
      const clientFaceData = {
        clientID: testClientID,
        clientContactNum: '(555) 123-4567',
        clientEmail: 'test@example.com',
        clientMedInsType: 'Medicare',
        clientAllergyComments: 'See Medical Face Sheet for details'
      };

      await request(app)
        .post('/api/saveClientFace')
        .send(clientFaceData)
        .expect(200);

      // Verify ClientFace doesn't have clientAllergies field
      const response = await request(app)
        .get(`/api/getClientFace/${testClientID}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.clientContactNum).toBe('(555) 123-4567');
      // ClientAllergies should not be in ClientFace response
      // (it might be undefined or not present at all)
    });

    test('ClientFace endpoint should ignore clientAllergies if sent', async () => {
      const dataWithAllergies = {
        clientID: testClientID,
        clientContactNum: '(555) 999-8888',
        clientAllergies: ['This', 'Should', 'Be', 'Ignored'] // Should be ignored
      };

      const response = await request(app)
        .post('/api/saveClientFace')
        .send(dataWithAllergies)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      
      // Verify it was ignored
      const getResponse = await request(app)
        .get(`/api/getClientFace/${testClientID}`)
        .expect(200);

      expect(getResponse.body.clientContactNum).toBe('(555) 999-8888');
      // Allergies should not be saved to ClientFace
    });
  });

  describe('Cross-Section Data Flow', () => {
    
    test('allergies saved in Section 5 are retrievable', async () => {
      const crossTestClientID = testClientID + '-CROSS';
      
      // Create client
      await request(app).post('/api/clients').send({
        clientID: crossTestClientID,
        clientFirstName: 'Cross',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Test'
      }).expect(201);

      // Save contact info in ClientFace (Section 1)
      await request(app).post('/api/saveClientFace').send({
        clientID: crossTestClientID,
        clientContactNum: '(555) 111-1111',
        clientEmail: 'cross@test.com',
        clientMedInsType: 'Medicaid'
      }).expect(200);

      // Save allergies in Medical (Section 5)
      await request(app).post(`/api/medical/info/${crossTestClientID}`).send({
        clientAllergies: [
          { value: 'sulfa', label: 'Sulfa Drugs' },
          { value: 'iodine', label: 'Iodine' }
        ]
      }).expect(200);

      // Retrieve from ClientFace - should have contact info, not allergies
      const clientFaceResponse = await request(app)
        .get(`/api/getClientFace/${crossTestClientID}`)
        .expect(200);

      expect(clientFaceResponse.body.clientContactNum).toBe('(555) 111-1111');
      expect(clientFaceResponse.body.clientEmail).toBe('cross@test.com');

      // Retrieve from Medical - should have allergies
      const medicalResponse = await request(app)
        .get(`/api/medical/info/${crossTestClientID}`)
        .expect(200);

      expect(medicalResponse.body.clientAllergies).toBeDefined();
      expect(medicalResponse.body.clientAllergies.length).toBe(2);
      const allergyValues = medicalResponse.body.clientAllergies.map(a => a.value);
      expect(allergyValues).toContain('sulfa');
      expect(allergyValues).toContain('iodine');
    }, 20000);
  });

  describe('Allergy Comments in ClientFace', () => {
    
    test('should save and retrieve allergy comments in ClientFace', async () => {
      const comments = 'Patient has severe allergies. See Medical Face Sheet for complete list.';

      await request(app)
        .post('/api/saveClientFace')
        .send({
          clientID: testClientID,
          clientAllergyComments: comments
        })
        .expect(200);

      const response = await request(app)
        .get(`/api/getClientFace/${testClientID}`)
        .expect(200);

      expect(response.body.clientAllergyComments).toBe(comments);
    });

    test('allergy comments should be separate from allergy list', async () => {
      // Comments in ClientFace
      const comments = 'Updated allergy comments';
      await request(app).post('/api/saveClientFace').send({
        clientID: testClientID,
        clientAllergyComments: comments
      }).expect(200);

      // Allergies in Medical
      await request(app).post(`/api/medical/info/${testClientID}`).send({
        clientAllergies: [
          { value: 'aspirin', label: 'Aspirin' }
        ]
      }).expect(200);

      // Verify both exist separately
      const clientFaceResponse = await request(app)
        .get(`/api/getClientFace/${testClientID}`)
        .expect(200);

      const medicalResponse = await request(app)
        .get(`/api/medical/info/${testClientID}`)
        .expect(200);

      expect(clientFaceResponse.body.clientAllergyComments).toBe(comments);
      expect(medicalResponse.body.clientAllergies.length).toBe(1);
      expect(medicalResponse.body.clientAllergies[0].value).toBe('aspirin');
    });
  });

  describe('Data Integrity', () => {
    
    test('deleting from one section should not affect the other', async () => {
      const integrityClientID = testClientID + '-INTEGRITY';
      
      // Create client
      await request(app).post('/api/clients').send({
        clientID: integrityClientID,
        clientFirstName: 'Integrity',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Test'
      }).expect(201);

      // Add data to both sections
      await request(app).post('/api/saveClientFace').send({
        clientID: integrityClientID,
        clientContactNum: '(555) 777-7777',
        clientEmail: 'integrity@test.com',
        clientMedInsType: 'Private'
      }).expect(200);

      await request(app).post(`/api/medical/info/${integrityClientID}`).send({
        clientAllergies: [
          { value: 'codeine', label: 'Codeine' }
        ]
      }).expect(200);

      // Update ClientFace with null values
      await request(app).post('/api/saveClientFace').send({
        clientID: integrityClientID,
        clientContactNum: '(555) 888-8888'
      }).expect(200);

      // Medical allergies should still exist
      const medicalResponse = await request(app)
        .get(`/api/medical/info/${integrityClientID}`)
        .expect(200);

      expect(medicalResponse.body.clientAllergies).toBeDefined();
      expect(medicalResponse.body.clientAllergies.length).toBe(1);
      expect(medicalResponse.body.clientAllergies[0].value).toBe('codeine');
    }, 20000);
  });
});

console.log('✅ Allergy integration test suite completed');