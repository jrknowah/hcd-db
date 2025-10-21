// backend/tests/discharge.test.js
const request = require('supertest');
const app = require('../server');

describe('Discharge Summary API', () => {
  let testClientID = 'TEST-DISCHARGE-' + Date.now();

  const completeDischargeData = {
    clientID: testClientID,
    clientDischargeDate: '2025-03-15',
    clientDischargeDiag: 'Acute myocardial infarction, resolved',
    clientDischargI: 'Patient is a 65-year-old male who presented with acute MI. Recovery goals include cardiac rehabilitation and medication compliance. Patient demonstrates good understanding of treatment plan.',
    clientDischargII: 'Patient will be discharged to home with spouse as primary caregiver. Home environment is safe and appropriate for recovery.',
    clientDischargIII: 'Metoprolol 50mg BID, Lisinopril 10mg daily, Atorvastatin 40mg at bedtime, Aspirin 81mg daily. Take medications as prescribed with food.',
    clientDischargIV: 'Blood pressure monitor (provided), pill organizer, emergency contact list, walker for mobility assistance.',
    clientDischargV: 'Home health nursing visits 2x weekly for vital signs monitoring and medication compliance assessment. Physical therapy 3x weekly.',
    clientDischargVI: 'Follow-up with cardiologist Dr. Johnson in 1 week (scheduled), primary care physician in 2 weeks. Emergency contact: 911 or cardiology hotline.',
    clientDischargVII: 'Patient and spouse educated on heart-healthy diet (low sodium, low fat), medication management using pill organizer, warning signs requiring emergency care (chest pain, shortness of breath), and importance of regular exercise as tolerated.'
  };

  describe('POST /api/saveClientDischarge', () => {
    test('should save complete discharge summary with all 7 sections', async () => {
      const response = await request(app)
        .post('/api/saveClientDischarge')
        .send(completeDischargeData)
        .expect(200);

      expect(response.text).toBe('Client discharge saved.');
    });

    test('should handle partial discharge data', async () => {
      const partialData = {
        clientID: testClientID,
        clientDischargeDate: '2025-03-20',
        clientDischargeDiag: 'Test diagnosis',
        clientDischargI: 'Assessment section only'
      };

      await request(app)
        .post('/api/saveClientDischarge')
        .send(partialData)
        .expect(200);
    });

    test('should validate date format', async () => {
      const invalidDate = {
        ...completeDischargeData,
        clientDischargeDate: 'invalid-date'
      };

      await request(app)
        .post('/api/saveClientDischarge')
        .send(invalidDate)
        .expect(400);
    });

    test('should require clientID', async () => {
      const noID = { ...completeDischargeData };
      delete noID.clientID;

      await request(app)
        .post('/api/saveClientDischarge')
        .send(noID)
        .expect(400);
    });
  });

  describe('GET /api/getClientDischarge/:clientID', () => {
    test('should retrieve all discharge sections', async () => {
      // First save
      await request(app)
        .post('/api/saveClientDischarge')
        .send(completeDischargeData);

      // Then retrieve
      const response = await request(app)
        .get(`/api/getClientDischarge/${testClientID}`)
        .expect(200);

      expect(response.body.clientDischargeDiag).toBe(completeDischargeData.clientDischargeDiag);
      expect(response.body.clientDischargI).toBe(completeDischargeData.clientDischargI);
      expect(response.body.clientDischargVII).toBe(completeDischargeData.clientDischargVII);
    });

    test('should return empty object for non-existent client', async () => {
      const response = await request(app)
        .get('/api/getClientDischarge/NONEXISTENT')
        .expect(200);

      expect(response.body).toEqual({});
    });
  });

  describe('Update Discharge Data', () => {
    test('should update existing discharge data (MERGE operation)', async () => {
      // Initial save
      await request(app)
        .post('/api/saveClientDischarge')
        .send(completeDischargeData);

      // Update
      const updatedData = {
        ...completeDischargeData,
        clientDischargeDiag: 'Updated diagnosis - condition improving'
      };

      await request(app)
        .post('/api/saveClientDischarge')
        .send(updatedData)
        .expect(200);

      // Verify update
      const response = await request(app)
        .get(`/api/getClientDischarge/${testClientID}`);

      expect(response.body.clientDischargeDiag).toBe('Updated diagnosis - condition improving');
    });
  });
});