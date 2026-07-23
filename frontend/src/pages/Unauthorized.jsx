import { Container, Typography, Button, Box } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'primary.main' }}>
          403
        </Typography>
        <Typography variant="h4" gutterBottom sx={{ mt: -2 }}>
          Unauthorized
        </Typography>
      </Box>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        You do not have permission to access this resource.
      </Typography>
      <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </Button>
    </Container>
  );
};

export default Unauthorized;
