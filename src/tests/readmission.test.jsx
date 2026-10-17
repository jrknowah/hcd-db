// Readmitting a discharged client (Discharged tab -> Readmit) and listing a
// client's previous stays with a chart download for each.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import DashboardClient from '../views/Dashboard/DashboardClient';
import PreviousStays from '../components/cards/PreviousStays';
import clientReducer from '../backend/store/slices/clientSlice';

vi.setConfig({ testTimeout: 30000 });

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useLocation: () => ({ pathname: '/dashboard', search: '' }) };
});
vi.mock('../utils/apiAuth', () => ({ getApiAuthHeaders: async () => ({ Authorization: 'Bearer t' }) }));

const exportPdf = vi.fn(async () => true);
vi.mock('../hooks/useClientPdfExport', () => ({
  default: () => ({ exportPdf, exporting: null, error: '' }),
}));

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

const discharged = {
  clientID: 'D1', clientFirstName: 'Dee', clientLastName: 'Moss', clientSite: 'Pacific', clientProgram: 'DMH',
  status: 'discharged', clientDischargeDate: '2026-09-30T00:00:00.000Z', createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Readmit from the Discharged tab', () => {
  it('readmits under the same ID and moves the client back to Current Clients', async () => {
    let list = [discharged];
    axios.get.mockImplementation(async () => ({ data: list }));
    axios.post.mockImplementation(async (url, body) => {
      list = [{ ...discharged, status: 'active', clientDischargeDate: null, clientSite: body.clientSite }];
      return { data: { client: list[0], priorStayClientID: 'D1~1', stayNumber: 1 } };
    });

    const store = configureStore({ reducer: { clients: clientReducer, auth: (s = {}) => s } });
    render(
      <Provider store={store}>
        <MemoryRouter><DashboardClient /></MemoryRouter>
      </Provider>
    );

    await userEvent.click(await screen.findByRole('tab', { name: /Discharged/ }));
    const row = (await screen.findByText('Dee Moss')).closest('tr');
    await userEvent.click(within(row).getAllByRole('button').pop());
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Readmit' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/keeps client ID/)).toHaveTextContent('D1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Readmit' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      '/api/clients/D1/readmit',
      expect.objectContaining({ clientSite: 'Pacific', admitDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
      { headers: { Authorization: 'Bearer t' } }
    ));
    expect(await screen.findByText(/Stay 1 is under Previous Stays/)).toBeInTheDocument();
    // Back on Current Clients, now active
    expect(await screen.findByText('Dee Moss')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Current Clients/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('PreviousStays', () => {
  it('lists earlier stays and downloads a stay chart', async () => {
    axios.get.mockResolvedValue({ data: [
      { stayNumber: 1, priorStayClientID: 'D1~1', site: 'Pacific', program: 'DMH',
        admitDate: '2026-01-05T00:00:00.000Z', dischargeDate: '2026-09-30T00:00:00.000Z', exitReason: 'Family Reunification' },
    ] });
    render(<PreviousStays clientID="D1" />);

    expect(await screen.findByText('Stay 1 · Pacific · DMH')).toBeInTheDocument();
    expect(screen.getByText(/Family Reunification/)).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/clients/D1/stays', { headers: { Authorization: 'Bearer t' } });

    await userEvent.click(screen.getByRole('button', { name: /Chart/ }));
    expect(exportPdf).toHaveBeenCalledWith('D1~1');
  });

  it('says when there are none', async () => {
    axios.get.mockResolvedValue({ data: [] });
    render(<PreviousStays clientID="A1" />);
    expect(await screen.findByText('No previous stays.')).toBeInTheDocument();
  });
});
