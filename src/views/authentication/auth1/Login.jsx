import { Link } from 'react-router';
import { Grid, Box, Stack, Typography, Avatar, Button, Divider, Card, CardContent } from "@mui/material";
import { Microsoft as MicrosoftIcon } from '@mui/icons-material';
import PageContainer from 'src/components/container/PageContainer';
import AuthLogin from "../authForms/AuthLogin";
import { CustomizerContext } from 'src/context/CustomizerContext';
import { useContext } from 'react';

// HOPE Logo Component (inline for this example)
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

// Azure Login Component
const AzureLogin = ({ onLogin }) => {
  const handleAzureLogin = async () => {
    try {
      // This would integrate with MSAL (Microsoft Authentication Library)
      // Example: await msalInstance.loginPopup(loginRequest);
      console.log('Azure login initiated');
      onLogin && onLogin();
    } catch (error) {
      console.error('Azure login failed:', error);
    }
  };

  return (
    <Button
      fullWidth
      variant="outlined"
      size="large"
      onClick={handleAzureLogin}
      startIcon={<MicrosoftIcon />}
      sx={{
        py: 1.5,
        borderColor: '#0078d4',
        color: '#0078d4',
        '&:hover': {
          backgroundColor: '#0078d4',
          color: 'white',
        },
        mb: 2,
      }}
    >
      Sign in with Microsoft
    </Button>
  );
};

export default function Login() {
  const { activeMode } = useContext(CustomizerContext);

  const handleAzureLogin = () => {
    // Handle Azure login logic here
    // This would typically redirect to Azure AD or handle the authentication flow
  };

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

                {/* Azure Login Button */}
                <AzureLogin onLogin={handleAzureLogin} />

                {/* <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Or continue with
                  </Typography>
                </Divider> */}

                {/* Standard Login Form 
                <AuthLogin
                  title=""
                  subtext=""
                  subtitle={
                    <Stack
                      direction="row"
                      justifyContent="center"
                      spacing={1}
                      mt={3}
                    >
                      <Typography
                        color="textSecondary"
                        variant="body2"
                        fontWeight="400"
                      >
                        Need help accessing your account?
                      </Typography>
                      <Typography
                        component={Link}
                        to="/auth/forgot-password"
                        fontWeight="500"
                        variant="body2"
                        sx={{
                          textDecoration: "none",
                          color: "primary.main",
                        }}
                      >
                        Contact Support
                      </Typography>
                    </Stack>
                  }
                />*/}
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
                  <Typography variant="body2">Real-time Data Access</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box width={8} height={8} bgcolor="white" borderRadius="50%" />
                  <Typography variant="body2">Integrated Workflows</Typography>
                </Box>
              </Stack>
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