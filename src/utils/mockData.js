// src/utils/mockData.js
export const mockClients = [
  {
    clientID: 'MOCK-001',
    clientFirstName: 'John',
    clientLastName: 'Doe',
    clientDOB: '1990-01-15',
    clientSite: 'Main Campus',
    clientGender: 'Male',
    clientSSN: '123456789',
    clientVetStatus: 'Not a Veteran',
    createdAt: new Date().toISOString(),
    status: 'active'
  },
  {
    clientID: 'MOCK-002',
    clientFirstName: 'Jane',
    clientLastName: 'Smith',
    clientDOB: '1985-05-20',
    clientSite: 'West Center',
    clientGender: 'Female',
    clientSSN: '987654321',
    clientVetStatus: 'Protected Veteran',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  },
  {
    clientID: 'MOCK-003',
    clientFirstName: 'Robert',
    clientLastName: 'Johnson',
    clientDOB: '1975-08-10',
    clientSite: 'North Facility',
    clientGender: 'Male',
    clientSSN: '555666777',
    clientVetStatus: 'Not a Veteran',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  }
];

export default {
  clients: mockClients
};