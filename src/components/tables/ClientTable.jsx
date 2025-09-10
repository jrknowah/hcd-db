import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Chip,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Badge,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  ContactPage as ContactPageIcon, // ✅ Add this import for View Chart
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

// Table column definitions
const headCells = [
  { id: 'avatar', numeric: false, disablePadding: true, label: '' },
  { id: 'clientName', numeric: false, disablePadding: false, label: 'Client Name' },
  { id: 'clientID', numeric: false, disablePadding: false, label: 'ID' },
  { id: 'clientSite', numeric: false, disablePadding: false, label: 'Site' },
  { id: 'clientGender', numeric: false, disablePadding: false, label: 'Gender' },
  { id: 'clientDOB', numeric: false, disablePadding: false, label: 'Date of Birth' },
  { id: 'createdAt', numeric: false, disablePadding: false, label: 'Created' },
  { id: 'actions', numeric: false, disablePadding: false, label: 'Actions' }
];

// Enhanced table head component
function EnhancedTableHead({ 
  onSelectAllClick, 
  order, 
  orderBy, 
  numSelected, 
  rowCount, 
  onRequestSort 
}) {
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'select all clients' }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {headCell.id !== 'avatar' && headCell.id !== 'actions' ? (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// ✅ FIXED: Client row action menu component with View Chart
function ClientActionMenu({ client, onEdit, onView, onViewForms, onViewChart }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(client.clientID);
    }
    handleClose();
  };

  const handleView = () => {
    onView(client.clientID);
    handleClose();
  };

  const handleViewForms = () => {
    onViewForms(client.clientID);
    handleClose();
  };

  // ✅ NEW: View Chart handler
  const handleViewChart = () => {
    console.log('🔄 ClientActionMenu handleViewChart called for client:', client.clientID);
    if (onViewChart) {
      console.log('🔄 Calling onViewChart with:', client.clientID);
      onViewChart(client.clientID);
    } else {
      console.warn('❌ onViewChart not provided to ClientActionMenu');
    }
    handleClose();
  };

  return (
    <>
      <IconButton onClick={handleClick} size="small">
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ✅ NEW: View Chart option - first item for visibility */}
        <MenuItem onClick={handleViewChart}>
          <ListItemIcon>
            <ContactPageIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Chart</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Profile</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Client</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleViewForms}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Forms</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <PrintIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Print Profile</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send Email</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

// ✅ FIXED: Client card component with View Chart button
function ClientCard({ client, isSelected, onSelect, onView, onEdit, onViewForms, onViewChart }) {
  const avatarInitials = `${client.clientFirstName?.charAt(0) || ''}${client.clientLastName?.charAt(0) || ''}`;

  return (
    <Card 
      elevation={isSelected ? 4 : 1}
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: isSelected ? '2px solid primary.main' : '2px solid transparent',
        '&:hover': {
          elevation: 3,
          transform: 'translateY(-2px)'
        }
      }}
      onClick={() => onView(client.clientID)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(client.clientID);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            {avatarInitials}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {client.clientFirstName} {client.clientLastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ID: {client.clientID} • {client.clientSite}
            </Typography>
          </Box>
          
          <ClientActionMenu
            client={client}
            onEdit={onEdit}
            onView={onView}
            onViewForms={onViewForms}
            onViewChart={onViewChart} // ✅ Pass View Chart handler
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            label={client.clientGender || 'Not specified'}
            size="small"
            variant="outlined"
          />
          {client.clientVetStatus?.includes('veteran') && (
            <Chip 
              label="Veteran"
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary">
          Created: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
        </Typography>
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        <Button 
          size="small" 
          startIcon={<VisibilityIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onView(client.clientID);
          }}
        >
          View
        </Button>
        
        {/* ✅ NEW: View Chart button */}
        <Button 
          size="small" 
          startIcon={<ContactPageIcon />}
          onClick={(e) => {
            e.stopPropagation();
            if (onViewChart) onViewChart(client.clientID);
          }}
          variant="contained"
          color="primary"
        >
          Chart
        </Button>
        
        <Button 
          size="small" 
          startIcon={<AssignmentIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onViewForms(client.clientID);
          }}
        >
          Forms
        </Button>
      </CardActions>
    </Card>
  );
}

// ✅ FIXED: Main component with onViewChart prop
const ClientTable = ({ 
  clients = [], 
  onSelectClient, 
  selectedClientID, 
  viewMode = 'table',
  loading = false,
  onEditClient,  // Edit functionality
  onViewForms,   // View forms functionality
  onViewChart    // ✅ NEW: View Chart functionality
}) => {
  // State management
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('clientName');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting comparator
  const descendingComparator = (a, b, orderBy) => {
    let aVal, bVal;
    
    switch (orderBy) {
      case 'clientName':
        aVal = `${a.clientFirstName || ''} ${a.clientLastName || ''}`;
        bVal = `${b.clientFirstName || ''} ${b.clientLastName || ''}`;
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt || 0);
        bVal = new Date(b.createdAt || 0);
        break;
      case 'clientDOB':
        aVal = new Date(a.clientDOB || 0);
        bVal = new Date(b.clientDOB || 0);
        break;
      default:
        aVal = a[orderBy] || '';
        bVal = b[orderBy] || '';
    }

    if (bVal < aVal) return -1;
    if (bVal > aVal) return 1;
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  // Stable sort
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  // Event handlers
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = clients.map((client) => client.clientID);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = (clientID) => {
    const selectedIndex = selected.indexOf(clientID);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, clientID);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (clientID) => {
    onSelectClient(clientID);
  };

  const handleEdit = (clientID) => {
    console.log('Edit client:', clientID);
    if (onEditClient) {
      onEditClient(clientID);
    }
  };

  const handleViewForms = (clientID) => {
    console.log('View forms for client:', clientID);
    if (onViewForms) {
      onViewForms(clientID);
    }
  };

  // ✅ NEW: View Chart handler
  const handleViewChart = (clientID) => {
    console.log('🔄 ClientTable handleViewChart called with:', clientID);
    console.log('🔄 onViewChart function exists:', typeof onViewChart);
    if (onViewChart) {
      console.log('🔄 Calling onViewChart with:', clientID);
      onViewChart(clientID);
    } else {
      console.warn('❌ onViewChart prop not provided to ClientTable');
    }
  };

  const isSelected = (clientID) => selected.indexOf(clientID) !== -1;
  const isClientSelected = (clientID) => selectedClientID === clientID;

  // Memoized sorted and paginated data
  const visibleRows = useMemo(() => {
    const sorted = stableSort(clients, getComparator(order, orderBy));
    return viewMode === 'table' 
      ? sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      : sorted;
  }, [clients, order, orderBy, page, rowsPerPage, viewMode]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading clients...</Typography>
      </Box>
    );
  }

  // Empty state
  if (!clients || clients.length === 0) {
    return (
      <Alert severity="info" sx={{ textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          No clients found
        </Typography>
        <Typography variant="body2">
          Try adjusting your search criteria or add a new client.
        </Typography>
      </Alert>
    );
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <Grid container spacing={2}>
        {visibleRows.map((client) => (
          <Grid item xs={12} sm={6} md={4} key={client.clientID}>
            <ClientCard
              client={client}
              isSelected={isSelected(client.clientID)}
              onSelect={handleSelect}
              onView={handleRowClick}
              onEdit={handleEdit}
              onViewForms={handleViewForms}
              onViewChart={handleViewChart} // ✅ Pass View Chart handler
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Table view
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={clients.length}
            />
            <TableBody>
              {visibleRows.map((client, index) => {
                const isItemSelected = isSelected(client.clientID);
                const isRowSelected = isClientSelected(client.clientID);
                const labelId = `enhanced-table-checkbox-${index}`;
                const avatarInitials = `${client.clientFirstName?.charAt(0) || ''}${client.clientLastName?.charAt(0) || ''}`;

                return (
                  <TableRow
                    hover
                    onClick={() => handleRowClick(client.clientID)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={client.clientID}
                    selected={isRowSelected}
                    sx={{ 
                      cursor: 'pointer',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.50'
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onChange={() => handleSelect(client.clientID)}
                        onClick={(e) => e.stopPropagation()}
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </TableCell>
                    
                    <TableCell padding="none">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {avatarInitials}
                        </Typography>
                      </Avatar>
                    </TableCell>

                    <TableCell component="th" id={labelId} scope="row">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {client.clientFirstName} {client.clientLastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.clientGender} • Born {client.clientDOB ? new Date(client.clientDOB).getFullYear() : 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {client.clientID}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip 
                        label={client.clientSite || 'Not assigned'}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {client.clientGender || 'Not specified'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {client.clientDOB ? new Date(client.clientDOB).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <ClientActionMenu
                        client={client}
                        onEdit={handleEdit}
                        onView={handleRowClick}
                        onViewForms={handleViewForms}
                        onViewChart={handleViewChart} // ✅ Pass View Chart handler
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {viewMode === 'table' && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={clients.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ClientTable;