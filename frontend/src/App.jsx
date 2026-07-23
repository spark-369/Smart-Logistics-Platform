import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import ShipmentCreate from './pages/ShipmentCreate';
import ShipmentDetail from './pages/ShipmentDetail';
import ShipmentEdit from './pages/ShipmentEdit';
import Tracking from './pages/Tracking';
import TrackingPublic from './pages/TrackingPublic';
import Drivers from './pages/Drivers';
import Vehicles from './pages/Vehicles';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Unauthorized from './pages/Unauthorized';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  const getDefaultRoute = () => {
    if (user?.role === 'ADMIN' || user?.role === 'DISPATCHER') {
      return '/dashboard';
    }
    return '/shipments';
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={getDefaultRoute()} replace /> : <Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/track/:trackingNumber" element={<TrackingPublic />} />
      <Route path="/" element={<PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER']}><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="dashboard" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER']}><Dashboard /></PrivateRoute>
        } />
        <Route path="shipments" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER']}><Shipments /></PrivateRoute>
        } />
        <Route path="shipments/create" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER', 'CUSTOMER']}><ShipmentCreate /></PrivateRoute>
        } />
        <Route path="shipments/:id" element={
          <PrivateRoute><ShipmentDetail /></PrivateRoute>
        } />
        <Route path="shipments/:id/edit" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER']}><ShipmentEdit /></PrivateRoute>
        } />
        <Route path="tracking" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER', 'DRIVER']}><Tracking /></PrivateRoute>
        } />
        <Route path="drivers" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER']}><Drivers /></PrivateRoute>
        } />
        <Route path="vehicles" element={
          <PrivateRoute allowedRoles={['ADMIN', 'DISPATCHER']}><Vehicles /></PrivateRoute>
        } />
        <Route path="users" element={
          <PrivateRoute allowedRoles={['ADMIN']}><Users /></PrivateRoute>
        } />
        <Route path="notifications" element={
          <PrivateRoute><Notifications /></PrivateRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
