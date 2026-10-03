import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from './test-utils';
import axios from 'axios';
import AdminAnalytics from '../views/admin/AdminAnalytics';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { acquireTokenSilent: vi.fn().mockResolvedValue({ idToken: 'test-id-token' }) },
    accounts: [{ username: 'admin' }],
  }),
}));

vi.mock('axios');

const catalog = {
  minCellSize: 11,
  reports: [
    {
      key: 'census_by_site',
      label: 'Current Census by Site',
      category: 'Census & Flow',
      description: 'Clients enrolled today, per site.',
      usesRange: false,
    },
    {
      key: 'average_length_of_stay',
      label: 'Length of Stay by Site',
      category: 'Census & Flow',
      description: 'Average and median days enrolled.',
      usesRange: true,
    },
  ],
};

const losReport = {
  key: 'average_length_of_stay',
  label: 'Length of Stay by Site',
  usesRange: true,
  range: { startDate: '2025-10-01', endDate: '2026-09-30' },
  columns: ['site', 'clientCount', 'avgDays'],
  rows: [
    { site: 'Arroyo', clientCount: 40, avgDays: 101.25 },
    { site: 'Percy', clientCount: null, avgDays: null, __suppressed: true },
  ],
  suppressedCells: 2,
  minCellSize: 11,
};

function mockApi() {
  axios.get.mockImplementation((url, opts = {}) => {
    if (url.endsWith('/analytics/reports')) return Promise.resolve({ data: catalog });
    if (url.endsWith('/analytics/summary')) {
      return Promise.resolve({
        data: {
          summary: { activeClients: 120, admissions30d: null, discharges30d: 14, totalClients: 900 },
          admissionsTrend: [],
        },
      });
    }
    if (url.endsWith('/export') || url.endsWith('/export-all')) {
      return Promise.resolve({ data: new Blob(['file']), opts });
    }
    if (url.endsWith('/reports/average_length_of_stay')) return Promise.resolve({ data: losReport });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
}

async function pickReport(label) {
  fireEvent.mouseDown(screen.getByLabelText('Report'));
  fireEvent.click(await screen.findByRole('option', { name: label }));
}

describe('AdminAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows suppressed headline figures as <11 rather than 0', async () => {
    renderWithProviders(<AdminAnalytics />);
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByText('<11')).toBeInTheDocument();
  });

  it('runs a report on selection and renders readable headers and suppressed cells', async () => {
    renderWithProviders(<AdminAnalytics />);
    await pickReport('Length of Stay by Site');

    expect(await screen.findByText('Avg Days')).toBeInTheDocument();
    expect(screen.getByText('Average and median days enrolled.')).toBeInTheDocument();
    expect(screen.getByText('101.3')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/reports\/average_length_of_stay$/),
      expect.objectContaining({ params: expect.any(Object) })
    );
  });

  it('exports the selected report as Excel', async () => {
    renderWithProviders(<AdminAnalytics />);
    await pickReport('Length of Stay by Site');
    await screen.findByText('Avg Days');

    fireEvent.click(screen.getByRole('button', { name: /^export$/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /excel/i }));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/reports\/average_length_of_stay\/export$/),
        expect.objectContaining({
          params: expect.objectContaining({ format: 'xlsx' }),
          responseType: 'blob',
        })
      )
    );
  });

  it('exports all reports as PDF, and does not offer CSV for the packet', async () => {
    renderWithProviders(<AdminAnalytics />);
    await screen.findByText('120');

    fireEvent.click(screen.getByRole('button', { name: /all reports/i }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: /csv/i })).toBeNull();
    fireEvent.click(within(menu).getByRole('menuitem', { name: /pdf/i }));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/analytics\/export-all$/),
        expect.objectContaining({ params: expect.objectContaining({ format: 'pdf' }) })
      )
    );
  });

  it('disables the date range for "as of today" reports', async () => {
    renderWithProviders(<AdminAnalytics />);
    await pickReport('Current Census by Site');
    expect(screen.getByLabelText('Start date')).toBeDisabled();
    expect(screen.getByLabelText('End date')).toBeDisabled();
  });
});
