// src/pages/admin/AdminAudit.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useMsal } from '@azure/msal-react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  TablePagination,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const initialFilters = {
  userID: '',
  action: '',
  resourceType: '',
  resourceID: '',
  clientID: '',
  startDate: '',
  endDate: '',
  success: '',
  search: '',
};

const COLUMNS = [
  { id: 'timestamp', field: 'Timestamp', label: 'Timestamp', sortable: true },
  { id: 'userId', field: 'UserName', label: 'User', sortable: true },
  { id: 'action', field: 'Action', label: 'Action', sortable: true },
  { id: 'resourceType', field: 'ResourceType', label: 'Resource', sortable: true },
  { id: 'resourceID', field: 'ResourceID', label: 'Resource ID', sortable: false },
  { id: 'clientId', field: 'ClientID', label: 'Client ID', sortable: true },
];

function formatTimestamp(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function AdminAudit() {
  const { instance, accounts } = useMsal();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);        // MUI is 0-indexed, API is 1-indexed
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  const [stats, setStats] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    actions: [],
    resourceTypes: [],
    userIDs: [],
  });

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Prevents overlapping fetches from racing
  const fetchIdRef = useRef(0);

  const getAuthHeader = useCallback(async () => {
    if (!accounts[0]) throw new Error('Not authenticated');
    const result = await instance.acquireTokenSilent({
      scopes: ['openid', 'profile'],
      account: accounts[0],
    });
    return { Authorization: `Bearer ${result.idToken}` };
  }, [instance, accounts]);

  const buildParams = useCallback(() => {
    const params = {};
    Object.entries(appliedFilters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) params[k] = v;
    });
    return params;
  }, [appliedFilters]);

  const fetchEntries = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeader();
      const params = { ...buildParams(), page: page + 1, pageSize, sortBy, sortDir };

      const res = await axios.get(`${API_BASE}/api/admin/audit`, { headers, params });

      if (fetchId !== fetchIdRef.current) return; // stale response
      setRows(res.data.entries || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      console.error('Failed to load audit log:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, buildParams, getAuthHeader]);

  const fetchStats = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/audit/stats`, { headers });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load audit stats:', err);
    }
  }, [getAuthHeader]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/audit/filters`, { headers });
      setFilterOptions({
        actions: res.data.actions || [],
        resourceTypes: res.data.resourceTypes || [],
        userIDs: res.data.userIDs || [],
      });
    } catch (err) {
      console.error('Failed to load audit filters:', err);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(0);
  };

  const handleFilterChange = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSort = (columnId) => {
    if (sortBy === columnId) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnId);
      setSortDir('desc');
    }
    setPage(0);
  };

  const handleViewDetail = async (logID) => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/audit/${logID}`, { headers });
      setSelectedEntry(res.data);
    } catch (err) {
      console.error('Failed to load audit detail:', err);
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/audit/export`, {
        headers,
        params: buildParams(),
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">Audit Trail</Typography>
          <Typography variant="body2" color="text.secondary">
            Every action recorded in HOPE. Resource references only — no PHI values are stored
            or displayed here.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
            variant="outlined"
          >
            Export CSV
          </Button>
          <IconButton onClick={() => { fetchEntries(); fetchStats(); }} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Total entries</Typography>
                <Typography variant="h4">{stats.summary?.total ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Last 24 hours</Typography>
                <Typography variant="h4">{stats.summary?.last24h ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Distinct users</Typography>
                <Typography variant="h4">{stats.summary?.distinctUsers ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Failed actions</Typography>
                <Typography variant="h4" color="error.main">
                  {stats.summary?.failures ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select fullWidth size="small" label="Action"
              value={filters.action} onChange={handleFilterChange('action')}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.actions.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select fullWidth size="small" label="Resource type"
              value={filters.resourceType} onChange={handleFilterChange('resourceType')}
            >
              <MenuItem value="">All</MenuItem>
              {filterOptions.resourceTypes.map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" label="User ID"
              value={filters.userID} onChange={handleFilterChange('userID')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" label="Client ID"
              value={filters.clientID} onChange={handleFilterChange('clientID')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="Start date"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate} onChange={handleFilterChange('startDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="End date"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate} onChange={handleFilterChange('endDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select fullWidth size="small" label="Outcome"
              value={filters.success} onChange={handleFilterChange('success')}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Success</MenuItem>
              <MenuItem value="false">Failure</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth size="small" label="Search (user / action / resource)"
              value={filters.search} onChange={handleFilterChange('search')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleApplyFilters}>Apply</Button>
              <Button onClick={handleClearFilters}>Clear</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col.id}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.id}
                        direction={sortBy === col.id ? sortDir : 'desc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
                <TableCell>Outcome</TableCell>
                <TableCell align="right">Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              )}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No audit entries match these filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!loading && rows.map((row) => (
                <TableRow key={row.LogID} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatTimestamp(row.Timestamp)}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.UserID || ''}>
                      <span>{row.UserName || row.UserID || '—'}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.Action || '—'} />
                  </TableCell>
                  <TableCell>{row.ResourceType || '—'}</TableCell>
                  <TableCell>{row.ResourceID || '—'}</TableCell>
                  <TableCell>{row.ClientID || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.Success === false || row.Success === 0 ? 'Failed' : 'OK'}
                      color={row.Success === false || row.Success === 0 ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleViewDetail(row.LogID)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </Paper>

      <Dialog
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Audit Entry</DialogTitle>
        <DialogContent dividers>
          {selectedEntry && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Log ID</Typography>
                <Typography>{selectedEntry.LogID}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                <Typography>{formatTimestamp(selectedEntry.Timestamp)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">User</Typography>
                <Typography>{selectedEntry.UserName || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">User ID</Typography>
                <Typography>{selectedEntry.UserID || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Action</Typography>
                <Typography>{selectedEntry.Action || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Outcome</Typography>
                <Typography>
                  {selectedEntry.Success === false || selectedEntry.Success === 0
                    ? 'Failed'
                    : 'Success'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Resource type</Typography>
                <Typography>{selectedEntry.ResourceType || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Resource ID</Typography>
                <Typography>{selectedEntry.ResourceID || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Client ID</Typography>
                <Typography>{selectedEntry.ClientID || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">IP address</Typography>
                <Typography>{selectedEntry.IPAddress || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">User agent</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {selectedEntry.UserAgent || '—'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEntry(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
