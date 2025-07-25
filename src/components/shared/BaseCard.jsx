// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext } from 'react';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { Card, CardHeader, CardContent, Divider } from '@mui/material';

const BaseCard = ({ title, children }) => {
  const { isCardShadow } = useContext(CustomizerContext);


  return (
    <Card
      sx={{ padding: 0 }}
      elevation={isCardShadow ? 9 : 0}
      variant={!isCardShadow ? 'outlined' : undefined}
    >
      <CardHeader title={title} />
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default BaseCard;
