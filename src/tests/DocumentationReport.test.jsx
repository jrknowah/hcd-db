// Admin > Behavioral Health / Nursing documentation report page.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Menuitems, { filterMenuItems } from '../layouts/full/vertical/sidebar/MenuItems';
import DocumentationReport from '../views/admin/DocumentationReport';

// Stable across renders, like the real MSAL context
const msal = {
  instance: { acquireTokenSilent: async () => ({ idToken: 'token' }) },
  accounts: [{ idTokenClaims: { groups: [] } }],
};
vi.mock('@azure/msal-react', () => ({ useMsal: () => msal }));
vi.mock('axios');

const report = {
  area: 'nursing',
  generatedAt: '2026-10-07T12:00:00Z',
  failedChecks: [],
  checks: [
    { key: 'nursingAssessment', section: 5, label: 'Nursing Assessment', rule: 'Within 3 days.' },
    { key: 'progressNotes', section: 5, label: 'Progress Notes', rule: 'Every 30 days.' },
  ],
  summary: { activeClients: 2, clientsWithGaps: 1, byCheck: {} },
  clients: [
    {
      clientID: 'C1', firstName: 'Ana', lastName: 'Lopez', site: 'Eubanks', admitDate: '2026-08-01', daysEnrolled: 67, gapCount: 2,
      items: {
        nursingAssessment: { status: 'missing', detail: 'Not entered' },
        progressNotes: { status: 'incomplete', detail: '1 note not submitted' },
      },
    },
    {
      clientID: 'C2', firstName: 'Ben', lastName: 'Kim', site: 'Pacific', admitDate: '2026-08-01', daysEnrolled: 67, gapCount: 0,
      items: {
        nursingAssessment: { status: 'ok', detail: '1 record on file' },
        progressNotes: { status: 'ok', detail: '2 records on file' },
      },
    },
  ],
};

const renderPage = () => render(
  <MemoryRouter>
    <DocumentationReport area="nursing" title="Nursing Documentation" />
  </MemoryRouter>,
);

describe('DocumentationReport', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.get.mockResolvedValue({ data: report });
  });

  it('loads the area report and lists only clients needing attention by default', async () => {
    renderPage();
    expect(await screen.findByText('Lopez, Ana')).toBeInTheDocument();
    expect(screen.queryByText('Kim, Ben')).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/admin\/documentation\/nursing$/),
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('links each status to that section for the client', async () => {
    renderPage();
    const row = (await screen.findByText('Lopez, Ana')).closest('tr');
    expect(within(row).getByText('Missing').closest('a')).toHaveAttribute('href', '/Section5/C1');
    expect(within(row).getByText('Incomplete')).toBeInTheDocument();
  });

  it('shows every active client when the status filter is cleared', async () => {
    renderPage();
    await screen.findByText('Lopez, Ana');
    fireEvent.mouseDown(screen.getByLabelText('Status'));
    fireEvent.click(await screen.findByRole('option', { name: 'All active clients' }));
    expect(await screen.findByText('Kim, Ben')).toBeInTheDocument();
  });

  it('shows the server error', async () => {
    axios.get.mockRejectedValue({ response: { data: { error: 'Only IT Admin or Level 1 users can view documentation reports' } } });
    renderPage();
    expect(await screen.findByText(/Only IT Admin or Level 1/)).toBeInTheDocument();
  });
});

describe('sidebar', () => {
  const titles = (items) => items.map((i) => i.title || i.subheader).filter(Boolean);

  it('shows each documentation report only to its admin group', () => {
    const nursing = titles(filterMenuItems(Menuitems, { isAdmin: false, canViewNursing: true }));
    expect(nursing).toEqual(expect.arrayContaining(['Administration', 'Nursing (S5)']));
    expect(nursing).not.toContain('Behavioral Health (S1–4)');
    expect(nursing).not.toContain('Audit Trail');

    const behavioral = titles(filterMenuItems(Menuitems, { isAdmin: false, canViewBehavioral: true }));
    expect(behavioral).toContain('Behavioral Health (S1–4)');
    expect(behavioral).not.toContain('Nursing (S5)');
  });

  it('hides the reports from Level 1', () => {
    const level1 = titles(filterMenuItems(Menuitems, { isAdmin: false, canViewAudit: true }));
    expect(level1).toContain('Audit Trail');
    expect(level1).not.toContain('Nursing (S5)');
    expect(level1).not.toContain('Behavioral Health (S1–4)');
  });
});
