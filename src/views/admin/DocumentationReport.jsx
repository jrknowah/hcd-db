// src/views/admin/DocumentationReport.jsx
// Admin > Behavioral Health (Sections 1-4) and Admin > Nursing (Section 5).
// One row per active client, one column per required document, showing what
// is missing, unfinished (drafts / unsigned / not Complete) or out of date.
// The rules and thresholds live in the backend (routes/admin/documentation.cjs);
// this page only displays what it returns.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
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
  Chip,
  Stack,
  Card,
  CardContent,
  CardActionArea,
  Tooltip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { formatLocalDateTime } from '../../utils/localDateTime';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const GAP_STATUSES = ['missing', 'incomplete', 'overdue'];

// status -> chip appearance
const STATUS_STYLE = {
  missing:    { label: 'Missing',    color: 'error',   variant: 'filled' },
  incomplete: { label: 'Incomplete', color: 'warning', variant: 'filled' },
  overdue:    { label: 'Overdue',    color: 'error',   variant: 'outlined' },
  pending:    { label: 'Due soon',   color: 'default', variant: 'outlined' },
  ok:         { label: 'OK',         color: 'success', variant: 'outlined' },
  na:         { label: '—',          color: 'default', variant: 'outlined' },
  error:      { label: 'Unknown',    color: 'default', variant: 'outlined' },
};

const STATUS_FILTERS = [
  { value: 'gaps', label: 'Needs attention (missing, incomplete or overdue)' },
  { value: 'missing', label: 'Missing' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'pending', label: 'Due soon' },
  { value: 'all', label: 'All active clients' },
];

const matchesStatus = (status, filter) => {
  if (filter === 'all') return true;
  if (filter === 'gaps') return GAP_STATUSES.includes(status);
  return status === filter;
};

const formatDate = (value) => {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return y && m && d ? `${m}/${d}/${y}` : String(value);
};

function StatusChip({ item, href }) {
  const style = STATUS_STYLE[item?.status] || STATUS_STYLE.error;
  const title = (
    <Box>
      <Typography variant="body2">{item?.detail || style.label}</Typography>
      {item?.lastAt && (
        <Typography variant="caption">Last activity: {formatLocalDateTime(item.lastAt, item.lastAt)}</Typography>
      )}
    </Box>
  );
  return (
    <Tooltip title={title} arrow>
      <Chip
        size="small"
        label={style.label}
        color={style.color}
        variant={style.variant}
        component={RouterLink}
        to={href}
        clickable
      />
    </Tooltip>
  );
}

StatusChip.propTypes = {
  item: PropTypes.object,
  href: PropTypes.string.isRequired,
};

export default function DocumentationReport({ area, title, subtitle }) {
  const { instance, accounts } = useMsal();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [site, setSite] = useState('');
  const [checkKey, setCheckKey] = useState('');
  const [statusFilter, setStatusFilter] = useState('gaps');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fetchIdRef = useRef(0);

  const fetchReport = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      if (!accounts[0]) throw new Error('Not authenticated');
      const token = await instance.acquireTokenSilent({ scopes: ['openid', 'profile'], account: accounts[0] });
      const res = await axios.get(`${API_BASE}/api/admin/documentation/${area}`, {
        headers: { Authorization: `Bearer ${token.idToken}` },
      });
      if (fetchId !== fetchIdRef.current) return;
      setReport(res.data);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      console.error(`Failed to load ${area} documentation report:`, err);
      setError(err.response?.data?.error || err.message);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [area, instance, accounts]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const checks = useMemo(() => report?.checks || [], [report]);
  const sites = useMemo(
    () => [...new Set((report?.clients || []).map((c) => c.site))].sort(),
    [report],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const keys = checkKey ? [checkKey] : checks.map((c) => c.key);
    return (report?.clients || []).filter((c) => {
      if (site && c.site !== site) return false;
      if (q) {
        const hay = `${c.firstName} ${c.lastName} ${c.lastName}, ${c.firstName} ${c.clientID}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return keys.some((k) => matchesStatus(c.items[k]?.status, statusFilter));
    });
  }, [report, checks, search, site, checkKey, statusFilter]);

  // Gaps per check, for the cards (respects the site filter only)
  const gapCounts = useMemo(() => {
    const counts = Object.fromEntries(checks.map((c) => [c.key, 0]));
    (report?.clients || []).forEach((c) => {
      if (site && c.site !== site) return;
      checks.forEach((ch) => {
        if (GAP_STATUSES.includes(c.items[ch.key]?.status)) counts[ch.key] += 1;
      });
    });
    return counts;
  }, [report, checks, site]);

  const siteClients = (report?.clients || []).filter((c) => !site || c.site === site);
  const clientsWithGaps = siteClients.filter((c) => c.gapCount > 0).length;

  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const toggleCheck = (key) => {
    setCheckKey((current) => (current === key ? '' : key));
    setPage(0);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
        <Box>
          <Typography variant="h4">{title}</Typography>
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          {report?.generatedAt && (
            <Typography variant="caption" color="text.secondary">
              Updated {formatLocalDateTime(report.generatedAt, report.generatedAt)}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchReport}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {report?.failedChecks?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some columns could not be checked and show &quot;Unknown&quot;:{' '}
          {report.failedChecks.map((k) => checks.find((c) => c.key === k)?.label || k).join(', ')}.
        </Alert>
      )}

      {!report && loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      )}

      {report && (
        <>
          {/* Summary */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              mb: 2,
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Active clients</Typography>
                <Typography variant="h4">{siteClients.length}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Need attention</Typography>
                <Typography variant="h4" color={clientsWithGaps ? 'error.main' : 'success.main'}>
                  {clientsWithGaps}
                </Typography>
              </CardContent>
            </Card>
            {checks.map((ch) => (
              <Card
                key={ch.key}
                variant="outlined"
                sx={{ borderColor: checkKey === ch.key ? 'primary.main' : undefined }}
              >
                <CardActionArea onClick={() => toggleCheck(ch.key)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.3 }}>
                      S{ch.section} · {ch.label}
                    </Typography>
                    <Typography variant="h5" color={gapCounts[ch.key] ? 'error.main' : 'text.primary'}>
                      {gapCounts[ch.key]}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>

          {/* Filters */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="Search name or client ID"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                sx={{ minWidth: 220 }}
              />
              <TextField
                select size="small" label="Site" value={site}
                onChange={(e) => { setSite(e.target.value); setPage(0); }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All sites</MenuItem>
                {sites.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField
                select size="small" label="Document" value={checkKey}
                onChange={(e) => { setCheckKey(e.target.value); setPage(0); }}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">All documents</MenuItem>
                {checks.map((ch) => (
                  <MenuItem key={ch.key} value={ch.key}>S{ch.section} · {ch.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select size="small" label="Status" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                sx={{ minWidth: 220 }}
              >
                {STATUS_FILTERS.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
              </TextField>
            </Stack>
          </Paper>

          {/* Client table */}
          <Paper variant="outlined">
            <TableContainer sx={{ maxHeight: '65vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Site</TableCell>
                    <TableCell>Admitted</TableCell>
                    {checks.map((ch) => (
                      <TableCell key={ch.key} align="center">
                        <Tooltip title={ch.rule} arrow>
                          <span>
                            <Typography variant="caption" color="text.secondary" component="div">S{ch.section}</Typography>
                            {ch.label}
                          </span>
                        </Tooltip>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((c) => (
                    <TableRow key={c.clientID} hover>
                      <TableCell>
                        <Link
                          component={RouterLink}
                          to={`/Section${checks[0]?.section || 1}/${encodeURIComponent(c.clientID)}`}
                          underline="hover"
                        >
                          {[c.lastName, c.firstName].filter(Boolean).join(', ') || '(no name)'}
                        </Link>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {c.clientID}
                        </Typography>
                      </TableCell>
                      <TableCell>{c.site}</TableCell>
                      <TableCell>
                        {formatDate(c.admitDate)}
                        {c.daysEnrolled !== null && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {c.daysEnrolled} days
                          </Typography>
                        )}
                      </TableCell>
                      {checks.map((ch) => (
                        <TableCell key={ch.key} align="center">
                          <StatusChip
                            item={c.items[ch.key]}
                            href={`/Section${ch.section}/${encodeURIComponent(c.clientID)}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3 + checks.length} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">
                          {statusFilter === 'gaps'
                            ? 'No outstanding documentation for the selected filters.'
                            : 'No clients match the selected filters.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]}
            />
          </Paper>

          {/* Rules */}
          <Accordion variant="outlined" sx={{ mt: 2 }} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">How each document is checked</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {checks.map((ch) => (
                  <Typography key={ch.key} variant="body2">
                    <strong>S{ch.section} · {ch.label}:</strong> {ch.rule}
                  </Typography>
                ))}
                <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
                  <strong>Missing</strong>: nothing on file after the grace period.{' '}
                  <strong>Incomplete</strong>: a draft not submitted, a form not signed, or an assessment not marked Complete.{' '}
                  <strong>Overdue</strong>: not updated within the expected interval, or past its due date.{' '}
                  <strong>Due soon</strong>: not entered yet, still inside the grace period.
                  Only clients admitted and not discharged are listed. Click a status to open that section for the client.
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
}

DocumentationReport.propTypes = {
  area: PropTypes.oneOf(['behavioral', 'nursing']).isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};
