import { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import { Visibility as ShowIcon, VisibilityOff as HideIcon } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../components/FeedbackProvider';
import AuthLayout, { AuthBrandMark } from '../components/AuthLayout';
import { getErrorMessage } from '../utils/format';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { notifySuccess } = useFeedback();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      notifySuccess(`Welcome back, ${data?.firstName ?? 'there'}.`);
      // Return the user to the page they originally requested, when there was one.
      const redirectTo = location.state?.from;
      if (redirectTo && redirectTo !== '/login') {
        navigate(redirectTo, { replace: true });
      } else if (data?.role === 'ADMIN' || data?.role === 'DISPATCHER') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/shipments', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthBrandMark subtitle="Access your Smart Logistics Platform workspace" />

      <Typography variant="h5" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
        Sign in
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        noValidate
      >
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          fullWidth
          autoFocus
          autoComplete="email"
          disabled={loading}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          disabled={loading}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((value) => !value)}
                    edge="end"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HideIcon /> : <ShowIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" align="center">
        Don&apos;t have an account?{' '}
        <MuiLink component={Link} to="/register" underline="hover" sx={{ fontWeight: 600 }}>
          Create one
        </MuiLink>
      </Typography>

      <Typography variant="body2" align="center" sx={{ mt: 1 }}>
        <MuiLink component={Link} to="/track" underline="hover">
          Track a shipment without signing in
        </MuiLink>
      </Typography>
    </AuthLayout>
  );
};

export default Login;
