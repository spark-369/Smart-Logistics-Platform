import { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { shipmentService } from '../services/shipmentService';

const TrackingPublic = () => {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [trackingNumberInput, setTrackingNumberInput] = useState(trackingNumber || '');
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumberInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await shipmentService.getByTrackingNumber(trackingNumberInput.trim());
      setShipment(data);
    } catch (err) {
      setError('Shipment not found. Please check the tracking number.');
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4, boxShadow: 2 }}>
        <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Track Your Shipment
        </Typography>
        <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
          Enter your tracking number to get the latest status
        </Typography>

        <Box component="form" onSubmit={handleTrack} sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Enter tracking number"
            value={trackingNumberInput}
            onChange={(e) => setTrackingNumberInput(e.target.value)}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Track'}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {shipment && (
          <Box sx={{ mt: 2, border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">Tracking Number</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold', mb: 2 }}>{shipment.trackingNumber}</Typography>

            <Typography variant="subtitle2" color="textSecondary">Status</Typography>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>{shipment.status}</Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Origin</Typography>
                <Typography variant="body2">{shipment.originCity}, {shipment.originCountry}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="textSecondary">Destination</Typography>
                <Typography variant="body2">{shipment.destCity}, {shipment.destCountry}</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">Sender</Typography>
              <Typography variant="body2">{shipment.senderName}</Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="textSecondary">Receiver</Typography>
              <Typography variant="body2">{shipment.receiverName}</Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default TrackingPublic;
