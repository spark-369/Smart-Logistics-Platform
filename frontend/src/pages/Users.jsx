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
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ManageAccounts as UsersIcon,
  Refresh as RefreshIcon,
  FilterAltOff as ClearFiltersIcon,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import StatusChip from '../components/StatusChip';
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '../components/StateFeedback';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFeedback } from '../components/FeedbackProvider';
import { userService } from '../services/userService';
import { USER_ROLES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, orDash, unwrapPage } from '../utils/format';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { notifySuccess, notifyError } = useFeedback();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const data = roleFilter
          ? await userService.getByRole(roleFilter, page, rowsPerPage)
          : await userService.getAll(page, rowsPerPage);
        const { content, totalElements: total } = unwrapPage(data);
        setUsers(content);
        setTotalElements(total);
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load users.');
        setError(message);
        setUsers([]);
        setTotalElements(0);
        if (silent) notifyError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, rowsPerPage, roleFilter, notifyError],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    try {
      await userService.delete(deleteTarget.id);
      setDeleteTarget(null);
      notifySuccess('User deleted.');
      if (users.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        loadUsers();
      }
    } catch (err) {
      setDeleteTarget(null);
      const message = getErrorMessage(err, 'Failed to delete user.');
      setError(message);
      notifyError(message);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredUsers = useMemo(
    () =>
      term
        ? users.filter((user) =>
            [user.email, user.firstName, user.lastName, user.phoneNumber]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(term)),
          )
        : users,
    [users, term],
  );

  const hasFilters = Boolean(search || roleFilter);
  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setPage(0);
  };


  return (
    <>
      <PageHeader
        overline="Administration"
        title="Users"
        subtitle={`${totalElements} account${totalElements === 1 ? '' : 's'} — manage roles and access`}
        icon={<UsersIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadUsers({ silent: true })}
              disabled={refreshing || loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add user
            </Button>
          </Stack>
        }
      />

      <ErrorState message={error} title="Could not load users" onRetry={() => loadUsers()} />

      <InlineLoading active={refreshing} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <SearchInput
              fullWidth
              label="Search"
              placeholder="Name, email or phone"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All roles</MenuItem>
                {USER_ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <Button
              fullWidth
              variant="text"
              startIcon={<ClearFiltersIcon />}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={6} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No matching users' : 'No users yet'}
            description={
              hasFilters
                ? 'Try clearing the search box or role filter.'
                : 'Add the first user to get started.'
            }
            actionLabel={hasFilters ? 'Clear filters' : 'Add user'}
            onAction={hasFilters ? clearFilters : () => setCreateDialogOpen(true)}
          />
        ) : (
          <>
            <TableContainer sx={{ maxHeight: '65vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {orDash(`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim())}
                          </Typography>
                          {user.id === currentUser?.id && (
                            <Chip label="You" size="small" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{orDash(user.email)}</TableCell>
                      <TableCell>{orDash(user.phoneNumber)}</TableCell>
                      <TableCell>
                        <StatusChip value={user.role} domain="role" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.enabled ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={user.enabled ? 'success' : 'default'}
                          variant={user.enabled ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditDialogOpen(true);
                                }}
                                aria-label={`Edit user ${user.email}`}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip
                              title={
                                user.id === currentUser?.id
                                  ? 'You cannot delete your own account'
                                  : 'Delete'
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={user.id === currentUser?.id}
                                  onClick={() => setDeleteTarget(user)}
                                  aria-label={`Delete user ${user.email}`}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
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
        title="Delete user"
        content={`Delete ${deleteTarget?.email ?? 'this user'}? This action cannot be undone.`}
        confirmLabel="Delete user"
        requireText={deleteTarget?.email}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={() => {
          setCreateDialogOpen(false);
          notifySuccess('User created.');
          loadUsers();
        }}
      />

      <EditUserDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        user={selectedUser}
        onUpdated={() => {
          setEditDialogOpen(false);
          notifySuccess('User updated.');
          loadUsers();
        }}
      />
    </>
  );
};

const CreateUserDialog = ({ open, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'CUSTOMER',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'CUSTOMER',
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
      await userService.create(formData);
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle>Create user</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="firstName"
                label="First name"
                value={formData.firstName}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="lastName"
                label="Last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
          </Grid>
          <TextField
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            name="phoneNumber"
            label="Phone number"
            value={formData.phoneNumber}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
              {USER_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            name="password"
            label="Temporary password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            fullWidth
            helperText="At least 6 characters. Ask the user to change it after signing in."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !formData.email || !formData.password}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditUserDialog = ({ open, onClose, user, onUpdated }) => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'CUSTOMER',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      setFormData({
        email: user.email ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        phoneNumber: user.phoneNumber ?? '',
        role: user.role ?? 'CUSTOMER',
        enabled: user.enabled ?? true,
      });
      setError('');
    }
  }, [open, user]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      await userService.update(user.id, formData);
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle>Edit user</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="firstName"
                label="First name"
                value={formData.firstName}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="lastName"
                label="Last name"
                value={formData.lastName}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>
          </Grid>
          <TextField
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            name="phoneNumber"
            label="Phone number"
            value={formData.phoneNumber}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
              {USER_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={formData.enabled} onChange={handleChange} name="enabled" />}
            label="Account enabled"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Users;
