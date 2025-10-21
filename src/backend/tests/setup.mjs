// ============================================================================
// STEP 2: Create src/backend/tests/setup.mjs (ES Module version)
// ============================================================================

// src/backend/tests/setup.mjs
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';

// =============================================================================
// Environment Configuration
// =============================================================================
process.env.NODE_ENV = 'test';
process.env.SKIP_AZURE = 'true';
process.env.USE_MOCK_DATA = 'true';
process.env.ENABLE_LOCAL_FALLBACK = 'true'; 
process.env.AZURE_STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || 'mockstorage';
process.env.AZURE_BLOB_CONTAINER = process.env.AZURE_BLOB_CONTAINER || 'client-docs';

console.log('🧪 Backend test environment initialized');
console.log('📦 Mocks: Azure SQL, Blob Storage');
console.log('🔧 Environment:', process.env.NODE_ENV);

// =============================================================================
// Mock Azure SQL Connection (Used by ALL backend tests)
// =============================================================================
const mockRequest = {
  input: vi.fn().mockReturnThis(),
  output: vi.fn().mockReturnThis(),
  query: vi.fn().mockResolvedValue({ 
    recordset: [],
    rowsAffected: [1] 
  }),
  execute: vi.fn().mockResolvedValue({ 
    recordset: [],
    rowsAffected: [1] 
  })
};

const mockPool = {
  connected: true,
  request: vi.fn(() => mockRequest),
  close: vi.fn().mockResolvedValue(undefined)
};

vi.mock('../store/azureSql.js', () => ({
  connectToAzureSQL: vi.fn().mockResolvedValue(mockPool),
  closeSQLConnection: vi.fn().mockResolvedValue(undefined),
  closePool: vi.fn().mockResolvedValue(undefined),
  default: {
    connectToAzureSQL: vi.fn().mockResolvedValue(mockPool),
    closeSQLConnection: vi.fn().mockResolvedValue(undefined)
  }
}));

// =============================================================================
// Mock Azure Blob Storage (Used by file upload tests)
// =============================================================================
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: vi.fn().mockImplementation(() => ({
    getContainerClient: vi.fn().mockReturnValue({
      uploadBlockBlob: vi.fn().mockResolvedValue({ requestId: 'mock-id' }),
      deleteBlob: vi.fn().mockResolvedValue({ requestId: 'mock-id' }),
      listBlobsFlat: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { name: 'test-file.pdf', properties: { contentLength: 1024 } };
        }
      })
    })
  }))
}));

// =============================================================================
// Global Test Lifecycle
// =============================================================================
beforeAll(() => {
  console.log('🧪 Backend test environment initialized');
  console.log('📦 Mocks: Azure SQL, Blob Storage');
  console.log('🔧 Environment: test');
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterAll(async () => {
  console.log('✅ Backend tests completed');
  // Allow time for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Export mocks for use in tests if needed
export { mockRequest, mockPool };