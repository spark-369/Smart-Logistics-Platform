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
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  SwapHoriz as StatusIcon,
  People as DriversIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import StatusChip from '../components/StatusChip';
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '../components/StateFeedback';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFeedback } from '../components/FeedbackProvider';
import { driverService } from '../services/driverService';
import { userService } from '../services/userService';
import { DRIVER_STATUSES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, humanize } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, orDash, unwrapPage } from '../utils/format';

const Drivers = () => {
  const { isAdmin } = useAuth();
  const admin = isAdmin();
  const { notifySuccess, notifyError } = useFeedback();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [users, setUsers] = useState([]);

  const loadDrivers = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const data = await driverService.getAll(page, rowsPerPage);
        const { content, totalElements: total } = unwrapPage(data);
        setDrivers(content);
        setTotalElements(total);
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load drivers.');
        setError(message);
        setDrivers([]);
        setTotalElements(0);
        if (silent) notifyError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, rowsPerPage, notifyError],
  );

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Only an admin can create driver profiles, so only they need the candidate list.
  useEffect(() => {
    if (!admin) return undefined;
    let cancelled = false;
    const loadUsers = async () => {
      try {
        const data = await userService.getLookup();
        if (!cancelled) setUsers((data ?? []).filter((user) => user.role === 'DRIVER'));
      } catch {
        if (!cancelled) setUsers([]);
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    try {
      await driverService.delete(deleteTarget.id);
      setDeleteTarget(null);
      notifySuccess('Driver profile deleted.');
      if (drivers.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        loadDrivers();
      }
    } catch (err) {
      setDeleteTarget(null);
      const message = getErrorMessage(err, 'Failed to delete driver.');
      setError(message);
      notifyError(message);
    }
  };

  const handleStatusChange = async (driverId, status) => {
    try {
      await driverService.updateStatus(driverId, status);
      setStatusTarget(null);
      notifySuccess(`Driver status updated to ${humanize(status)}.`);
      loadDrivers();
    } catch (err) {
      setStatusTarget(null);
      const message = getErrorMessage(err, 'Failed to update driver status.');
      setError(message);
      notifyError(message);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredDrivers = useMemo(
    () =>
      term
        ? drivers.filter((driver) =>
            [driver.userName, driver.email, driver.licenseNumber, driver.vehiclePlate]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(term)),
          )
        : drivers,
    [drivers, term],
  );

  return (
    <>
      <PageHeader
        overline="Fleet"
        title="Drivers"
        subtitle={`${totalElements} driver profile${totalElements === 1 ? '' : 's'}`}
        icon={<DriversIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadDrivers({ silent: true })}
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
                Add driver profile
              </Button>
            )}
          </Stack>
        }
      />

      <ErrorState message={error} title="Could not load drivers" onRetry={() => loadDrivers()} />

      <InlineLoading active={refreshing} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <SearchInput
          fullWidth
          label="Search"
          placeholder="Name, email, licence or plate"
          value={search}
          onChange={setSearch}
        />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={7} />
        ) : filteredDrivers.length === 0 ? (
          <EmptyState
            title={search ? 'No matching drivers' : 'No drivers yet'}
            description={
              search
                ? 'Try a different search term.'
                : admin
                  ? 'Create a driver profile for a user with the DRIVER role.'
                  : 'Driver profiles will appear here once created.'
            }
            actionLabel={search ? 'Clear search' : admin ? 'Add driver profile' : undefined}
            onAction={
              search ? () => setSearch('') : admin ? () => setCreateDialogOpen(true) : undefined
            }
          />
        ) : (
          <>
            <TableContainer sx={{ maxHeight: '65vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Driver</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Licence</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} hover>
                      <TableCell>{orDash(driver.userName)}</TableCell>
                      <TableCell>{orDash(driver.email)}</TableCell>
                      <TableCell>{orDash(driver.phoneNumber)}</TableCell>
                      <TableCell>{orDash(driver.licenseNumber)}</TableCell>
                      <TableCell>
                        <StatusChip value={driver.status} domain="driver" />
                      </TableCell>
                      <TableCell>{orDash(driver.vehiclePlate)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Change status">
                            <IconButton
                              size="small"
                              onClick={() => setStatusTarget(driver)}
                              aria-label={`Change status for ${driver.userName ?? 'driver'}`}
                            >
                              <StatusIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {admin && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(driver)}
                                aria-label={`Delete driver ${driver.userName ?? ''}`}
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
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete driver profile"
        content={`Delete the driver profile for ${deleteTarget?.userName ?? 'this driver'}? The user account itself is kept.`}
        confirmLabel="Delete profile"
      />

      <ChangeStatusDialog
        driver={statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
      />

      {admin && (
        <CreateDriverDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          users={users}
          onCreated={() => {
            setCreateDialogOpen(false);
            notifySuccess('Driver profile created.');
            loadDrivers();
          }}
        />
      )}
    </>
  );
};

const ChangeStatusDialog = ({ driver, onClose, onConfirm }) => {
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (driver) setStatus(driver.status ?? 'AVAILABLE');
  }, [driver]);

  const handleConfirm = async () => {
    if (!driver || !status) return;
    setSaving(true);
    try {
      await onConfirm(driver.id, status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(driver)} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Change driver status</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {driver?.userName} — currently {humanize(driver?.status)}
        </DialogContentText>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(event) => setStatus(event.target.value)}>
            {DRIVER_STATUSES.map((value) => (
              <MenuItem key={value} value={value}>
                {humanize(value)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {status === 'INACTIVE' && driver?.vehiclePlate && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This driver is assigned to {driver.vehiclePlate}. Unassign the vehicle first.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Update status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CreateDriverDialog = ({ open, onClose, users, onCreated }) => {
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUserId('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!userId) return;
    setError('');
    setSaving(true);
    try {
      await driverService.create(userId);
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create the driver profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Add driver profile</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}
        <DialogContentText sx={{ mb: 2 }}>
          Select a user with the DRIVER role to create a driver profile for.
        </DialogContentText>
        {users.length === 0 ? (
          <Alert severity="info">
            No users with the DRIVER role yet. Create one from the Users page first.
          </Alert>
        ) : (
          <FormControl fullWidth>
            <InputLabel>User</InputLabel>
            <Select value={userId} label="User" onChange={(event) => setUserId(event.target.value)}>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
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
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !userId}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Drivers;
