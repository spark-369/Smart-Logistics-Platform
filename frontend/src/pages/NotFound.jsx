import { Container, Typography, Button, Box, Stack } from '@mui/material';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  ExploreOff as ExploreOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 }, textAlign: 'center' }}>
      <ExploreOffIcon sx={{ fontSize: 72, color: 'primary.main', opacity: 0.85, mb: 1 }} />
      <Typography variant="h1" sx={{ fontSize: { xs: '4.5rem', sm: '6rem' }, fontWeight: 800, color: 'primary.main' }}>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The page you are looking for does not exist or may have been moved.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="center"
        alignItems="center"
      >
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate(user ? '/' : '/login')}
        >
          {user ? 'Back to dashboard' : 'Go to sign in'}
        </Button>
        <Button variant="outlined" startIcon={<SearchIcon />} onClick={() => navigate('/track')}>
          Track a shipment
        </Button>
      </Stack>
      {user && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4 }}>
          Signed in as {user.email} ({user.role})
        </Typography>
      )}
    </Container>
  );
};

export default NotFound;
