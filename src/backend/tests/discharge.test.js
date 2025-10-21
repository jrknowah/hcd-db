import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.cjs';

describe('Discharge Summary API', () => {
  let testClientID;
  
  // Complete discharge data with all 7 sections
  const completeDischargeData = {
    clientDischargeDate: '2025-03-15',
    clientDischargeDiag: 'Acute myocardial infarction, resolved',
    clientDischargI: 'Patient is a 65-year-old male who presented with acute MI. Recovery goals include cardiac rehabilitation and medication compliance.',
    clientDischargII: 'Patient will be discharged to home with spouse as primary caregiver.',
    clientDischargIII: 'Metoprolol 50mg BID, Lisinopril 10mg daily, Atorvastatin 40mg at bedtime.',
    clientDischargIV: 'Blood pressure monitor, pill organizer, emergency contact list.',
    clientDischargV: 'Home health nursing visits 2x weekly for vital signs and medication compliance assessment.',
    clientDischargVI: 'Follow-up with cardiologist in 1 week, primary care physician in 2 weeks.',
    clientDischargVII: 'Patient and spouse educated on heart-healthy diet, medication management, and when to seek emergency care.'
  };

  beforeAll(async () => {
    console.log('🧪 Starting Discharge test suite...');
    
    // Create a test client first
    testClientID = `TEST-DISCHARGE-${Date.now()}`;
    
    const clientData = {
      clientID: testClientID,
      clientFirstName: 'Test',
      clientLastName: 'Discharge',
      clientDOB: '1990-01-01',
      clientGender: 'Male',
      clientSite: 'Main Campus',
      clientStatus: 'Active',
      clientAdmitDate: new Date().toISOString().split('T')[0]
    };

    await request(app)
      .post('/api/clients')
      .send(clientData)
      .expect(201);  // ✅ FIX: API returns 201 Created, not 200

    console.log(`✅ Test client created: ${testClientID}`);
  });

  afterAll(() => {
    console.log('✅ Discharge test suite completed');
  });

  describe('POST /api/saveClientDischarge', () => {
    
    it('should save complete discharge summary with all 7 sections', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          ...completeDischargeData
        })
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    it('should save with minimal required fields', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          clientDischargeDate: '2025-03-20',
          clientDischargeDiag: 'Test diagnosis'
        })
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    it('should handle partial discharge data (some sections empty)', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          clientDischargeDate: '2025-03-18',
          clientDischargeDiag: 'Partial diagnosis',
          clientDischargI: 'Assessment completed',
          clientDischargII: 'Discharge destination noted',
          clientDischargIII: '',
          clientDischargIV: '',
          clientDischargV: '',
          clientDischargVI: '',
          clientDischargVII: ''
        })
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    it('should update existing discharge data (MERGE operation)', async () => {
      // First save
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          ...completeDischargeData
        })
        .expect(200);

      // Update with new data
      const updatedData = {
        clientID: testClientID,  // ✅ FIX: Include clientID
        clientDischargeDate: '2025-03-15',
        clientDischargeDiag: 'Updated diagnosis after review',
        clientDischargI: 'Updated assessment with new recovery goals',
        clientDischargII: completeDischargeData.clientDischargII,
        clientDischargIII: completeDischargeData.clientDischargIII,
        clientDischargIV: completeDischargeData.clientDischargIV,
        clientDischargV: completeDischargeData.clientDischargV,
        clientDischargVI: completeDischargeData.clientDischargVI,
        clientDischargVII: completeDischargeData.clientDischargVII
      };

      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send(updatedData)
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    it('should require clientID', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientDischargeDate: '2025-03-15',
          clientDischargeDiag: 'Test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle very long section content', async () => {
      const longText = 'A'.repeat(2000);
      
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          clientDischargeDate: '2025-03-15',
          clientDischargeDiag: 'Test',
          clientDischargI: longText,
          clientDischargVII: 'B'.repeat(2000)
        })
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    it('should handle special characters and formatting', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          clientDischargeDate: '2025-03-15',
          clientDischargeDiag: `Diagnosis with "quotes" and special chars: & < > ' "`,
          clientDischargI: "Assessment: Patient's condition improved 100%",
          clientDischargIII: 'Medications:\n1. Drug A - 50mg\n2. Drug B - 100mg',
          clientDischargVII: 'Education provided in English & Spanish.'
        })
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    it('should handle null values in optional sections', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          clientDischargeDate: '2025-03-15',
          clientDischargeDiag: 'Test',
          clientDischargI: null,
          clientDischargII: null,
          clientDischargIII: null,
          clientDischargIV: null,
          clientDischargV: null,
          clientDischargVI: null,
          clientDischargVII: null
        })
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });
  });

  describe('GET /api/getClientDischarge/:clientID', () => {
    
    beforeAll(async () => {
      // Save test data
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          ...completeDischargeData
        });
    });

    it('should retrieve complete discharge data with all sections', async () => {
      const response = await request(app)
        .get(`/api/getClientDischarge/${testClientID}`)
        .expect(200);

      // Verify all sections are returned
      expect(response.body.clientDischargeDate).toBeDefined();
      expect(response.body.clientDischargeDiag).toBe(completeDischargeData.clientDischargeDiag);
      expect(response.body.clientDischargI).toBe(completeDischargeData.clientDischargI);
      expect(response.body.clientDischargII).toBe(completeDischargeData.clientDischargII);
      expect(response.body.clientDischargIII).toBe(completeDischargeData.clientDischargIII);
      expect(response.body.clientDischargIV).toBe(completeDischargeData.clientDischargIV);
      expect(response.body.clientDischargV).toBe(completeDischargeData.clientDischargV);
      expect(response.body.clientDischargVI).toBe(completeDischargeData.clientDischargVI);
      expect(response.body.clientDischargVII).toBe(completeDischargeData.clientDischargVII);
    });

    it('should return empty object for non-existent client', async () => {
      const response = await request(app)
        .get('/api/getClientDischarge/NONEXISTENT')
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should persist data after update', async () => {
      // Update the discharge
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          clientDischargeDate: '2025-03-15',
          clientDischargeDiag: 'Updated diagnosis after review',
          clientDischargI: completeDischargeData.clientDischargI,
          clientDischargII: completeDischargeData.clientDischargII,
          clientDischargIII: completeDischargeData.clientDischargIII,
          clientDischargIV: completeDischargeData.clientDischargIV,
          clientDischargV: completeDischargeData.clientDischargV,
          clientDischargVI: completeDischargeData.clientDischargVI,
          clientDischargVII: completeDischargeData.clientDischargVII
        });

      // Retrieve and verify
      const response = await request(app)
        .get(`/api/getClientDischarge/${testClientID}`);

      expect(response.body.clientDischargeDiag).toBe('Updated diagnosis after review');
    });
  });

  describe('Data Integrity & Edge Cases', () => {
    
    it('should maintain data consistency across save and retrieve', async () => {
      const consistencyID = `${testClientID}-CONSISTENCY`;
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: consistencyID,
          clientFirstName: 'Consistency',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const testData = {
        clientID: consistencyID,  // ✅ FIX: Include clientID
        clientDischargeDate: '2025-04-01',
        clientDischargeDiag: 'Consistency test diagnosis',
        clientDischargI: 'Section I content for consistency check',
        clientDischargII: 'Section II content for consistency check',
        clientDischargIII: 'Section III content for consistency check',
        clientDischargIV: 'Section IV content for consistency check',
        clientDischargV: 'Section V content for consistency check',
        clientDischargVI: 'Section VI content for consistency check',
        clientDischargVII: 'Section VII content for consistency check'
      };

      // Save
      await request(app)
        .post('/api/saveClientDischarge')
        .send(testData)
        .expect(200);

      // Retrieve
      const response = await request(app)
        .get(`/api/getClientDischarge/${consistencyID}`)
        .expect(200);

      // Verify exact match
      expect(response.body.clientDischargeDiag).toBe(testData.clientDischargeDiag);
      expect(response.body.clientDischargI).toBe(testData.clientDischargI);
      expect(response.body.clientDischargII).toBe(testData.clientDischargII);
      expect(response.body.clientDischargIII).toBe(testData.clientDischargIII);
      expect(response.body.clientDischargIV).toBe(testData.clientDischargIV);
      expect(response.body.clientDischargV).toBe(testData.clientDischargV);
      expect(response.body.clientDischargVI).toBe(testData.clientDischargVI);
      expect(response.body.clientDischargVII).toBe(testData.clientDischargVII);
    });

    it('should not leak discharge data between clients', async () => {
      const client1ID = `${testClientID}-ISO1`;
      const client2ID = `${testClientID}-ISO2`;
      
      // Create two separate clients
      await request(app).post('/api/clients').send({
        clientID: client1ID,
        clientFirstName: 'Client1',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Main Campus',
        clientStatus: 'Active',
        clientAdmitDate: new Date().toISOString().split('T')[0]
      }).expect(201);  // ✅ FIX: Expect 201 for client creation

      await request(app).post('/api/clients').send({
        clientID: client2ID,
        clientFirstName: 'Client2',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Main Campus',
        clientStatus: 'Active',
        clientAdmitDate: new Date().toISOString().split('T')[0]
      }).expect(201);  // ✅ FIX: Expect 201 for client creation

      // Save different data for each
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: client1ID,
          clientDischargeDate: '2025-03-01',
          clientDischargeDiag: 'Client 1 diagnosis',
          clientDischargI: 'Client 1 assessment'
        });

      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: client2ID,
          clientDischargeDate: '2025-03-02',
          clientDischargeDiag: 'Client 2 diagnosis',
          clientDischargI: 'Client 2 assessment'
        });

      // Verify isolation
      const response1 = await request(app).get(`/api/getClientDischarge/${client1ID}`);
      const response2 = await request(app).get(`/api/getClientDischarge/${client2ID}`);

      expect(response1.body.clientDischargeDiag).toBe('Client 1 diagnosis');
      expect(response1.body.clientDischargI).toBe('Client 1 assessment');
      
      expect(response2.body.clientDischargeDiag).toBe('Client 2 diagnosis');
      expect(response2.body.clientDischargI).toBe('Client 2 assessment');
    });

    it('should handle multiple updates to same client', async () => {
      const multiID = `${testClientID}-MULTI`;
      
      await request(app).post('/api/clients').send({
        clientID: multiID,
        clientFirstName: 'Multi',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Main Campus',
        clientStatus: 'Active',
        clientAdmitDate: new Date().toISOString().split('T')[0]
      }).expect(201);  // ✅ FIX: Expect 201 for client creation

      // First save
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: multiID,
          clientDischargeDate: '2025-03-01',
          clientDischargeDiag: 'Initial diagnosis',
          clientDischargI: 'Initial assessment'
        });

      // Second save
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: multiID,
          clientDischargeDate: '2025-03-02',
          clientDischargeDiag: 'Updated diagnosis',
          clientDischargI: 'Updated assessment'
        });

      // Third save
      await request(app)
        .post('/api/saveClientDischarge')
        .send({
          clientID: multiID,
          clientDischargeDate: '2025-03-03',
          clientDischargeDiag: 'Final diagnosis',
          clientDischargI: 'Final assessment'
        });

      // Verify final state
      const response = await request(app)
        .get(`/api/getClientDischarge/${multiID}`)
        .expect(200);

      expect(response.body.clientDischargeDiag).toBe('Final diagnosis');
      expect(response.body.clientDischargI).toBe('Final assessment');
    });
  });

  describe('Date Validation', () => {
    
    it('should accept valid date formats', async () => {
      const validDates = ['2025-03-15', '2025-01-01', '2025-12-31'];
      
      for (const date of validDates) {
        const dateClientID = `${testClientID}-DATE-${date}`;
        
        await request(app)
          .post('/api/clients')
          .send({
            clientID: dateClientID,
            clientFirstName: 'Date',
            clientLastName: 'Test',
            clientDOB: '1990-01-01',
            clientGender: 'Male',
            clientSite: 'Main Campus',
            clientStatus: 'Active',
            clientAdmitDate: new Date().toISOString().split('T')[0]
          })
          .expect(201);  // ✅ FIX: Expect 201 for client creation

        const response = await request(app)
          .post('/api/saveClientDischarge')
          .send({
            clientID: dateClientID,
            clientDischargeDate: date,
            clientDischargeDiag: 'Test'
          })
          .expect(200);

        expect(response.text).toBe('Client discharge saved.');
      }
    });
  });
});

console.log('✅ Backend tests completed');