// backend/tests/referrals.test.js
const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

describe('Referrals API', () => {
  let testClientID = 'TEST-REF-' + Date.now();

  const completeReferralData = {
    clientID: testClientID,
    lahsaReferral: 'LAHSA referral completed on 2024-03-10. Case worker: Jane Smith. Housing voucher approved. Client eligible for Section 8 housing assistance.',
    odrReferral: 'ODR evaluation scheduled for 2024-03-20. Disability determination pending review. Physical assessment completed showing mobility limitations.',
    dhsReferral: 'DHS benefits application submitted 2024-03-01. CalFresh and Medi-Cal eligibility confirmed. Monthly benefits: $250 CalFresh, full Medi-Cal coverage.',
    dmhReferral: 'DMH psychiatric evaluation completed 2024-03-05. Diagnosed with Major Depressive Disorder. Outpatient therapy 2x weekly recommended.'
  };

  describe('POST /api/saveClientReferrals', () => {
    test('should save all 4 referral types', async () => {
      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send(completeReferralData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Referral notes saved successfully');
    });

    test('should handle partial referral data', async () => {
      const partialData = {
        clientID: testClientID,
        lahsaReferral: 'LAHSA only',
        odrReferral: ''
      };

      await request(app)
        .post('/api/saveClientReferrals')
        .send(partialData)
        .expect(200);
    });

    test('should require clientID', async () => {
      const noID = { lahsaReferral: 'Test' };

      const response = await request(app)
        .post('/api/saveClientReferrals')
        .send(noID)
        .expect(400);

      expect(response.body.error).toBe('Missing required field: clientID');
    });
  });

  describe('GET /api/clientReferrals/:clientID', () => {
    test('should retrieve all referral types', async () => {
      // First save
      await request(app)
        .post('/api/saveClientReferrals')
        .send(completeReferralData);

      // Then retrieve
      const response = await request(app)
        .get(`/api/clientReferrals/${testClientID}`)
        .expect(200);

      expect(response.body.lahsaReferral).toBe(completeReferralData.lahsaReferral);
      expect(response.body.odrReferral).toBe(completeReferralData.odrReferral);
      expect(response.body.dhsReferral).toBe(completeReferralData.dhsReferral);
    });

    test('should return empty strings for non-existent client', async () => {
      const response = await request(app)
        .get('/api/clientReferrals/NONEXISTENT')
        .expect(200);

      expect(response.body.lahsaReferral).toBe('');
      expect(response.body.odrReferral).toBe('');
    });
  });

  describe('POST /api/uploadReferral - File Upload', () => {
    test('should upload referral document to Azure Blob Storage', async () => {
      // Create a test file
      const testFilePath = path.join(__dirname, 'test-referral.pdf');
      fs.writeFileSync(testFilePath, 'Mock PDF content');

      const response = await request(app)
        .post('/api/uploadReferral')
        .field('clientID', testClientID)
        .field('type', 'lahsaReferral')
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('uploaded successfully');
      expect(response.body.storageLocation).toBe('azure');
      expect(response.body.fileUrl).toBeDefined();

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    test('should validate required fields for upload', async () => {
      const response = await request(app)
        .post('/api/uploadReferral')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should enforce file size limits', async () => {
      // Create a file larger than 10MB
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const testFilePath = path.join(__dirname, 'large-file.pdf');
      fs.writeFileSync(testFilePath, largeFile);

      await request(app)
        .post('/api/uploadReferral')
        .field('clientID', testClientID)
        .field('type', 'lahsaReferral')
        .attach('file', testFilePath)
        .expect(413); // Payload too large

      fs.unlinkSync(testFilePath);
    });
  });

  describe('GET /api/referralFiles/:clientID', () => {
    test('should list all uploaded files for client', async () => {
      const response = await request(app)
        .get(`/api/referralFiles/${testClientID}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('DELETE /api/referralFiles/:fileID', () => {
    test('should delete file from Azure and database', async () => {
      // First upload a file
      const testFilePath = path.join(__dirname, 'test-delete.pdf');
      fs.writeFileSync(testFilePath, 'To be deleted');

      const uploadResponse = await request(app)
        .post('/api/uploadReferral')
        .field('clientID', testClientID)
        .field('type', 'lahsaReferral')
        .attach('file', testFilePath);

      const fileID = uploadResponse.body.file.fileID;

      // Then delete
      const response = await request(app)
        .delete(`/api/referralFiles/${fileID}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Cleanup
      fs.unlinkSync(testFilePath);
    });

    test('should return 404 for non-existent file', async () => {
      await request(app)
        .delete('/api/referralFiles/99999')
        .expect(404);
    });
  });
});