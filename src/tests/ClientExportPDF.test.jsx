import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import ClientExportPDF from '../components/ClientExportPDF';
import { buildExportUrl } from '../hooks/useClientPdfExport';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { acquireTokenSilent: vi.fn().mockResolvedValue({ idToken: 'test-id-token' }) },
    accounts: [{ username: 'tester' }],
  }),
}));

describe('buildExportUrl', () => {
  it('builds the full-record URL when no sections are given', () => {
    expect(buildExportUrl('C 1')).toMatch(/\/api\/export\/client\/C%201\/pdf$/);
  });

  it('adds a sections query for a subset', () => {
    expect(buildExportUrl('C1', { sections: [1, 5] })).toMatch(/\/pdf\?sections=1,5$/);
  });

  it('omits the query when all six sections are selected', () => {
    expect(buildExportUrl('C1', { sections: [1, 2, 3, 4, 5, 6] })).toMatch(/\/pdf$/);
  });

  it('targets the medical face sheet route', () => {
    expect(buildExportUrl('C1', { kind: 'med-face-sheet' })).toMatch(/\/pdf\/med-face-sheet$/);
  });
});

describe('ClientExportPDF', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['%PDF'])),
      headers: { get: () => 'attachment; filename="Doe_Jane_Section_5.pdf"' },
    });
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports a single section from its row button', async () => {
    renderWithProviders(<ClientExportPDF clientID="C1" />);
    fireEvent.click(screen.getByRole('button', { name: /Export Section 5 – Medical/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/pdf\?sections=5$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-id-token');
  });

  it('exports only the checked sections', async () => {
    renderWithProviders(<ClientExportPDF clientID="C1" />);
    fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Include Section 2/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Include Section 5/i }));
    fireEvent.click(screen.getByRole('button', { name: /Export 2 Selected Sections/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/pdf\?sections=2,5$/);
  });

  it('disables the main export when nothing is selected', () => {
    renderWithProviders(<ClientExportPDF clientID="C1" />);
    fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
    expect(screen.getByRole('button', { name: /Select at least one section/i })).toBeDisabled();
  });
});

describe('ClientInfoBanner export button', () => {
  it('shows no export button by default', async () => {
    const { default: ClientInfoBanner } = await import('../components/shared/ClientInfoBanner');
    renderWithProviders(<ClientInfoBanner />);
    expect(screen.queryByRole('button', { name: /Export Section/i })).toBeNull();
  });

  it('exports just its own section', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['%PDF'])),
      headers: { get: () => '' },
    });
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();

    const { default: ClientInfoBanner } = await import('../components/shared/ClientInfoBanner');
    renderWithProviders(<ClientInfoBanner exportSection={3} />, {
      preloadedState: { clients: { selectedClient: { clientID: 'C9', clientFirstName: 'A', clientLastName: 'B' } } },
    });
    fireEvent.click(screen.getByRole('button', { name: /Export Section 3 PDF/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/client\/C9\/pdf\?sections=3$/);
    vi.unstubAllGlobals();
  });
});
