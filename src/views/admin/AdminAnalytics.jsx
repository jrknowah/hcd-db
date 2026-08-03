// src/views/admin/AdminAnalytics.jsx
//
// No charting library. The trend line is a native <svg><polyline>, and the
// report chart is MUI Boxes sized by percentage. Nothing to install.

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
  Tooltip,
  CircularProgress,
  Alert,
  ListSubheader,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// TrendLine — native SVG line chart. viewBox + preserveAspectRatio="none" lets
// it stretch to any container width without a resize observer.
// ---------------------------------------------------------------------------
function TrendLine({ data, xKey, yKey, height = 220 }) {
  const theme = useTheme();

  const geometry = useMemo(() => {
    if (!data?.length) return null;

    const values = data.map((d) => Number(d[yKey]) || 0);
    const max = Math.max(...values, 1);
    const W = 1000;
    const H = 300;
    const padY = 20;

    const step = data.length > 1 ? W / (data.length - 1) : 0;
    const points = values.map((v, i) => {
      const x = data.length > 1 ? i * step : W / 2;
      const y = H - padY - (v / max) * (H - padY * 2);
      return { x, y, v, label: data[i][xKey] };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    // Close the shape along the baseline for the fill underneath.
    const area = `${points[0].x},${H} ${polyline} ${points[points.length - 1].x},${H}`;

    // Horizontal gridlines at 0 / 50% / 100% of max.
    const gridlines = [0, 0.5, 1].map((f) => ({
      y: H - padY - f * (H - padY * 2),
      value: Math.round(max * f),
    }));

    return { points, polyline, area, gridlines, max, W, H };
  }, [data, xKey, yKey]);

  if (!geometry) return null;

  const { points, polyline, area, gridlines, W, H } = geometry;

  return (
    <Box>
      <Box sx={{ display: 'flex' }}>
        {/* Y axis labels sit outside the stretched SVG so they don't distort */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            pr: 1,
            py: '4px',
            height,
          }}
        >
          {[...gridlines].reverse().map((g) => (
            <Typography key={g.y} variant="caption" color="text.secondary">
              {g.value}
            </Typography>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1, height }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
          >
            {gridlines.map((g) => (
              <line
                key={g.y}
                x1="0"
                x2={W}
                y1={g.y}
                y2={g.y}
                stroke={theme.palette.divider}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <polygon points={area} fill={theme.palette.primary.main} opacity="0.12" />

            <polyline
              points={polyline}
              fill="none"
              stroke={theme.palette.primary.main}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {points.map((p) => (
              <circle
                key={p.x}
                cx={p.x}
                cy={p.y}
                r="4"
                fill={theme.palette.background.paper}
                stroke={theme.palette.primary.main}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${p.label}: ${p.v}`}</title>
              </circle>
            ))}
          </svg>
        </Box>
      </Box>

      {/* X axis labels — thinned so they never collide */}
      <Box sx={{ display: 'flex', pl: 4, mt: 0.5 }}>
        {points.map((p, i) => (
          <Box key={p.label} sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            {i % Math.ceil(points.length / 8) === 0 && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {p.label}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// BarList — horizontal bars. Labels read inline, which beats rotated axis text.
// Suppressed values (null) render as a hatched stub rather than an empty row.
// ---------------------------------------------------------------------------
function BarList({ rows, labelKey, valueKey, minCellSize }) {
  const theme = useTheme();

  const max = useMemo(
    () => Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1),
    [rows, valueKey]
  );

  return (
    <Stack spacing={1.25}>
      {rows.map((row, i) => {
        const raw = row[valueKey];
        const suppressed = raw === null || raw === undefined;
        const value = Number(raw) || 0;
        const pct = suppressed ? 100 : (value / max) * 100;

        return (
          <Box key={`${row[labelKey]}-${i}`}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="body2" noWrap sx={{ pr: 2 }}>
                {row[labelKey]}
              </Typography>
              <Typography variant="body2" fontWeight={600} color={suppressed ? 'text.secondary' : 'text.primary'}>
                {suppressed ? `<${minCellSize}` : value.toLocaleString()}
              </Typography>
            </Stack>

            <Tooltip title={suppressed ? `Suppressed (cohort under ${minCellSize})` : String(value)}>
              <Box
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${suppressed ? 8 : Math.max(pct, 1)}%`,
                    borderRadius: 1,
                    bgcolor: suppressed ? 'transparent' : 'primary.main',
                    backgroundImage: suppressed
                      ? `repeating-linear-gradient(45deg, ${theme.palette.text.disabled} 0 4px, transparent 4px 8px)`
                      : 'none',
                    transition: 'width 300ms ease',
                  }}
                />
              </Box>
            </Tooltip>
          </Box>
        );
      })}
    </Stack>
  );
}

// ---------------------------------------------------------------------------

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

  const groupedCatalog = useMemo(() => {
    const groups = {};
    catalog.forEach((r) => {
      (groups[r.category] = groups[r.category] || []).push(r);
    });
    return groups;
  }, [catalog]);

  // Derive chart shape from the result: first string column is the label,
  // first numeric (or suppressed-null) column is the value.
  const chart = useMemo(() => {
    if (!report?.rows?.length) return null;
    const sample = report.rows[0];
    const keys = Object.keys(sample).filter((k) => k !== '__suppressed');
    const labelKey = keys.find((k) => typeof sample[k] === 'string');
    const valueKey = keys.find(
      (k) => k !== labelKey && (typeof sample[k] === 'number' || sample[k] === null)
    );
    if (!labelKey || !valueKey) return null;
    return { labelKey, valueKey };
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
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Admissions, last 12 months
              </Typography>
              <TrendLine
                data={summary.admissionsTrend}
                xKey="period"
                yKey="admissions"
                height={220}
              />
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

          {chart && report.rows.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <BarList
                rows={report.rows}
                labelKey={chart.labelKey}
                valueKey={chart.valueKey}
                minCellSize={report.minCellSize}
              />
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