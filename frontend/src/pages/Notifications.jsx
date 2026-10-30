import { useState, useEffect, useCallback } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  DoneAll as DoneAllIcon,
  MarkEmailRead as MarkReadIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StateFeedback';
import { useFeedback } from '../components/FeedbackProvider';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { userService } from '../services/userService';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';
import { formatDateTime, getErrorMessage, orDash, unwrapPage } from '../utils/format';

const Notifications = () => {
  const { user, isAdmin } = useAuth();
  const admin = isAdmin();
  const { notifySuccess, notifyError } = useFeedback();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await notificationService.getByUserId(user.id, page, rowsPerPage);
      const { content, totalElements: total } = unwrapPage(data);
      setNotifications(content);
      setTotalElements(total);

      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(Number(count) || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load notifications.'));
      setNotifications([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page, rowsPerPage]);
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Only administrators can compose notifications, so only they need the recipient list.
  useEffect(() => {
    if (!admin) return undefined;
    let cancelled = false;
    const loadUsers = async () => {
      try {
        const data = await userService.getLookup();
        if (!cancelled) setUsers(data ?? []);
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

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId, user.id);
      // Optimistic update keeps the list responsive.
      setNotifications((previous) =>
        previous.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      );
      setUnreadCount((count) => Math.max(count - 1, 0));
      notifySuccess('Notification marked as read.');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update the notification.');
      setError(message);
      notifyError(message);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      notifySuccess('All notifications marked as read.');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to mark all notifications as read.');
      setError(message);
      notifyError(message);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <PageHeader
        overline="Administration"
        title="Notifications"
        subtitle="Shipment and account updates addressed to you"
        icon={<NotificationsIcon />}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
            >
              {markingAll ? <CircularProgress size={20} color="inherit" /> : 'Mark all read'}
            </Button>
            {admin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                New notification
              </Button>
            )}
          </Stack>
        }
      />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" color="text.secondary">
            Unread
          </Typography>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              color={unreadCount ? 'error' : 'default'}
              variant={unreadCount ? 'filled' : 'outlined'}
            />
          </Badge>
          <Typography variant="caption" color="text.secondary">
            {totalElements} total notification{totalElements === 1 ? '' : 's'}
          </Typography>
        </Stack>
      </Paper>

      <ErrorState message={error} title="Could not load notifications" onRetry={() => loadNotifications()} />

      <Paper sx={{ overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={5} />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You are all caught up. New updates about your shipments will appear here."
          />
        ) : (
          <>
            <TableContainer sx={{ maxHeight: '65vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Received</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow
                      key={notification.id}
                      hover
                      sx={{ bgcolor: notification.read ? 'inherit' : 'action.hover' }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: notification.read ? 400 : 700 }}
                        >
                          {notification.title}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 380 }}>
                        <Typography variant="body2" color="text.secondary">
                          {orDash(notification.message)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {formatDateTime(notification.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={notification.read ? 'Read' : 'Unread'}
                          size="small"
                          color={notification.read ? 'default' : 'error'}
                          variant={notification.read ? 'outlined' : 'filled'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {!notification.read && (
                          <Tooltip title="Mark as read">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleMarkAsRead(notification.id)}
                              aria-label={`Mark notification "${notification.title}" as read`}
                            >
                              <MarkReadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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

      {admin && (
        <CreateNotificationDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          users={users}
          onCreate={() => {
            setCreateDialogOpen(false);
            notifySuccess('Notification sent.');
            loadNotifications();
          }}
        />
      )}
    </>
  );
};

const CreateNotificationDialog = ({ open, onClose, onCreate, users }) => {
  const [formData, setFormData] = useState({ title: '', message: '', userId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFormData({ title: '', message: '', userId: '' });
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
      await notificationService.create(formData.userId, formData.title, formData.message);
      onCreate();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create notification.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Create notification</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel>Send to</InputLabel>
            <Select name="userId" value={formData.userId} label="Send to" onChange={handleChange}>
              {users.map((recipient) => (
                <MenuItem key={recipient.id} value={recipient.id}>
                  {recipient.firstName} {recipient.lastName} ({recipient.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            name="title"
            label="Title"
            value={formData.title}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            name="message"
            label="Message"
            value={formData.message}
            onChange={handleChange}
            required
            fullWidth
            multiline
            rows={3}
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
          disabled={saving || !formData.userId || !formData.title || !formData.message}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Send'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Notifications;
