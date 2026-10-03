// src/backend/store/clientScope.js
//
// Keeps client-specific data from leaking between clients and between users.
//
// 1. withClientScopeReset(): wraps the root reducer so that
//    - whenever the selected client changes, every client-scoped slice is
//      reset to its initial state (no slice has to remember to do it), and
//    - on logout, the ENTIRE store is reset (clients list, PHI, everything).
//
// 2. clientScopeMiddleware: guards async thunks against the wrong client.
//    - A request that settles after the user has switched clients is dropped,
//      so a slow response for client A can never land on client B's screen.
//    - A request whose argument names a clientID other than the selected
//      client is refused before it runs (e.g. a save carrying a stale form).

// Slices that are NOT tied to one client and survive a client switch.
export const GLOBAL_SLICES = ['auth', 'clients'];

// Actions that wipe the whole store. (auth/clearAuth is deliberately not here:
// azureProfileService fires it on a Graph 401, which must not discard the
// open client or an unsaved form.)
export const SESSION_RESET_ACTIONS = ['auth/logout'];

const RESET_ACTION = { type: '@@clientScope/RESET' };

export const selectedClientKey = (state) => {
  const id = state?.clients?.selectedClient?.clientID;
  return id === undefined || id === null || id === '' ? null : String(id);
};

export const withClientScopeReset = (appReducer, sliceKeys) => {
  const clientScoped = sliceKeys.filter((key) => !GLOBAL_SLICES.includes(key));

  return (state, action) => {
    if (SESSION_RESET_ACTIONS.includes(action.type)) {
      // Rebuild every slice from its initial state, then let auth run the
      // logout reducer itself (which clears its persisted keys).
      return appReducer(undefined, action);
    }

    const next = appReducer(state, action);

    if (state && selectedClientKey(state) !== selectedClientKey(next)) {
      const fresh = appReducer(undefined, RESET_ACTION);
      const reset = { ...next };
      clientScoped.forEach((key) => {
        reset[key] = fresh[key];
      });
      return reset;
    }

    return next;
  };
};

// Thunks from these slices manage client selection / auth and are exempt.
const isExempt = (type) => type.startsWith('clients/') || type.startsWith('auth/');

const argClientKey = (arg) => {
  if (!arg || typeof arg !== 'object') return null;
  const id = arg.clientID ?? arg.clientId;
  return id === undefined || id === null || id === '' ? null : String(id);
};

export class ClientMismatchError extends Error {
  constructor(requested, selected) {
    super(
      `Blocked request for client ${requested} while client ${selected} is selected. ` +
      'Reload the page and try again.'
    );
    this.name = 'ClientMismatchError';
  }
}

export const createClientScopeMiddleware = () => {
  // requestId -> client that was selected when the request started
  const inFlight = new Map();

  return (store) => (next) => (action) => {
    const requestId = action?.meta?.requestId;
    const status = action?.meta?.requestStatus;

    if (!requestId || !status || typeof action.type !== 'string' || isExempt(action.type)) {
      return next(action);
    }

    const current = selectedClientKey(store.getState());

    if (status === 'pending') {
      const requested = argClientKey(action.meta.arg);
      if (requested && current && requested !== current) {
        // Thrown inside createAsyncThunk's try block: the payload creator never
        // runs and the thunk resolves as rejected with this error.
        throw new ClientMismatchError(requested, current);
      }
      inFlight.set(requestId, current);
      return next(action);
    }

    // fulfilled / rejected
    if (inFlight.has(requestId)) {
      const startedFor = inFlight.get(requestId);
      inFlight.delete(requestId);
      if (startedFor !== current) {
        // The user switched clients while this request was in flight.
        return action;
      }
    }

    return next(action);
  };
};
