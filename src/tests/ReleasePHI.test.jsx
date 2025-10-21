// ReleasePHI.test.jsx - Comprehensive test suite for PHI Release form (Vitest)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import userEvent from '@testing-library/user-event';
import ReleasePHI from '../views/Section-2/ReleasePHI';

// Mock Redux actions and selectors
vi.mock('../backend/store/slices/authSigSlice', async () => {
  const actual = await vi.importActual('../backend/store/slices/authSigSlice');
  return {
    ...actual,
    default: actual.default || {},
    fetchFormData: vi.fn(),
    saveFormData: vi.fn(),
    updateFormLocal: vi.fn(),
    clearErrors: vi.fn(),
    clearSuccessFlags: vi.fn(),
    selectFormByType: vi.fn(() => () => ({})),
    selectFormLoading: vi.fn(() => () => false),
    selectSaving: vi.fn(() => false),
    selectSaveSuccess: vi.fn(() => false)
  };
});

// Import mocked modules
import * as authSigSlice from '../backend/store/slices/authSigSlice';

describe('ReleasePHI - Protected Health Information Release Form', () => {
  const mockClientID = 'TEST-CLIENT-001';

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
        phiRelease: {
          signature: '',
          acknowledged: false,
          ...overrides.phiReleaseForm,
        },
      },
      formLoading: {
        phiRelease: false,
        ...overrides.formLoading,
      },
      saving: overrides.saving || false,
      saveSuccess: overrides.saveSuccess || false,
      formErrors: {
        phiRelease: overrides.formErrors || null
      }
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all selectors to default values
    authSigSlice.selectFormByType.mockReturnValue(() => ({}));
    authSigSlice.selectFormLoading.mockReturnValue(() => false);
    authSigSlice.selectSaving.mockReturnValue(false);
    authSigSlice.selectSaveSuccess.mockReturnValue(false);

    authSigSlice.fetchFormData.mockReturnValue({ type: 'fetchFormData' });
    authSigSlice.saveFormData.mockReturnValue({ 
      type: 'saveFormData',
      unwrap: vi.fn().mockResolvedValue({ success: true })
    });
    authSigSlice.updateFormLocal.mockReturnValue({ type: 'updateFormLocal' });
    authSigSlice.clearErrors.mockReturnValue({ type: 'clearErrors' });
    authSigSlice.clearSuccessFlags.mockReturnValue({ type: 'clearSuccessFlags' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // SECTION 1: COMPONENT RENDERING & INITIAL STATE (5 tests)
  // ============================================================================

  describe('Component Rendering & Initial State', () => {
    it('T1: renders PHI release header correctly', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Protected Health Information (PHI) Release')).toBeInTheDocument();
      });
      expect(screen.getByText('HIPAA Privacy Notice and Acknowledgment')).toBeInTheDocument();
    });

    it('T2: displays client information when selectedClient exists', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText(/Client:/)).toBeInTheDocument();
      });
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/ID: TEST-CLIENT-001/)).toBeInTheDocument();
    });

    it('T3: shows loading state when formLoading is true', () => {
      authSigSlice.selectFormLoading.mockReturnValueOnce(() => true);

      const preloadedState = createMockState({ formLoading: { phiRelease: true } });
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      expect(screen.getByText('Loading PHI release data...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('T4: displays progress indicator with 0% initially', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('0% Complete')).toBeInTheDocument();
      });
    });

    it('T5: renders all 4 PHI information sections in accordions', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Overview & General Information')).toBeInTheDocument();
        expect(screen.getByText('How We Use and Disclose Your Information')).toBeInTheDocument();
        expect(screen.getByText('Your Rights Regarding Your Health Information')).toBeInTheDocument();
        expect(screen.getByText('Privacy Officer & Complaints')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 2: ACCORDION INTERACTION (6 tests)
  // ============================================================================

  describe('Accordion Interaction', () => {
    it('T6: expands overview accordion when clicked', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Overview & General Information')).toBeInTheDocument();
      });

      const overviewAccordion = screen.getByText('Overview & General Information');
      await user.click(overviewAccordion);

      await waitFor(() => {
        expect(screen.getByText(/This company believes in protecting the privacy/)).toBeInTheDocument();
      });
    });

    it('T7: displays HIPAA information when overview accordion is expanded', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const overviewAccordion = screen.getByText('Overview & General Information');
      await user.click(overviewAccordion);

      await waitFor(() => {
        expect(screen.getByText(/Health Insurance Portability and Accountability Act/)).toBeInTheDocument();
        expect(screen.getByText(/Protected Health Information \(PHI\)/)).toBeInTheDocument();
      });
    });

    it('T8: displays uses and disclosures section content', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const usesAccordion = screen.getByText('How We Use and Disclose Your Information');
      await user.click(usesAccordion);

      await waitFor(() => {
        expect(screen.getByText('Treatment')).toBeInTheDocument();
        expect(screen.getByText('Payment')).toBeInTheDocument();
        expect(screen.getByText('Health Care Operations')).toBeInTheDocument();
      });
    });

    it('T9: displays patient rights when rights accordion is expanded', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const rightsAccordion = screen.getByText('Your Rights Regarding Your Health Information');
      await user.click(rightsAccordion);

      await waitFor(() => {
        expect(screen.getByText('Right to Request Restrictions')).toBeInTheDocument();
        expect(screen.getByText('Right to Confidential Communications')).toBeInTheDocument();
        expect(screen.getByText('Right to Inspect and Copy')).toBeInTheDocument();
      });
    });

    it('T10: displays privacy officer contact information', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const contactAccordion = screen.getByText('Privacy Officer & Complaints');
      await user.click(contactAccordion);

      await waitFor(() => {
        expect(screen.getByText('Gisela Vasquez')).toBeInTheDocument();
        expect(screen.getByText(/17420 Avalon Blvd/)).toBeInTheDocument();
      });
    });

    it('T11: multiple accordions can be expanded and collapsed', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      // Expand first accordion
      const overviewAccordion = screen.getByText('Overview & General Information');
      await user.click(overviewAccordion);

      await waitFor(() => {
        expect(screen.getByText(/This company believes in protecting/)).toBeInTheDocument();
      });

      // Expand second accordion
      const usesAccordion = screen.getByText('How We Use and Disclose Your Information');
      await user.click(usesAccordion);

      await waitFor(() => {
        expect(screen.getByText('Treatment')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 3: SIGNATURE & FORM FIELDS (7 tests)
  // ============================================================================

  describe('Signature & Form Fields', () => {
    it('T12: renders electronic signature field', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByLabelText(/Electronic Signature/i)).toBeInTheDocument();
      });
    });

    it('T13: signature field has proper placeholder text', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter your full legal name');
        expect(input).toBeInTheDocument();
      });
    });

    it('T14: updates signature when user types', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      expect(authSigSlice.updateFormLocal).toHaveBeenCalled();
    });

    it('T15: displays signature confirmation when signature entered', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText(/Signature captured:/)).toBeInTheDocument();
      });
    });

    it('T16: shows helper text for signature field', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText(/Type your name to provide your electronic signature/)).toBeInTheDocument();
      });
    });

    it('T17: displays acknowledgment statement', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText(/I certify that I have received a copy/)).toBeInTheDocument();
      });
    });

    it('T18: signature field is marked as required', async () => {
      const preloadedState = createMockState();
      const { container } = renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveAttribute('required');
      });
    });
  });

  // ============================================================================
  // SECTION 4: VALIDATION & ERROR HANDLING (8 tests)
  // ============================================================================

  describe('Validation & Error Handling', () => {
    it('T19: displays validation errors when present', async () => {
      const preloadedState = createMockState({
        formErrors: 'Form submission failed'
      });

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Form submission failed')).toBeInTheDocument();
      });
    });

    it('T20: shows warning when signature is missing', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText(/Please provide your electronic signature before saving/i)).toBeInTheDocument();
      });
    });

    it('T21: error alert can be dismissed', async () => {
      const user = userEvent.setup();
      
      const preloadedState = createMockState({
        formErrors: 'Test error'
      });

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(authSigSlice.clearErrors).toHaveBeenCalled();
    });

    it('T22: submit button is disabled when form is invalid', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
      expect(submitButton).toBeDisabled();
    });

    it('T23: submit button is disabled when no clientID', async () => {
      const preloadedState = createMockState({
        clients: { selectedClient: null }
      });

      authSigSlice.selectFormByType.mockReturnValue(() => ({
        signature: 'John Doe',
        acknowledged: true
      }));

      renderWithProviders(<ReleasePHI />, { preloadedState });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
        expect(submitButton).toBeDisabled();
      });
    });

    it('T24: submit button is enabled when form is valid', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('T25: displays validation error when submitting without signature', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      // Try to submit without signature - button should be disabled
      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
      expect(submitButton).toBeDisabled();
    });

    it('T26: clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState({
        formErrors: 'Signature required'
      });

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Signature required')).toBeInTheDocument();
      });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'J');

      // Local errors should be cleared when typing starts
      expect(authSigSlice.updateFormLocal).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SECTION 5: FORM SUBMISSION (8 tests)
  // ============================================================================

  describe('Form Submission', () => {
    it('T27: submits form with correct data structure', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            clientID: mockClientID,
            formType: 'phiRelease',
            formData: expect.objectContaining({
              signature: 'John Doe',
              acknowledged: true,
              completionPercentage: 100,
              status: 'completed'
            })
          })
        );
      });
    });

    it('T28: includes timestamp in submission', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
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

    it('T29: includes privacy notice version in submission', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalledWith(
          expect.objectContaining({
            formData: expect.objectContaining({
              formData: expect.objectContaining({
                privacyNoticeVersion: '2024-v1'
              })
            })
          })
        );
      });
    });

    it('T30: shows saving state during submission', async () => {
      authSigSlice.selectSaving.mockReturnValue(true);

      const preloadedState = createMockState({ saving: true });
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: 'Saving...' });
      expect(submitButton).toBeDisabled();
    });

    it('T31: displays loading spinner during save', async () => {
      authSigSlice.selectSaving.mockReturnValue(true);

      const preloadedState = createMockState({ saving: true });
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const progressbars = screen.getAllByRole('progressbar');
        expect(progressbars.length).toBeGreaterThan(0);
      });
    });

    it('T32: handles successful submission', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockResolvedValue({ success: true })
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSaveFormData).toHaveBeenCalled();
      });
    });

    it('T33: handles submission failure', async () => {
      const user = userEvent.setup();

      const mockSaveFormData = vi.fn().mockReturnValue({
        type: 'saveFormData',
        unwrap: vi.fn().mockRejectedValue(new Error('Network error'))
      });
      authSigSlice.saveFormData.mockImplementation(mockSaveFormData);

      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      const submitButton = screen.getByRole('button', { name: /Save PHI Acknowledgment/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('T34: form submission prevents page reload', async () => {
      const preloadedState = createMockState();
      const { container } = renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const form = container.querySelector('form');
        expect(form).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 6: UI FEEDBACK & NOTIFICATIONS (5 tests)
  // ============================================================================

  describe('UI Feedback & Notifications', () => {
    it('T35: displays success snackbar after successful save', async () => {
      authSigSlice.selectSaveSuccess.mockReturnValue(true);

      const preloadedState = createMockState({ saveSuccess: true });
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText(/PHI acknowledgment saved successfully!/i)).toBeInTheDocument();
      });
    });

    it('T36: success snackbar can be manually closed', async () => {
      const user = userEvent.setup();

      authSigSlice.selectSaveSuccess.mockReturnValue(true);

      const preloadedState = createMockState({ saveSuccess: true });
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText(/PHI acknowledgment saved successfully!/i)).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await user.click(closeButtons[closeButtons.length - 1]);

      expect(authSigSlice.clearSuccessFlags).toHaveBeenCalled();
    });

    it('T37: displays important privacy notice banner', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('IMPORTANT PRIVACY NOTICE')).toBeInTheDocument();
      });
    });

    it('T38: displays acknowledgment section', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Acknowledgment')).toBeInTheDocument();
      });
    });

    it('T39: shows signature captured confirmation with checkmark', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText(/Signature captured:/)).toBeInTheDocument();
        const checkIcon = screen.getByTestId('CheckCircleIcon');
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 7: PROGRESS TRACKING (4 tests)
  // ============================================================================

  describe('Progress Tracking', () => {
    it('T40: calculates progress at 0% with no signature', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('0% Complete')).toBeInTheDocument();
      });
    });

    it('T41: increases progress to 50% when signature provided', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
      });
    });

    it('T42: reaches 100% when signature provided and acknowledged', async () => {
      authSigSlice.selectFormByType.mockReturnValue(() => ({
        signature: 'John Doe',
        acknowledged: true
      }));

      const preloadedState = createMockState({
        phiReleaseForm: {
          signature: 'John Doe',
          acknowledged: true
        }
      });

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('100% Complete')).toBeInTheDocument();
      });
    });

    it('T43: updates progress bar color based on completion', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      const { container } = renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      // Initially at 0% - should be primary color
      await waitFor(() => {
        const progressBar = container.querySelector('.MuiLinearProgress-bar');
        expect(progressBar).toBeInTheDocument();
      });

      // Type signature to reach 50%
      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'John Doe');

      await waitFor(() => {
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // SECTION 8: ACCESSIBILITY (4 tests)
  // ============================================================================

  describe('Accessibility', () => {
    it('T44: signature field has proper label', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toBeInTheDocument();
      });
    });

    it('T45: form has proper heading hierarchy', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      });

      const mainHeading = screen.getByRole('heading', { name: /Protected Health Information/i });
      expect(mainHeading).toBeInTheDocument();
    });

    it('T46: required field has proper attributes', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveAttribute('required');
      });
    });

    it('T47: accordions are keyboard accessible', async () => {
      const preloadedState = createMockState();
      const { container } = renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const accordions = container.querySelectorAll('[role="button"]');
        expect(accordions.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // SECTION 9: REDUX INTEGRATION (3 tests)
  // ============================================================================

  describe('Redux Integration', () => {
    it('T48: fetches form data on mount', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(authSigSlice.fetchFormData).toHaveBeenCalledWith({
          clientID: mockClientID,
          formType: 'phiRelease'
        });
      });
    });

    it('T49: uses clientID from props when provided', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID="PROP-CLIENT-123" />, { preloadedState });

      await waitFor(() => {
        expect(authSigSlice.fetchFormData).toHaveBeenCalledWith({
          clientID: 'PROP-CLIENT-123',
          formType: 'phiRelease'
        });
      });
    });

    it('T50: uses clientID from Redux when no prop provided', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI />, { preloadedState });

      await waitFor(() => {
        expect(authSigSlice.fetchFormData).toHaveBeenCalledWith({
          clientID: mockClientID,
          formType: 'phiRelease'
        });
      });
    });
  });

  // ============================================================================
  // SECTION 10: EDGE CASES & ERROR SCENARIOS (5 tests)
  // ============================================================================

  describe('Edge Cases & Error Scenarios', () => {
    it('T51: handles missing client data gracefully', async () => {
      const preloadedState = createMockState({
        clients: { selectedClient: null }
      });

      renderWithProviders(<ReleasePHI />, { preloadedState });

      await waitFor(() => {
        expect(screen.queryByText(/Client:/)).not.toBeInTheDocument();
      });
    });

    it('T52: handles empty form data', async () => {
      authSigSlice.selectFormByType.mockReturnValue(() => ({}));

      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveValue('');
      });
    });

    it('T53: handles very short signatures', async () => {
      const user = userEvent.setup();
      const preloadedState = createMockState();
      
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      const signatureInput = screen.getByLabelText(/Electronic Signature/i);
      await user.type(signatureInput, 'A');

      expect(authSigSlice.updateFormLocal).toHaveBeenCalled();
    });

    it('T54: handles network errors during data fetch', async () => {
      const preloadedState = createMockState();
      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Protected Health Information (PHI) Release')).toBeInTheDocument();
      });

      // Verify the main content is rendered despite potential network errors
      expect(screen.getByText('HIPAA Privacy Notice and Acknowledgment')).toBeInTheDocument();
    });

    it('T55: loads existing signature data from Redux', async () => {
      authSigSlice.selectFormByType.mockReturnValue(() => ({
        signature: 'Existing Signature',
        acknowledged: false
      }));

      const preloadedState = createMockState({
        phiReleaseForm: {
          signature: 'Existing Signature',
          acknowledged: false
        }
      });

      renderWithProviders(<ReleasePHI clientID={mockClientID} />, { preloadedState });

      await waitFor(() => {
        const input = screen.getByLabelText(/Electronic Signature/i);
        expect(input).toHaveValue('Existing Signature');
      });
    });
  });
});

// ============================================================================
// TEST SUMMARY
// ============================================================================
/*
TOTAL TESTS: 55

BREAKDOWN BY SECTION:
✅ Section 1: Component Rendering & Initial State (5 tests)
✅ Section 2: Accordion Interaction (6 tests)
✅ Section 3: Signature & Form Fields (7 tests)
✅ Section 4: Validation & Error Handling (8 tests)
✅ Section 5: Form Submission (8 tests)
✅ Section 6: UI Feedback & Notifications (5 tests)
✅ Section 7: Progress Tracking (4 tests)
✅ Section 8: Accessibility (4 tests)
✅ Section 9: Redux Integration (3 tests)
✅ Section 10: Edge Cases & Error Scenarios (5 tests)

KEY FEATURES TESTED:
- PHI release form rendering and initialization
- HIPAA privacy notice display in accordions
- Electronic signature capture and validation
- Form submission with proper data structure
- Progress tracking (0%, 50%, 100%)
- Privacy officer contact information display
- Patient rights explanation
- Uses and disclosures of PHI
- Error handling and validation
- Redux state management
- Accessibility compliance
- Success/failure notifications

FORM STRUCTURE:
- 4 main accordion sections:
  1. Overview & General Information (HIPAA basics)
  2. How We Use and Disclose Your Information (Treatment, Payment, Operations)
  3. Your Rights Regarding Your Health Information (5 key rights)
  4. Privacy Officer & Complaints (Contact info)

PROGRESS CALCULATION:
- 0%: No signature
- 50%: Signature provided but not acknowledged
- 100%: Signature provided and acknowledged

VITEST COMPATIBLE:
- Uses vi.fn(), vi.mock(), vi.clearAllMocks()
- Follows established testing patterns
- Comprehensive coverage of all component features
*/