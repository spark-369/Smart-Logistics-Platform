import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ColorModeProvider } from './theme/ColorModeContext';
import { FeedbackProvider } from './components/FeedbackProvider';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import ShipmentCreate from './pages/ShipmentCreate';
import ShipmentDetail from './pages/ShipmentDetail';
import Tracking from './pages/Tracking';
import PublicTracking from './pages/TrackingPublic';
import Drivers from './pages/Drivers';
import Vehicles from './pages/Vehicles';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import { LoadingState } from './components/StateFeedback';
import { UserRole } from './constants';

const ALL_ROLES = [UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER, UserRole.CUSTOMER];

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // A visible splash beats the previous `return null`, which rendered a blank white screen on
    // every cold start while the session was being restored.
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <LoadingState message="Restoring your session…" minHeight={200} />
      </Box>
    );
  }

  const getDefaultRoute = () => {
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.DISPATCHER) {
      return '/dashboard';
    }
    return '/shipments';
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
      <Route
        path="/register"
        element={user ? <Navigate to={getDefaultRoute()} replace /> : <Register />}
      />

      {/* Public routes: reachable without an account. */}
      <Route path="/track" element={<PublicTracking />} />
      <Route path="/track/:trackingNumber" element={<PublicTracking />} />

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/"
        element={
          <PrivateRoute allowedRoles={ALL_ROLES}>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />
        <Route
          path="dashboard"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN, UserRole.DISPATCHER]}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="shipments"
          element={
            <PrivateRoute allowedRoles={ALL_ROLES}>
              <Shipments />
            </PrivateRoute>
          }
        />
        <Route
          path="shipments/create"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN, UserRole.DISPATCHER, UserRole.CUSTOMER]}>
              <ShipmentCreate />
            </PrivateRoute>
          }
        />
        <Route
          path="shipments/:id"
          element={
            <PrivateRoute allowedRoles={ALL_ROLES}>
              <ShipmentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="tracking"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN, UserRole.DISPATCHER, UserRole.DRIVER]}>
              <Tracking />
            </PrivateRoute>
          }
        />
        <Route
          path="drivers"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN, UserRole.DISPATCHER]}>
              <Drivers />
            </PrivateRoute>
          }
        />
        <Route
          path="vehicles"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN, UserRole.DISPATCHER]}>
              <Vehicles />
            </PrivateRoute>
          }
        />
        <Route
          path="users"
          element={
            <PrivateRoute allowedRoles={[UserRole.ADMIN]}>
              <Users />
            </PrivateRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <PrivateRoute allowedRoles={ALL_ROLES}>
              <Notifications />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <ColorModeProvider>
      <FeedbackProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </FeedbackProvider>
    </ColorModeProvider>
  </ErrorBoundary>
);

export default App;
