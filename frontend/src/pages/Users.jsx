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
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { userService } from '../services/userService';
import ConfirmDialog from '../components/ConfirmDialog';

const ROLES = ['ADMIN', 'DISPATCHER', 'DRIVER', 'CUSTOMER'];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let data;
      if (roleFilter) {
        data = await userService.getByRole(roleFilter, page, rowsPerPage);
      } else {
        data = await userService.getAll(page, rowsPerPage);
      }
      setUsers(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, roleFilter]);

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
      await userService.delete(deleteId);
      setDeleteId(null);
      loadUsers();
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Users
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Add User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, boxShadow: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Search users..."
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
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={roleFilter}
                label="Filter by Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
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
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" color={user.role === 'ADMIN' ? 'secondary' : 'default'} />
                    </TableCell>
                    <TableCell>{user.phoneNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={user.enabled ? 'Yes' : 'No'} size="small" color={user.enabled ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEdit(user)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteId(user.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
        title="Delete User"
        content="Are you sure you want to delete this user? This action cannot be undone."
        loading={deleteLoading}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={() => {
          setCreateDialogOpen(false);
          loadUsers();
        }}
      />

      <EditUserDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        user={selectedUser}
        onUpdate={() => {
          setEditDialogOpen(false);
          loadUsers();
        }}
      />
    </Container>
  );
};

const CreateUserDialog = ({ open, onClose, onCreate }) => {
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await userService.create(formData);
      setFormData({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '', role: 'CUSTOMER' });
      onCreate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Add New User</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField name="firstName" label="First Name" value={formData.firstName} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField name="lastName" label="Last Name" value={formData.lastName} onChange={handleChange} required fullWidth />
            </Grid>
          </Grid>
          <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required fullWidth />
          <TextField name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required fullWidth />
          <TextField name="phoneNumber" label="Phone Number" value={formData.phoneNumber} onChange={handleChange} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
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

const EditUserDialog = ({ open, onClose, user, onUpdate }) => {
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
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role || 'CUSTOMER',
        enabled: user.enabled ?? true,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const target = e.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      await userService.update(user.id, formData);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField name="firstName" label="First Name" value={formData.firstName} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField name="lastName" label="Last Name" value={formData.lastName} onChange={handleChange} required fullWidth />
            </Grid>
          </Grid>
          <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required fullWidth />
          <TextField name="phoneNumber" label="Phone Number" value={formData.phoneNumber} onChange={handleChange} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>{role}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formData.enabled}
                onChange={handleChange}
                name="enabled"
              />
            }
            label="Enabled"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Users;
