// src/tests/mocks/handlers.js - COMPLETE VERSION
import { http, HttpResponse } from 'msw';
import { authSigHandlers } from './authSigHandlers';

const API_URL = 'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net';

// ========== SECTION 1: MOCK DATA ==========

export const mockClients = [
  {
    clientID: 'TEST-001',
    clientFirstName: 'John',
    clientLastName: 'Doe',
    clientDOB: '1990-01-01',
    clientSite: 'Main Campus',
    clientGender: 'Male',
    clientStatus: 'Active',
    clientVetStatus: 'Veteran',
    clientEthnicity: 'Not Hispanic or Latino',
    clientAdmitDate: new Date().toISOString().split('T')[0]
  },
  {
    clientID: 'TEST-002',
    clientFirstName: 'Jane',
    clientLastName: 'Smith',
    clientDOB: '1985-05-15',
    clientSite: 'South Campus',
    clientGender: 'Female',
    clientStatus: 'Active',
    clientVetStatus: 'Non-Veteran',
    clientEthnicity: 'Hispanic or Latino',
    clientAdmitDate: '2023-01-01'
  }
];

export const mockClientFaceData = {
  clientID: 'TEST-001',
  clientContactNum: '(555) 123-4567',
  clientContactAltNum: '(555) 987-6543',
  clientEmail: 'john.doe@example.com',
  clientEmgContactName: 'Jane Doe',
  clientEmgContactNum: '(555) 111-2222',
  clientEmgContactRel: 'Spouse',
  clientEmgContactAddress: '123 Main St, Anytown, ST 12345',
  clientMedInsType: 'Medicare',
  clientMedCarrier: 'Blue Cross Blue Shield',
  clientMedInsNum: 'MED123456789',
  clientMedPrimaryPhy: 'Dr. John Smith',
  clientMedPrimaryPhyFacility: 'City General Hospital',
  clientMedPrimaryPhyPhone: '(555) 444-5555',
  clientAllergyComments: 'No known drug allergies'
};

export const mockAllergies = ['Penicillin', 'Peanuts', 'Latex', 'Shellfish'];

// ✅ NEW: Mock file storage
let mockFiles = [
  {
    id: 'FILE-001',
    fileName: 'id_card.pdf',
    blobName: 'TEST-001/Identification-Card/2024-03-15-id_card.pdf',
    blobUrl: 'https://mock-storage.blob.core.windows.net/client-docs/TEST-001/Identification-Card/2024-03-15-id_card.pdf',
    docType: 'Identification Card',
    uploadDate: '2024-03-15T10:30:00Z',
    fileSize: 1024000,
    contentType: 'application/pdf',
    clientID: 'TEST-001'
  },
  {
    id: 'FILE-002',
    fileName: 'drivers_license.jpg',
    blobName: 'TEST-001/Drivers-License/2024-03-14-drivers_license.jpg',
    blobUrl: 'https://mock-storage.blob.core.windows.net/client-docs/TEST-001/Drivers-License/2024-03-14-drivers_license.jpg',
    docType: "Driver's License",
    uploadDate: '2024-03-14T15:45:00Z',
    fileSize: 2048000,
    contentType: 'image/jpeg',
    clientID: 'TEST-001'
  }
];

// ========== SECTION 1: CLIENT HANDLERS ==========

export const handlers = [
  // GET /api/clients
  http.get(`${API_URL}/api/clients`, () => {
    console.log('🎭 MSW: Intercepted GET /api/clients');
    return HttpResponse.json(mockClients);
  }),

  // GET /api/clients/:id
  http.get(`${API_URL}/api/clients/:id`, ({ params }) => {
    const { id } = params;
    console.log(`🎭 MSW: Intercepted GET /api/clients/${id}`);
    
    const client = mockClients.find(c => c.clientID === id);
    
    if (client) {
      return HttpResponse.json(client);
    }
    
    return new HttpResponse(null, { status: 404 });
  }),

  // POST /api/clients
  http.post(`${API_URL}/api/clients`, async ({ request }) => {
    const newClient = await request.json();
    console.log('🎭 MSW: Intercepted POST /api/clients', newClient);
    
    if (!newClient.clientID) {
      return HttpResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }
    
    const duplicate = mockClients.find(c => c.clientID === newClient.clientID);
    if (duplicate) {
      return HttpResponse.json(
        { error: 'Client ID already exists' },
        { status: 409 }
      );
    }
    
    return HttpResponse.json(
      { ...newClient, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  }),

  // PUT /api/clients/:id
  http.put(`${API_URL}/api/clients/:id`, async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json();
    console.log(`🎭 MSW: Intercepted PUT /api/clients/${id}`, updates);
    
    const clientIndex = mockClients.findIndex(c => c.clientID === id);
    
    if (clientIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    
    const updatedClient = { ...mockClients[clientIndex], ...updates };
    return HttpResponse.json(updatedClient);
  }),

  // DELETE /api/clients/:id
  http.delete(`${API_URL}/api/clients/:id`, ({ params }) => {
    const { id } = params;
    console.log(`🎭 MSW: Intercepted DELETE /api/clients/${id}`);
    
    const clientIndex = mockClients.findIndex(c => c.clientID === id);
    
    if (clientIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return new HttpResponse(null, { status: 204 });
  }),

  // ========== CLIENT FACE SHEET HANDLERS ==========

  // GET /api/getClientFace/:clientID
  http.get(`${API_URL}/api/getClientFace/:clientID`, ({ params }) => {
    const { clientID } = params;
    console.log(`🎭 MSW: Intercepted GET /api/getClientFace/${clientID}`);
    
    if (clientID === 'NONEXISTENT') {
      return HttpResponse.json({});
    }
    
    return HttpResponse.json({
      ...mockClientFaceData,
      clientID
    });
  }),

  // POST /api/saveClientFace
  http.post(`${API_URL}/api/saveClientFace`, async ({ request }) => {
    const data = await request.json();
    console.log('🎭 MSW: Intercepted POST /api/saveClientFace', data);
    
    if (!data.clientID) {
      return HttpResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      message: 'Client face data saved successfully',
      clientID: data.clientID
    });
  }),

  // GET /api/getClientAllergies/:clientID
  http.get(`${API_URL}/api/getClientAllergies/:clientID`, ({ params }) => {
    const { clientID } = params;
    console.log(`🎭 MSW: Intercepted GET /api/getClientAllergies/${clientID}`);
    
    if (clientID === 'NONEXISTENT') {
      return HttpResponse.json([]);
    }
    
    return HttpResponse.json(mockAllergies);
  }),

  // POST /api/saveClientAllergies
  http.post(`${API_URL}/api/saveClientAllergies`, async ({ request }) => {
    const data = await request.json();
    console.log('🎭 MSW: Intercepted POST /api/saveClientAllergies', data);
    
    return HttpResponse.json({
      message: 'Allergies saved successfully',
      allergies: data.allergies
    });
  }),

  // ========== FILE UPLOAD/MANAGEMENT HANDLERS ==========

  // POST /api/upload - File upload
  http.post(`${API_URL}/api/upload`, async ({ request }) => {
    console.log('🎭 MSW: Intercepted POST /api/upload');
    
    const formData = await request.formData();
    const file = formData.get('file');
    const clientID = formData.get('clientID');
    const docType = formData.get('docType');
    
    if (!file || !clientID || !docType) {
      return HttpResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create mock file entry
    const newFile = {
      id: `FILE-${Date.now()}`,
      fileName: file.name,
      blobName: `${clientID}/${docType.replace(/\s+/g, '-')}/${Date.now()}-${file.name}`,
      blobUrl: `https://mock-storage.blob.core.windows.net/client-docs/${clientID}/${docType}/${file.name}`,
      docType: docType,
      uploadDate: new Date().toISOString(),
      fileSize: file.size,
      contentType: file.type,
      clientID: clientID
    };
    
    mockFiles.push(newFile);
    
    return HttpResponse.json({
      success: true,
      storage: 'azure',
      ...newFile
    });
  }),

  // GET /api/files/:clientID - List client files
  http.get(`${API_URL}/api/files/:clientID`, ({ params }) => {
    const { clientID } = params;
    console.log(`🎭 MSW: Intercepted GET /api/files/${clientID}`);
    
    const clientFiles = mockFiles.filter(f => f.clientID === clientID);
    return HttpResponse.json(clientFiles);
  }),

  // GET /api/file/:fileName - Get file metadata
  http.get(`${API_URL}/api/file/:fileName`, ({ params, request }) => {
    const { fileName } = params;
    const url = new URL(request.url);
    const blobName = url.searchParams.get('blobName') || fileName;
    
    console.log(`🎭 MSW: Intercepted GET /api/file/${fileName}?blobName=${blobName}`);
    
    const file = mockFiles.find(f => f.blobName === blobName || f.fileName === fileName);
    
    if (!file) {
      return HttpResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      blobName: file.blobName,
      fileName: file.fileName,
      url: file.blobUrl,
      size: file.fileSize,
      mimeType: file.contentType,
      lastModified: file.uploadDate,
      storage: 'azure'
    });
  }),

  // GET /api/file/download-url - Generate SAS URL
  http.get(`${API_URL}/api/file/download-url`, ({ request }) => {
    const url = new URL(request.url);
    const blobName = url.searchParams.get('blobName');
    
    console.log(`🎭 MSW: Intercepted GET /api/file/download-url?blobName=${blobName}`);
    
    if (!blobName) {
      return HttpResponse.json(
        { message: 'blobName required' },
        { status: 400 }
      );
    }
    
    const file = mockFiles.find(f => f.blobName === blobName);
    
    if (!file) {
      return HttpResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }
    
    // Mock SAS URL with signature
    const sasUrl = `${file.blobUrl}?sig=mock-signature&se=${new Date(Date.now() + 3600000).toISOString()}`;
    
    return HttpResponse.json({
      url: sasUrl,
      expiresOn: new Date(Date.now() + 3600000).toISOString()
    });
  }),

  // DELETE /api/file/:fileName - Delete file
  http.delete(`${API_URL}/api/file/:fileName`, ({ params, request }) => {
    const { fileName } = params;
    const url = new URL(request.url);
    const blobName = url.searchParams.get('blobName') || fileName;
    
    console.log(`🎭 MSW: Intercepted DELETE /api/file/${fileName}?blobName=${blobName}`);
    
    const fileIndex = mockFiles.findIndex(f => f.blobName === blobName || f.fileName === fileName);
    
    if (fileIndex === -1) {
      return HttpResponse.json(
        { message: 'File not found' },
        { status: 404 }
      );
    }
    
    mockFiles.splice(fileIndex, 1);
    
    return HttpResponse.json({
      success: true,
      message: 'File deleted successfully',
      blobName,
      storage: 'azure'
    });
  }),

  // GET /api/list - List all files
  http.get(`${API_URL}/api/list`, () => {
    console.log('🎭 MSW: Intercepted GET /api/list');
    
    return HttpResponse.json({
      files: mockFiles,
      total: mockFiles.length,
      storage: 'azure'
    });
  }),

  // GET /api/mental-archive/:clientID - Mental health files
  http.get(`${API_URL}/api/mental-archive/:clientID`, ({ params }) => {
    const { clientID } = params;
    console.log(`🎭 MSW: Intercepted GET /api/mental-archive/${clientID}`);
    
    const mentalHealthTypes = [
      'Mental Health Archive', 'Assessment Report', 'Treatment Plan',
      'Progress Notes', 'Discharge Summary', 'Psychiatric Evaluation',
      'Therapy Notes', 'Medication Records'
    ];
    
    const mentalFiles = mockFiles.filter(f => 
      f.clientID === clientID && mentalHealthTypes.includes(f.docType)
    );
    
    return HttpResponse.json(mentalFiles);
  }),

  // GET /api/health - Health check
  http.get(`${API_URL}/api/health`, () => {
    console.log('🎭 MSW: Intercepted GET /api/health');
    
    return HttpResponse.json({
      status: 'ok',
      azureBlobEnabled: true,
      container: 'client-docs',
      account: 'mock-storage-account',
      timestamp: new Date().toISOString()
    });
  })

  // ========== AUTHORIZATION & SIGNATURE HANDLERS ==========
  ,
  ...authSigHandlers

];

// ========== ERROR HANDLERS ==========

export const errorHandlers = [
  http.get(`${API_URL}/api/clients`, () => {
    console.log('🎭 MSW: Simulating server error');
    return new HttpResponse(null, { status: 500 });
  }),
];

export const networkErrorHandlers = [
  http.get(`${API_URL}/api/clients`, () => {
    console.log('🎭 MSW: Simulating network error');
    return HttpResponse.error();
  }),
];

// ========== UTILITY: Reset mock files ==========
export const resetMockFiles = () => {
  mockFiles = [
    {
      id: 'FILE-001',
      fileName: 'id_card.pdf',
      blobName: 'TEST-001/Identification-Card/2024-03-15-id_card.pdf',
      blobUrl: 'https://mock-storage.blob.core.windows.net/client-docs/TEST-001/Identification-Card/2024-03-15-id_card.pdf',
      docType: 'Identification Card',
      uploadDate: '2024-03-15T10:30:00Z',
      fileSize: 1024000,
      contentType: 'application/pdf',
      clientID: 'TEST-001'
    },
    {
      id: 'FILE-002',
      fileName: 'drivers_license.jpg',
      blobName: 'TEST-001/Drivers-License/2024-03-14-drivers_license.jpg',
      blobUrl: 'https://mock-storage.blob.core.windows.net/client-docs/TEST-001/Drivers-License/2024-03-14-drivers_license.jpg',
      docType: "Driver's License",
      uploadDate: '2024-03-14T15:45:00Z',
      fileSize: 2048000,
      contentType: 'image/jpeg',
      clientID: 'TEST-001'
    }
  ];
};