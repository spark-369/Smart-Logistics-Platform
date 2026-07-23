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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { driverService } from '../services/driverService';
import { userService } from '../services/userService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const Drivers = () => {
  const { isAdmin, isDispatcher } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await driverService.getAll(page, rowsPerPage);
      setDrivers(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await userService.getLookup();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [page, rowsPerPage]);

  useEffect(() => {
    loadUsers();
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
      await driverService.delete(deleteId);
      setDeleteId(null);
      loadDrivers();
    } catch (err) {
      setError('Failed to delete driver');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateDriver = async (userId) => {
    try {
      await driverService.create(userId);
      setCreateDialogOpen(false);
      loadDrivers();
    } catch (err) {
      setError('Failed to create driver profile');
    }
  };

  const filteredDrivers = drivers.filter((d) =>
    d.userName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Drivers
        </Typography>
        {isAdmin() && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            Add Driver
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, boxShadow: 2 }}>
        <TextField
          fullWidth
          placeholder="Search drivers..."
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
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>License</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} hover>
                    <TableCell>{driver.userName}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.phoneNumber}</TableCell>
                    <TableCell>{driver.licenseNumber}</TableCell>
                    <TableCell>
                      <Chip label={driver.status} size="small" color={driver.status === 'AVAILABLE' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{driver.vehiclePlate || 'N/A'}</TableCell>
                    <TableCell align="right">
                      {isAdmin() && (
                        <IconButton size="small" title="Delete" onClick={() => setDeleteId(driver.id)} color="error">
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
        title="Delete Driver"
        content="Are you sure you want to delete this driver profile? This action cannot be undone."
        loading={deleteLoading}
      />

      <CreateDriverDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        users={users}
        onCreate={handleCreateDriver}
      />
    </Container>
  );
};

const CreateDriverDialog = ({ open, onClose, users, onCreate }) => {
  const [userId, setUserId] = useState('');

  const handleSubmit = () => {
    if (userId) {
      onCreate(userId);
      setUserId('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Add Driver Profile</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Select a user to assign as a driver.
        </DialogContentText>
        <FormControl fullWidth>
          <InputLabel>User</InputLabel>
          <Select
            value={userId}
            label="User"
            onChange={(e) => setUserId(e.target.value)}
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!userId}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Drivers;
