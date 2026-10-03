import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';
import AuthSig from '../views/Section-2/AuthSig';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const signedOrientation = (canUnlock) => ({
  formType: 'orientation',
  status: 'completed',
  signature: 'Jane Client',
  completedBy: 'cm@hope.org',
  completedAt: '2026-09-01T17:00:00Z',
  locked: true,
  canUnlock,
});

// Backend stand-in: orientation starts signed; an unlock re-opens it
function stubBackend({ canUnlock }) {
  let orientation = signedOrientation(canUnlock);
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method || 'GET';
    if (url.endsWith('/form/orientation/unlock') && method === 'POST') {
      const { reason } = JSON.parse(options.body);
      orientation = {
        formType: 'orientation',
        status: 'in_progress',
        signature: null,
        locked: false,
        canUnlock,
        unlockedBy: 'it@hope.org',
        unlockedAt: '2026-10-03T18:00:00Z',
        unlockReason: reason,
      };
      return jsonResponse(200, {
        status: 'in_progress',
        unlockedBy: orientation.unlockedBy,
        unlockedAt: orientation.unlockedAt,
        unlockReason: reason,
      });
    }
    if (url.endsWith('/form/orientation') && method === 'GET') {
      return jsonResponse(200, orientation);
    }
    return jsonResponse(404, { message: 'Form not found' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function openOrientation(user) {
  const title = await screen.findByText('Patient Orientation Information Sheet');
  const card = title.closest('.MuiCard-root');
  await user.click(within(card).getByRole('button', { name: /open form/i }));
  return screen.findByRole('dialog');
}

describe('AuthSig - signed form lock and unlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a signed form as locked with no Unlock for regular staff', async () => {
    stubBackend({ canUnlock: false });
    const user = userEvent.setup();
    renderWithProviders(<AuthSig />);

    const dialog = await openOrientation(user);
    expect(await within(dialog).findByText(/Signed and locked/)).toBeInTheDocument();
    expect(within(dialog).getByText(/IT Admin or Level 1 user to unlock/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /^unlock$/i })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /view form/i }));
    expect(within(dialog).getByRole('button', { name: /submit form/i })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /save progress/i })).toBeDisabled();

    // Edits inside the locked form are swallowed
    const [firstField] = await within(dialog).findAllByRole('textbox');
    const before = firstField.value;
    await user.click(firstField);
    await user.paste('changed');
    await user.type(firstField, 'x{Backspace}{Backspace}');
    expect(firstField.value).toBe(before);

    const [firstCheckbox] = within(dialog).getAllByRole('checkbox');
    const wasChecked = firstCheckbox.checked;
    await user.click(firstCheckbox);
    expect(firstCheckbox.checked).toBe(wasChecked);
  }, 20000);

  it('lets an IT Admin / Level 1 user unlock with a reason', async () => {
    const fetchMock = stubBackend({ canUnlock: true });
    const user = userEvent.setup();
    renderWithProviders(<AuthSig />);

    const dialog = await openOrientation(user);
    await user.click(await within(dialog).findByRole('button', { name: /^unlock$/i }));

    const unlockDialog = await screen.findByRole('dialog', { name: /unlock signed form/i });
    const confirm = within(unlockDialog).getByRole('button', { name: /unlock form/i });
    expect(confirm).toBeDisabled(); // reason required

    await user.click(within(unlockDialog).getByLabelText(/reason for unlocking/i));
    await user.paste('Client name was misspelled');
    await user.click(confirm);

    await waitFor(() => {
      const unlockCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/form/orientation/unlock'));
      expect(unlockCall).toBeDefined();
      expect(JSON.parse(unlockCall[1].body)).toEqual({ reason: 'Client name was misspelled' });
    });

    expect(await within(dialog).findByText(/Unlocked by it@hope.org/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Signed and locked/)).not.toBeInTheDocument();

    // Wait for the unlock dialog to finish closing (it hides the form dialog while open)
    await user.click(await within(dialog).findByRole('button', { name: /view form/i }));
    expect(within(dialog).getByRole('button', { name: /submit form/i })).toBeEnabled();
  }, 20000);
});
