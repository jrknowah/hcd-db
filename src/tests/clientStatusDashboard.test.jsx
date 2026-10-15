// Client program and status on the dashboard: Current / Discharged tabs,
// Program and Status columns, and the face sheet's Program validation.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import ClientTable from '../components/tables/ClientTable';
import DashboardClient from '../views/Dashboard/DashboardClient';
import clientReducer from '../backend/store/slices/clientSlice';
import clientFaceReducer, { updateFormField, setValidationErrors } from '../backend/store/slices/clientFaceSlice';

vi.setConfig({ testTimeout: 30000 });

const CLIENTS = [
  { clientID: 'A1', clientFirstName: 'Ana', clientLastName: 'Lopez', clientSite: 'Pacific', clientProgram: 'LAHSA', status: 'active', createdAt: '2026-01-01T00:00:00Z' },
  { clientID: 'D1', clientFirstName: 'Dee', clientLastName: 'Moss', clientSite: 'Eubanks', clientProgram: 'DMH', status: 'discharged', clientDischargeDate: '2026-10-05T00:00:00.000Z', clientExitReason: 'Family Reunification', createdAt: '2026-01-01T00:00:00Z' },
];

// setup.js pins every route to a client page; the dashboard only renders on /dashboard
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useLocation: () => ({ pathname: '/dashboard', search: '' }) };
});

vi.mock('axios', () => ({
  default: { get: vi.fn(async () => ({ data: CLIENTS })), post: vi.fn(), put: vi.fn() },
}));

describe('ClientTable', () => {
  it('shows each client program and status', () => {
    render(<ClientTable clients={CLIENTS} onSelectClient={() => {}} />);
    const ana = screen.getByText('Ana Lopez').closest('tr');
    expect(within(ana).getByText('LAHSA')).toBeInTheDocument();
    expect(within(ana).getByText('Active')).toBeInTheDocument();

    const dee = screen.getByText('Dee Moss').closest('tr');
    expect(within(dee).getByText('DMH')).toBeInTheDocument();
    // Calendar date, not shifted a day by the timezone
    expect(within(dee).getByText(`Discharged ${new Date(2026, 9, 5).toLocaleDateString()}`)).toBeInTheDocument();
  });
});

describe('Dashboard tabs', () => {
  it('lists current clients first and discharged clients on their own tab', async () => {
    const store = configureStore({ reducer: { clients: clientReducer, auth: (s = {}) => s } });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardClient />
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByText('Ana Lopez')).toBeInTheDocument();
    expect(screen.queryByText('Dee Moss')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Discharged/ }));
    expect(await screen.findByText('Dee Moss')).toBeInTheDocument();
    expect(screen.queryByText('Ana Lopez')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1 discharged clients')).toBeInTheDocument();
  });
});

describe('Face sheet program validation', () => {
  it('clears "Program is required" once a program is picked', () => {
    let state = clientFaceReducer(undefined, setValidationErrors(['Program is required', 'Email must be a valid email address']));
    state = clientFaceReducer(state, updateFormField({ field: 'clientProgram', value: 'DHS' }));
    expect(state.validationErrors).toEqual(['Email must be a valid email address']);
    expect(state.formData.clientProgram).toBe('DHS');
  });
});
