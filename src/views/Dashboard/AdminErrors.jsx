// src/pages/admin/AdminErrors.jsx
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
  CheckCircle as CheckCircleIcon,
  Replay as ReplayIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const SEVERITY_COLORS = {
  error: 'error',
  warn: 'warning',
  warning: 'warning',
  info: 'info',
  debug: 'default',
};

const initialFilters = {
  severity: '',
  source: '',
  route: '',
  userID: '',
  clientID: '',
  startDate: '',
  endDate: '',
  resolved: '',
  search: '',
};

export default function AdminErrors() {
  const { instance, accounts } = useMsal();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);         // MUI uses 0-indexed, API uses 1-indexed
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(null);

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [selectedError, setSelectedError] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

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

  const fetchErrors = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeader();

      // Strip empty strings before sending
      const params = { page: page + 1, pageSize };
      Object.entries(appliedFilters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) params[k] = v;
      });

      const res = await axios.get(`${API_BASE}/api/admin/errors`, {
        headers,
        params,
      });

      if (fetchId !== fetchIdRef.current) return; // stale response
      setRows(res.data.errors || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      console.error('Failed to load errors:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [page, pageSize, appliedFilters, getAuthHeader]);

  const fetchStats = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/errors/stats`, { headers });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const handleViewDetail = async (errorID) => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/errors/${errorID}`, { headers });
      setSelectedError(res.data);
      setResolveNotes(res.data.Notes || '');
    } catch (err) {
      console.error('Failed to load detail:', err);
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;
    setResolveSubmitting(true);
    try {
      const headers = await getAuthHeader();
      await axios.patch(
        `${API_BASE}/api/admin/errors/${selectedError.ErrorID}/resolve`,
        { notes: resolveNotes },
        { headers }
      );
      setSelectedError(null);
      setResolveNotes('');
      await Promise.all([fetchErrors(), fetchStats()]);
    } catch (err) {
      console.error('Resolve failed:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setResolveSubmitting(false);
    }
  };

  const handleReopen = async (errorID) => {
    try {
      const headers = await getAuthHeader();
      await axios.patch(`${API_BASE}/api/admin/errors/${errorID}/reopen`, {}, { headers });
      await Promise.all([fetchErrors(), fetchStats()]);
      if (selectedError?.ErrorID === errorID) setSelectedError(null);
    } catch (err) {
      console.error('Reopen failed:', err);
      setError(err.response?.data?.error || err.message);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">System Errors</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchErrors();
            fetchStats();
          }}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {/* Stats cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Total</Typography>
                <Typography variant="h4">{stats.summary?.total ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Unresolved</Typography>
                <Typography variant="h4" color="error.main">
                  {stats.summary?.unresolved ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Last 24 hours</Typography>
                <Typography variant="h4">{stats.summary?.last24h ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="body2">Unresolved errors</Typography>
                <Typography variant="h4" color="error.main">
                  {stats.summary?.unresolvedErrors ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <FilterListIcon fontSize="small" />
          <Typography variant="subtitle2">Filters</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Severity"
              value={filters.severity}
              onChange={handleFilterChange('severity')}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="warn">Warning</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Resolved"
              value={filters.resolved}
              onChange={handleFilterChange('resolved')}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="false">Unresolved</MenuItem>
              <MenuItem value="true">Resolved</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Source"
              value={filters.source}
              onChange={handleFilterChange('source')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Route contains"
              value={filters.route}
              onChange={handleFilterChange('route')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Message contains"
              value={filters.search}
              onChange={handleFilterChange('search')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="User ID"
              value={filters.userID}
              onChange={handleFilterChange('userID')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Client ID"
              value={filters.clientID}
              onChange={handleFilterChange('clientID')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="Start date"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={handleFilterChange('startDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="datetime-local"
              label="End date"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={handleFilterChange('endDate')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleApplyFilters}>Apply</Button>
              <Button onClick={handleClearFilters}>Clear</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No errors match the current filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.map((row) => (
                <TableRow key={row.ErrorID} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTimestamp(row.Timestamp)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.Severity || 'unknown'}
                      color={SEVERITY_COLORS[row.Severity?.toLowerCase()] || 'default'}
                    />
                  </TableCell>
                  <TableCell>{row.Source || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {row.Method ? `${row.Method} ` : ''}{row.Route || '—'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Tooltip title={row.Message || ''}>
                      <Typography noWrap variant="body2">{row.Message}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.UserID || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.ClientID || '—'}</TableCell>
                  <TableCell>
                    {row.Resolved ? (
                      <Chip size="small" label="Resolved" color="success" variant="outlined" />
                    ) : (
                      <Chip size="small" label="Open" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View detail">
                      <IconButton size="small" onClick={() => handleViewDetail(row.ErrorID)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {row.Resolved ? (
                      <Tooltip title="Reopen">
                        <IconButton size="small" onClick={() => handleReopen(row.ErrorID)}>
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Mark resolved">
                        <IconButton size="small" onClick={() => handleViewDetail(row.ErrorID)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </Paper>

      {/* Detail dialog */}
      <Dialog
        open={Boolean(selectedError)}
        onClose={() => setSelectedError(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedError && (
          <>
            <DialogTitle>
              Error #{selectedError.ErrorID}
              {' · '}
              <Chip
                size="small"
                label={selectedError.Severity}
                color={SEVERITY_COLORS[selectedError.Severity?.toLowerCase()] || 'default'}
                sx={{ ml: 1 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Timestamp</Typography>
                  <Typography variant="body2">{formatTimestamp(selectedError.Timestamp)}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Source</Typography>
                  <Typography variant="body2">{selectedError.Source || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Error code</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedError.ErrorCode || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Method</Typography>
                  <Typography variant="body2">{selectedError.Method || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="text.secondary">Route</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedError.Route || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">User ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedError.UserID || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Client ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedError.ClientID || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Message</Typography>
                  <Typography variant="body2">{selectedError.Message}</Typography>
                </Grid>
                {selectedError.StackTrace && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Stack trace</Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mt: 0.5,
                        bgcolor: 'grey.50',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        maxHeight: 320,
                        overflow: 'auto',
                      }}
                    >
                      {selectedError.StackTrace}
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Resolution notes"
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    disabled={selectedError.Resolved}
                  />
                </Grid>
                {selectedError.Resolved && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      Resolved by {selectedError.ResolvedBy || 'unknown'} on{' '}
                      {formatTimestamp(selectedError.ResolvedAt)}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedError(null)}>Close</Button>
              {selectedError.Resolved ? (
                <Button
                  color="warning"
                  startIcon={<ReplayIcon />}
                  onClick={() => handleReopen(selectedError.ErrorID)}
                >
                  Reopen
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleResolve}
                  disabled={resolveSubmitting}
                >
                  {resolveSubmitting ? 'Resolving…' : 'Mark resolved'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}