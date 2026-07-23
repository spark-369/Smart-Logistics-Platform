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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { trackingService } from '../services/trackingService';
import { shipmentService } from '../services/shipmentService';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

const TrackingManagement = () => {
  const { isDriver, isDispatcher } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadShipments = async () => {
    try {
      const data = await shipmentService.getAll(0, 100);
      setShipments(data.content || []);
    } catch (err) {
      console.error('Failed to load shipments');
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    if (selectedShipmentId) {
      loadEvents();
    }
  }, [selectedShipmentId, page, rowsPerPage]);

  const loadEvents = async () => {
    if (!selectedShipmentId) return;
    try {
      setEventsLoading(true);
      const data = await trackingService.getByShipmentIdPage(selectedShipmentId, page, rowsPerPage);
      setEvents(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError('Failed to load tracking events');
    } finally {
      setEventsLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Tracking Management
        </Typography>
        {(isDriver() || isDispatcher() || isAdmin()) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedShipmentId}
          >
            Add Event
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom>
          Select Shipment
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Shipment</InputLabel>
          <Select
            value={selectedShipmentId}
            label="Shipment"
            onChange={(e) => {
              setSelectedShipmentId(e.target.value);
              setPage(0);
            }}
          >
            {shipments.map((shipment) => (
              <MenuItem key={shipment.id} value={shipment.id}>
                {shipment.trackingNumber} - {shipment.senderName} to {shipment.receiverName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {selectedShipmentId && (
        <Paper sx={{ boxShadow: 2 }}>
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
                {eventsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
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
      )}

      <CreateTrackingEventDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        shipmentId={selectedShipmentId}
        onCreated={() => {
          setCreateDialogOpen(false);
          loadEvents();
        }}
      />
    </Container>
  );
};

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
              {STATUSES.map((status) => (
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

export default TrackingManagement;
