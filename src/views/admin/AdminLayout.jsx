// src/components/admin/AdminLayout.jsx
import { NavLink, Outlet } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { isAdminAccount } from '../../backend/config/groupConfig';
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

// Level 1 users can open the console for the Audit Trail only;
// everything marked adminOnly is IT Admin only.
const adminNav = [
  { label: 'System Errors', path: '/admin/errors', icon: <BugReportIcon />, adminOnly: true },
  { label: 'Audit Trail', path: '/admin/audit', icon: <HistoryIcon /> },
  { label: 'Reports & Analytics', path: '/admin/analytics', icon: <InsightsIcon />, adminOnly: true },
  { label: 'User Access', path: '/admin/access', icon: <PeopleIcon />, disabled: true, adminOnly: true },
  { label: 'Backend Health', path: '/admin/health', icon: <MonitorHeartIcon />, disabled: true, adminOnly: true },
];

export default function AdminLayout() {
  const { accounts } = useMsal();
  const isAdmin = isAdminAccount(accounts[0]);
  const navItems = isAdmin ? adminNav : adminNav.filter((item) => !item.adminOnly);

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
          <Typography variant="h6" noWrap>{isAdmin ? 'Admin · IT' : 'Audit'}</Typography>
        </Toolbar>
        <Divider />
        <List>
          {navItems.map((item) => (
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
