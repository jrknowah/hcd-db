import React, { useContext, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import { CssBaseline, ThemeProvider, Box, Typography, CircularProgress } from '@mui/material';
import { CustomizerContext } from 'src/context/CustomizerContext';
import { MsalProvider, useMsal } from '@azure/msal-react';
import { msalInstance, initializeMsal } from './backend/config/authConfig';
import AuthGuard from './components/Auth/AuthGuard';
import ClientRouteGate from './components/ClientRouteGate';
import IdleLogout from './components/Auth/IdleLogout';
import AssessCarePlans from './views/Section-3/AssessCarePlans';
import  store  from './backend/store/store';
import AdminErrors from './views/Dashboard/AdminErrors';
// import { ProtectedAdminRoute } from './views/Dashboard/ProtectedAdminRoute';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { isAdminAccount, canViewAuditTrail, canViewDocumentationReports } from './backend/config/groupConfig';
import AdminLayout from './views/admin/AdminLayout';

// At the very top of App.jsx, before any other code:
if (typeof window !== 'undefined') {
  const state = localStorage.getItem('redux_cache');
  const sessionState = sessionStorage.getItem('redux_cache');
  
  if (state?.includes('<!DOCTYPE') || sessionState?.includes('<!DOCTYPE')) {
    console.log('🧹 Clearing corrupted storage');
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
}

// ✅ Import your real components with error boundaries
const FullLayout = React.lazy(() => import('./layouts/full/FullLayout'));
const DashboardClient = React.lazy(() => import('./views/Dashboard/DashboardClient'));
const Identification = React.lazy(() => import('./views/Section-1/Identification'));
const AuthSig = React.lazy(() => import('./views/Section-2/AuthSig'));
const ClientProgress = React.lazy(() => import('./views/Section-4/ClientProgress'));
const Medical = React.lazy(() => import('./views/Section-5/Medical'));
const Section6 = React.lazy(() => import('./views/Section-6/Section6'));

// ✅ Admin pages (lazy — these are heavy and only IT loads them)
const AdminAudit = React.lazy(() => import('./views/admin/AdminAudit'));
const AdminAnalytics = React.lazy(() => import('./views/admin/AdminAnalytics'));
const DocumentationReport = React.lazy(() => import('./views/admin/DocumentationReport'));

// ✅ Simple loading fallback
const LoadingFallback = ({ name }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh',
    gap: 2
  }}>
    <CircularProgress />
    <Typography>Loading {name}...</Typography>
  </Box>
);

// ✅ MSAL Loading Component
const MSALLoadingComponent = ({ error, retry }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh',
    gap: 3,
    backgroundColor: '#f5f5f5'
  }}>
    {error ? (
      <>
        <Box sx={{ textAlign: 'center', p: 3, backgroundColor: 'white', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h4" color="error" gutterBottom>
            🔐 Authentication Setup Error
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Unable to initialize Microsoft Authentication
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'error.main', mb: 3 }}>
            {error}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <button 
              onClick={retry}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🔄 Retry Authentication
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              🔄 Reload Page
            </button>
          </Box>
        </Box>
      </>
    ) : (
      <>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h5" color="primary">
          🔐 Initializing Authentication...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Setting up secure Microsoft login session
        </Typography>
        <Box sx={{ 
          width: '200px', 
          height: '4px', 
          backgroundColor: '#e0e0e0', 
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(90deg, transparent, #1976d2, transparent)',
            animation: 'loading 2s infinite'
          }} />
        </Box>
      </>
    )}
  </Box>
);

// ✅ Error boundary for components
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, backgroundColor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          <Typography variant="h5">❌ Component Error</Typography>
          <Typography variant="body1">Component: {this.props.name}</Typography>
          <Typography variant="body2">Error: {this.state.error?.message}</Typography>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// ✅ Main App Routes Component (after MSAL is ready)
const AppRoutes = () => {
  const location = useLocation();
  
  // Debug info
  console.log('🔍 App rendering, current location:', location.pathname);
  
  const theme = ThemeSettings();
  const { activeDir } = useContext(CustomizerContext);

  return (
    <ThemeProvider theme={theme}>
      <RTL direction={activeDir}>
        <CssBaseline />
        <AuthGuard>
          <IdleLogout />
          <Routes>
            {/* ✅ Routes with FullLayout */}
            <Route path="/" element={
              <ComponentErrorBoundary name="FullLayout">
                <Suspense fallback={<LoadingFallback name="Layout" />}>
                  <FullLayout />
                </Suspense>
              </ComponentErrorBoundary>
            }>
              <Route index element={<Navigate to="/dashboard" />} />
              
              <Route path="dashboard" element={
                <ComponentErrorBoundary name="Dashboard">
                  <Suspense fallback={<LoadingFallback name="Dashboard" />}>
                    <DashboardClient />
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* ========================================
                  ✅ SECTION 1: IDENTIFICATION
                  Added :clientID parameter for URL persistence
                  ======================================== */}
              <Route path="Section1/:clientID" element={
                <ComponentErrorBoundary name="Identification">
                  <Suspense fallback={<LoadingFallback name="Section 1" />}>
                    <ClientRouteGate><Identification /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* Fallback without clientID */}
              <Route path="Section1" element={
                <ComponentErrorBoundary name="Identification">
                  <Suspense fallback={<LoadingFallback name="Section 1" />}>
                    <ClientRouteGate><Identification /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* ========================================
                  ✅ SECTION 2: AUTHORIZATION & SIGNATURES
                  Added :clientID parameter for URL persistence
                  ======================================== */}
              <Route path="Section2/:clientID" element={
                <ComponentErrorBoundary name="Section 2">
                  <Suspense fallback={<LoadingFallback name="Section 2" />}>
                    <ClientRouteGate><AuthSig /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* Fallback without clientID */}
              <Route path="Section2" element={
                <ComponentErrorBoundary name="Section 2">
                  <Suspense fallback={<LoadingFallback name="Section 2" />}>
                    <ClientRouteGate><AuthSig /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* ========================================
                  ✅ SECTION 3: BIO-SOCIAL
                  Added :clientID parameter for URL persistence
                  ======================================== */}
              <Route path="Section3/:clientID" element={
                <ComponentErrorBoundary name="Section 3">
                  <Suspense fallback={<LoadingFallback name="Section 3" />}>
                    <ClientRouteGate><AssessCarePlans /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* Fallback without clientID */}
              <Route path="Section3" element={
                <ComponentErrorBoundary name="Section 3">
                  <Suspense fallback={<LoadingFallback name="Section 3" />}>
                    <ClientRouteGate><AssessCarePlans /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />

              {/* ========================================
                  ✅ SECTION 4: CLIENT PROGRESS
                  Added :clientID parameter for URL persistence
                  ======================================== */}
              <Route path="Section4/:clientID" element={
                <ComponentErrorBoundary name="Section 4">
                  <Suspense fallback={<LoadingFallback name="Section 4" />}>
                    <ClientRouteGate><ClientProgress /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* Fallback without clientID */}
              <Route path="Section4" element={
                <ComponentErrorBoundary name="Section 4">
                  <Suspense fallback={<LoadingFallback name="Section 4" />}>
                    <ClientRouteGate><ClientProgress /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* ========================================
                  ✅ SECTION 5: MEDICAL
                  Added :clientID parameter for URL persistence
                  ======================================== */}
              <Route path="Section5/:clientID" element={
                <ComponentErrorBoundary name="Section 5">
                  <Suspense fallback={<LoadingFallback name="Section 5" />}>
                    <ClientRouteGate><Medical /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* Fallback without clientID */}
              <Route path="Section5" element={
                <ComponentErrorBoundary name="Section 5">
                  <Suspense fallback={<LoadingFallback name="Section 5" />}>
                    <ClientRouteGate><Medical /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* ========================================
                  ✅ SECTION 6
                  Added :clientID parameter for URL persistence
                  ======================================== */}
              <Route path="Section6/:clientID" element={
                <ComponentErrorBoundary name="Section 6">
                  <Suspense fallback={<LoadingFallback name="Section 6" />}>
                    <ClientRouteGate><Section6 /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
              {/* Fallback without clientID */}
              <Route path="Section6" element={
                <ComponentErrorBoundary name="Section 6">
                  <Suspense fallback={<LoadingFallback name="Section 6" />}>
                    <ClientRouteGate><Section6 /></ClientRouteGate>
                  </Suspense>
                </ComponentErrorBoundary>
              } />
              
            </Route>

            {/* ========================================
                ✅ ADMIN — its own layout branch, sibling to FullLayout.
                Guard is applied ONCE on the parent, so every child route
                inherits it. AdminLayout renders the admin sidebar + <Outlet />.
                No client-scoped section state applies here.
                ======================================== */}
            <Route path="/admin" element={
              // IT Admin sees the whole console; Level 1 sees only the audit trail
              <ProtectedRoute canAccess={canViewAuditTrail}>
                <ComponentErrorBoundary name="AdminLayout">
                  <AdminLayout />
                </ComponentErrorBoundary>
              </ProtectedRoute>
            }>
              <Route index element={<AdminHomeRedirect />} />

              <Route path="errors" element={
                <ProtectedRoute adminOnly>
                  <ComponentErrorBoundary name="Admin Errors">
                    <AdminErrors />
                  </ComponentErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="audit" element={
                <ComponentErrorBoundary name="Admin Audit">
                  <Suspense fallback={<LoadingFallback name="Audit Trail" />}>
                    <AdminAudit />
                  </Suspense>
                </ComponentErrorBoundary>
              } />

              <Route path="analytics" element={
                <ProtectedRoute adminOnly>
                  <ComponentErrorBoundary name="Admin Analytics">
                    <Suspense fallback={<LoadingFallback name="Reports & Analytics" />}>
                      <AdminAnalytics />
                    </Suspense>
                  </ComponentErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="behavioral" element={
                <ProtectedRoute canAccess={canViewDocumentationReports}>
                  <ComponentErrorBoundary name="Behavioral Health Documentation">
                    <Suspense fallback={<LoadingFallback name="Behavioral Health Documentation" />}>
                      <DocumentationReport
                        key="behavioral"
                        area="behavioral"
                        title="Behavioral Health Documentation"
                        subtitle="Sections 1–4: active clients whose face sheet, consent forms, assessments, care plans or encounter notes are missing, unfinished or out of date."
                      />
                    </Suspense>
                  </ComponentErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="nursing" element={
                <ProtectedRoute canAccess={canViewDocumentationReports}>
                  <ComponentErrorBoundary name="Nursing Documentation">
                    <Suspense fallback={<LoadingFallback name="Nursing Documentation" />}>
                      <DocumentationReport
                        key="nursing"
                        area="nursing"
                        title="Nursing Documentation"
                        subtitle="Section 5: active clients whose medical face sheet, screening, nursing assessment, progress notes, IDT notes or observation records are missing, unsubmitted or out of date."
                      />
                    </Suspense>
                  </ComponentErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="*" element={<AdminHomeRedirect />} />
            </Route>

            <Route path="/unauthorized" element={
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>Access Denied</Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  You don't have permission to access this area.
                </Typography>
                <a href="/dashboard">Return to Dashboard</a>
              </Box>
            } />
            {/* ✅ Catch all */}
            <Route path="*" element={
              <Box sx={{ p: 3, backgroundColor: 'error.main', color: 'error.contrastText' }}>
                <Typography variant="h4">404 - Route not found</Typography>
                <Typography>Path: {location.pathname}</Typography>
                <a href="/dashboard" style={{ color: 'yellow' }}>Go to Dashboard</a>
              </Box>
            } />
          </Routes>
        </AuthGuard>
      </RTL>
    </ThemeProvider>
  );
};

// ✅ Main App Component with MSAL Initialization
// /admin landing page: IT Admin starts on System Errors, Level 1 (audit
// trail only) on the Audit Trail.
function AdminHomeRedirect() {
  const { accounts } = useMsal();
  const to = isAdminAccount(accounts[0]) ? '/admin/errors' : '/admin/audit';
  return <Navigate to={to} replace />;
}

function App() {
  const [msalInitialized, setMsalInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupMsal = async () => {
      try {
        console.log('🚀 App starting MSAL setup...');
        
        // Wait for MSAL to fully initialize
        await initializeMsal();
        
        // Make MSAL instance globally available for token refresh
        window.msalInstance = msalInstance;
        
        // Also make Redux store available if you have it
        window.__REDUX_STORE__ = store;
        
        console.log('✅ MSAL setup complete');
        setMsalInitialized(true);
        
      } catch (error) {
        console.error('❌ MSAL setup failed:', error);
        setInitError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    setupMsal();
  }, []);

  // Retry function for failed initialization
  const retryInitialization = () => {
    setInitError(null);
    setIsLoading(true);
    setMsalInitialized(false);
    
    // Retry after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Show loading state while MSAL initializes
  if (isLoading || !msalInitialized) {
    return <MSALLoadingComponent error={initError} retry={retryInitialization} />;
  }

  // Only render the app after MSAL is fully ready
  return (
    <MsalProvider instance={msalInstance}>
      <AppRoutes />
    </MsalProvider>
  );
}

export default App;
