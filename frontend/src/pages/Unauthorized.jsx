import { Container, Typography, Button, Box, Stack } from '@mui/material';
import { Home as HomeIcon, LockPerson as LockIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Send the user somewhere they can actually reach, rather than a fixed /dashboard which a
  // DRIVER or CUSTOMER is not allowed to open (and would bounce straight back here).
  const homeRoute = user?.role === 'ADMIN' || user?.role === 'DISPATCHER' ? '/dashboard' : '/shipments';

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 }, textAlign: 'center' }}>
      <LockIcon sx={{ fontSize: 72, color: 'warning.main', mb: 1 }} />
      <Typography variant="h1" sx={{ fontSize: { xs: '4.5rem', sm: '6rem' }, fontWeight: 800, color: 'primary.main' }}>
        403
      </Typography>
      <Typography variant="h4" gutterBottom>
        Unauthorized
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        You do not have permission to access this resource.
        {user?.role ? ` Your account role is ${user.role}.` : ''}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
        <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate(homeRoute)}>
          Go to my home page
        </Button>
        <Button variant="outlined" onClick={logout}>
          Sign out
        </Button>
      </Stack>
      <Box sx={{ mt: 4 }}>
        <Typography variant="caption" color="text.secondary">
          If you believe you should have access, ask an administrator to review your role.
        </Typography>
      </Box>
    </Container>
  );
};

export default Unauthorized;
