// tests/authSig.test.js - ES Module version with all fixes
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../backend/server.cjs';
import sql from 'mssql';
import { poolPromise } from '../backend/store/azureSql.js';

describe('Authorization Forms API', () => {
  let testClientID = 'TEST-AUTH-' + Date.now();

  beforeAll(async () => {
    console.log('🧹 Setting up test data...');
    // Create test client
    await request(app)
      .post('/api/clients')
      .send({
        clientID: testClientID,
        firstName: 'Test',
        lastName: 'Client',
        dob: '1990-01-01',
        gender: 'Male'
      });
    console.log(`✅ Test client created: ${testClientID}`);
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...');
    try {
      const pool = await poolPromise;
      
      // Clean up in correct order (child tables first)
      await pool.request()
        .input('clientID', sql.VarChar(50), testClientID)
        .query('DELETE FROM AuthorizationForms WHERE clientID = @clientID');
      
      await pool.request()
        .input('clientID', sql.VarChar(50), testClientID)
        .query('DELETE FROM FormSubmissions WHERE clientID = @clientID');
      
      await pool.request()
        .input('clientID', sql.VarChar(50), testClientID)
        .query('DELETE FROM Clients WHERE clientID = @clientID');
      
      // Clean up any other test clients
      await pool.request()
        .query(`DELETE FROM Clients WHERE clientID LIKE 'TEST-%'`);
      
      console.log('✅ Test data cleaned up');
    } catch (err) {
      console.error('❌ Cleanup error:', err.message);
    }
  });

  describe('Form Type Validation', () => {
    it('should accept valid form type', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          checkboxes: { item1: true },
          signature: 'Test User'
        })
        .expect(200);
      
      expect(response.body.formType).toBe('orientation');
    });

    it('should reject invalid form type', async () => {
      await request(app)
        .post(`/api/authorization/${testClientID}/form/invalidFormType`)
        .send({
          checkboxes: { item1: true },
          signature: 'Test'
        })
        .expect(400);
    });

    it('should provide list of valid form types on error', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/invalidType`)
        .send({
          checkboxes: { item1: true },
          signature: 'Test'
        })
        .expect(400);
      
      expect(response.body.validFormTypes).toBeDefined();
    });
  });

  describe('POST /api/authorization/:clientID/form/orientation', () => {
    it('should create new orientation form', async () => {
      const formData = {
        checkboxes: {
          item1: true,
          item2: true,
          item3: false
        },
        signature: 'John Doe',
        completionPercentage: 75
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send(formData)
        .expect(200);
      
      expect(response.body.formType).toBe('orientation');
      expect(response.body.clientID).toBe(testClientID);
    });

    it('should update existing orientation form', async () => {
      const updatedData = {
        checkboxes: {
          item1: true,
          item2: true,
          item3: true
        },
        signature: 'John Doe Updated',
        completionPercentage: 100
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send(updatedData)
        .expect(200);
      
      expect(response.body.formData.signature).toBe('John Doe Updated');
    });

    it('should require clientID', async () => {
      await request(app)
        .post('/api/authorization//form/orientation')
        .send({
          checkboxes: { item1: true },
          signature: 'Test'
        })
        .expect(404);
    });

    it('should require signature', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          checkboxes: { item1: true }
          // No signature
        })
        .expect(422);
      
      expect(response.body.errors.signature).toBeDefined();
    });

    it('should validate signature length (min 2 chars)', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          checkboxes: { item1: true },
          signature: 'A' // Too short
        })
        .expect(422);
      
      expect(response.body.errors.signature).toContain('at least 2 characters');
    });

    it('should validate signature length (max 200 chars)', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          checkboxes: { item1: true },
          signature: 'A'.repeat(201) // Too long
        })
        .expect(422);
      
      expect(response.body.errors.signature).toContain('maximum 200 characters');
    });

    it('should require checkboxes object', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          signature: 'Test User'
          // No checkboxes
        })
        .expect(422);
      
      expect(response.body.errors.checkboxes).toBeDefined();
    });

    it('should require at least one checkbox', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          checkboxes: {}, // Empty object
          signature: 'Test User'
        })
        .expect(422);
      
      expect(response.body.errors.checkboxes).toContain('at least one');
    });

    it('should validate checkbox values are booleans', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send({
          checkboxes: {
            item1: 'yes' // Should be boolean
          },
          signature: 'Test User'
        })
        .expect(422);
      
      expect(response.body.errors.checkboxes).toContain('boolean');
    });

    // FIX #1: Completion percentage validation
    it('should validate completion percentage range', async () => {
      const invalidData = {
        checkboxes: { item1: true },
        signature: 'Test Signature',
        completionPercentage: 150 // Invalid: > 100
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send(invalidData)
        .expect(422);
      
      expect(response.body.errors.completionPercentage).toContain('between 0-100');
    });

    it('should set status to completed when signature present', async () => {
      const completeData = {
        checkboxes: { item1: true, item2: true },
        signature: 'Complete Signature',
        completionPercentage: 100
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/orientation`)
        .send(completeData)
        .expect(200);
      
      expect(response.body.status).toBe('completed');
    });
  });

  describe('POST /api/authorization/:clientID/form/clientRights', () => {
    it('should create client rights form', async () => {
      const formData = {
        acknowledged: true,
        signature: 'Client Name',
        completionPercentage: 100
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/clientRights`)
        .send(formData)
        .expect(200);
      
      expect(response.body.formType).toBe('clientRights');
    });

    it('should require acknowledged field', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/clientRights`)
        .send({
          signature: 'Test'
        })
        .expect(422);
      
      expect(response.body.errors.acknowledged).toBeDefined();
    });

    it('should require acknowledged to be true', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/clientRights`)
        .send({
          acknowledged: false,
          signature: 'Test'
        })
        .expect(422);
      
      expect(response.body.errors.acknowledged).toContain('must be acknowledged');
    });

    it('should validate signature is present', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/clientRights`)
        .send({
          acknowledged: true
        })
        .expect(422);
      
      expect(response.body.errors.signature).toBeDefined();
    });
  });

  describe('POST /api/authorization/:clientID/form/consentPhoto', () => {
    it('should create consent photo form', async () => {
      const formData = {
        clientReleaseItems: ['photos', 'videos', 'audio'],
        clientReleasePurposes: ['marketing', 'training'],
        consentPhotoSign1: '2024-01-01',
        consentPhotoEffectiveDate: '2024-01-01',
        consentPhotoExpirationDate: '2025-01-01',
        signature: 'Client Signature',
        completionPercentage: 100
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send(formData)
        .expect(200);
      
      expect(response.body.formType).toBe('consentPhoto');
    });

    // FIX #2: Array validation with proper error message
    it('should require release items array', async () => {
      const invalidData = {
        clientReleaseItems: 'not-an-array', // Should be array
        clientReleasePurposes: ['purpose1'],
        consentPhotoSign1: '2024-01-01',
        consentPhotoEffectiveDate: '2024-01-01'
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send(invalidData)
        .expect(422);
      
      expect(response.body.errors.clientReleaseItems).toContain('must be an array');
    });

    it('should require at least one release item', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send({
          clientReleaseItems: [], // Empty
          clientReleasePurposes: ['purpose1'],
          consentPhotoSign1: '2024-01-01',
          consentPhotoEffectiveDate: '2024-01-01'
        })
        .expect(422);
      
      expect(response.body.errors.clientReleaseItems).toContain('At least one');
    });

    it('should require release purposes array', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send({
          clientReleaseItems: ['photos'],
          clientReleasePurposes: 'not-array',
          consentPhotoSign1: '2024-01-01',
          consentPhotoEffectiveDate: '2024-01-01'
        })
        .expect(422);
      
      expect(response.body.errors.clientReleasePurposes).toBeDefined();
    });

    it('should require at least one purpose', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send({
          clientReleaseItems: ['photos'],
          clientReleasePurposes: [],
          consentPhotoSign1: '2024-01-01',
          consentPhotoEffectiveDate: '2024-01-01'
        })
        .expect(422);
      
      expect(response.body.errors.clientReleasePurposes).toContain('At least one');
    });

    // FIX #3 & #9: Date format validation
    it('should validate date formats', async () => {
      const invalidData = {
        clientReleaseItems: ['item1'],
        clientReleasePurposes: ['purpose1'], 
        consentPhotoSign1: 'Invalid Date Test',
        consentPhotoEffectiveDate: 'not-a-date'
      };

      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send(invalidData)
        .expect(422);
      
      expect(response.body.errors.consentPhotoEffectiveDate).toContain('Invalid');
    });

    it('should validate expiration date is after effective date', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send({
          clientReleaseItems: ['photos'],
          clientReleasePurposes: ['marketing'],
          consentPhotoSign1: '2024-01-01',
          consentPhotoEffectiveDate: '2024-12-31',
          consentPhotoExpirationDate: '2024-01-01' // Before effective
        })
        .expect(422);
      
      expect(response.body.errors.consentPhotoExpirationDate).toBeDefined();
    });

    it('should validate array items have required structure', async () => {
      const response = await request(app)
        .post(`/api/authorization/${testClientID}/form/consentPhoto`)
        .send({
          clientReleaseItems: [null, undefined, ''],
          clientReleasePurposes: ['purpose'],
          consentPhotoSign1: '2024-01-01',
          consentPhotoEffectiveDate: '2024-01-01'
        })
        .expect(422);
      
      expect(response.body.errors.clientReleaseItems).toBeDefined();
    });
  });

  // Continue with remaining test groups...
  // (GET, autosave, bulk, submit, status, etc.)
  
  // Note: The full test file from your original output was too long to include here.
  // This shows the pattern with the key fixes applied. You should keep your existing
  // passing tests and just add/update the failing ones with these fixes.  
});