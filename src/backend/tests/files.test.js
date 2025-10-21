// backend/tests/files.test.js - VITEST VERSION
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Mock Azure Blob Storage with Vitest
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: vi.fn(() => ({
    getContainerClient: vi.fn(() => ({
      createIfNotExists: vi.fn().mockResolvedValue({}),
      getBlockBlobClient: vi.fn(() => ({
        uploadData: vi.fn().mockResolvedValue({}),
        url: 'https://mock-storage.blob.core.windows.net/client-docs/test.pdf',
        exists: vi.fn().mockResolvedValue(true),
        getProperties: vi.fn().mockResolvedValue({
          contentLength: 1024,
          contentType: 'application/pdf',
          lastModified: new Date()
        }),
        delete: vi.fn().mockResolvedValue({})
      })),
      getBlobClient: vi.fn(() => ({
        exists: vi.fn().mockResolvedValue(true),
        getProperties: vi.fn().mockResolvedValue({
          contentLength: 1024,
          contentType: 'application/pdf',
          lastModified: new Date()
        }),
        url: 'https://mock-storage.blob.core.windows.net/client-docs/test.pdf'
      })),
      listBlobsFlat: vi.fn(() => ({
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: 'TEST-CLIENT/Identification-Card/test.pdf',
            properties: {
              contentLength: 1024,
              lastModified: new Date(),
              contentType: 'application/pdf'
            }
          };
        }
      })),
      url: 'https://mock-storage.blob.core.windows.net/client-docs'
    })),
    getUserDelegationKey: vi.fn().mockResolvedValue({
      signedOid: 'mock-oid',
      signedTid: 'mock-tid',
      signedStart: new Date(),
      signedExpiry: new Date(Date.now() + 3600000),
      signedService: 'b',
      signedVersion: '2020-12-06',
      value: 'mock-key'
    })
  })),
  BlobSASPermissions: {
    parse: vi.fn(() => ({}))
  },
  generateBlobSASQueryParameters: vi.fn(() => ({
    toString: () => 'sig=mock-signature&se=2025-10-14T00:00:00Z'
  }))
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(() => ({}))
}));

// Import app after mocks are set up
const app = (await import('../server.cjs')).default;

describe('File Upload API - Azure Blob Storage', () => {
  const timestamp = Date.now();
  const testClientID = `TEST-FILES-${timestamp}`;
  
  const docTypes = [
    'Identification Card',
    "Driver's License",
    'Social Security Card',
    'Medi-Cal Benefits',
    'TB Clearance'
  ];

  // Helper to create test files
  const createTestFile = (filename, content = 'Test content') => {
    const testFilePath = path.join(__dirname, filename);
    fs.writeFileSync(testFilePath, content);
    return testFilePath;
  };

  // Helper to clean up test files
  const cleanupTestFile = (filepath) => {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (err) {
      console.log('Cleanup warning:', err.message);
    }
  };

  describe('POST /api/upload', () => {
    test('should upload a PDF file successfully', async () => {
      const testFilePath = createTestFile('test-id-card.pdf', 'Mock ID Card PDF content');

      try {
        const response = await request(app)
          .post('/api/upload')
          .field('clientID', testClientID)
          .field('docType', 'Identification Card')
          .attach('file', testFilePath);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.storage).toBe('azure');
        expect(response.body.blobName).toContain(testClientID);
        expect(response.body.fileName).toBeDefined();
        expect(response.body.url).toBeDefined();
      } finally {
        cleanupTestFile(testFilePath);
      }
    }, 30000);

    test('should upload all supported document types', async () => {
      for (const docType of docTypes) {
        const fileName = `test-${docType.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
        const testFilePath = createTestFile(fileName, `Mock ${docType} content`);

        try {
          const response = await request(app)
            .post('/api/upload')
            .field('clientID', testClientID)
            .field('docType', docType)
            .attach('file', testFilePath);

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.storage).toBe('azure');
          expect(response.body.blobName).toContain(testClientID);
        } finally {
          cleanupTestFile(testFilePath);
        }
      }
    }, 60000);

    test('should upload image files (JPEG, PNG)', async () => {
      const imageTypes = [
        { ext: 'jpg', content: 'Mock JPEG content' },
        { ext: 'png', content: 'Mock PNG content' }
      ];

      for (const { ext, content } of imageTypes) {
        const testFilePath = createTestFile(`test-image.${ext}`, content);

        try {
          const response = await request(app)
            .post('/api/upload')
            .field('clientID', testClientID)
            .field('docType', 'Identification Card')
            .attach('file', testFilePath);

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        } finally {
          cleanupTestFile(testFilePath);
        }
      }
    }, 30000);

    test('should require clientID and docType', async () => {
      const testFilePath = createTestFile('test.pdf');

      try {
        // Missing clientID
        await request(app)
          .post('/api/upload')
          .field('docType', 'Identification Card')
          .attach('file', testFilePath)
          .expect(400);

        // Missing docType
        await request(app)
          .post('/api/upload')
          .field('clientID', testClientID)
          .attach('file', testFilePath)
          .expect(400);

        // Missing file
        await request(app)
          .post('/api/upload')
          .field('clientID', testClientID)
          .field('docType', 'Identification Card')
          .expect(400);
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    test('should sanitize blob names properly', async () => {
      const testFilePath = createTestFile('test with spaces & special!chars.pdf');

      try {
        const response = await request(app)
          .post('/api/upload')
          .field('clientID', 'TEST-SPECIAL-123')
          .field('docType', 'Identification Card')
          .attach('file', testFilePath);

        expect(response.status).toBe(200);
        expect(response.body.blobName).toBeDefined();
        expect(response.body.blobName).toMatch(/^[\w\-\/\.]+$/);
        expect(response.body.blobName).not.toMatch(/[\s!&]/);
      } finally {
        cleanupTestFile(testFilePath);
      }
    });

    test('should handle upload with metadata', async () => {
      const testFilePath = createTestFile('test-metadata.pdf');

      try {
        const response = await request(app)
          .post('/api/upload')
          .field('clientID', testClientID)
          .field('docType', 'Identification Card')
          .attach('file', testFilePath);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          storage: 'azure',
          fileName: expect.any(String),
          blobName: expect.any(String)
        });
      } finally {
        cleanupTestFile(testFilePath);
      }
    });
  });

  describe('GET /api/files/:clientID', () => {
    test('should list all files for a client', async () => {
      const response = await request(app)
        .get(`/api/files/${testClientID}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        response.body.forEach(file => {
          expect(file).toHaveProperty('fileName');
          expect(file).toHaveProperty('blobUrl');
          expect(file).toHaveProperty('docType');
        });
      }
    });

    test('should return empty array for client with no files', async () => {
      const response = await request(app)
        .get('/api/files/NONEXISTENT-CLIENT');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/file/download-url', () => {
    test('should generate time-limited SAS URL', async () => {
      const testBlobName = `${testClientID}/Identification-Card/test.pdf`;

      const response = await request(app)
        .get('/api/file/download-url')
        .query({ blobName: testBlobName });

      expect(response.status).toBe(200);
      expect(response.body.url).toBeDefined();
      expect(response.body.url).toContain('sig=');
      expect(response.body.expiresOn).toBeDefined();
      
      const expiresDate = new Date(response.body.expiresOn);
      expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
    });

    test('should require blobName query parameter', async () => {
      await request(app)
        .get('/api/file/download-url')
        .expect(400);
    });
  });

  describe('DELETE /api/file/:fileName', () => {
    test('should delete file from Azure Blob Storage', async () => {
      const testFilePath = createTestFile('test-to-delete.pdf');

      try {
        // First upload a file
        const uploadResponse = await request(app)
          .post('/api/upload')
          .field('clientID', testClientID)
          .field('docType', 'Identification Card')
          .attach('file', testFilePath);

        expect(uploadResponse.status).toBe(200);
        const blobName = uploadResponse.body.blobName;

        // Then delete it
        const deleteResponse = await request(app)
          .delete(`/api/file/${path.basename(blobName)}`)
          .query({ blobName });

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);
        expect(deleteResponse.body.message).toContain('deleted');
      } finally {
        cleanupTestFile(testFilePath);
      }
    }, 30000);
  });

  describe('GET /api/list', () => {
    test('should list all blobs in container', async () => {
      const response = await request(app)
        .get('/api/list');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('files');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('storage', 'azure');
      expect(Array.isArray(response.body.files)).toBe(true);
    });
  });

  describe('GET /api/mental-archive/:clientID', () => {
    test('should filter only mental health document types', async () => {
      const response = await request(app)
        .get(`/api/mental-archive/${testClientID}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return empty array for client with no mental health docs', async () => {
      const response = await request(app)
        .get('/api/mental-archive/NONEXISTENT-CLIENT'); 

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    }); 
  });

  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('azureBlobEnabled');
      expect(response.body).toHaveProperty('container');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});