import { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  Grid,
  LinearProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility as ShowIcon, VisibilityOff as HideIcon } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../components/FeedbackProvider';
import AuthLayout, { AuthBrandMark } from '../components/AuthLayout';
import { getErrorMessage } from '../utils/format';

const MIN_PASSWORD_LENGTH = 6;

/** Scores password strength 0-4 so the user gets feedback before submitting. */
const scorePassword = (password) => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['error', 'error', 'warning', 'info', 'success'];

/**
 * Self-service sign up.
 *
 * Only CUSTOMER accounts can be created here: the backend deliberately rejects self-registration
 * for ADMIN, DISPATCHER and DRIVER so that nobody can grant themselves elevated privileges. The
 * role selector that used to be on this form has therefore been removed; privileged accounts are
 * created by an administrator from the Users page.
 */
const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { notifySuccess } = useFeedback();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = scorePassword(formData.password);
  const passwordsMatch =
    formData.confirmPassword.length === 0 || formData.password === formData.confirmPassword;

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    try {
      // `role` is intentionally omitted: the backend defaults new sign-ups to CUSTOMER.
      await register({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
      });
      notifySuccess('Account created. Welcome to SLP Logistics!');
      navigate('/shipments', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout maxWidth={520}>
      <AuthBrandMark subtitle="Join SLP Logistics to book and track shipments" />

      <Typography variant="h5" align="center" gutterBottom sx={{ display: { xs: 'none', md: 'block' } }}>
        Create your account
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
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="First name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              fullWidth
              autoComplete="given-name"
              disabled={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Last name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              fullWidth
              autoComplete="family-name"
              disabled={loading}
            />
          </Grid>
        </Grid>

        <TextField
          label="Email address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          fullWidth
          autoComplete="email"
          disabled={loading}
        />

        <TextField
          label="Phone number"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          fullWidth
          autoComplete="tel"
          disabled={loading}
        />

        <Box>
          <TextField
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            fullWidth
            autoComplete="new-password"
            disabled={loading}
            helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
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
          {formData.password && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={(strength / 4) * 100}
                color={STRENGTH_COLORS[strength]}
              />
              <Typography variant="caption" color="text.secondary">
                Password strength: {STRENGTH_LABELS[strength]}
              </Typography>
            </Box>
          )}
        </Box>

        <TextField
          label="Confirm password"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          fullWidth
          autoComplete="new-password"
          disabled={loading}
          error={!passwordsMatch}
          helperText={!passwordsMatch ? 'Passwords do not match' : undefined}
        />

        <Alert severity="info">
          New accounts are created as <strong>Customer</strong>. Driver and Dispatcher access is
          granted by an administrator.
        </Alert>

        <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
          <MuiLink component={Link} to="/login" underline="hover" sx={{ fontWeight: 600 }}>
            Sign in
          </MuiLink>
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default Register;

