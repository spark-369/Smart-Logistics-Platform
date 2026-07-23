import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  LocalShipping as TrackingIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { shipmentService } from '../services/shipmentService';
import { trackingService } from '../services/trackingService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  IN_TRANSIT: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

const TRACKING_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

const CreateTrackingEventDialog = ({ open, onClose, shipmentId, onCreated }) => {
  const [formData, setFormData] = useState({
    status: '',
    location: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await trackingService.createEvent({
        shipmentId: Number(shipmentId),
        ...formData,
      });
      setFormData({ status: '', location: '', description: '' });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tracking event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Add Tracking Event</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} label="Status" onChange={handleChange}>
              {TRACKING_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField name="location" label="Location" value={formData.location} onChange={handleChange} required fullWidth />
          <TextField name="description" label="Description" value={formData.description} onChange={handleChange} fullWidth multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isDispatcher } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);

  useEffect(() => {
    loadShipment();
    loadEvents();
  }, [id]);

  const loadShipment = async () => {
    try {
      const data = await shipmentService.getById(id);
      setShipment(data);
    } catch (err) {
      setError('Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (pageToUse = page, sizeToUse = rowsPerPage) => {
    try {
      const data = await trackingService.getByShipmentIdPage(id, pageToUse, sizeToUse);
      setEvents(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError('Failed to load tracking events');
    } finally {
      setEventsLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await shipmentService.delete(id);
      navigate('/shipments');
    } catch (err) {
      setError('Failed to delete shipment');
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    loadEvents(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    loadEvents(0, newSize);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!shipment) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Shipment not found'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/shipments')} sx={{ mr: 2 }}>
            Back
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Shipment Details
          </Typography>
        </Box>
        {(isAdmin() || isDispatcher()) && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<EditIcon />} component={Link} to={`/shipments/${id}/edit`}>
              Edit
            </Button>
            {isAdmin() && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCreateEventDialogOpen(true)}
              >
                Add Event
              </Button>
            )}
            {isAdmin() && (
              <Button variant="outlined" color="error" onClick={() => setDeleteDialog(true)}>
                Delete
              </Button>
            )}
          </Box>
        )}
        {user?.role === 'DRIVER' && !isAdmin() && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateEventDialogOpen(true)}
            >
              Add Event
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Shipment Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Tracking Number:</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{shipment.trackingNumber}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Status:</Typography>
              <Chip label={shipment.status} color={STATUS_COLORS[shipment.status] || 'default'} size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Weight:</Typography>
              <Typography>{shipment.weight} kg</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Description:</Typography>
              <Typography sx={{ textAlign: 'right', maxWidth: '60%' }}>{shipment.description || 'N/A'}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Parties
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Sender:</Typography>
              <Typography>{shipment.senderName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Receiver:</Typography>
              <Typography>{shipment.receiverName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="textSecondary">Driver:</Typography>
              <Typography>{shipment.vehicleDriverName || shipment.driverName || 'Unassigned'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="textSecondary">Vehicle:</Typography>
              <Typography>{shipment.vehiclePlate || 'N/A'}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Origin
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>{shipment.originStreet}</Typography>
            <Typography>{shipment.originCity}, {shipment.originState}</Typography>
            <Typography>{shipment.originCountry}, {shipment.originZip}</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              Destination
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography>{shipment.destStreet}</Typography>
            <Typography>{shipment.destCity}, {shipment.destState}</Typography>
            <Typography>{shipment.destCountry}, {shipment.destZip}</Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tracking History
            </Typography>
            {eventsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="textSecondary" sx={{ py: 3 }}>No tracking events found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => (
                        <TableRow key={event.id} hover>
                          <TableCell>
                            <Chip label={event.status} size="small" color="primary" />
                          </TableCell>
                          <TableCell>{event.location}</TableCell>
                          <TableCell>{event.description}</TableCell>
                          <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalElements}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </Grid>
      </Grid>

      {isAdmin() && (
        <ConfirmDialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Shipment"
          content="Are you sure you want to delete this shipment? This action cannot be undone."
          loading={deleteLoading}
        />
      )}

      <CreateTrackingEventDialog
        open={createEventDialogOpen}
        onClose={() => setCreateEventDialogOpen(false)}
        shipmentId={id}
        onCreated={() => {
          setCreateEventDialogOpen(false);
          loadEvents();
        }}
      />
    </Container>
  );
};

export default ShipmentDetail;
