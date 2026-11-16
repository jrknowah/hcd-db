// Assigning the behavioral and medical person from the client profile card.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import CareTeam from '../components/cards/CareTeam';
import clientReducer from '../backend/store/slices/clientSlice';

vi.setConfig({ testTimeout: 30000 });

vi.mock('../utils/apiAuth', () => ({ getApiAuthHeaders: async () => ({ Authorization: 'Bearer t' }) }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

const loadCareTeamStaff = vi.fn();
vi.mock('../backend/services/careTeamDirectory', () => ({
  loadCareTeamStaff: (role) => loadCareTeamStaff(role),
}));

const client = {
  clientID: 'E1', clientFirstName: 'Eve', clientLastName: 'Two', clientSite: 'Eubanks',
  clientMedicalStaffEmail: 'old.nurse@hope.org', clientMedicalStaffName: 'Olive Nurse',
};

const Connected = ({ store }) => {
  const selected = store.getState().clients.selectedClient;
  return <CareTeam client={selected} />;
};

const setup = () => {
  const store = configureStore({
    reducer: { clients: clientReducer },
    preloadedState: { clients: { clients: [client], selectedClient: client, loading: false, error: null } },
  });
  const view = render(<Provider store={store}><Connected store={store} /></Provider>);
  store.subscribe(() => view.rerender(<Provider store={store}><Connected store={store} /></Provider>));
  return store;
};

beforeEach(() => {
  vi.clearAllMocks();
  loadCareTeamStaff.mockImplementation(async (role) => (role === 'behavioral'
    ? [{ email: 'case.worker@hope.org', name: 'Casey Worker', jobTitle: 'Case Manager' }]
    : [{ email: 'new.nurse@hope.org', name: 'Nina Nurse', jobTitle: 'LVN' }]));
});

describe('CareTeam', () => {
  it('shows who is assigned', () => {
    setup();
    expect(screen.getByText('Not assigned')).toBeInTheDocument();
    expect(screen.getByText('Olive Nurse (old.nurse@hope.org)')).toBeInTheDocument();
  });

  it('assigns staff picked from the directory', async () => {
    const user = userEvent.setup();
    axios.put.mockImplementation(async (_url, body) => ({ data: { ...client, ...body } }));
    const store = setup();

    await user.click(screen.getByRole('button', { name: /assign staff/i }));
    await user.click(screen.getByLabelText('Behavioral Health staff'));
    await user.click(await screen.findByText('Casey Worker'));
    await user.click(screen.getByLabelText('Medical staff'));
    await user.click(await screen.findByText('Nina Nurse'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][0]).toMatch(/\/api\/clients\/E1$/);
    expect(axios.put.mock.calls[0][1]).toEqual({
      clientBehavioralStaffEmail: 'case.worker@hope.org',
      clientBehavioralStaffName: 'Casey Worker',
      clientMedicalStaffEmail: 'new.nurse@hope.org',
      clientMedicalStaffName: 'Nina Nurse',
    });
    await waitFor(() =>
      expect(store.getState().clients.selectedClient.clientBehavioralStaffName).toBe('Casey Worker'));
    expect(await screen.findByText('Casey Worker (case.worker@hope.org)')).toBeInTheDocument();
  });

  it('accepts a typed email when the directory cannot be read', async () => {
    const user = userEvent.setup();
    loadCareTeamStaff.mockRejectedValue(new Error('Could not load the staff directory (Graph 403)'));
    axios.put.mockImplementation(async (_url, body) => ({ data: { ...client, ...body } }));
    setup();

    await user.click(screen.getByRole('button', { name: /assign staff/i }));
    await user.type(screen.getByLabelText('Behavioral Health staff'), 'Case.Worker@hope.org');
    expect(await screen.findByText(/you can still type/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1].clientBehavioralStaffEmail).toBe('case.worker@hope.org');
  });

  it('shows the server error and keeps the dialog open', async () => {
    const user = userEvent.setup();
    axios.put.mockRejectedValue({ response: { data: { error: 'You do not have access to clients at this site' } } });
    setup();

    await user.click(screen.getByRole('button', { name: /assign staff/i }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('You do not have access to clients at this site')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
