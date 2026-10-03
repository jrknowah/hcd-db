import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import clients from '../backend/store/slices/clientSlice';
import ClientRouteGate from '../components/ClientRouteGate';

// setup.js mocks useParams/useNavigate globally; this test needs the real router.
vi.unmock('react-router-dom');

// A form with local state, to prove it does not survive a client switch.
const Form = () => {
  const [value, setValue] = useState('');
  return <input aria-label="note" value={value} onChange={(e) => setValue(e.target.value)} />;
};

let navigate;
const NavGrab = () => {
  navigate = useNavigate();
  return null;
};

const renderAt = (path) => {
  const store = configureStore({
    reducer: combineReducers({ clients }),
    preloadedState: {
      clients: {
        clients: [{ clientID: 'A' }, { clientID: 'B' }],
        selectedClient: { clientID: 'A' },
        loading: false,
        error: null,
      },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <NavGrab />
        <Routes>
          <Route path="/Section1/:clientID" element={<ClientRouteGate><Form /></ClientRouteGate>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
};

describe('ClientRouteGate', () => {
  it('selects the URL client before rendering and remounts the form on switch', async () => {
    const store = renderAt('/Section1/A');
    fireEvent.change(screen.getByLabelText('note'), { target: { value: 'A only' } });
    expect(screen.getByLabelText('note').value).toBe('A only');

    await act(async () => {
      navigate('/Section1/B');
    });

    expect(store.getState().clients.selectedClient.clientID).toBe('B');
    expect(screen.getByLabelText('note').value).toBe('');
  });
});
