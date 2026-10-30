import { useState, useEffect, useCallback, useMemo } from 'react';
import {
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
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as AssignIcon,
  PersonRemove as UnassignIcon,
  DirectionsCar as VehiclesIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import StatusChip from '../components/StatusChip';
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '../components/StateFeedback';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFeedback } from '../components/FeedbackProvider';
import { driverService } from '../services/driverService';
import { vehicleService } from '../services/vehicleService';
import { VEHICLE_STATUSES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, humanize } from '../constants';
import { useAuth } from '../context/AuthContext';
import { formatWeight, getErrorMessage, orDash, unwrapPage } from '../utils/format';

const Vehicles = () => {
  const { isAdmin } = useAuth();
  const admin = isAdmin();
  const { notifySuccess, notifyError } = useFeedback();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState('');

  const loadVehicles = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const data = await vehicleService.getAll(page, rowsPerPage);
        const { content, totalElements: total } = unwrapPage(data);
        setVehicles(content);
        setTotalElements(total);
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load vehicles.');
        setError(message);
        setVehicles([]);
        setTotalElements(0);
        if (silent) notifyError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, rowsPerPage, notifyError],
  );


  const loadAvailableDrivers = useCallback(async () => {
    try {
      const data = await driverService.getAvailable(0, 100);
      setAvailableDrivers(unwrapPage(data).content);
    } catch {
      setAvailableDrivers([]);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadAvailableDrivers();
  }, [loadAvailableDrivers]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    try {
      await vehicleService.delete(deleteTarget.id);
      setDeleteTarget(null);
      notifySuccess('Vehicle deleted.');
      if (vehicles.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        loadVehicles();
      }
    } catch (err) {
      setDeleteTarget(null);
      const message = getErrorMessage(err, 'Failed to delete vehicle.');
      setError(message);
      notifyError(message);
    }
  };

  const handleUnassign = async () => {
    try {
      await vehicleService.unassignDriver(unassignTarget.id);
      setUnassignTarget(null);
      notifySuccess('Driver unassigned. The vehicle is now available.');
      loadVehicles();
      loadAvailableDrivers();
    } catch (err) {
      setUnassignTarget(null);
      const message = getErrorMessage(err, 'Failed to unassign the driver.');
      setError(message);
      notifyError(message);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignDriverId) return;
    try {
      await vehicleService.assignDriver(assignTarget.id, assignDriverId);
      setAssignTarget(null);
      setAssignDriverId('');
      notifySuccess('Driver assigned to the vehicle.');
      loadVehicles();
      loadAvailableDrivers();
    } catch (err) {
      setAssignTarget(null);
      const message = getErrorMessage(err, 'Failed to assign the driver.');
      setError(message);
      notifyError(message);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredVehicles = useMemo(
    () =>
      term
        ? vehicles.filter((vehicle) =>
            [vehicle.plateNumber, vehicle.model, vehicle.vehicleType, vehicle.driverName]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(term)),
          )
        : vehicles,
    [vehicles, term],
  );


  return (
    <>
      <PageHeader
        overline="Fleet"
        title="Vehicles"
        subtitle={`${totalElements} vehicle${totalElements === 1 ? '' : 's'} in the fleet`}
        icon={<VehiclesIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                loadVehicles({ silent: true });
                loadAvailableDrivers();
              }}
              disabled={refreshing || loading}
            >
              Refresh
            </Button>
            {admin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Add vehicle
              </Button>
            )}
          </Stack>
        }
      />

      <ErrorState message={error} title="Could not load vehicles" onRetry={() => loadVehicles()} />

      <InlineLoading active={refreshing} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <SearchInput
          fullWidth
          label="Search"
          placeholder="Plate, model, type or driver"
          value={search}
          onChange={setSearch}
        />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={7} />
        ) : filteredVehicles.length === 0 ? (
          <EmptyState
            title={search ? 'No matching vehicles' : 'No vehicles yet'}
            description={
              search
                ? 'Try a different search term.'
                : admin
                  ? 'Add the first vehicle to the fleet.'
                  : 'Vehicles will appear here once added.'
            }
            actionLabel={search ? 'Clear search' : admin ? 'Add vehicle' : undefined}
            onAction={
              search ? () => setSearch('') : admin ? () => setCreateDialogOpen(true) : undefined
            }
          />
        ) : (
          <VehicleTable
            vehicles={filteredVehicles}
            admin={admin}
            totalElements={totalElements}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            onAssign={(vehicle) => {
              setAssignTarget(vehicle);
              setAssignDriverId('');
            }}
            onUnassign={setUnassignTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete vehicle"
        content={`Delete vehicle ${deleteTarget?.plateNumber ?? ''}? This action cannot be undone.`}
        confirmLabel="Delete vehicle"
      />

      <ConfirmDialog
        open={Boolean(unassignTarget)}
        onClose={() => setUnassignTarget(null)}
        onConfirm={handleUnassign}
        title="Unassign driver"
        content={`Remove ${unassignTarget?.driverName ?? 'the driver'} from ${unassignTarget?.plateNumber ?? 'this vehicle'}? The vehicle will become available.`}
        confirmLabel="Unassign"
        confirmColor="warning"
      />

      <AssignDriverDialog
        vehicle={assignTarget}
        drivers={availableDrivers}
        driverId={assignDriverId}
        onDriverChange={setAssignDriverId}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssign}
      />

      {admin && (
        <CreateVehicleDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          availableDrivers={availableDrivers}
          onCreated={() => {
            setCreateDialogOpen(false);
            notifySuccess('Vehicle added to the fleet.');
            loadVehicles();
            loadAvailableDrivers();
          }}
        />
      )}
    </>
  );
};


const VehicleTable = ({
  vehicles,
  admin,
  totalElements,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onAssign,
  onUnassign,
  onDelete,
}) => (
  <>
    <TableContainer sx={{ maxHeight: '65vh' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Plate</TableCell>
            <TableCell>Model</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Capacity</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Driver</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {orDash(vehicle.plateNumber)}
                </Typography>
              </TableCell>
              <TableCell>{orDash(vehicle.model)}</TableCell>
              <TableCell>{orDash(vehicle.vehicleType)}</TableCell>
              <TableCell>{formatWeight(vehicle.capacity)}</TableCell>
              <TableCell>
                <StatusChip value={vehicle.status} domain="vehicle" />
              </TableCell>
              <TableCell>{orDash(vehicle.driverName)}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {vehicle.driverId ? (
                    <Tooltip title="Unassign driver">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => onUnassign(vehicle)}
                        aria-label={`Unassign driver from ${vehicle.plateNumber}`}
                      >
                        <UnassignIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Assign driver">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onAssign(vehicle)}
                        aria-label={`Assign driver to ${vehicle.plateNumber}`}
                      >
                        <AssignIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {admin && (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(vehicle)}
                        aria-label={`Delete vehicle ${vehicle.plateNumber}`}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      rowsPerPageOptions={PAGE_SIZE_OPTIONS}
      component="div"
      count={totalElements}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={onPageChange}
      onRowsPerPageChange={onRowsPerPageChange}
    />
  </>
);

const AssignDriverDialog = ({ vehicle, drivers, driverId, onDriverChange, onClose, onConfirm }) => {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(vehicle)} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Assign driver</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Assign an available driver to {vehicle?.plateNumber}.
        </DialogContentText>
        {drivers.length === 0 ? (
          <Alert severity="info">
            No available drivers. Unassign a driver from another vehicle first.
          </Alert>
        ) : (
          <FormControl fullWidth>
            <InputLabel>Driver</InputLabel>
            <Select
              value={driverId}
              label="Driver"
              onChange={(event) => onDriverChange(event.target.value)}
            >
              {drivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.userName} ({driver.licenseNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={saving || !driverId}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CreateVehicleDialog = ({ open, onClose, onCreate, availableDrivers, onCreated }) => {
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

  useEffect(() => {
    if (open) {
      setFormData({
        plateNumber: '',
        model: '',
        vehicleType: '',
        capacity: '',
        status: 'AVAILABLE',
        driverId: '',
      });
      setError('');
    }
  }, [open]);

  const handleChange = (event) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await vehicleService.create({
        plateNumber: formData.plateNumber,
        model: formData.model,
        vehicleType: formData.vehicleType,
        capacity: Number(formData.capacity),
        // The backend forces IN_USE when a driver is supplied, so an explicit status is only
        // meaningful for a driverless vehicle.
        status: formData.driverId ? 'IN_USE' : formData.status,
        driverId: formData.driverId ? Number(formData.driverId) : null,
      });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create vehicle.'));
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    formData.plateNumber && formData.model && formData.vehicleType && Number(formData.capacity) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle>Add vehicle</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            name="plateNumber"
            label="Plate number"
            value={formData.plateNumber}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            name="model"
            label="Model"
            value={formData.model}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            name="vehicleType"
            label="Type"
            value={formData.vehicleType}
            onChange={handleChange}
            required
            fullWidth
            placeholder="e.g. TRUCK, VAN"
          />
          <TextField
            name="capacity"
            label="Capacity (kg)"
            type="number"
            value={formData.capacity}
            onChange={handleChange}
            required
            fullWidth
            slotProps={{ htmlInput: { min: 1, step: '0.01' } }}
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} label="Status" onChange={handleChange}>
              {VEHICLE_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {humanize(status)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Assign driver (optional)</InputLabel>
            <Select
              name="driverId"
              value={formData.driverId}
              label="Assign driver (optional)"
              onChange={handleChange}
            >
              <MenuItem value="">None</MenuItem>
              {availableDrivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.userName} ({driver.licenseNumber})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {formData.driverId && (
            <Alert severity="info">
              Assigning a driver puts the vehicle in use automatically.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !canSubmit}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Vehicles;
