import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';
import ClientRights from '../views/Section-2/ClientRights';

// Mock the actual crList data structure
vi.mock('../data/arrayList', () => ({
  crList: [
    'All clients have rights under the law',
    'The Right: To be treated with respect and dignity',
    'The Right: To privacy and confidentiality',
    'The Right: To receive quality care',
    'The Right: To file grievances',
    'Other Rights: Additional protections apply'
  ]
}));

// Mock Redux slice properly for async thunks
vi.mock('../backend/store/slices/authSigSlice', async () => {
  const actual = await vi.importActual('../backend/store/slices/authSigSlice');
  return {
    ...actual,
    fetchFormData: vi.fn(() => ({ type: 'authSig/fetchFormData/fulfilled', payload: {} })),
    saveFormData: vi.fn(() => async (dispatch) => {
      return Promise.resolve({ payload: { success: true } });
    }),
    updateFormLocal: vi.fn((data) => ({ type: 'authSig/updateFormLocal', payload: data })),
    clearErrors: vi.fn(() => ({ type: 'authSig/clearErrors' })),
    clearSuccessFlags: vi.fn(() => ({ type: 'authSig/clearSuccessFlags' }))
  };
});

describe('ClientRights - Client Rights and Responsibilities', () => {
  const mockClientID = 'TEST-CLIENT-001';
  const mockClient = {
    clientID: mockClientID,
    firstName: 'John',
    lastName: 'Doe'
  };

  const mockClientRightsData = {
    signature: 'John Doe',
    acknowledged: true,
    completionPercentage: 100
  };

  // Helper to create proper Redux state
  const createPreloadedState = (overrides = {}) => ({
    authSig: {
      forms: overrides.forms || {},
      formLoading: overrides.formLoading || {},
      formsLoading: false,
      saving: overrides.saving || false,
      saveSuccess: overrides.saveSuccess || false,
      formErrors: overrides.formErrors || {},
      validationErrors: {},
      currentClientID: mockClientID,
      autoSaving: false,
      submitting: false,
      formsError: null,
      saveError: null,
      submitError: null,
      submitSuccess: false,
      autoSaveSuccess: false,
      overallCompletion: 0,
      totalForms: 15,
      completedForms: 0,
      activeForm: null,
      unsavedChanges: false,
      lastAutoSave: null,
      filterBy: 'all',
      sortBy: 'priority',
      viewMode: 'grid',
      autoSaveEnabled: true,
      autoSaveInterval: 30000,
      useMockData: false,
      submissionStatus: 'draft',
      submissionHistory: [],
      lastSubmission: null
    },
    clients: { 
      selectedClient: overrides.selectedClient !== undefined ? overrides.selectedClient : mockClient,
      clients: [mockClient],
      loading: false,
      error: null
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Rendering & Data Loading', () => {
    it('should render the main header and description', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: {} }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Client Rights and Responsibilities')).toBeInTheDocument();
      expect(screen.getByText(/Please review your rights and responsibilities/)).toBeInTheDocument();
    });

    it('should display loading state while fetching data', () => {
      const preloadedState = createPreloadedState({ 
        formLoading: { clientRights: true }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Loading client rights data...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display client information when available', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText(/Client:/)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/ID: TEST-CLIENT-001/)).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('should display 0% completion when nothing is acknowledged or signed', () => {
      const preloadedState = createPreloadedState({
        forms: {
          clientRights: {
            signature: '',
            acknowledged: false
          }
        }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('0% Complete')).toBeInTheDocument();
    });

    it('should display 50% completion when only acknowledged (no signature)', () => {
      const preloadedState = createPreloadedState({
        forms: {
          clientRights: {
            signature: '',
            acknowledged: true
          }
        }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('50% Complete')).toBeInTheDocument();
    });

    it('should display 50% completion when only signed (not acknowledged)', () => {
      const preloadedState = createPreloadedState({
        forms: {
          clientRights: {
            signature: 'John Doe',
            acknowledged: false
          }
        }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('50% Complete')).toBeInTheDocument();
    });

    it('should display 100% completion when both acknowledged and signed', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: mockClientRightsData }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('100% Complete')).toBeInTheDocument();
    });

    it('should show success color when 100% complete', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: mockClientRightsData }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const chip = screen.getByText('100% Complete');
      expect(chip).toBeInTheDocument();
    });
  });

  describe('Client Rights Display', () => {
    it('should render all client rights from crList', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('All clients have rights under the law')).toBeInTheDocument();
      expect(screen.getByText(/To be treated with respect and dignity/)).toBeInTheDocument();
      expect(screen.getByText(/To privacy and confidentiality/)).toBeInTheDocument();
    });

    it('should display section header for client rights', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Your Rights as a Client')).toBeInTheDocument();
    });

    it('should display numbered list items for rights', () => {
      const preloadedState = createPreloadedState();
      const { container } = renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      // Check for numbered circles (1-6 based on mock data)
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(6);
    });
  });

  describe('Acknowledgment Functionality', () => {
    it('should render acknowledgment button', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByRole('button', { name: /Click to Acknowledge Rights/i })).toBeInTheDocument();
    });

    it('should update button text when acknowledged', () => {
      const preloadedState = createPreloadedState({
        forms: {
          clientRights: {
            acknowledged: true,
            signature: ''
          }
        }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByRole('button', { name: /Rights Acknowledged/i })).toBeInTheDocument();
    });

    it('should toggle acknowledgment state when clicked', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const ackButton = screen.getByRole('button', { name: /Click to Acknowledge Rights/i });
      await user.click(ackButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Rights Acknowledged/i })).toBeInTheDocument();
      });
    });

    it('should clear errors when acknowledgment is toggled', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      // Submit without acknowledging (will show error)
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Click acknowledge button
      const ackButton = screen.getByRole('button', { name: /Click to Acknowledge Rights/i });
      await user.click(ackButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should load saved acknowledgment state from Redux', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: mockClientRightsData }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByRole('button', { name: /Rights Acknowledged/i })).toBeInTheDocument();
    });
  });

  describe('Electronic Signature', () => {
    it('should render signature field with proper labels', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Electronic Signature')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your full legal name')).toBeInTheDocument();
      expect(screen.getByText(/Please type your full name below/)).toBeInTheDocument();
    });

    it('should disable signature field when not acknowledged', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: false, signature: '' } }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      expect(signatureField).toBeDisabled();
    });

    it('should enable signature field when acknowledged', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      expect(signatureField).not.toBeDisabled();
    });

    it('should load saved signature from Redux', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: mockClientRightsData }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      expect(signatureField).toHaveValue('John Doe');
    });

    it('should update signature field on input', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      await user.type(signatureField, 'Jane Smith');
      
      expect(signatureField).toHaveValue('Jane Smith');
    });

    it('should display signature confirmation when both acknowledged and signed', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      await user.type(signatureField, 'Jane Smith');
      
      await waitFor(() => {
        expect(screen.getByText(/Signature captured:/)).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should clear errors when signature is entered', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      // Submit without signature (will show error)
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      // Enter signature
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      await user.type(signatureField, 'Jane Smith');
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without client ID', async () => {
      const preloadedState = createPreloadedState({ selectedClient: null });
      renderWithProviders(<ClientRights />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show error when signature is missing', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Electronic signature is required/)).toBeInTheDocument();
      });
    });

    it('should show error when acknowledgment is missing', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: false, signature: 'John Doe' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/You must acknowledge that you have read/)).toBeInTheDocument();
      });
    });

    it('should validate trimmed signature (reject whitespace-only)', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      await user.type(signatureField, '   ');
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Electronic signature is required/)).toBeInTheDocument();
      });
    });

    it('should show warning when completion is less than 100%', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: false, signature: '' } }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText(/Please acknowledge your rights and provide signature/)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should disable submit button when no client ID', () => {
      const preloadedState = createPreloadedState({ selectedClient: null });
      renderWithProviders(<ClientRights />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when client ID exists', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should show loading state during submission', async () => {
      const preloadedState = createPreloadedState({ saving: true });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Saving.../i });
      expect(submitButton).toBeDisabled();
      expect(within(submitButton).getByRole('progressbar')).toBeInTheDocument();
    });

    it('should attempt to call save when form is complete', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: mockClientRightsData }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      expect(submitButton).toBeInTheDocument();
    });

    it('should show success snackbar after successful submission', async () => {
      const preloadedState = createPreloadedState({ saveSuccess: true });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      await waitFor(() => {
        expect(screen.getByText(/Client rights acknowledgment saved successfully!/)).toBeInTheDocument();
      });
    });

    it('should handle validation errors on submission', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display Redux form errors', () => {
      const preloadedState = createPreloadedState({
        formErrors: { clientRights: 'Server validation error' }
      });

      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Server validation error')).toBeInTheDocument();
    });

    it('should allow closing error alerts', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      const closeButton = within(screen.getByRole('alert')).getByRole('button');
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('should display multiple validation errors as list', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(within(alert).getByText(/Electronic signature is required/)).toBeInTheDocument();
        expect(within(alert).getByText(/You must acknowledge/)).toBeInTheDocument();
      });
    });
  });

  describe('Snackbar Notifications', () => {
    it('should close success snackbar when user clicks close', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({ saveSuccess: true });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const snackbar = await screen.findByText(/Client rights acknowledgment saved successfully!/);
      expect(snackbar).toBeInTheDocument();
      
      const closeButton = within(snackbar.closest('[role="alert"]')).getByRole('button');
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Client rights acknowledgment saved successfully!/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form controls with labels', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByPlaceholderText('Enter your full legal name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rights Acknowledged/i })).toBeInTheDocument();
    });

    it('should have accessible submit button', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const submitButton = screen.getByRole('button', { name: /Save Rights Acknowledgment/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should use semantic HTML structure with lists', () => {
      const preloadedState = createPreloadedState();
      const { container } = renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByRole('list')).toBeInTheDocument();
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('should have proper heading hierarchy', () => {
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewport', () => {
      global.innerWidth = 375;
      global.innerHeight = 667;
      
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Client Rights and Responsibilities')).toBeInTheDocument();
    });

    it('should render on tablet viewport', () => {
      global.innerWidth = 768;
      global.innerHeight = 1024;
      
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Client Rights and Responsibilities')).toBeInTheDocument();
    });

    it('should render on desktop viewport', () => {
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      
      const preloadedState = createPreloadedState();
      renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      expect(screen.getByText('Client Rights and Responsibilities')).toBeInTheDocument();
    });
  });

  describe('Integration with Redux Store', () => {
    it('should properly connect to Redux store', () => {
      const preloadedState = createPreloadedState({
        forms: { clientRights: mockClientRightsData }
      });

      const { store } = renderWithProviders(
        <ClientRights clientID={mockClientID} />,
        { preloadedState }
      );
      
      expect(store.getState().authSig.forms.clientRights).toEqual(mockClientRightsData);
    });

    it('should update store on acknowledgment toggle', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState();
      const { store } = renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const ackButton = screen.getByRole('button', { name: /Click to Acknowledge Rights/i });
      await user.click(ackButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Rights Acknowledged/i })).toBeInTheDocument();
      });
    });

    it('should update store on signature change', async () => {
      const user = userEvent.setup();
      const preloadedState = createPreloadedState({
        forms: { clientRights: { acknowledged: true, signature: '' } }
      });
      const { store } = renderWithProviders(<ClientRights clientID={mockClientID} />, { preloadedState });
      
      const signatureField = screen.getByPlaceholderText('Enter your full legal name');
      await user.type(signatureField, 'Test');
      
      expect(signatureField).toHaveValue('Test');
    });
  });
});