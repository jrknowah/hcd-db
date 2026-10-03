// Tests for store/clientScope.js: client-switch reset, logout reset, and the
// guard that drops late / mismatched async results.
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, combineReducers, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  withClientScopeReset,
  createClientScopeMiddleware,
  ClientMismatchError,
} from '../backend/store/clientScope';

const clients = createSlice({
  name: 'clients',
  initialState: { clients: [{ clientID: 'A' }, { clientID: 'B' }], selectedClient: null },
  reducers: {
    setSelectedClient: (state, action) => {
      state.selectedClient = action.payload;
    },
  },
});

const auth = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.user = null;
    },
  },
});

let resolvers;
const fetchNotes = createAsyncThunk('notes/fetch', (clientID) =>
  new Promise((resolve) => {
    resolvers[clientID] = () => resolve([`${clientID}-note`]);
  })
);
const saveNote = createAsyncThunk('notes/save', async ({ clientID, text }) => ({ clientID, text }));

const notes = createSlice({
  name: 'notes',
  initialState: { items: [], saved: null },
  reducers: {
    add: (state, action) => {
      state.items.push(action.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotes.fulfilled, (state, action) => {
      state.items = action.payload;
    });
    b.addCase(saveNote.fulfilled, (state, action) => {
      state.saved = action.payload;
    });
  },
});

const makeStore = () => {
  const reducers = { clients: clients.reducer, auth: auth.reducer, notes: notes.reducer };
  return configureStore({
    reducer: withClientScopeReset(combineReducers(reducers), Object.keys(reducers)),
    middleware: (gdm) => gdm().concat(createClientScopeMiddleware()),
  });
};

const select = (store, id) => store.dispatch(clients.actions.setSelectedClient({ clientID: id }));

describe('clientScope', () => {
  let store;
  beforeEach(() => {
    resolvers = {};
    store = makeStore();
  });

  it('resets client-scoped slices when the selected client changes', () => {
    select(store, 'A');
    store.dispatch(notes.actions.add('A private note'));
    expect(store.getState().notes.items).toEqual(['A private note']);

    select(store, 'B');
    expect(store.getState().notes.items).toEqual([]);
    expect(store.getState().clients.selectedClient.clientID).toBe('B');
    expect(store.getState().clients.clients).toHaveLength(2);
  });

  it('does not reset when the same client is re-selected (e.g. after an update)', () => {
    select(store, 'A');
    store.dispatch(notes.actions.add('kept'));
    store.dispatch(clients.actions.setSelectedClient({ clientID: 'A', name: 'updated' }));
    expect(store.getState().notes.items).toEqual(['kept']);
  });

  it('treats numeric and string ids as the same client', () => {
    select(store, 7);
    store.dispatch(notes.actions.add('kept'));
    select(store, '7');
    expect(store.getState().notes.items).toEqual(['kept']);
  });

  it('wipes the entire store on logout, including the client list', () => {
    store.dispatch(auth.actions.login({ name: 'nurse' }));
    select(store, 'A');
    store.dispatch(notes.actions.add('A private note'));

    store.dispatch(auth.actions.logout());
    const state = store.getState();
    expect(state.auth.user).toBeNull();
    expect(state.clients.selectedClient).toBeNull();
    expect(state.notes.items).toEqual([]);
  });

  it('drops a response that arrives after the user switched clients', async () => {
    select(store, 'A');
    const pending = store.dispatch(fetchNotes('A'));
    select(store, 'B');
    resolvers.A();
    await pending;
    expect(store.getState().notes.items).toEqual([]);
  });

  it('keeps a response for the client that is still selected', async () => {
    select(store, 'A');
    const pending = store.dispatch(fetchNotes('A'));
    resolvers.A();
    await pending;
    expect(store.getState().notes.items).toEqual(['A-note']);
  });

  it('refuses a request that names a different client than the selected one', async () => {
    select(store, 'B');
    const result = await store.dispatch(saveNote({ clientID: 'A', text: 'stale form' }));
    expect(result.meta.requestStatus).toBe('rejected');
    expect(result.error.name).toBe(new ClientMismatchError('A', 'B').name);
    expect(store.getState().notes.saved).toBeNull();
  });

  it('allows a request for the selected client', async () => {
    select(store, 'B');
    const result = await store.dispatch(saveNote({ clientID: 'B', text: 'ok' }));
    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(store.getState().notes.saved).toEqual({ clientID: 'B', text: 'ok' });
  });
});
