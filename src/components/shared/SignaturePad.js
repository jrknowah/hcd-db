import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button, Box } from '@mui/material';

const SignaturePad = ({ onSave }) => {
  const sigPad = useRef();

  const handleClear = () => sigPad.current.clear();
  const handleSave = () => {
    const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <Box>
      <SignatureCanvas ref={sigPad} penColor="black" canvasProps={{ width: 400, height: 150, className: 'sigCanvas' }} />
      <Button onClick={handleSave}>Save Signature</Button>
      <Button onClick={handleClear}>Clear</Button>
    </Box>
  );
};

export default SignaturePad;
