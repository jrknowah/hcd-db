// Section 4: encounter notes and care plans save as drafts, lock once
// submitted, and only IT Admin / Level 1 see Unlock.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import { renderWithProviders } from './test-utils';
import encounterNoteReducer from '../backend/store/slices/encounterNoteSlice';
import carePlansReducer from '../backend/store/slices/carePlanSlice';
import EncounterNote from '../views/Section-4/EncounterNote';
import CarePlan from '../views/Section-4/CarePlan';

const IT_GROUP = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';
const CASE_GROUP = '59b40286-56c6-4b1e-8de2-854c7d91179b';

let groups = [];
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ accounts: [{ idTokenClaims: { groups } }] }),
}));
vi.mock('../utils/apiAuth', () => ({
  getApiAuthHeaders: async () => ({ Authorization: 'Bearer test-token' }),
}));
vi.mock('../backend/config/logAction', () => ({ default: vi.fn(async () => {}) }));
vi.mock('axios');

const makeStore = () => configureStore({
  reducer: {
    encounterNote: encounterNoteReducer,
    carePlans: carePlansReducer,
    auth: (state = { user: { email: 'cm@hope.org' } }) => state,
    clients: (state = { selectedClient: null }) => state,
  },
  middleware: (gdm) => gdm({ serializableCheck: false }),
});

const submittedNote = {
  _id: 'n1',
  clientID: 'C1',
  careNoteDate: '2026-10-01',
  careNoteType: 'Individual',
  careNoteSite: null,
  careNote: 'Met with client about housing.',
  createdBy: 'cm@hope.org',
  submissionStatus: 'submitted',
  submittedBy: 'cm@hope.org',
  submittedAt: '2026-10-01T17:00:00Z',
  locked: true,
};

const draftNote = { ...submittedNote, _id: 'n2', submissionStatus: 'draft', submittedBy: null, submittedAt: null, locked: false };

const submittedPlan = {
  _id: 'p1',
  clientID: 'C1',
  careGoal: 'Stable housing',
  careSteps: 'Apply for housing',
  status: 'Active',
  priority: 'High',
  createdBy: 'cm@hope.org',
  submissionStatus: 'submitted',
  submittedBy: 'cm@hope.org',
  submittedAt: '2026-10-01T17:00:00Z',
  locked: true,
};

const rowFor = (text) => screen.getByText(text).closest('tr');

describe('Section 4 encounter notes lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groups = [CASE_GROUP];
    axios.get.mockResolvedValue({ data: [submittedNote, draftNote] });
  });

  it('shows submitted notes read-only with no Unlock for regular staff', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EncounterNote clientID="C1" />, { store: makeStore() });

    await screen.findAllByText('Met with client about housing.');
    const [lockedRow, draftRow] = screen.getAllByText('Met with client about housing.').map(el => el.closest('tr'));
    expect(within(lockedRow).getByText('Submitted')).toBeInTheDocument();
    expect(within(lockedRow).queryByRole('button', { name: /unlock note/i })).not.toBeInTheDocument();
    expect(within(lockedRow).queryByRole('button', { name: /edit draft/i })).not.toBeInTheDocument();
    expect(within(draftRow).getByText('Draft')).toBeInTheDocument();
    expect(within(draftRow).getByRole('button', { name: /edit draft/i })).toBeInTheDocument();

    await user.click(within(lockedRow).getByRole('button', { name: /view note/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Submitted and locked/)).toBeInTheDocument();
    expect(within(dialog).getByText(/IT Admin or Level 1 user to unlock/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /submit note/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /save progress/i })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/note content/i)).toHaveAttribute('readonly');
  }, 20000);

  it('saves progress as a draft with submit: false', async () => {
    const user = userEvent.setup();
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockImplementation(async (_url, body) => ({
      data: { ...body, _id: 'new', locked: body.submit === true, submissionStatus: body.submit ? 'submitted' : 'draft' },
    }));
    renderWithProviders(<EncounterNote clientID="C1" />, { store: makeStore() });

    await user.click(await screen.findByRole('button', { name: /add note/i }));
    const dialog = await screen.findByRole('dialog');
    // Draft only needs a date and type; pick the type
    await user.click(within(dialog).getByText('Select note type...'));
    await user.click(await screen.findByText('Individual'));
    await user.click(within(dialog).getByRole('button', { name: /save progress/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post.mock.calls[0][1]).toMatchObject({ careNoteType: 'Individual', submit: false });
    expect(await screen.findAllByText(/Progress saved/)).not.toHaveLength(0);
  }, 20000);

  it('requires note content to submit', async () => {
    const user = userEvent.setup();
    axios.get.mockResolvedValue({ data: [] });
    renderWithProviders(<EncounterNote clientID="C1" />, { store: makeStore() });

    await user.click(await screen.findByRole('button', { name: /add note/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByText('Select note type...'));
    await user.click(await screen.findByText('Individual'));
    await user.click(within(dialog).getByRole('button', { name: /submit note/i }));

    expect(await within(dialog).findByText(/write the note before submitting/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  }, 20000);

  it.each([['IT Admin', IT_GROUP], ['Level 1', LEVEL1_GROUP]])('lets %s unlock with a reason', async (_label, group) => {
    groups = [group];
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: { ...submittedNote, submissionStatus: 'draft', locked: false, unlockedBy: 'lead@hope.org', unlockedAt: '2026-10-04T10:00:00Z', unlockReason: 'Wrong date' },
    });
    renderWithProviders(<EncounterNote clientID="C1" />, { store: makeStore() });

    await screen.findAllByText('Met with client about housing.');
    const lockedRow = screen.getAllByText('Met with client about housing.')[0].closest('tr');
    await user.click(within(lockedRow).getByRole('button', { name: /unlock note/i }));

    const unlockDialog = await screen.findByRole('dialog', { name: /unlock submitted note/i });
    const confirm = within(unlockDialog).getByRole('button', { name: /unlock note/i });
    expect(confirm).toBeDisabled();
    await user.click(within(unlockDialog).getByLabelText(/reason for unlocking/i));
    await user.paste('Wrong date');
    await user.click(confirm);

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/encounter-notes\/n1\/unlock$/),
      { reason: 'Wrong date' },
      { headers: { Authorization: 'Bearer test-token' } },
    ));
    // Re-opens as an editable draft
    expect(await screen.findByText(/Unlocked by lead@hope.org/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit note/i })).toBeEnabled();
  }, 20000);
});

describe('Section 4 care plans lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    groups = [CASE_GROUP];
    axios.get.mockResolvedValue({ data: [submittedPlan] });
  });

  it('hides edit and delete on a submitted plan for regular staff', async () => {
    renderWithProviders(<CarePlan clientID="C1" />, { store: makeStore() });
    await screen.findByText('Stable housing');
    const row = rowFor('Stable housing');
    expect(within(row).getByText('Submitted')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /view care plan/i })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /edit draft/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /delete draft/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /unlock care plan/i })).not.toBeInTheDocument();
  });

  it('shows Unlock to Level 1 and unlocks with a reason', async () => {
    groups = [LEVEL1_GROUP];
    const user = userEvent.setup();
    axios.post.mockResolvedValue({
      data: { ...submittedPlan, submissionStatus: 'draft', locked: false, unlockedBy: 'lead@hope.org', unlockedAt: '2026-10-04T10:00:00Z' },
    });
    renderWithProviders(<CarePlan clientID="C1" />, { store: makeStore() });

    await screen.findByText('Stable housing');
    await user.click(within(rowFor('Stable housing')).getByRole('button', { name: /unlock care plan/i }));
    const unlockDialog = await screen.findByRole('dialog', { name: /unlock submitted care plan/i });
    await user.click(within(unlockDialog).getByLabelText(/reason for unlocking/i));
    await user.paste('Goal needs revising');
    await user.click(within(unlockDialog).getByRole('button', { name: /unlock care plan/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/care-plans\/p1\/unlock$/),
      { reason: 'Goal needs revising' },
      { headers: { Authorization: 'Bearer test-token' } },
    ));
    expect(await screen.findByRole('button', { name: /submit goal/i })).toBeEnabled();
  }, 20000);
});
