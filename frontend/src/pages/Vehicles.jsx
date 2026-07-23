import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  PersonAdd as AssignIcon,
  PersonRemove as UnassignIcon,
} from '@mui/icons-material';
import { driverService } from '../services/driverService';
import { vehicleService } from '../services/vehicleService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Vehicles = () => {
  const { isAdmin, isDispatcher } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignVehicleId, setAssignVehicleId] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getAll(page, rowsPerPage);
      setVehicles(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      const data = await driverService.getAvailable(0, 100);
      setAvailableDrivers(data.content || []);
    } catch (err) {
      console.error('Failed to load available drivers');
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [page, rowsPerPage]);

  useEffect(() => {
    loadAvailableDrivers();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await vehicleService.delete(deleteId);
      setDeleteId(null);
      loadVehicles();
    } catch (err) {
      setError('Failed to delete vehicle');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!assignVehicleId || !assignDriverId) return;
    setAssignLoading(true);
    try {
      await vehicleService.assignDriver(assignVehicleId, assignDriverId);
      setAssignDialogOpen(false);
      setAssignVehicleId(null);
      setAssignDriverId('');
      loadVehicles();
    } catch (err) {
      setError('Failed to assign driver');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignDriver = async (vehicleId) => {
    try {
      await vehicleService.unassignDriver(vehicleId);
      loadVehicles();
    } catch (err) {
      setError('Failed to unassign driver');
    }
  };

  const filteredVehicles = vehicles.filter((v) =>
    v.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Vehicles
        </Typography>
        {isAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Add Vehicle
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, boxShadow: 2 }}>
        <TextField
          fullWidth
          placeholder="Search vehicles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ boxShadow: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plate Number</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{vehicle.plateNumber}</TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell>{vehicle.vehicleType}</TableCell>
                    <TableCell>{vehicle.capacity} kg</TableCell>
                    <TableCell>
                      <Chip label={vehicle.status} size="small" color={vehicle.status === 'AVAILABLE' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{vehicle.driverName || 'Unassigned'}</TableCell>
                    <TableCell align="right">
                      {!vehicle.driverId && availableDrivers.length > 0 && (isDispatcher() || isAdmin()) && (
                        <IconButton
                          size="small"
                          title="Assign Driver"
                          onClick={() => {
                            setAssignVehicleId(vehicle.id);
                            setAssignDriverId('');
                            setAssignDialogOpen(true);
                          }}
                          color="primary"
                        >
                          <AssignIcon fontSize="small" />
                        </IconButton>
                      )}
                      {vehicle.driverId && (isDispatcher() || isAdmin()) && (
                        <IconButton
                          size="small"
                          title="Unassign Driver"
                          onClick={() => handleUnassignDriver(vehicle.id)}
                        >
                          <UnassignIcon fontSize="small" />
                        </IconButton>
                      )}
                      {isAdmin() && (
                        <IconButton size="small" title="Delete" onClick={() => setDeleteId(vehicle.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        content="Are you sure you want to delete this vehicle? This action cannot be undone."
        loading={deleteLoading}
      />

      <CreateVehicleDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={() => {
          setCreateDialogOpen(false);
          loadVehicles();
        }}
        availableDrivers={availableDrivers}
      />

      <AssignDriverDialog
        open={assignDialogOpen}
        onClose={() => {
          setAssignDialogOpen(false);
          setAssignVehicleId(null);
          setAssignDriverId('');
        }}
        onConfirm={handleAssignDriver}
        availableDrivers={availableDrivers}
        assignLoading={assignLoading}
        driverId={assignDriverId}
        onDriverChange={setAssignDriverId}
      />
    </Container>
  );
};

const AssignDriverDialog = ({ open, onClose, onConfirm, availableDrivers, assignLoading, driverId, onDriverChange }) => {
  const handleConfirm = () => {
    if (!driverId) return;
    onConfirm();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Assign Driver</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Select a driver to assign to this vehicle.
        </DialogContentText>
        <FormControl fullWidth>
          <InputLabel>Driver</InputLabel>
          <Select
            value={driverId}
            label="Driver"
            onChange={(e) => onDriverChange(e.target.value)}
          >
            {availableDrivers.map((driver) => (
              <MenuItem key={driver.id} value={driver.id}>
                {driver.userName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!driverId || assignLoading}>
          {assignLoading ? <CircularProgress size={24} color="inherit" /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CreateVehicleDialog = ({ open, onClose, onCreate, availableDrivers }) => {
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    vehicleType: '',
    capacity: '',
    status: 'AVAILABLE',
    driverId: '',
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
      await vehicleService.create({
        ...formData,
        capacity: Number(formData.capacity),
        driverId: formData.driverId ? Number(formData.driverId) : null,
      });
      setFormData({ plateNumber: '', model: '', vehicleType: '', capacity: '', status: 'AVAILABLE', driverId: '' });
      onCreate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create vehicle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Add New Vehicle</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField name="plateNumber" label="Plate Number" value={formData.plateNumber} onChange={handleChange} required fullWidth />
          <TextField name="model" label="Model" value={formData.model} onChange={handleChange} required fullWidth />
          <TextField name="vehicleType" label="Type" value={formData.vehicleType} onChange={handleChange} required fullWidth />
          <TextField name="capacity" label="Capacity (kg)" type="number" value={formData.capacity} onChange={handleChange} required fullWidth inputProps={{ min: 0 }} />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} label="Status" onChange={handleChange}>
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="IN_USE">In Use</MenuItem>
              <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Assign Driver (optional)</InputLabel>
            <Select name="driverId" value={formData.driverId} label="Assign Driver (optional)" onChange={handleChange}>
              <MenuItem value="">None</MenuItem>
              {availableDrivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.userName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

export default Vehicles;
