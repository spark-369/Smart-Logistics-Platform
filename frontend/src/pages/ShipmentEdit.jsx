import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { shipmentService } from '../services/shipmentService';

const SHIPMENT_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

const ShipmentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [shipment, setShipment] = useState(null);
  const [formData, setFormData] = useState({
    status: '',
  });

  useEffect(() => {
    loadShipment();
  }, [id]);

  const loadShipment = async () => {
    try {
      const data = await shipmentService.getById(id);
      setShipment(data);
      setFormData({ status: data.status });
    } catch (err) {
      setError('Failed to load shipment');
    }
  };

  const canAssign = shipment?.driverId && shipment?.vehicleId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await shipmentService.updateStatus(id, formData.status);
      navigate(`/shipments/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update shipment');
    } finally {
      setSaving(false);
    }
  };

  if (!shipment && error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/shipments/${id}`)} sx={{ mr: 2 }}>
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Update Shipment Status
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 4, boxShadow: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            disabled
            label="Tracking Number"
            value={shipment?.trackingNumber || ''}
            fullWidth
            sx={{ mb: 2 }}
          />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ status: e.target.value })}
                label="Status"
                disabled={!canAssign && formData.status === 'ASSIGNED'}
              >
                {SHIPMENT_STATUSES.map((status) => (
                  <MenuItem 
                    key={status} 
                    value={status}
                    disabled={status === 'ASSIGNED' && !canAssign}
                  >
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!canAssign && formData.status !== 'ASSIGNED' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Assign a driver and vehicle to enable ASSIGNED status.
              </Alert>
            )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate(`/shipments/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Update Status'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ShipmentEdit;
