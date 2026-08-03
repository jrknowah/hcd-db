// src/pages/admin/AdminAnalytics.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextField,
  MenuItem,
  Button,
  IconButton,
  Stack,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  ListSubheader,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminAnalytics() {
  const { instance, accounts } = useMsal();

  const [catalog, setCatalog] = useState([]);
  const [minCellSize, setMinCellSize] = useState(11);
  const [reportKey, setReportKey] = useState('');

  const [startDate, setStartDate] = useState(isoDaysAgo(365));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeader = useCallback(async () => {
    if (!accounts[0]) throw new Error('Not authenticated');
    const result = await instance.acquireTokenSilent({
      scopes: ['openid', 'profile'],
      account: accounts[0],
    });
    return { Authorization: `Bearer ${result.idToken}` };
  }, [instance, accounts]);

  const fetchCatalog = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/analytics/reports`, { headers });
      setCatalog(res.data.reports || []);
      if (res.data.minCellSize) setMinCellSize(res.data.minCellSize);
    } catch (err) {
      console.error('Failed to load report catalog:', err);
      setError(err.response?.data?.error || err.message);
    }
  }, [getAuthHeader]);

  const fetchSummary = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(`${API_BASE}/api/admin/analytics/summary`, { headers });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load analytics summary:', err);
    }
  }, [getAuthHeader]);

  const runReport = useCallback(async () => {
    if (!reportKey) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(
        `${API_BASE}/api/admin/analytics/reports/${reportKey}`,
        { headers, params: { startDate, endDate } }
      );
      setReport(res.data);
    } catch (err) {
      console.error('Report failed:', err);
      setError(err.response?.data?.error || err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportKey, startDate, endDate, getAuthHeader]);

  const handleExport = async () => {
    if (!reportKey) return;
    setExporting(true);
    try {
      const headers = await getAuthHeader();
      const res = await axios.get(
        `${API_BASE}/api/admin/analytics/reports/${reportKey}/export`,
        { headers, params: { startDate, endDate }, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportKey}-${endDate}.csv`);
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

  useEffect(() => {
    fetchCatalog();
    fetchSummary();
  }, [fetchCatalog, fetchSummary]);

  // Group catalog entries by category for the picker
  const groupedCatalog = useMemo(() => {
    const groups = {};
    catalog.forEach((r) => {
      (groups[r.category] = groups[r.category] || []).push(r);
    });
    return groups;
  }, [catalog]);

  // Derive chart shape from the report result: first string column is the
  // label axis, first numeric column is the value.
  const chart = useMemo(() => {
    if (!report?.rows?.length) return null;
    const sample = report.rows[0];
    const keys = Object.keys(sample).filter((k) => k !== '__suppressed');
    const labelKey = keys.find((k) => typeof sample[k] === 'string');
    const valueKey = keys.find((k) => typeof sample[k] === 'number' || sample[k] === null);
    if (!labelKey || !valueKey) return null;
    return { labelKey, valueKey, data: report.rows };
  }, [report]);

  const columns = report?.rows?.length
    ? Object.keys(report.rows[0]).filter((k) => k !== '__suppressed')
    : [];

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">Reports &amp; Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            Aggregate figures only. Cohorts smaller than {minCellSize} are suppressed to prevent
            re-identification.
          </Typography>
        </Box>
        <IconButton onClick={fetchSummary}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {summary && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Active clients</Typography>
                  <Typography variant="h4">{summary.summary?.activeClients ?? 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Admissions (30d)</Typography>
                  <Typography variant="h4">{summary.summary?.admissions30d ?? 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Discharges (30d)</Typography>
                  <Typography variant="h4">{summary.summary?.discharges30d ?? 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Clients served</Typography>
                  <Typography variant="h4">{summary.summary?.totalClients ?? 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {summary.admissionsTrend?.length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Admissions, last 12 months
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.admissionsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="admissions" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}
        </>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              select fullWidth size="small" label="Report"
              value={reportKey}
              onChange={(e) => { setReportKey(e.target.value); setReport(null); }}
            >
              <MenuItem value="">Select a report…</MenuItem>
              {Object.entries(groupedCatalog).flatMap(([category, items]) => [
                <ListSubheader key={`h-${category}`}>{category}</ListSubheader>,
                ...items.map((r) => (
                  <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>
                )),
              ])}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="Start date"
              InputLabelProps={{ shrink: true }}
              value={startDate} onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="End date"
              InputLabelProps={{ shrink: true }}
              value={endDate} onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={runReport}
                disabled={!reportKey || loading}
              >
                Run report
              </Button>
              <Button
                variant="outlined"
                startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={!report || exporting}
              >
                Export CSV
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && report && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">{report.label}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {report.range?.startDate} to {report.range?.endDate}
          </Typography>

          {report.suppressedCells > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {report.suppressedCells} value{report.suppressedCells === 1 ? '' : 's'} suppressed
              (cohort smaller than {report.minCellSize}).
            </Alert>
          )}

          {chart && (
            <Box sx={{ height: 300, mb: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={chart.labelKey} />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey={chart.valueKey} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}

          <Divider sx={{ mb: 1 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c}>{c}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {report.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length || 1} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        No data for this range.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {report.rows.map((row, i) => (
                  <TableRow key={i} hover>
                    {columns.map((c) => (
                      <TableCell key={c}>
                        {row[c] === null ? (
                          <Typography variant="body2" color="text.secondary">
                            &lt;{report.minCellSize}
                          </Typography>
                        ) : (
                          typeof row[c] === 'number' ? row[c].toLocaleString() : String(row[c])
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
