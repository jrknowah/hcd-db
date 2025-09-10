import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Grid, 
  Box, 
  Stack, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Alert,
  CircularProgress,
  Chip
} from "@mui/material";
import { 
  Microsoft as MicrosoftIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useMsal } from '@azure/msal-react';
import PageContainer from 'src/components/container/PageContainer';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext } from 'react';
import { useAuth } from '../../../hooks/useAuth';

// HOPE Logo Component (same as before)
const HopeLogo = ({ width = "180", height = "60" }) => (
  <svg width={width} height={height} viewBox="0 0 220 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#1e40af" stopOpacity="0.8" />
      </linearGradient>
    </defs>
    
    <g transform="translate(15, 15)">
      <rect x="8" y="5" width="4" height="20" fill="url(#iconGradient)" rx="1"/>
      <rect x="3" y="10" width="14" height="4" fill="url(#iconGradient)" rx="1"/>
      
      <rect x="22" y="7" width="8" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="10" width="6" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="13" width="7" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="16" width="9" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      <rect x="22" y="19" width="5" height="1.5" fill="url(#iconGradient)" rx="0.5"/>
      
      <path d="M 10 28 C 8 26, 4 26, 4 30 C 4 34, 10 40, 10 40 C 10 40, 16 34, 16 30 C 16 26, 12 26, 10 28 Z" 
            fill="url(#iconGradient)" opacity="0.7"/>
    </g>
    
    <text x="70" y="35" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill="#2563eb">
      HOPE
    </text>
    
    <text x="70" y="48" fontFamily="Arial, sans-serif" fontSize="10" fill="#64748b">
      Client Database
    </text>
    
    <g stroke="#2563eb" strokeWidth="1" opacity="0.3" fill="none">
      <line x1="55" y1="25" x2="65" y2="25"/>
      <line x1="55" y1="30" x2="65" y2="30"/>
      <line x1="55" y1="35" x2="65" y2="35"/>
      <circle cx="52" cy="25" r="1" fill="#2563eb"/>
      <circle cx="52" cy="30" r="1" fill="#2563eb"/>
      <circle cx="52" cy="35" r="1" fill="#2563eb"/>
    </g>
  </svg>
);

// Working Azure Login Component
const AzureLogin = () => {
  const { login, loading, error } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleAzureLogin = async () => {
    setLocalLoading(true);
    setLocalError(null);
    setLoginSuccess(false);

    try {
      await login();
      setLoginSuccess(true);
      // Navigation is handled by AuthGuard component
    } catch (error) {
      console.error('Azure login failed:', error);
      setLocalError(error.message || 'Login failed. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;
  const displayError = error || localError;

  return (
    <Box>
      {/* Error Alert */}
      {displayError && !isLoading && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          icon={<ErrorIcon />}
        >
          <Typography variant="body2">
            {typeof displayError === 'string' ? displayError : 'Login failed. Please try again.'}
          </Typography>
        </Alert>
      )}

      {/* Success Alert */}
      {loginSuccess && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          icon={<CheckCircleIcon />}
        >
          <Typography variant="body2">
            Login successful! Loading your dashboard...
          </Typography>
        </Alert>
      )}

      {/* Azure Login Button */}
      <Button
        fullWidth
        variant="outlined"
        size="large"
        onClick={handleAzureLogin}
        disabled={isLoading}
        startIcon={
          isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <MicrosoftIcon />
          )
        }
        sx={{
          py: 1.5,
          borderColor: '#0078d4',
          color: '#0078d4',
          '&:hover': {
            backgroundColor: '#0078d4',
            color: 'white',
          },
          '&:disabled': {
            borderColor: '#e0e0e0',
            color: '#9e9e9e',
          },
          mb: 2,
        }}
      >
        {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
      </Button>

      {/* Login Info */}
      <Box mt={2}>
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Sign in with your organization account to access:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip 
            label="HOPE Database" 
            size="small" 
            variant="outlined" 
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip 
            label="Medical Records" 
            size="small" 
            variant="outlined" 
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip 
            label="Case Management" 
            size="small" 
            variant="outlined" 
            sx={{ fontSize: '0.7rem' }}
          />
        </Stack>
      </Box>
    </Box>
  );
};

// User Role Display Component (shows during loading)
const UserRoleDisplay = ({ userRoles, loading }) => {
  if (loading || !userRoles?.length) return null;

  const roleDisplayNames = {
    'IT_ADMIN': 'IT Administrator',
    'LEVEL1': 'Level 1 Staff',
    'CASE_MANAGER': 'Case Manager',
    'NURSE': 'Nurse',
    'AUDITOR': 'Auditor',
    'READONLY': 'Read Only'
  };

  return (
    <Box mt={2} p={2} bgcolor="success.50" borderRadius={1} border="1px solid" borderColor="success.200">
      <Typography variant="caption" color="success.700" gutterBottom>
        Welcome! Your access level:
      </Typography>
      <Stack direction="row" spacing={1} mt={1}>
        {userRoles.map(role => (
          <Chip
            key={role}
            label={roleDisplayNames[role] || role}
            size="small"
            color="success"
            variant="filled"
          />
        ))}
      </Stack>
    </Box>
  );
};

export default function Login() {
  const { activeMode } = useContext(CustomizerContext);
  const { isAuthenticated, userRoles, isLoadingGroups } = useAuth();

  // If user is already authenticated, show loading state
  if (isAuthenticated) {
    return (
      <PageContainer title="HOPE Login" description="HOPE Client Database Login">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
        >
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading HOPE Dashboard...
          </Typography>
          <UserRoleDisplay userRoles={userRoles} loading={isLoadingGroups} />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="HOPE Login" description="HOPE Client Database Login">
      <Grid
        container
        spacing={0}
        justifyContent="center"
        sx={{
          height: "100vh",
          backgroundColor: activeMode === "light" ? "#f8fafc" : "background.default",
        }}
      >
        {/* Left Panel - Login Form */}
        <Grid
          size={{
            xs: 12,
            sm: 12,
            lg: 5,
            xl: 4
          }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: activeMode === "light" ? "white" : "background.paper",
          }}
        >
          {/* Logo Section */}
          <Box px={4} py={3}>
            <HopeLogo width="200" height="60" />
          </Box>

          {/* Login Form Section */}
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            flex={1}
            px={4}
            pb={4}
          >
            <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="h4" fontWeight="600" mb={1} color="primary">
                  Welcome Back
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={4}>
                  Access your HOPE Client Database
                </Typography>

                {/* Azure Login Component */}
                <AzureLogin />

                {/* Support Information */}
                <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    <strong>Need Help?</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Contact your IT administrator for account access.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Make sure you're added to the appropriate HOPE security groups in Azure AD.
                  </Typography>
                </Box>

                {/* Development Info (remove in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <Box mt={2} p={2} bgcolor="info.50" borderRadius={1} border="1px solid" borderColor="info.200">
                    <Typography variant="caption" color="info.700" gutterBottom display="block">
                      <strong>Development Mode - Required Groups:</strong>
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="info.600">• HOPE_case (Case Managers)</Typography>
                      <Typography variant="caption" color="info.600">• HOPE_nursing (Nursing Staff)</Typography>
                      <Typography variant="caption" color="info.600">• HOPE_it (IT Administrators)</Typography>
                      <Typography variant="caption" color="info.600">• HOPE_level1 (Level 1 Staff)</Typography>
                      <Typography variant="caption" color="info.600">• HOPE_audit (Auditors)</Typography>
                      <Typography variant="caption" color="info.600">• HOPE_readonly (Read Only)</Typography>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right Panel - HOPE Branding */}
        <Grid
          size={{
            xs: 0,
            sm: 0,
            lg: 7,
            xl: 8
          }}
          sx={{
            position: "relative",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: { xs: "none", lg: "block" },
          }}
        >
          <Box
            position="relative"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            {/* Medical Background Pattern */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M29 20h2v20h-2zM20 29h20v2H20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Main Content */}
            <Box textAlign="center" color="white" zIndex={1} px={6}>
              <Typography variant="h2" fontWeight="700" mb={3}>
                HOPE
              </Typography>
              <Typography variant="h5" fontWeight="300" mb={2}>
                Client Database System
              </Typography>
              <Typography variant="body1" opacity={0.8} maxWidth={400} mx="auto" mb={4}>
                Secure, comprehensive medical records management designed for healthcare professionals
              </Typography>
              
              {/* Feature Highlights */}
              <Stack spacing={2} maxWidth={300} mx="auto">
                <Box display="flex" alignItems="center" gap={2}>
                  <Box width={8} height={8} bgcolor="white" borderRadius="50%" />
                  <Typography variant="body2">HIPAA Compliant Security</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box width={8} height={8} bgcolor="white" borderRadius="50%" />
                  <Typography variant="body2">Azure AD Integration</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box width={8} height={8} bgcolor="white" borderRadius="50%" />
                  <Typography variant="body2">Role-Based Access Control</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box width={8} height={8} bgcolor="white" borderRadius="50%" />
                  <Typography variant="body2">Real-time Data Access</Typography>
                </Box>
              </Stack>

              {/* Security Badge */}
              <Box mt={4} p={2} bgcolor="rgba(255,255,255,0.1)" borderRadius={2} border="1px solid rgba(255,255,255,0.2)">
                <Typography variant="caption" display="block" mb={1}>
                  🔒 Enterprise Security
                </Typography>
                <Typography variant="body2" opacity={0.9}>
                  Single Sign-On with Multi-Factor Authentication
                </Typography>
              </Box>
            </Box>

            {/* Decorative Elements */}
            <Box
              sx={{
                position: "absolute",
                top: "20%",
                right: "15%",
                width: 100,
                height: 100,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.2)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: "25%",
                left: "10%",
                width: 60,
                height: 60,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
}