// The ID token goes with every backend call, and only backend calls.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../utils/apiAuth', () => ({
  getApiAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer id-token' })),
}));

import { isBackendUrl, wrapFetch } from '../utils/installApiAuth';

describe('isBackendUrl', () => {
  it('matches API paths on our own backend', () => {
    expect(isBackendUrl('/api/getClientFace/E1')).toBe(true);
    expect(isBackendUrl('http://localhost:5000/api/clients')).toBe(true);
    expect(isBackendUrl('/api/clients', 'http://localhost:5000')).toBe(true);
  });

  it('never matches other hosts or non-API paths', () => {
    expect(isBackendUrl('https://graph.microsoft.com/v1.0/me')).toBe(false);
    expect(isBackendUrl('https://acct.blob.core.windows.net/api/x')).toBe(false);
    expect(isBackendUrl('/assets/logo.svg')).toBe(false);
    expect(isBackendUrl(undefined)).toBe(false);
  });
});

describe('wrapFetch', () => {
  const sent = (spy) => new Headers(spy.mock.calls[0][1]?.headers);

  it('adds the token to backend calls', async () => {
    const spy = vi.fn(async () => new Response('{}'));
    await wrapFetch(spy)('/api/getClientFace/E1', { headers: { 'Content-Type': 'application/json' } });
    expect(sent(spy).get('Authorization')).toBe('Bearer id-token');
    expect(sent(spy).get('Content-Type')).toBe('application/json');
  });

  it('keeps a header the caller set', async () => {
    const spy = vi.fn(async () => new Response('{}'));
    await wrapFetch(spy)('/api/clients', { headers: { Authorization: 'Bearer mine' } });
    expect(sent(spy).get('Authorization')).toBe('Bearer mine');
  });

  it('leaves other hosts untouched', async () => {
    const spy = vi.fn(async () => new Response('{}'));
    const init = { headers: { Authorization: 'Bearer graph' } };
    await wrapFetch(spy)('https://graph.microsoft.com/v1.0/me', init);
    expect(spy).toHaveBeenCalledWith('https://graph.microsoft.com/v1.0/me', init);
  });
});
