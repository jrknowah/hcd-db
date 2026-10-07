// Section 1 Exit Form and Section 5 Discharge Plan: load the client's saved
// form, save it with PUT, and show who last saved it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExitForm, { lengthOfStayDays } from '../views/Section-1/ExitForm';
import DischargePlan from '../views/Section-5/DischargePlan';

// These MUI forms are large; typing into them in jsdom is slow
vi.setConfig({ testTimeout: 30000 });

let persistence;
vi.mock('../hooks/useClientPersistence', () => ({
  useClientPersistence: () => persistence,
}));
vi.mock('../utils/apiAuth', () => ({
  getApiAuthHeaders: async () => ({ Authorization: 'Bearer test-token' }),
}));

const json = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
}));

let fetchMock;

beforeEach(() => {
  persistence = {
    clientID: 'C1',
    client: { clientID: 'C1', clientFirstName: 'Ana', clientLastName: 'Lopez', clientDOB: '1980-05-04T00:00:00.000Z', clientAdmitDate: '2026-09-01T00:00:00.000Z' },
    shouldUseMockData: false,
  };
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lengthOfStayDays', () => {
  it('counts the intake date but not the exit date', () => {
    expect(lengthOfStayDays('2026-09-01', '2026-09-02')).toBe(1);
    expect(lengthOfStayDays('2026-09-01', '2026-10-01')).toBe(30);
    expect(lengthOfStayDays('2026-09-01', '2026-09-01')).toBe(0);
  });

  it('is blank when a date is missing or the exit is before the admit', () => {
    expect(lengthOfStayDays('', '2026-09-02')).toBeNull();
    expect(lengthOfStayDays('2026-09-05', '2026-09-02')).toBeNull();
  });
});

describe('Exit Form', () => {
  it('starts a new form from the client admit date and saves it', async () => {
    fetchMock
      .mockReturnValueOnce(json({ success: true, record: null }))
      .mockImplementationOnce((_url, init) => json({
        success: true,
        record: { ...JSON.parse(init.body), createdBy: 'cm@hope.org', createdAt: '2026-10-05T17:00:00Z' },
      }));
    const user = userEvent.setup();
    render(<ExitForm />);

    const admit = await screen.findByLabelText('Interim Housing Admit Date');
    await waitFor(() => expect(admit).toHaveValue('2026-09-01'));
    expect(screen.getByLabelText("Client's Name")).toHaveValue('Ana Lopez');

    await user.type(screen.getByLabelText('Interim Housing Exit Date'), '2026-10-01');
    expect(screen.getByLabelText('Length of Stay (days)')).toHaveValue('30');

    await user.click(screen.getByLabelText('Called'));
    await user.click(screen.getByLabelText('Change in Level of Care'));
    await user.click(screen.getByRole('button', { name: 'Save Exit Form' }));

    await screen.findByText('Exit Form saved.');
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/api\/exit-form\/C1$/);
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(init.body)).toMatchObject({
      admitDate: '2026-09-01',
      exitDate: '2026-10-01',
      lengthOfStay: 30,
      notificationMethods: ['Called'],
      exitReason: 'Change in Level of Care',
    });
    expect(screen.getByText(/Created .* by cm@hope\.org/)).toBeInTheDocument();
  });

  it('shows the saved form and asks for an incident report when needed', async () => {
    fetchMock.mockReturnValueOnce(json({
      success: true,
      record: {
        admitDate: '2026-08-01T00:00:00.000Z',
        exitDate: '2026-08-11T00:00:00.000Z',
        exitReason: 'Deceased',
        notificationMethods: ['Emailed'],
        createdBy: 'a@hope.org',
        createdAt: '2026-08-11T17:00:00Z',
        updatedBy: 'b@hope.org',
        updatedAt: '2026-08-12T17:00:00Z',
      },
    }));
    render(<ExitForm />);

    expect(await screen.findByLabelText('Interim Housing Exit Date')).toHaveValue('2026-08-11');
    expect(screen.getByLabelText('Interim Housing Admit Date')).toHaveValue('2026-08-01');
    expect(screen.getByLabelText('Length of Stay (days)')).toHaveValue('10');
    expect(screen.getByLabelText('Emailed')).toBeChecked();
    expect(screen.getByLabelText('Deceased')).toBeChecked();
    expect(screen.getByText('Attach an Incident Report for this exit reason.')).toBeInTheDocument();
    expect(screen.getByText(/Last updated .* by b@hope\.org/)).toBeInTheDocument();
  });

  it('will not save when loading the saved form failed', async () => {
    fetchMock.mockReturnValueOnce(json({ success: false, message: 'Failed to load Exit Form' }, 500));
    render(<ExitForm />);

    expect(await screen.findByText('Failed to load Exit Form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Exit Form' })).toBeDisabled();
  });
});

describe('Discharge Plan', () => {
  it('loads the saved plan and saves changes', async () => {
    fetchMock
      .mockReturnValueOnce(json({
        success: true,
        record: { admissionDate: '2026-09-01T00:00:00.000Z', primaryDiagnosis: 'CHF', createdBy: 'rn@hope.org', createdAt: '2026-09-02T17:00:00Z' },
      }))
      .mockImplementationOnce((_url, init) => json({
        success: true,
        record: { ...JSON.parse(init.body), createdBy: 'rn@hope.org', createdAt: '2026-09-02T17:00:00Z', updatedBy: 'md@hope.org', updatedAt: '2026-10-05T17:00:00Z' },
      }));
    const user = userEvent.setup();
    render(<DischargePlan />);

    expect(await screen.findByLabelText('Primary Diagnosis')).toHaveValue('CHF');
    expect(screen.getByLabelText('Admission Date')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Patient Name')).toHaveValue('Ana Lopez');
    expect(screen.getByLabelText('Date of Birth')).toHaveValue('5/4/1980');

    await user.click(screen.getByLabelText('II. Discharge Destination'));
    await user.paste('Home with sister');
    await user.click(screen.getByRole('button', { name: 'Save Discharge Plan' }));

    await screen.findByText('Discharge Plan saved.');
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/api\/discharge-plan\/C1$/);
    expect(JSON.parse(init.body)).toMatchObject({
      admissionDate: '2026-09-01',
      primaryDiagnosis: 'CHF',
      dischargeDestination: 'Home with sister',
    });
    expect(screen.getByText(/Last updated .* by md@hope\.org/)).toBeInTheDocument();
  });

  it('refuses a discharge date before the admission date', async () => {
    fetchMock.mockReturnValueOnce(json({ success: true, record: { admissionDate: '2026-09-10' } }));
    const user = userEvent.setup();
    render(<DischargePlan />);

    await user.type(await screen.findByLabelText('Discharge Date'), '2026-09-01');
    await user.click(screen.getByRole('button', { name: 'Save Discharge Plan' }));

    expect(await screen.findByText('The discharge date cannot be before the admission date.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears the form when switching clients', async () => {
    fetchMock
      .mockReturnValueOnce(json({ success: true, record: { primaryDiagnosis: 'CHF' } }))
      .mockReturnValueOnce(json({ success: true, record: null }));
    const { rerender } = render(<DischargePlan />);
    expect(await screen.findByLabelText('Primary Diagnosis')).toHaveValue('CHF');

    persistence = { ...persistence, clientID: 'C2', client: { clientID: 'C2', clientFirstName: 'Bo', clientLastName: 'Kim' } };
    rerender(<DischargePlan />);

    await waitFor(() => expect(screen.getByLabelText('Patient Name')).toHaveValue('Bo Kim'));
    expect(screen.getByLabelText('Primary Diagnosis')).toHaveValue('');
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/discharge-plan\/C2$/);
  });
});
