// src/components/admin/AdminLayout.jsx
import { NavLink, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  People as PeopleIcon,
  History as HistoryIcon,
  Insights as InsightsIcon,
  MonitorHeart as MonitorHeartIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 220;

const adminNav = [
  { label: 'System Errors', path: '/admin/errors', icon: <BugReportIcon /> },
  { label: 'Audit Trail', path: '/admin/audit', icon: <HistoryIcon /> },
  { label: 'Reports & Analytics', path: '/admin/analytics', icon: <InsightsIcon /> },
  { label: 'User Access', path: '/admin/access', icon: <PeopleIcon />, disabled: true },
  { label: 'Backend Health', path: '/admin/health', icon: <MonitorHeartIcon />, disabled: true },
];

export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar sx={{ px: 2 }}>
          <Typography variant="h6" noWrap>Admin · IT</Typography>
        </Toolbar>
        <Divider />
        <List>
          {adminNav.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.path}
                disabled={item.disabled}
                sx={{
                  '&.active': {
                    bgcolor: 'action.selected',
                    fontWeight: 600,
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton component={NavLink} to="/">
              <ListItemIcon><ArrowBackIcon /></ListItemIcon>
              <ListItemText primary="Back to app" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
