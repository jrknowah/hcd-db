// src/tests/examples/MSW-Usage-Examples.test.jsx
import { describe, test, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import DashboardClient from '../../views/Dashboard/DashboardClient';

const API_URL = 'https://hcd-db-backend-fdfmekfgehbhf0db.westus2-01.azurewebsites.net';

describe('MSW Usage Examples', () => {
  describe('Standard API Mocking', () => {
    test('automatically uses mocked API data', async () => {
      // MSW automatically intercepts API calls
      renderWithProviders(<DashboardClient />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Verify mocked data is displayed
      const statHeadings = screen.getAllByRole('heading', { level: 4 });
      const totalClientsHeading = statHeadings.find(h => {
        const card = h.closest('.MuiCard-root');
        return card && card.textContent.includes('Total Clients');
      });
      
      expect(totalClientsHeading.textContent).toBe('2');
    });
  });

  describe('Error Scenario Testing', () => {
    test('should handle server errors gracefully', async () => {
      // Override handler for this test
      server.use(
        http.get(`${API_URL}/api/clients`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
      
      renderWithProviders(<DashboardClient />);
      
      // Should show error state
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Component should handle error (verify error UI)
      // This depends on your error handling implementation
    });

    test('should handle network errors', async () => {
      // Simulate network error
      server.use(
        http.get(`${API_URL}/api/clients`, () => {
          return HttpResponse.error();
        })
      );
      
      renderWithProviders(<DashboardClient />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test('should handle 404 not found', async () => {
      server.use(
        http.get(`${API_URL}/api/clients/INVALID-ID`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );
      
      // Test component behavior with 404
      // Your implementation here
    });
  });

  describe('Custom Response Testing', () => {
    test('should handle empty client list', async () => {
      // Return empty array
      server.use(
        http.get(`${API_URL}/api/clients`, () => {
          return HttpResponse.json([]);
        })
      );
      
      renderWithProviders(<DashboardClient />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Should show empty state
      const statHeadings = screen.getAllByRole('heading', { level: 4 });
      const hasZero = statHeadings.some(h => h.textContent === '0');
      expect(hasZero).toBe(true);
    });

    test('should handle large client list', async () => {
      // Generate many clients
      const manyClients = Array.from({ length: 100 }, (_, i) => ({
        clientID: `TEST-${String(i).padStart(3, '0')}`,
        clientFirstName: `Client${i}`,
        clientLastName: 'Test',
        clientDOB: '1990-01-01',
        clientSite: 'Main Campus',
        clientGender: 'Male',
        clientStatus: 'Active',
        clientVetStatus: 'Non-Veteran',
        clientAdmitDate: new Date().toISOString().split('T')[0]
      }));
      
      server.use(
        http.get(`${API_URL}/api/clients`, () => {
          return HttpResponse.json(manyClients);
        })
      );
      
      renderWithProviders(<DashboardClient />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // Verify count
      const statHeadings = screen.getAllByRole('heading', { level: 4 });
      const totalClientsHeading = statHeadings.find(h => {
        const card = h.closest('.MuiCard-root');
        return card && card.textContent.includes('Total Clients');
      });
      
      expect(totalClientsHeading.textContent).toBe('100');
    });
  });

  describe('POST Request Testing', () => {
    test('should successfully create new client', async () => {
      // MSW will handle POST automatically
      // Test your NewClient component here
      
      const newClientData = {
        clientID: 'TEST-NEW',
        clientFirstName: 'New',
        clientLastName: 'Client',
        clientDOB: '1995-01-01',
        clientSite: 'Main Campus'
      };
      
      // Your test implementation
      // e.g., fill form, submit, verify success
    });

    test('should handle duplicate client ID error', async () => {
      server.use(
        http.post(`${API_URL}/api/clients`, () => {
          return HttpResponse.json(
            { error: 'Client ID already exists' },
            { status: 409 }
          );
        })
      );
      
      // Test duplicate error handling
      // Your implementation here
    });
  });

  describe('Delayed Response Testing', () => {
    test('should show loading state during API call', async () => {
      // Add delay to response
      server.use(
        http.get(`${API_URL}/api/clients`, async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json([]);
        })
      );
      
      renderWithProviders(<DashboardClient />);
      
      // Should show loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });
});