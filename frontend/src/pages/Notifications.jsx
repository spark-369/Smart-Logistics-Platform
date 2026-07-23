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
  Grid,
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
  Check as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { userService } from '../services/userService';

const Notifications = () => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState([]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await notificationService.getByUserId(user.id, page, rowsPerPage);
      setNotifications(data.content || []);
      setTotalElements(data.totalElements || 0);
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [page, rowsPerPage, user?.id]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMarkAsRead = async (notificationId) => {
    setDeleteLoading(true);
    try {
      await notificationService.markAsRead(notificationId, user.id);
      setDeleteId(null);
      loadNotifications();
    } catch (err) {
      setError('Failed to update notification');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all as read');
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip label={`${unreadCount} unread`} color="primary" size="small" />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {unreadCount > 0 && (
            <Button variant="outlined" size="small" onClick={handleMarkAllRead}>
              Mark All Read
            </Button>
          )}
          {isAdmin() && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { loadUsers(); setCreateDialogOpen(true); }}>
              Create
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                  <TableCell>Title</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Read</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id} hover sx={{ bgcolor: notification.read ? 'inherit' : 'action.hover' }}>
                    <TableCell sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>{notification.title}</TableCell>
                    <TableCell>{notification.message}</TableCell>
                    <TableCell>
                      <Chip label={notification.read ? 'Yes' : 'No'} size="small" color={notification.read ? 'default' : 'error'} />
                    </TableCell>
                    <TableCell>{new Date(notification.createdAt).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      {!notification.read && (
                        <IconButton size="small" title="Mark as read" onClick={() => handleMarkAsRead(notification.id)} color="primary">
                          <CheckIcon fontSize="small" />
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

      {isAdmin() && (
        <CreateNotificationDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreate={() => {
            setCreateDialogOpen(false);
            loadNotifications();
          }}
          users={users}
        />
      )}
    </Container>
  );
};

const CreateNotificationDialog = ({ open, onClose, onCreate, users }) => {
  const [formData, setFormData] = useState({ title: '', message: '', userId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await notificationService.create(formData.userId, formData.title, formData.message);
      setFormData({ title: '', message: '', userId: '' });
      onCreate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create notification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Create Notification</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel>Send To</InputLabel>
            <Select name="userId" value={formData.userId} label="Send To" onChange={handleChange}>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField name="title" label="Title" value={formData.title} onChange={handleChange} required fullWidth />
          <TextField name="message" label="Message" value={formData.message} onChange={handleChange} required fullWidth multiline rows={3} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !formData.userId}>
          {saving ? <CircularProgress size={24} color="inherit" /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Notifications;
