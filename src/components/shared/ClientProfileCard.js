// src/components/dashboard/ClientProfileCard.js
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { useSelector } from 'react-redux';

const ClientProfileCard = ({ clientID }) => {
  const clients = useSelector((state) => state.clients.data);
  const client = clients.find((c) => c.clientID === clientID);

  if (!client) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">{client.clientFirstName} {client.clientLastName}</Typography>
        <Typography variant="body2">Client ID: {client.clientID}</Typography>
        <Typography variant="body2">Email: {client.clientEmail}</Typography>
        <Typography variant="body2">Phone: {client.clientContactNum}</Typography>
      </CardContent>
    </Card>
  );
};

export default ClientProfileCard;
