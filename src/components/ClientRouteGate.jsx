// src/components/ClientRouteGate.jsx
//
// Wraps every /SectionN/:clientID route.
//
// - The URL is the source of truth for which client is open. If Redux holds a
//   different client (back/forward, pasted link, switching from the dashboard),
//   the gate selects the URL's client first and shows a loader meanwhile, so no
//   section component ever renders or fetches with the previous client.
// - Children are keyed by clientID, so every form remounts with blank local
//   state when the client changes.
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { fetchClientById, setSelectedClient } from '../backend/store/slices/clientSlice';

const sameId = (a, b) => a !== undefined && a !== null && String(a) === String(b);

const ClientRouteGate = ({ children }) => {
  const { clientID: urlClientID } = useParams();
  const dispatch = useDispatch();
  const selectedClient = useSelector((state) => state.clients?.selectedClient);
  const clients = useSelector((state) => state.clients?.clients);
  const [loadError, setLoadError] = useState(null);

  const hasUrlClient = Boolean(urlClientID) && urlClientID !== 'undefined';
  const inSync = !hasUrlClient || sameId(selectedClient?.clientID, urlClientID);

  useEffect(() => {
    if (inSync) return undefined;

    setLoadError(null);
    const fromList = Array.isArray(clients)
      ? clients.find((c) => sameId(c.clientID, urlClientID))
      : null;

    if (fromList) {
      dispatch(setSelectedClient(fromList));
      return undefined;
    }

    let cancelled = false;
    dispatch(fetchClientById(urlClientID))
      .unwrap()
      .catch((err) => {
        if (!cancelled) setLoadError(typeof err === 'string' ? err : 'Client could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
    // `clients` is intentionally omitted: a list refresh must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inSync, urlClientID, dispatch]);

  if (loadError) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={Link} to="/dashboard" variant="contained">
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!inSync) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, py: 6 }}>
        <CircularProgress />
        <Typography>Loading client...</Typography>
      </Box>
    );
  }

  return <React.Fragment key={hasUrlClient ? String(urlClientID) : 'no-client'}>{children}</React.Fragment>;
};

ClientRouteGate.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ClientRouteGate;
