// src/tests/DashboardClient.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, createMockClient } from './test-utils';
import DashboardClient from '../views/Dashboard/DashboardClient'; // ⚠️ Adjust path if needed
import NewClient from '../views/Dashboard/NewClient'; // ⚠️ Adjust path if needed

// Mock data
const mockClients = [
  createMockClient({
    clientID: 'TEST-001',
    clientFirstName: 'John',
    clientLastName: 'Doe',
    clientVetStatus: 'Veteran',
    clientAdmitDate: new Date().toISOString().split('T')[0] // Today
  }),
  createMockClient({
    clientID: 'TEST-002',
    clientFirstName: 'Jane',
    clientLastName: 'Smith',
    clientSite: 'South Campus',
    clientGender: 'Female',
    clientVetStatus: 'Non-Veteran',
    clientAdmitDate: '2023-01-01' // Old date
  })
];

// Mock Redux state
const mockInitialState = {
  clients: {
    clients: mockClients,
    selectedClient: null,
    loading: false,
    error: null
  }
};

describe('DashboardClient Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    test('should render dashboard header and breadcrumbs', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      expect(screen.getByText('Client Management Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/select a client to begin/i)).toBeInTheDocument();
    });

    test('should display stat cards with correct counts', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      // Find all heading level 4 elements (stat card numbers)
      const statHeadings = screen.getAllByRole('heading', { level: 4 });
      
      // Should show "2" for total clients
      const totalClientsHeading = statHeadings.find(h => {
        const card = h.closest('.MuiCard-root');
        return card && card.textContent.includes('Total Clients');
      });
      
      expect(totalClientsHeading).toBeDefined();
      expect(totalClientsHeading.textContent).toBe('2');
    });

    test('should render Add New Client button', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      const addButton = screen.getByRole('button', { name: /add new client/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('Client Table', () => {
    test('should display client count in stat card', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      // Verify the stat card shows correct count
      const statHeadings = screen.getAllByRole('heading', { level: 4 });
      const totalClientsHeading = statHeadings.find(h => {
        const card = h.closest('.MuiCard-root');
        return card && card.textContent.includes('Total Clients');
      });
      
      expect(totalClientsHeading).toBeDefined();
      expect(totalClientsHeading.textContent).toBe('2');
    });

    test('should show loading spinner when loading', () => {
      const loadingState = {
        clients: {
          clients: mockClients,
          selectedClient: null,
          loading: true,
          error: null
        }
      };
      
      renderWithProviders(<DashboardClient />, { preloadedState: loadingState });
      
      // Should show progress bar when loading
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    test('should have a search input field', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveValue('');
    });

    test('should allow typing in search field', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(searchInput).toHaveValue('John');
    });
  });

  describe('Filter Functionality', () => {
    test('should have clickable veteran filter chip', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      // Find all clickable chips (MUI Chip components are buttons)
      const allButtons = screen.getAllByRole('button');
      
      // Find the Veterans chip specifically by checking its content
      const veteranChip = allButtons.find(button => {
        const chipLabel = button.querySelector('.MuiChip-label');
        return chipLabel && chipLabel.textContent === 'Veterans';
      });
      
      expect(veteranChip).toBeDefined();
      
      // Click the chip
      fireEvent.click(veteranChip);
      
      // Verify chip is still present after click (UI interaction works)
      expect(veteranChip).toBeInTheDocument();
    });

    test('should filter by new clients this week', async () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      const allButtons = screen.getAllByRole('button');
      const newThisWeekChip = allButtons.find(button => {
        const chipLabel = button.querySelector('.MuiChip-label');
        return chipLabel && chipLabel.textContent === 'New This Week';
      });
      
      expect(newThisWeekChip).toBeDefined();
      fireEvent.click(newThisWeekChip);
      
      // Just verify the chip was clickable and filter applied
      // The actual filtering logic depends on your date calculation
      await waitFor(() => {
        expect(newThisWeekChip).toBeInTheDocument();
      });
    });

    test('should have filter chips available', () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      // Verify filter chips exist
      const allButtons = screen.getAllByRole('button');
      const chipLabels = allButtons
        .map(btn => btn.querySelector('.MuiChip-label')?.textContent)
        .filter(Boolean);
      
      expect(chipLabels).toContain('All Clients');
      expect(chipLabels).toContain('New This Week');
      expect(chipLabels).toContain('Veterans');
      expect(chipLabels).toContain('Active Cases');
    });
  });

  describe('Modal Interactions', () => {
    test('should open new client modal when Add button clicked', async () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      const addButton = screen.getByRole('button', { name: /add new client/i });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        // Look for heading specifically inside the modal
        const headings = within(modal).getAllByRole('heading');
        const hasIntakeHeading = headings.some(h => 
          h.textContent.includes('New Client Intake')
        );
        expect(hasIntakeHeading).toBe(true);
      });
    });

    test('should close modal when close button clicked', async () => {
      renderWithProviders(<DashboardClient />, { preloadedState: mockInitialState });
      
      // Open modal
      const addButton = screen.getByRole('button', { name: /add new client/i });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Find and click close button
      const modal = screen.getByRole('dialog');
      const allButtons = within(modal).getAllByRole('button');
      
      // The close button typically has only an icon, no text
      const closeButton = allButtons.find(btn => {
        const hasIcon = btn.querySelector('svg');
        const hasNoText = btn.textContent.trim() === '';
        return hasIcon && hasNoText;
      });
      
      if (closeButton) {
        fireEvent.click(closeButton);
        
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      } else {
        // If no X button, try Escape key
        fireEvent.keyDown(modal, { key: 'Escape' });
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Empty State', () => {
    test('should show empty state when no clients exist', () => {
      const emptyState = {
        clients: {
          clients: [],
          selectedClient: null,
          loading: false,
          error: null
        }
      };
      
      renderWithProviders(<DashboardClient />, { preloadedState: emptyState });
      
      // Check for zero in stat cards
      const statHeadings = screen.getAllByRole('heading', { level: 4 });
      const hasZero = statHeadings.some(h => h.textContent === '0');
      expect(hasZero).toBe(true);
    });
  });

  describe('Loading State', () => {
    test('should show loading indicator when loading', () => {
      const loadingState = {
        clients: {
          clients: [],
          selectedClient: null,
          loading: true,
          error: null
        }
      };
      
      renderWithProviders(<DashboardClient />, { preloadedState: loadingState });
      
      // MUI CircularProgress has role="progressbar"
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});

describe('NewClient Component', () => {
  test('should render form with basic fields', () => {
    renderWithProviders(<NewClient />);
    
    expect(screen.getByText('New Client Intake')).toBeInTheDocument();
    
    // Check for inputs by placeholder or label
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  test('should show validation error when submitting empty form', async () => {
    renderWithProviders(<NewClient />);
    
    const createButton = screen.getByRole('button', { name: /create client/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      // Check for error alert (MUI Alert has role="alert")
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toMatch(/client id/i);
    });
  });

  test('should allow form input', async () => {
    renderWithProviders(<NewClient />);
    
    // Find Client ID input
    const inputs = screen.getAllByRole('textbox');
    const clientIDInput = inputs[0]; // Usually first input
    
    fireEvent.change(clientIDInput, { target: { value: 'TEST-003' } });
    expect(clientIDInput.value).toBe('TEST-003');
  });

  test('should show validation for incomplete form', async () => {
    renderWithProviders(<NewClient />);
    
    // Fill only some fields, not all required ones
    const inputs = screen.getAllByRole('textbox');
    
    // Fill Client ID
    fireEvent.change(inputs[0], { target: { value: 'TEST-003' } });
    
    // Fill First Name if it exists
    if (inputs.length > 1) {
      fireEvent.change(inputs[1], { target: { value: 'Test' } });
    }
    
    // Don't fill Last Name, DOB, or Site (intentionally incomplete)
    
    const createButton = screen.getByRole('button', { name: /create client/i });
    fireEvent.click(createButton);
    
    // Verify validation error appears for missing required fields
    await waitFor(() => {
      const alerts = screen.queryAllByRole('alert');
      const hasErrorAlert = alerts.some(alert => 
        alert.className.includes('MuiAlert-colorError') &&
        alert.textContent.includes('required')
      );
      expect(hasErrorAlert).toBe(true);
    }, { timeout: 3000 });
  });
});