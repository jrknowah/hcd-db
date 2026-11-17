// Care team on the New Client / Edit Client form and in the client list.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import NewClient from '../views/Dashboard/NewClient';
import ClientTable from '../components/tables/ClientTable';
import clientReducer from '../backend/store/slices/clientSlice';

vi.setConfig({ testTimeout: 30000 });

vi.mock('../utils/apiAuth', () => ({ getApiAuthHeaders: async () => ({ Authorization: 'Bearer t' }) }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../backend/services/careTeamDirectory', () => ({
  loadCareTeamStaff: async (role) => (role === 'behavioral'
    ? [{ email: 'casey.worker@hope.org', name: 'Casey Worker', jobTitle: 'Case Manager' }]
    : [{ email: 'nina.ortiz@hope.org', name: 'Nina Ortiz', jobTitle: 'LVN' }]),
}));

const existing = {
  clientID: 'E1', clientFirstName: 'Eve', clientLastName: 'Two', clientSite: 'Pacific',
  clientDOB: '1980-01-01T00:00:00Z',
  clientMedicalStaffEmail: 'olive.grant@hope.org', clientMedicalStaffName: 'Olive Grant',
};

const renderWithStore = (ui) => {
  const store = configureStore({
    reducer: { clients: clientReducer },
    preloadedState: { clients: { clients: [existing], selectedClient: null, loading: false, error: null } },
  });
  return render(<Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>);
};

const pick = async (user, label, name) => {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByText(name));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('New Client form care team', () => {
  it('sends the picked staff with a new client', async () => {
    const user = userEvent.setup();
    axios.post.mockImplementation(async (_url, body) => ({ data: { clientID: body.clientID, data: body } }));
    renderWithStore(<NewClient />);

    const [idField] = screen.getAllByRole('textbox');
    await user.type(idField, 'N1');
    const fields = screen.getAllByRole('textbox');
    await user.type(fields[1], 'New'); // first name
    await user.type(fields[3], 'Person'); // last name
    const dob = document.querySelector('input[type="date"][required]');
    await user.type(dob, '1990-05-05');
    await user.click(screen.getByRole('combobox', { name: '*' }));
    await user.click(await screen.findByRole('option', { name: 'Pacific' }));

    await pick(user, 'Behavioral Health staff', 'Casey Worker');
    await user.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const body = axios.post.mock.calls[0][1];
    expect(body).toMatchObject({
      clientID: 'N1',
      clientBehavioralStaffEmail: 'casey.worker@hope.org',
      clientBehavioralStaffName: 'Casey Worker',
    });
    // Unset roles are left out, not sent as null
    expect(body).not.toHaveProperty('clientMedicalStaffEmail');
  });

  it('sends only the roles that changed when editing', async () => {
    const user = userEvent.setup();
    axios.put.mockImplementation(async (_url, body) => ({ data: { ...existing, ...body } }));
    renderWithStore(<NewClient editMode clientData={existing} />);

    expect(screen.getByLabelText('Medical staff')).toHaveValue('Olive Grant');
    await pick(user, 'Behavioral Health staff', 'Casey Worker');
    await user.click(screen.getByRole('button', { name: /update client/i }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    const body = axios.put.mock.calls[0][1];
    expect(body.clientBehavioralStaffEmail).toBe('casey.worker@hope.org');
    expect(body).not.toHaveProperty('clientMedicalStaffEmail');
  });

  it('refuses a typed staff entry that is not an email', async () => {
    const user = userEvent.setup();
    renderWithStore(<NewClient editMode clientData={existing} />);

    await user.type(screen.getByLabelText('Behavioral Health staff'), 'Casey{Enter}');
    await user.click(screen.getByRole('button', { name: /update client/i }));

    expect(await screen.findByText(/valid email address for the behavioral health staff/i)).toBeInTheDocument();
    expect(axios.put).not.toHaveBeenCalled();
  });
});

describe('client list care team column', () => {
  const clients = [
    { ...existing },
    {
      clientID: 'E2', clientFirstName: 'Al', clientLastName: 'Both', clientSite: 'Pacific',
      clientBehavioralStaffEmail: 'casey.worker@hope.org', clientBehavioralStaffName: 'Casey Worker',
      clientMedicalStaffEmail: 'nina.ortiz@hope.org', clientMedicalStaffName: 'Nina Ortiz',
    },
  ];

  it('shows who is assigned and flags missing roles', () => {
    render(<ClientTable clients={clients} viewMode="table" onClientSelect={() => {}} />);
    const rowE1 = screen.getByText('E1').closest('tr');
    expect(within(rowE1).getByText('Olive Grant')).toBeInTheDocument();
    expect(within(rowE1).getByText('Unassigned')).toBeInTheDocument();
    const rowE2 = screen.getByText('E2').closest('tr');
    expect(within(rowE2).getByText('Casey Worker')).toBeInTheDocument();
    expect(within(rowE2).getByText('Nina Ortiz')).toBeInTheDocument();
  });

  it('sorts clients missing someone first', async () => {
    const user = userEvent.setup();
    render(<ClientTable clients={[clients[1], clients[0]]} viewMode="table" onClientSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Care Team' }));
    // Body rows carry role="checkbox" (MUI selectable table), so select them directly
    const ids = [...document.querySelectorAll('tbody tr')].map((row) => within(row).queryByText(/^E\d$/)?.textContent);
    expect(ids).toEqual(['E1', 'E2']);
  });
});
