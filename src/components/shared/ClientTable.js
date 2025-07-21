// src/components/dashboard/ClientTable.js
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button
} from '@mui/material';
import { useSelector } from 'react-redux';

const ClientTable = ({ onSelectClient }) => {
  const clients = useSelector((state) => state.clients.data);

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Client Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.clientID}>
              <TableCell>{client.clientFirstName} {client.clientLastName}</TableCell>
              <TableCell>{client.clientEmail}</TableCell>
              <TableCell>{client.clientContactNum}</TableCell>
              <TableCell>
                <Button variant="outlined" size="small" onClick={() => onSelectClient(client.clientID)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ClientTable;
