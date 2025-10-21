import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.cjs';

describe('Referrals API', () => {
  let testClientID;
  
  // Complete referral data for testing
  const completeReferralData = {
    lahsaReferral: 'LAHSA referral completed on 2024-03-10. Case worker: Jane Smith. Housing voucher approved. Client eligible for Section 8 housing assistance.',
    odrReferral: 'ODR evaluation scheduled for 2024-03-20. Disability determination pending review. Physical assessment completed showing mobility limitations.',
    dhsReferral: 'DHS benefits application submitted 2024-03-01. CalFresh and Medi-Cal eligibility confirmed. Monthly benefits: $250 CalFresh, full Medi-Cal coverage.',
    dmhReferral: 'DMH psychiatric evaluation completed 2024-03-05. Diagnosed with Major Depressive Disorder. Outpatient therapy 2x weekly recommended.'
  };

  beforeAll(async () => {
    console.log('🧪 Starting Referrals test suite...');
    
    // Create a test client first
    testClientID = `TEST-REF-${Date.now()}`;
    
    const clientData = {
      clientID: testClientID,
      clientFirstName: 'Test',
      clientLastName: 'Referral',
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
    console.log('✅ Referrals test suite completed');
  });

  describe('POST /api/saveClientReferrals', () => {
    
    it('should save all 4 referral types (LAHSA, ODR, DHS, DMH)', async () => {
      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          ...completeReferralData
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('saved');
    });

    it('should handle partial referral data (LAHSA only)', async () => {
      const partialClientID = `${testClientID}-PARTIAL`;
      
      // Create client first
      await request(app)
        .post('/api/clients')
        .send({
          clientID: partialClientID,
          clientFirstName: 'Partial',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: partialClientID,  // ✅ FIX: Include clientID
          lahsaReferral: 'LAHSA referral only - housing assessment in progress',
          odrReferral: '',
          dhsReferral: '',
          dmhReferral: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should save with only ODR referral', async () => {
      const odrClientID = `${testClientID}-ODR`;
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: odrClientID,
          clientFirstName: 'ODR',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: odrClientID,  // ✅ FIX: Include clientID
          lahsaReferral: '',
          odrReferral: 'ODR disability evaluation pending',
          dhsReferral: '',
          dmhReferral: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should save with multiple referrals (LAHSA + DMH)', async () => {
      const multiClientID = `${testClientID}-MULTI`;
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: multiClientID,
          clientFirstName: 'Multi',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: multiClientID,  // ✅ FIX: Include clientID
          lahsaReferral: 'LAHSA housing referral approved',
          odrReferral: '',
          dhsReferral: '',
          dmhReferral: 'DMH mental health services scheduled'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require clientID', async () => {
      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          lahsaReferral: 'Test referral without client ID'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle empty referrals (all fields empty)', async () => {
      const emptyClientID = `${testClientID}-EMPTY`;
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: emptyClientID,
          clientFirstName: 'Empty',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: emptyClientID,  // ✅ FIX: Include clientID
          lahsaReferral: '',
          odrReferral: '',
          dhsReferral: '',
          dmhReferral: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle very long referral notes', async () => {
      const longClientID = `${testClientID}-LONG`;
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: longClientID,
          clientFirstName: 'Long',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const longText = 'A'.repeat(2000);
      
      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: longClientID,  // ✅ FIX: Include clientID
          lahsaReferral: longText,
          odrReferral: 'B'.repeat(2000),
          dhsReferral: '',
          dmhReferral: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle special characters in referral notes', async () => {
      const specialClientID = `${testClientID}-SPECIAL`;
      
      await request(app)
        .post('/api/clients')
        .send({
          clientID: specialClientID,
          clientFirstName: 'Special',
          clientLastName: 'Test',
          clientDOB: '1990-01-01',
          clientGender: 'Male',
          clientSite: 'Main Campus',
          clientStatus: 'Active',
          clientAdmitDate: new Date().toISOString().split('T')[0]
        })
        .expect(201);  // ✅ FIX: Expect 201 for client creation

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: specialClientID,  // ✅ FIX: Include clientID
          lahsaReferral: `Client's referral includes "special needs" & requirements: <housing>, (medical), {mental health}`,
          odrReferral: 'Assessment: 50% disability rating @ $1,500/month',
          dhsReferral: '',
          dmhReferral: ''
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update existing referrals (MERGE operation)', async () => {
      // First save
      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          ...completeReferralData
        })
        .expect(200);

      // Update with new data
      const updatedData = {
        clientID: testClientID,  // ✅ FIX: Include clientID
        lahsaReferral: 'Updated: LAHSA housing voucher approved and Section 8 application submitted',
        odrReferral: completeReferralData.odrReferral,
        dhsReferral: completeReferralData.dhsReferral,
        dmhReferral: 'Updated: DMH therapy sessions increased to 3x weekly'
      };

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send(updatedData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/clientReferrals/:clientID', () => {
    
    beforeAll(async () => {
      // Save test data
      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          ...completeReferralData
        });
    });

    it('should retrieve all 4 referral types', async () => {
      const response = await request(app)
        .get(`/api/clientReferrals/${testClientID}`)
        .expect(200);

      expect(response.body.lahsaReferral).toBe(completeReferralData.lahsaReferral);
      expect(response.body.odrReferral).toBe(completeReferralData.odrReferral);
      expect(response.body.dhsReferral).toBe(completeReferralData.dhsReferral);
      expect(response.body.dmhReferral).toBe(completeReferralData.dmhReferral);
    });

    it('should return empty strings for non-existent client', async () => {
      const response = await request(app)
        .get('/api/clientReferrals/NONEXISTENT-CLIENT')
        .expect(200);

      expect(response.body.lahsaReferral).toBe('');
      expect(response.body.odrReferral).toBe('');
      expect(response.body.dhsReferral).toBe('');
      expect(response.body.dmhReferral).toBe('');
    });

    it('should persist updated data after MERGE', async () => {
      // Update the referrals
      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: testClientID,  // ✅ FIX: Include clientID
          lahsaReferral: 'Final update: Housing placement confirmed',
          odrReferral: completeReferralData.odrReferral,
          dhsReferral: completeReferralData.dhsReferral,
          dmhReferral: completeReferralData.dmhReferral
        });

      // Retrieve and verify
      const response = await request(app)
        .get(`/api/clientReferrals/${testClientID}`);

      expect(response.body.lahsaReferral).toBe('Final update: Housing placement confirmed');
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
        lahsaReferral: 'Consistency test for LAHSA referral',
        odrReferral: 'Consistency test for ODR referral',
        dhsReferral: 'Consistency test for DHS referral',
        dmhReferral: 'Consistency test for DMH referral'
      };

      // Save
      await request(app)
        .post('/api/saveClientReferrals')
        .send(testData)
        .expect(200);

      // Retrieve
      const response = await request(app)
        .get(`/api/clientReferrals/${consistencyID}`)
        .expect(200);

      // Verify exact match
      expect(response.body.lahsaReferral).toBe(testData.lahsaReferral);
      expect(response.body.odrReferral).toBe(testData.odrReferral);
      expect(response.body.dhsReferral).toBe(testData.dhsReferral);
      expect(response.body.dmhReferral).toBe(testData.dmhReferral);
    });

    it('should not leak referral data between clients', async () => {
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
        .post('/api/saveClientReferrals')
        .send({
          clientID: client1ID,
          lahsaReferral: 'Client 1 LAHSA referral',
          odrReferral: '',
          dhsReferral: '',
          dmhReferral: ''
        });

      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: client2ID,
          lahsaReferral: '',
          odrReferral: 'Client 2 ODR referral',
          dhsReferral: 'Client 2 DHS benefits',
          dmhReferral: ''
        });

      // Verify isolation
      const response1 = await request(app).get(`/api/clientReferrals/${client1ID}`);
      const response2 = await request(app).get(`/api/clientReferrals/${client2ID}`);

      expect(response1.body.lahsaReferral).toBe('Client 1 LAHSA referral');
      expect(response1.body.odrReferral).toBe('');
      
      expect(response2.body.lahsaReferral).toBe('');
      expect(response2.body.odrReferral).toBe('Client 2 ODR referral');
    });

    it('should handle multiple updates to same client', async () => {
      const multiUpdateID = `${testClientID}-MULTIUPDATE`;
      
      await request(app).post('/api/clients').send({
        clientID: multiUpdateID,
        clientFirstName: 'MultiUpdate',
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientGender: 'Male',
        clientSite: 'Main Campus',
        clientStatus: 'Active',
        clientAdmitDate: new Date().toISOString().split('T')[0]
      }).expect(201);  // ✅ FIX: Expect 201 for client creation

      // First save
      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: multiUpdateID,
          lahsaReferral: 'Initial LAHSA referral',
          odrReferral: '',
          dhsReferral: '',
          dmhReferral: ''
        });

      // Second save
      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: multiUpdateID,
          lahsaReferral: 'Updated LAHSA referral',
          odrReferral: 'New ODR referral added',
          dhsReferral: '',
          dmhReferral: ''
        });

      // Third save
      await request(app)
        .post('/api/saveClientReferrals')
        .send({
          clientID: multiUpdateID,
          lahsaReferral: 'Final LAHSA referral status',
          odrReferral: 'Updated ODR evaluation',
          dhsReferral: 'New DHS benefits application',
          dmhReferral: 'New DMH psychiatric evaluation'
        });

      // Verify final state
      const response = await request(app)
        .get(`/api/clientReferrals/${multiUpdateID}`)
        .expect(200);

      expect(response.body.lahsaReferral).toBe('Final LAHSA referral status');
      expect(response.body.odrReferral).toBe('Updated ODR evaluation');
      expect(response.body.dhsReferral).toBe('New DHS benefits application');
      expect(response.body.dmhReferral).toBe('New DMH psychiatric evaluation');
    });
  }); 
});

console.log('✅ Backend tests completed');