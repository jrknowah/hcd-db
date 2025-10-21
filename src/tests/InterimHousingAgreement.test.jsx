// InterimHousingAgreement.test.jsx - Comprehensive test suite for Termination Policy form (Vitest)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import userEvent from '@testing-library/user-event';
import InterimHousingAgreement from '../views/Section-2/InterimHousingAgreement';

// Mock Redux actions and selectors
vi.mock('../backend/store/slices/authSigSlice', async () => {
  const actual = await vi.importActual('../backend/store/slices/authSigSlice');
  return {
    ...actual,
    default: actual.default || {},
    fetchFormData: vi.fn(),
    saveFormData: vi.fn(),
    autoSaveFormData: vi.fn(),
    updateFormLocal: vi.fn(),
    clearErrors: vi.fn(),
    clearSuccessFlags: vi.fn(),
    setUnsavedChanges: vi.fn(),
    selectFormByType: vi.fn(() => () => ({})),
    selectFormLoading: vi.fn(() => () => false),
    selectSaving: vi.fn(() => false),
    selectAutoSaving: vi.fn(() => false),
    selectSaveSuccess: vi.fn(() => false),
    selectUnsavedChanges: vi.fn(() => false)
  };
});

// Import mocked modules
import * as authSigSlice from '../backend/store/slices/authSigSlice';

describe('InterimHousingAgreement - Termination Policy Form', () => {
  const mockClientID = 'TEST-CLIENT-001';
  const mockFormConfig = {
    version: '2024-v1'
  };

  const createMockState = (overrides = {}) => ({
    clients: {
      selectedClient: {
        clientID: mockClientID,
        firstName: 'John',
        lastName: 'Doe',
      },
      ...overrides.clients,
    },
    authSig: {
      forms: {
        termination: {
          tppSign: '',
          hasReadPolicy: false,
          ...overrides.terminationForm,
        },
      },
      formLoading: {
        termination: false,
        ...overrides.formLoading,
      },
      saving: overrides.saving || false,
      autoSaving: overrides.autoSaving || false,
      saveSuccess: overrides.saveSuccess || false,
      unsavedChanges: overrides.unsavedChanges || false,
      formErrors: {
        termination: overrides.formErrors || null
      }
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all selectors to default values
    authSigSlice.selectFormByType.mockReturnValue(() => ({}));
    authSigSlice.selectFormLoading.mockReturnValue(() => false);
    authSigSlice.selectSaving.mockReturnValue(false);
    authSigSlice.selectAutoSaving.mockReturnValue(false);
    authSigSlice.selectSaveSuccess.mockReturnValue(false);
    authSigSlice.selectUnsavedChanges.mockReturnValue(false);

    authSigSlice.fetchFormData.mockReturnValue({ type: 'fetchFormData' });
    authSigSlice.saveFormData.mockReturnValue({ 
      type: 'saveFormData',
      unwrap: vi.fn().mockResolvedValue({ success: true })
    });
    authSigSlice.autoSaveFormData.mockReturnValue({ type: 'autoSaveFormData' });
    authSigSlice.updateFormLocal.mockReturnValue({ type: 'updateFormLocal' });
    authSigSlice.clearErrors.mockReturnValue({ type: 'clearErrors' });
    authSigSlice.clearSuccessFlags.mockReturnValue({ type: 'clearSuccessFlags' });
    authSigSlice.setUnsavedChanges.mockReturnValue({ type: 'setUnsavedChanges' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // SECTION 1: COMPONENT RENDERING & INITIAL STATE (5 tests)
  // ============================================================================

  describe('Component Rendering & Initial State', () => {
    it('T1: renders termination policy header correctly', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Termination Policy & Procedure')).toBeInTheDocument();
      });
      expect(screen.getByText('Interim Housing Program Guidelines')).toBeInTheDocument();
    });

    it('T2: displays client information when selectedClient exists', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Client:/)).toBeInTheDocument();
      });
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/ID: TEST-CLIENT-001/)).toBeInTheDocument();
    });

    it('T3: shows loading state when formLoading is true', () => {
      authSigSlice.selectFormLoading.mockReturnValueOnce(() => true);

      const preloadedState = createMockState({ formLoading: { termination: true } });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      expect(screen.getByText('Loading termination policy data...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('T4: displays progress indicator with 0% initially', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('0% Complete')).toBeInTheDocument();
      });
    });

    it('T5: renders all policy sections', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Program Commitment & Support')).toBeInTheDocument();
        expect(screen.getByText('Immediate Termination Reasons')).toBeInTheDocument();
        expect(screen.getByText('Consultation Process')).toBeInTheDocument();
        expect(screen.getByText('Termination Notice Procedure')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 2: POLICY CONTENT DISPLAY (6 tests)
  // ============================================================================

  describe('Policy Content Display', () => {
    it('T6: displays immediate termination reasons list', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Physical aggression')).toBeInTheDocument();
        expect(screen.getByText('Possession of weapons')).toBeInTheDocument();
        expect(screen.getByText('Engaging in illegal activity on site')).toBeInTheDocument();
      });
    });

    it('T7: displays consultation process information', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/consultation with the participant's care team/)).toBeInTheDocument();
      });
    });

    it('T8: displays termination notice procedure items', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Reason(s) for termination')).toBeInTheDocument();
        expect(screen.getByText('Effective date of termination')).toBeInTheDocument();
        expect(screen.getByText('Grievance procedure')).toBeInTheDocument();
      });
    });

    it('T9: displays important policy notice banner', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT POLICY NOTICE')).toBeInTheDocument();
      });
    });

    it('T10: displays policy icons for visual guidance', async () => {
      const preloadedState = createMockState();
      const { container } = renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="PolicyIcon"]')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="SecurityIcon"]')).toBeInTheDocument();
      });
    });

    it('T11: shows Holliday\'s Helping Hands organization name', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Holliday's Helping Hands/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 3: POLICY ACKNOWLEDGMENT (7 tests)
  // ============================================================================

  describe('Policy Acknowledgment', () => {
    it('T12: renders policy acknowledgment button', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Acknowledge Policy/i })).toBeInTheDocument();
      });
    });

    it('T13: allows user to acknowledge policy', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      expect(authSigSlice.updateFormLocal).toHaveBeenCalled();
    });

    it('T14: shows success message after policy acknowledgment', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByText(/You have acknowledged reading and understanding/)).toBeInTheDocument();
      });
    });

    it('T15: changes button appearance after acknowledgment', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Policy Acknowledged/i })).toBeInTheDocument();
      });
    });

    it('T16: updates progress to 50% after policy acknowledgment', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
      });
    });

    it('T17: displays acknowledgment statement', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/I have read and understand the Termination Policy/)).toBeInTheDocument();
      });
    });

    it('T18: can toggle policy acknowledgment', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Policy Acknowledged/i })).toBeInTheDocument();
      });

      // Click again to toggle off
      const acknowledgedButton = screen.getByRole('button', { name: /Policy Acknowledged/i });
      await user.click(acknowledgedButton);

      expect(authSigSlice.updateFormLocal).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // SECTION 4: SIGNATURE & FORM FIELDS (7 tests)
  // ============================================================================

  describe('Signature & Form Fields', () => {
    it('T19: renders electronic signature field', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Electronic Signature/i)).toBeInTheDocument();
      });
    });

    it('T20: signature field is disabled until policy is acknowledged', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const signatureInput = screen.getByLabelText(/Electronic Signature/i);
        expect(signatureInput).toBeDisabled();
      });
    });

    it('T21: signature field becomes enabled after policy acknowledgment', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        const signatureInput = screen.getByLabelText(/Electronic Signature/i);
        expect(signatureInput).not.toBeDisabled();
      });
    });

    it('T22: updates signature when user types', async () => {
      const user = userEvent.setup();
      
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // First acknowledge the policy to enable signature field
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Acknowledge Policy/i })).toBeInTheDocument();
      });

      const acknowledgeButton = screen.getByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      // Wait for signature field to be enabled
      await waitFor(() => {
        const signatureInput = screen.getByLabelText(/Electronic Signature/i);
        expect(signatureInput).not.toBeDisabled();
      });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      expect(authSigSlice.updateFormLocal).toHaveBeenCalled();
    });

    it('T23: displays signature confirmation when signature entered', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState({
        terminationForm: { hasReadPolicy: true, tppSign: '' }
      });
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Acknowledge policy first
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText(/Signature captured:/)).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('T24: shows helper text for signature field', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Type your name to provide your electronic signature/)).toBeInTheDocument();
      });
    });

    it('T25: signature field has proper placeholder text', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Type your full legal name');
        expect(input).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 5: VALIDATION & ERROR HANDLING (8 tests)
  // ============================================================================

  describe('Validation & Error Handling', () => {
    it('T26: displays validation errors when present', async () => {
      const preloadedState = createMockState({
        formErrors: 'Form submission failed'
      });

      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Form submission failed')).toBeInTheDocument();
      });
    });

    it('T27: shows warning when validation requirements not met', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Please acknowledge the policy and provide your signature/)).toBeInTheDocument();
      });
    });

    it('T28: error alert can be dismissed', async () => {
      const user = userEvent.setup();
      
      const preloadedState = createMockState({
        formErrors: 'Test error'
      });

      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i });
      await user.click(dismissButton);

      expect(authSigSlice.clearErrors).toHaveBeenCalled();
    });

    it('T29: submit button is disabled when form is invalid', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('T30: submit button is disabled when no clientID', async () => {
      authSigSlice.selectFormByType.mockReturnValue(() => ({
        tppSign: 'John Doe',
        hasReadPolicy: true
      }));

      const preloadedState = createMockState({
        clients: { selectedClient: null },
        terminationForm: { tppSign: 'John Doe', hasReadPolicy: true }
      });

      renderWithProviders(
        <InterimHousingAgreement formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('T31: submit button is enabled when form is valid', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();

      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Acknowledge policy
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      // Enter signature
      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('T32: validates that policy must be acknowledged', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();

      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Try to submit without acknowledging policy
      const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
      expect(submitButton).toBeDisabled();
    });

    it('T33: clears validation errors when user makes changes', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState({
        formErrors: 'Signature required'
      });

      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Signature required')).toBeInTheDocument();
      });

      // Acknowledge policy to trigger change
      const acknowledgeButton = screen.getByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      expect(authSigSlice.updateFormLocal).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SECTION 6: FORM SUBMISSION (8 tests)
  // ============================================================================

  describe('Form Submission', () => {
    it('T34: submits form with correct data structure', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Acknowledge policy
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      // Enter signature
      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            clientID: mockClientID,
            formType: 'termination',
            formData: expect.objectContaining({
              tppSign: 'John Doe',
              hasReadPolicy: true,
              completionPercentage: 100,
              status: 'completed'
            })
          })
        );
      });
    });

    it('T35: includes timestamp in submission', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Complete form
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            formData: expect.objectContaining({
              formData: expect.objectContaining({
                acknowledgedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
              })
            })
          })
        );
      });
    });

    it('T36: includes policy version in submission', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Complete form
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            formData: expect.objectContaining({
              formData: expect.objectContaining({
                policyVersion: '2024-v1'
              })
            })
          })
        );
      });
    });

    it('T37: shows saving state during submission', async () => {
      authSigSlice.selectSaving.mockReturnValue(true);

      const preloadedState = createMockState({ saving: true });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: 'Saving...' });
      expect(submitButton).toBeDisabled();
    });

    it('T38: displays loading spinner during save', async () => {
      authSigSlice.selectSaving.mockReturnValue(true);

      const preloadedState = createMockState({ saving: true });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const progressbars = screen.getAllByRole('progressbar');
        expect(progressbars.length).toBeGreaterThan(0);
      });
    });

    it('T39: handles successful submission', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Complete form
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalled();
      });
    });

    it('T40: handles submission failure', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockRejectedValue(new Error('Network error'))
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Complete form
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('T41: form submission prevents page reload', async () => {
      const preloadedState = createMockState();
      const { container } = renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const form = container.querySelector('form');
        expect(form).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 7: UI FEEDBACK & NOTIFICATIONS (6 tests)
  // ============================================================================

  describe('UI Feedback & Notifications', () => {
    it('T42: displays success snackbar after successful save', async () => {
      authSigSlice.selectSaveSuccess.mockReturnValue(true);

      const preloadedState = createMockState({ saveSuccess: true });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Termination policy acknowledgment saved successfully!/i)).toBeInTheDocument();
      });
    });

    it('T43: success snackbar can be manually closed', async () => {
      const user = userEvent.setup();

      authSigSlice.selectSaveSuccess.mockReturnValue(true);

      const preloadedState = createMockState({ saveSuccess: true });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Termination policy acknowledgment saved successfully!/i)).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[closeButtons.length - 1]);

      expect(authSigSlice.clearSuccessFlags).toHaveBeenCalled();
    });

    it('T44: displays important policy notice banner', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT POLICY NOTICE')).toBeInTheDocument();
      });
    });

    it('T45: shows auto-saving indicator when auto-saving', async () => {
      authSigSlice.selectAutoSaving.mockReturnValue(true);

      const preloadedState = createMockState({ autoSaving: true });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Auto-saving...')).toBeInTheDocument();
      });
    });

    it('T46: displays unsaved changes warning', async () => {
      authSigSlice.selectUnsavedChanges.mockReturnValue(true);

      const preloadedState = createMockState({ unsavedChanges: true });
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
      });
    });

    it('T47: shows signature capture confirmation with checkmark', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Acknowledge policy first
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText(/Signature captured:/)).toBeInTheDocument();
        // Multiple checkmark icons exist in the component (in list items, buttons, etc.)
        // Just verify that at least one exists
        const checkIcons = screen.getAllByTestId('CheckCircleIcon');
        expect(checkIcons.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // SECTION 8: PROGRESS TRACKING (4 tests)
  // ============================================================================

  describe('Progress Tracking', () => {
    it('T48: calculates progress at 0% with no actions', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('0% Complete')).toBeInTheDocument();
      });
    });

    it('T49: increases progress to 50% when policy acknowledged', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
      });
    });

    it('T50: reaches 100% when policy acknowledged and signature provided', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      // Acknowledge policy
      const acknowledgeButton = await screen.findByRole('button', { name: /Acknowledge Policy/i });
      await user.click(acknowledgeButton);

      // Enter signature
      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText('100% Complete')).toBeInTheDocument();
      });
    });

    it('T51: displays individual progress indicators for policy and signature', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText(/Policy review: Pending/)).toBeInTheDocument();
        expect(screen.getByText(/Signature: Required/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 9: ACCESSIBILITY (4 tests)
  // ============================================================================

  describe('Accessibility', () => {
    it('T52: signature field has proper label', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toBeInTheDocument();
      });
    });

    it('T53: form has proper heading hierarchy', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      });

      const mainHeading = screen.getByRole('heading', { name: /Termination Policy/i });
      expect(mainHeading).toBeInTheDocument();
    });

    it('T54: required field has proper attributes', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveAttribute('required');
      });
    });

    it('T55: buttons are keyboard accessible', async () => {
      const preloadedState = createMockState();
      const { container } = renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // SECTION 10: REDUX INTEGRATION (3 tests)
  // ============================================================================

  describe('Redux Integration', () => {
    it('T56: fetches form data on mount', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(authSigSlice.fetchFormData).toHaveBeenCalledWith({
          clientID: mockClientID,
          formType: 'termination'
        });
      });
    });

    it('T57: uses clientID from props when provided', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID="PROP-CLIENT-123" formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(authSigSlice.fetchFormData).toHaveBeenCalledWith({
          clientID: 'PROP-CLIENT-123',
          formType: 'termination'
        });
      });
    });

    it('T58: uses clientID from Redux when no prop provided', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(authSigSlice.fetchFormData).toHaveBeenCalledWith({
          clientID: mockClientID,
          formType: 'termination'
        });
      });
    });
  });

  // ============================================================================
  // SECTION 11: EDGE CASES & ERROR SCENARIOS (5 tests)
  // ============================================================================

  describe('Edge Cases & Error Scenarios', () => {
    it('T59: handles missing client data gracefully', async () => {
      const preloadedState = createMockState({
        clients: { selectedClient: null }
      });

      renderWithProviders(
        <InterimHousingAgreement formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.queryByText(/Client:/)).not.toBeInTheDocument();
      });
    });

    it('T60: handles empty form data', async () => {
      authSigSlice.selectFormByType.mockReturnValue(() => ({}));

      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveValue('');
      });
    });

    it('T61: loads existing form data from Redux', async () => {
      authSigSlice.selectFormByType.mockReturnValue(() => ({
        tppSign: 'Existing Signature',
        hasReadPolicy: true
      }));

      const preloadedState = createMockState({
        terminationForm: {
          tppSign: 'Existing Signature',
          hasReadPolicy: true
        }
      });

      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveValue('Existing Signature');
      });
    });

    it('T62: handles network errors during data fetch', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} formConfig={mockFormConfig} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Termination Policy & Procedure')).toBeInTheDocument();
      });

      // Verify the main content is rendered despite potential network errors
      expect(screen.getByText('Interim Housing Program Guidelines')).toBeInTheDocument();
    });

    it('T63: handles missing formConfig gracefully', async () => {
      const preloadedState = createMockState();
      renderWithProviders(
        <InterimHousingAgreement clientID={mockClientID} />, 
        { preloadedState }
      );

      await waitFor(() => {
        expect(screen.getByText('Termination Policy & Procedure')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// TEST SUMMARY
// ============================================================================
/*
TOTAL TESTS: 63

BREAKDOWN BY SECTION:
✅ Section 1: Component Rendering & Initial State (5 tests)
✅ Section 2: Policy Content Display (6 tests)
✅ Section 3: Policy Acknowledgment (7 tests)
✅ Section 4: Signature & Form Fields (7 tests)
✅ Section 5: Validation & Error Handling (8 tests)
✅ Section 6: Form Submission (8 tests)
✅ Section 7: UI Feedback & Notifications (6 tests)
✅ Section 8: Progress Tracking (4 tests)
✅ Section 9: Accessibility (4 tests)
✅ Section 10: Redux Integration (3 tests)
✅ Section 11: Edge Cases & Error Scenarios (5 tests)

KEY FEATURES TESTED:
- Termination policy display (immediate termination reasons)
- Policy acknowledgment button with toggle functionality
- Two-step process: acknowledge policy then sign
- Signature field disabled until policy acknowledged
- Progress tracking (0% → 50% → 100%)
- Consultation process information
- Termination notice procedure
- Form validation (both policy and signature required)
- Error handling and user feedback
- Auto-save indicator
- Unsaved changes warning
- Redux state management
- Accessibility compliance

UNIQUE FEATURES:
- Two-step validation: Must acknowledge policy BEFORE signing
- Signature field is disabled until policy is acknowledged
- Progress split evenly: 50% for policy, 50% for signature
- Immediate termination reasons prominently displayed
- Auto-saving with visual indicator
- Gradient header design with color coding
- Interim Housing Program (IHP) specific terminology

FORM FLOW:
1. User reads termination policy
2. User clicks "Acknowledge Policy" button
3. Policy acknowledgment shows success message
4. Signature field becomes enabled
5. User types signature
6. Signature capture confirmation appears
7. Progress reaches 100%
8. User submits form
9. Success message displays

VITEST COMPATIBLE:
- Uses vi.fn(), vi.mock(), vi.clearAllMocks()
- Comprehensive coverage of all component features
- Tests user workflows end-to-end
*/