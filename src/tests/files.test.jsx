// backend/tests/files.test.js
const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

describe('File Upload API - Azure Blob Storage', () => {
  let testClientID = 'TEST-FILES-' + Date.now();
  const docTypes = [
    'Identification Card',
    "Driver's License",
    'Social Security Card',
    'Medi-Cal Benefits',
    'TB Clearance'
  ];

  describe('POST /api/upload', () => {
    test('should upload all document types to Azure', async () => {
      for (const docType of docTypes) {
        const testFilePath = path.join(__dirname, `test-${docType.replace(/\s+/g, '-')}.pdf`);
        fs.writeFileSync(testFilePath, `Mock ${docType} content`);

        const response = await request(app)
          .post('/api/upload')
          .field('clientID', testClientID)
          .field('docType', docType)
          .attach('file', testFilePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.storage).toBe('azure');
        expect(response.body.blobName).toContain(testClientID);
        expect(response.body.blobName).toContain(docType);

        fs.unlinkSync(testFilePath);
      }
    });

    test('should validate file type restrictions', async () => {
      const testFilePath = path.join(__dirname, 'test.exe');
      fs.writeFileSync(testFilePath, 'Executable content');

      await request(app)
        .post('/api/upload')
        .field('clientID', testClientID)
        .field('docType', 'Identification Card')
        .attach('file', testFilePath)
        .expect(400);

      fs.unlinkSync(testFilePath);
    });

    test('should enforce 15MB file size limit', async () => {
      const largeFile = Buffer.alloc(16 * 1024 * 1024); // 16MB
      const testFilePath = path.join(__dirname, 'large.pdf');
      fs.writeFileSync(testFilePath, largeFile);

      await request(app)
        .post('/api/upload')
        .field('clientID', testClientID)
        .field('docType', 'Identification Card')
        .attach('file', testFilePath)
        .expect(413);

      fs.unlinkSync(testFilePath);
    });

    test('should sanitize blob name properly', async () => {
      const testFilePath = path.join(__dirname, 'test with spaces & special!chars.pdf');
      fs.writeFileSync(testFilePath, 'Test content');

      const response = await request(app)
        .post('/api/upload')
        .field('clientID', 'TEST-123')
        .field('docType', 'Identification Card')
        .attach('file', testFilePath);

      // Blob name should have no spaces or special chars
      expect(response.body.blobName).not.toMatch(/[\s!&]/);
      expect(response.body.blobName).toMatch(/^[\w\-\/\.]+$/);

      fs.unlinkSync(testFilePath);
    });
  });

  describe('GET /api/files/:clientID', () => {
    test('should list all files for a client', async () => {
      const response = await request(app)
        .get(`/api/files/${testClientID}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(file => {
        expect(file).toHaveProperty('fileName');
        expect(file).toHaveProperty('blobUrl');
        expect(file).toHaveProperty('docType');
        expect(file).toHaveProperty('uploadDate');
        expect(file).toHaveProperty('fileSize');
      });
    });
  });

  describe('GET /api/file/download-url', () => {
    test('should generate time-limited SAS URL', async () => {
      // First upload a file
      const testFilePath = path.join(__dirname, 'test-download.pdf');
      fs.writeFileSync(testFilePath, 'Download test');

      const uploadResponse = await request(app)
        .post('/api/upload')
        .field('clientID', testClientID)
        .field('docType', 'Identification Card')
        .attach('file', testFilePath);

      const blobName = uploadResponse.body.blobName;

      // Get download URL
      const response = await request(app)
        .get('/api/file/download-url')
        .query({ blobName })
        .expect(200);

      expect(response.body.url).toBeDefined();
      expect(response.body.url).toContain('sig='); // SAS signature
      expect(response.body.expiresOn).toBeDefined();

      fs.unlinkSync(testFilePath);
    });
  });

  describe('DELETE /api/file/:fileName', () => {
    test('should delete file from Azure Blob Storage', async () => {
      // Upload
      const testFilePath = path.join(__dirname, 'test-delete-blob.pdf');
      fs.writeFileSync(testFilePath, 'To delete');

      const uploadResponse = await request(app)
        .post('/api/upload')
        .field('clientID', testClientID)
        .field('docType', 'Identification Card')
        .attach('file', testFilePath);

      const blobName = uploadResponse.body.blobName;

      // Delete
      const response = await request(app)
        .delete(`/api/file/${blobName}`)
        .query({ blobName })
        .expect(200);

      expect(response.body.success).toBe(true);

      fs.unlinkSync(testFilePath);
    });
  });

  describe('GET /api/mental-archive/:clientID', () => {
    test('should filter only mental health document types', async () => {
      const response = await request(app)
        .get(`/api/mental-archive/${testClientID}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Should only include mental health doc types
      const mentalHealthTypes = [
        'Mental Health Archive', 'Assessment Report', 'Treatment Plan',
        'Progress Notes', 'Psychiatric Evaluation', 'Therapy Notes'
      ];

      response.body.forEach(file => {
        expect(mentalHealthTypes).toContain(file.docType);
      });
    });
  });
});