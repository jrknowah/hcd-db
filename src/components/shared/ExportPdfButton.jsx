/**
 * ExportPdfButton.jsx
 * Small button that downloads a server-generated client PDF.
 *
 * Props:
 *   clientID  {string}    – client to export (required to enable the button)
 *   sections  {number[]}  – section numbers to include (e.g. [5])
 *   kind      {string}    – special document instead of sections ('med-face-sheet')
 *   label     {string}    – button text
 *   tooltip   {string}    – optional hover text
 *   ...rest               – passed to MUI Button (variant, size, sx, …)
 */

import PropTypes from 'prop-types';
import { Alert, Button, CircularProgress, Snackbar, Tooltip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import useClientPdfExport from '../../hooks/useClientPdfExport';

export default function ExportPdfButton({ clientID, sections, kind, label = 'Export PDF', tooltip, ...rest }) {
  const { exportPdf, exporting, error, clearError } = useClientPdfExport();
  const busy = exporting !== null;

  const button = (
    <span>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
        disabled={busy || !clientID}
        onClick={() => exportPdf(clientID, { sections, kind })}
        {...rest}
      >
        {busy ? 'Generating…' : label}
      </Button>
    </span>
  );

  return (
    <>
      {tooltip ? <Tooltip title={tooltip}>{button}</Tooltip> : button}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

ExportPdfButton.propTypes = {
  clientID: PropTypes.string,
  sections: PropTypes.arrayOf(PropTypes.number),
  kind: PropTypes.oneOf(['med-face-sheet']),
  label: PropTypes.string,
  tooltip: PropTypes.string,
};
