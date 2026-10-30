import { useState, useEffect, useCallback } from 'react';
import {
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
  Divider,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useFeedback } from '../components/FeedbackProvider';
import { useAuth } from '../context/AuthContext';
import { shipmentService } from '../services/shipmentService';
import { userService } from '../services/userService';
import { vehicleService } from '../services/vehicleService';
import { getErrorMessage } from '../utils/format';

const ShipmentCreate = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isDispatcher } = useAuth();
  const { notifySuccess, notifyError } = useFeedback();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    senderId: '',
    receiverId: '',
    originStreet: '',
    originCity: '',
    originState: '',
    originCountry: '',
    originZip: '',
    destStreet: '',
    destCity: '',
    destState: '',
    destCountry: '',
    destZip: '',
    weight: '',
    description: '',
    vehicleId: '',
  });

  useEffect(() => {
    if (users.length > 0 && user?.id) {
      setFormData((prev) => ({ ...prev, senderId: String(user.id) }));
    }
  }, [users, user]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await userService.getLookup();
      setUsers(data || []);
    } catch (err) {
      // Previously swallowed with console.error, which left the dropdowns silently empty.
      setError(getErrorMessage(err, 'Failed to load the list of users.'));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const data = await vehicleService.getAssignable(0, 100);
      setVehicles(data.content || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load assignable vehicles.'));
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    if (isAdmin() || isDispatcher()) {
      loadVehicles();
    }
  }, [loadUsers, loadVehicles, isAdmin, isDispatcher]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (String(formData.senderId) === String(formData.receiverId)) {
      setError('Sender and receiver must be different users.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        senderId: Number(formData.senderId),
        receiverId: Number(formData.receiverId),
        weight: formData.weight ? Number(formData.weight) : null,
        vehicleId: formData.vehicleId ? Number(formData.vehicleId) : null,
      };
      const created = await shipmentService.create(payload);
      notifySuccess(
        created?.trackingNumber
          ? `Shipment ${created.trackingNumber} created.`
          : 'Shipment created.',
      );
      navigate('/shipments');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create shipment');
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <PageHeader
        overline="Shipments"
        title="Create shipment"
        subtitle="Book a new consignment and optionally assign a vehicle"
        icon={<AddIcon />}
        actions={
          <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate('/shipments')}>
            Back to shipments
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Sender &amp; Receiver
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sender and receiver must be two different accounts.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Sender</InputLabel>
                <Select
                  name="senderId"
                  value={formData.senderId}
                  onChange={handleChange}
                  label="Sender"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Receiver</InputLabel>
                <Select
                  name="receiverId"
                  value={formData.receiverId}
                  onChange={handleChange}
                  label="Receiver"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {(isAdmin() || isDispatcher()) && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                Vehicle
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Optional at booking time; a dispatcher can assign it later.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth disabled={loadingVehicles}>
                    <InputLabel>Assign Vehicle (optional)</InputLabel>
                    <Select
                      name="vehicleId"
                      value={formData.vehicleId}
                      onChange={handleChange}
                      label="Assign Vehicle (optional)"
                    >
                      <MenuItem value="">None</MenuItem>
                      {vehicles.map((vehicle) => (
                        <MenuItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plateNumber} - {vehicle.model}{' '}
                          {vehicle.driverName ? `(${vehicle.driverName})` : '(No driver)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Origin Address
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="originStreet"
                label="Street"
                value={formData.originStreet}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="originCity"
                label="City"
                value={formData.originCity}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="originState"
                label="State"
                value={formData.originState}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="originCountry"
                label="Country"
                value={formData.originCountry}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="originZip"
                label="Zip Code"
                value={formData.originZip}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Destination Address
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="destStreet"
                label="Street"
                value={formData.destStreet}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="destCity"
                label="City"
                value={formData.destCity}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                name="destState"
                label="State"
                value={formData.destState}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="destCountry"
                label="Country"
                value={formData.destCountry}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                name="destZip"
                label="Zip Code"
                value={formData.destZip}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Additional Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                name="weight"
                label="Weight (kg)"
                type="number"
                value={formData.weight}
                onChange={handleChange}
                fullWidth
                slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="flex-end"
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button variant="outlined" onClick={() => navigate('/shipments')} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? undefined : <SaveIcon />}
              disabled={saving || loadingUsers}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Create shipment'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </>
  );
};

export default ShipmentCreate;
