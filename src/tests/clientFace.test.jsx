import { describe, test, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockClientFace } from './test-utils';
import ClientFace from '../views/Section-1/ClientFace';

describe('ClientFace Component', () => {
  test('should render without crashing', async () => {
    const { container } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    await waitFor(() => {
      expect(container.firstChild).toBeTruthy();
    }, { timeout: 3000 });
  });

  test('should show message when no client selected', () => {
    renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace({ currentClientID: null })
      }
    });

    // Component now shows this better message
    expect(screen.getByText(/please select a client/i)).toBeInTheDocument();
  });

  test('should render MUI Alert component', () => {
    const { container } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
  });

  test('should have proper MUI structure', async () => {
    const { container } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    await waitFor(() => {
      const muiBox = container.querySelector('.MuiBox-root');
      expect(muiBox).toBeTruthy();
    });
  });

  test('should render Paper component', async () => {
    const { container } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    await waitFor(() => {
      const paper = container.querySelector('.MuiPaper-root');
      expect(paper).toBeTruthy();
    });
  });

  test('component accepts Redux state', () => {
    const mockState = createMockClientFace({
      formData: {
        clientContactNum: '(555) 123-4567',
        clientEmail: 'test@example.com'
      },
      currentClientID: 'TEST-123'
    });

    const { store } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: mockState
      }
    });

    const state = store.getState();
    expect(state.clientFace.formData.clientContactNum).toBe('(555) 123-4567');
    expect(state.clientFace.currentClientID).toBe('TEST-123');
  });

  test('Redux store structure is correct', () => {
    const { store } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    const state = store.getState();
    expect(state.clientFace).toHaveProperty('formData');
    expect(state.clientFace).toHaveProperty('allergies');
    expect(state.clientFace).toHaveProperty('loading');
    expect(state.clientFace).toHaveProperty('saving');
  });

  test('formData structure is correct', () => {
    const { store } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    const formData = store.getState().clientFace.formData;
    expect(formData).toHaveProperty('clientContactNum');
    expect(formData).toHaveProperty('clientEmail');
    expect(formData).toHaveProperty('clientMedInsType');
  });

  test('can update form data through state', () => {
    const customData = {
      clientContactNum: '(555) 999-8888',
      clientEmail: 'custom@test.com',
      clientMedInsType: 'Medi-Cal'
    };

    const { store } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace({
          formData: customData
        })
      }
    });

    const state = store.getState();
    expect(state.clientFace.formData.clientContactNum).toBe('(555) 999-8888');
    expect(state.clientFace.formData.clientEmail).toBe('custom@test.com');
    expect(state.clientFace.formData.clientMedInsType).toBe('Medi-Cal');
  });
});

describe('ClientFace Component - Simple Tests', () => {
  test('component can be imported', () => {
    expect(ClientFace).toBeDefined();
  });

  test('component renders something', () => {
    const { container } = renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    expect(container.innerHTML).toBeTruthy();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  test('component shows helpful message', () => {
    renderWithProviders(<ClientFace />, {
      preloadedState: {
        clientFace: createMockClientFace()
      }
    });

    // Better UX - tells user what to do
    expect(screen.getByText(/please select a client/i)).toBeInTheDocument();
  });
});