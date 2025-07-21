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
  LinearProgress
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

// Mock data for demonstration
const mockClients = [
  {
    clientID: 'CLI001',
    clientFirstName: 'John',
    clientLastName: 'Doe',
    clientDOB: '1980-05-15',
    clientSite: '104th',
    clientGender: 'Male',
    clientVetStatus: 'Protected Veteran',
    clientAdmitDate: '2025-01-15',
    status: 'active',
    formsCompleted: 8,
    totalForms: 12,
    lastActivity: '2025-01-20T10:30:00Z',
    caseworker: 'Sarah Johnson',
    priority: 'high'
  },
  {
    clientID: 'CLI002',
    clientFirstName: 'Jane',
    clientLastName: 'Smith',
    clientDOB: '1975-08-22',
    clientSite: 'Heritage House',
    clientGender: 'Female',
    clientVetStatus: 'I am not a veteran',
    clientAdmitDate: '2025-01-10',
    status: 'active',
    formsCompleted: 12,
    totalForms: 12,
    lastActivity: '2025-01-19T14:15:00Z',
    caseworker: 'Michael Chen',
    priority: 'medium'
  },
  {
    clientID: 'CLI003',
    clientFirstName: 'Robert',
    clientLastName: 'Johnson',
    clientDOB: '1965-12-03',
    clientSite: 'Northridge',
    clientGender: 'Male',
    clientVetStatus: 'Protected Veteran',
    clientAdmitDate: '2024-12-20',
    status: 'inactive',
    formsCompleted: 5,
    totalForms: 12,
    lastActivity: '2025-01-18T09:00:00Z',
    caseworker: 'Sarah Johnson',
    priority: 'low'
  }
];

// Table column definitions
const headCells = [
  { id: 'avatar', numeric: false, disablePadding: true, label: '' },
  { id: 'clientName', numeric: false, disablePadding: false, label: 'Client Name' },
  { id: 'clientID', numeric: false, disablePadding: false, label: 'ID' },
  { id: 'clientSite', numeric: false, disablePadding: false, label: 'Site' },
  { id: 'status', numeric: false, disablePadding: false, label: 'Status' },
  { id: 'formsProgress', numeric: false, disablePadding: false, label: 'Forms Progress' },
  { id: 'lastActivity', numeric: false, disablePadding: false, label: 'Last Activity' },
  { id: 'caseworker', numeric: false, disablePadding: false, label: 'Caseworker' },
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

// Client row action menu component
function ClientActionMenu({ client, onEdit, onView, onViewForms }) {
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
    onEdit(client.clientID);
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

// Client card component for mobile/grid view
function ClientCard({ client, isSelected, onSelect, onView, onEdit, onViewForms }) {
  const completionPercentage = Math.round((client.formsCompleted / client.totalForms) * 100);
  const avatarInitials = `${client.clientFirstName.charAt(0)}${client.clientLastName.charAt(0)}`;

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
          
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: client.status === 'active' ? 'success.main' : 'grey.500',
                  border: '2px solid white'
                }}
              />
            }
          >
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              {avatarInitials}
            </Avatar>
          </Badge>
          
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
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Forms Progress
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {client.formsCompleted}/{client.totalForms}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionPercentage} 
            sx={{ height: 6, borderRadius: 3 }}
            color={completionPercentage === 100 ? 'success' : 'primary'}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip 
            label={client.status}
            size="small"
            color={client.status === 'active' ? 'success' : 'default'}
            variant="outlined"
          />
          {client.clientVetStatus.includes('veteran') && (
            <Chip 
              label="Veteran"
              size="small"
              color="info"
              variant="outlined"
            />
          )}
          <Chip 
            label={client.priority}
            size="small"
            color={
              client.priority === 'high' ? 'error' : 
              client.priority === 'medium' ? 'warning' : 'default'
            }
            variant="outlined"
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          Last activity: {new Date(client.lastActivity).toLocaleDateString()}
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

const ClientTable = ({ 
  clients = mockClients, 
  onSelectClient, 
  selectedClientID, 
  viewMode = 'table',
  loading = false 
}) => {
  // State management
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('clientName');
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [favorites, setFavorites] = useState(new Set());

  // Sorting comparator
  const descendingComparator = (a, b, orderBy) => {
    let aVal, bVal;
    
    switch (orderBy) {
      case 'clientName':
        aVal = `${a.clientFirstName} ${a.clientLastName}`;
        bVal = `${b.clientFirstName} ${b.clientLastName}`;
        break;
      case 'formsProgress':
        aVal = a.formsCompleted / a.totalForms;
        bVal = b.formsCompleted / b.totalForms;
        break;
      case 'lastActivity':
        aVal = new Date(a.lastActivity);
        bVal = new Date(b.lastActivity);
        break;
      default:
        aVal = a[orderBy];
        bVal = b[orderBy];
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
  };

  const handleViewForms = (clientID) => {
    console.log('View forms for client:', clientID);
  };

  const toggleFavorite = (clientID) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(clientID)) {
      newFavorites.delete(clientID);
    } else {
      newFavorites.add(clientID);
    }
    setFavorites(newFavorites);
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
                const completionPercentage = Math.round((client.formsCompleted / client.totalForms) * 100);
                const avatarInitials = `${client.clientFirstName.charAt(0)}${client.clientLastName.charAt(0)}`;

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
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: client.status === 'active' ? 'success.main' : 'grey.500',
                              border: '2px solid white'
                            }}
                          />
                        }
                      >
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {avatarInitials}
                          </Typography>
                        </Avatar>
                      </Badge>
                    </TableCell>

                    <TableCell component="th" id={labelId} scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {client.clientFirstName} {client.clientLastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {client.clientGender} • Born {new Date(client.clientDOB).getFullYear()}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(client.clientID);
                          }}
                          sx={{ ml: 1 }}
                        >
                          {favorites.has(client.clientID) ? 
                            <StarIcon sx={{ color: 'warning.main' }} fontSize="small" /> :
                            <StarBorderIcon fontSize="small" />
                          }
                        </IconButton>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {client.clientID}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip 
                        label={client.clientSite}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Chip 
                          label={client.status}
                          size="small"
                          color={client.status === 'active' ? 'success' : 'default'}
                        />
                        {client.clientVetStatus.includes('veteran') && (
                          <Chip 
                            label="VET"
                            size="small"
                            color="info"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 60 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={completionPercentage} 
                            color={completionPercentage === 100 ? 'success' : 'primary'}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ minWidth: 45 }}>
                          {client.formsCompleted}/{client.totalForms}
                        </Typography>
                        {completionPercentage === 100 && (
                          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {new Date(client.lastActivity).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(client.lastActivity).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {client.caseworker}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <ClientActionMenu
                        client={client}
                        onEdit={handleEdit}
                        onView={handleRowClick}
                        onViewForms={handleViewForms}
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

      {/* Selection toolbar */}
      {selected.length > 0 && (
        <Paper 
          elevation={4}
          sx={{ 
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 2,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="body2">
            {selected.length} client{selected.length > 1 ? 's' : ''} selected
          </Typography>
          <Button size="small" variant="outlined">
            Export
          </Button>
          <Button size="small" variant="outlined">
            Bulk Edit
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            color="error"
            onClick={() => setSelected([])}
          >
            Clear
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default ClientTable;