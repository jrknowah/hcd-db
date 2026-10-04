import React from 'react';
import { Box, Typography, alpha } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { useClientPersistence } from '../../hooks/useClientPersistence';
import ExportPdfButton from './ExportPdfButton';

/**
 * Shows the current client's name and ID. Rendered directly under each
 * section's tab bar so it stays visible no matter which tab is open.
 *
 * Pass `exportSection` (1–6) to show an "Export Section N PDF" button that
 * downloads just that section of the client's record.
 */
const ClientInfoBanner = ({ sx, exportSection }) => {
  const { clientID, client } = useClientPersistence();

  const fullName = [client?.clientFirstName, client?.clientLastName]
    .filter(Boolean)
    .join(' ') || 'Unknown Client';
  const id = client?.clientID || clientID || 'N/A';

  return (
    <Box
      data-testid="client-info-banner"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 3 },
        px: 2,
        py: 1.5,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        border: 1,
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon color="primary" />
        <Typography variant="subtitle1" component="span">
          Client: <strong>{fullName}</strong>
        </Typography>
      </Box>
      <Typography variant="subtitle1" component="span">
        Client ID: <strong>{id}</strong>
      </Typography>
      {exportSection && (
        <Box sx={{ ml: { sm: 'auto' } }}>
          <ExportPdfButton
            clientID={client?.clientID || clientID}
            sections={[exportSection]}
            label={`Export Section ${exportSection} PDF`}
            tooltip={`Download Section ${exportSection} of this client's record as a PDF`}
          />
        </Box>
      )}
    </Box>
  );
};

export default ClientInfoBanner;
