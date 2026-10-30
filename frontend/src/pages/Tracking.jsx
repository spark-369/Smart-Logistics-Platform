import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
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
  DialogActions,
  TextField,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Timeline as TrackingIcon,
  Refresh as RefreshIcon,
  PlaceOutlined as LocationIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '../components/StateFeedback';
import { useFeedback } from '../components/FeedbackProvider';
import { trackingService } from '../services/trackingService';
import { shipmentService } from '../services/shipmentService';
import { useAuth } from '../context/AuthContext';
import { SHIPMENT_STATUSES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, humanize } from '../constants';
import { formatDateTime, getErrorMessage, orDash, unwrapPage } from '../utils/format';

const TrackingManagement = () => {
  const { user, isDriver, isDispatcher, isAdmin } = useAuth();
  const userRole = user?.role;
  const { notifySuccess, notifyError } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();

  const [shipments, setShipments] = useState([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [selectedShipmentId, setSelectedShipmentId] = useState(searchParams.get('shipmentId') ?? '');
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadShipments = useCallback(async () => {
    setShipmentsLoading(true);
    setError('');
    try {
      // GET /api/shipments is scoped by role server-side: an ADMIN/DISPATCHER sees everything, a
      // CUSTOMER sees only shipments they send or receive, and a DRIVER sees only shipments
      // assigned to them. One call therefore gives every role exactly the right list.
      //
      // Do NOT use /api/shipments/driver/{driverId} here: that endpoint is ADMIN/DISPATCHER-only
      // (by design, so a driver cannot enumerate another driver's work), so calling it as a DRIVER
      // always answers 403.
      const data = await shipmentService.getAll(0, 100);
      setShipments(unwrapPage(data).content);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load shipments.'));
      setShipments([]);
    } finally {
      setShipmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const loadEvents = useCallback(
    async ({ silent = false } = {}) => {
      if (!selectedShipmentId) return;
      if (silent) {
        setRefreshing(true);
      } else {
        setEventsLoading(true);
      }
      setError('');
      try {
        const data = await trackingService.getByShipmentIdPage(
          selectedShipmentId,
          page,
          rowsPerPage,
        );
        const { content, totalElements: total } = unwrapPage(data);
        setEvents(content);
        setTotalElements(total);
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load tracking events.');
        setError(message);
        setEvents([]);
        setTotalElements(0);
        if (silent) notifyError(message);
      } finally {
        setEventsLoading(false);
        setRefreshing(false);
      }
    },
    [selectedShipmentId, page, rowsPerPage, notifyError],
  );

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSelectShipment = (event) => {
    const value = event.target.value;
    setSelectedShipmentId(value);
    setPage(0);
    // Keep the selection in the URL so the view is shareable and refresh-safe.
    setSearchParams(value ? { shipmentId: value } : {});
  };

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const selectedShipment = shipments.find(
    (shipment) => String(shipment.id) === String(selectedShipmentId),
  );

  const canAddEvent = isDriver() || isDispatcher() || isAdmin();

  return (
    <>
      <PageHeader
        overline="Operations"
        title="Tracking management"
        subtitle="Review and append journey events for a shipment"
        icon={<TrackingIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadEvents({ silent: true })}
              disabled={refreshing || eventsLoading || !selectedShipmentId}
            >
              Refresh
            </Button>
            {canAddEvent && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                disabled={!selectedShipmentId}
              >
                Add event
              </Button>
            )}
          </Stack>
        }
      />

      <ErrorState message={error} onRetry={() => loadEvents()} />

      <InlineLoading active={refreshing} />

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Select shipment
        </Typography>
        {shipmentsLoading ? (
          <TableSkeleton rows={2} columns={3} />
        ) : shipments.length === 0 ? (
          <EmptyState
            title={userRole === 'DRIVER' ? 'No shipments assigned to you' : 'No shipments available'}
            description={
              userRole === 'DRIVER'
                ? 'A dispatcher has not assigned any shipments to you yet. Check back after your next dispatch.'
                : 'Create a shipment first, then return here to record its journey.'
            }
            minHeight={120}
          />
        ) : (
          <FormControl fullWidth>
            <InputLabel>Shipment</InputLabel>
            <Select value={selectedShipmentId} label="Shipment" onChange={handleSelectShipment}>
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {shipments.map((shipment) => (
                <MenuItem key={shipment.id} value={String(shipment.id)}>
                  {shipment.trackingNumber} — {shipment.originCity} → {shipment.destCity} (
                  {humanize(shipment.status)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {selectedShipment && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <StatusChip value={selectedShipment.status} domain="shipment" />
            <Typography variant="body2" color="text.secondary">
              {orDash(selectedShipment.senderName)} → {orDash(selectedShipment.receiverName)}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {orDash(selectedShipment.trackingNumber)}
            </Typography>
          </Stack>
        )}
      </Paper>

      {!selectedShipmentId ? (
        <EmptyState
          title="No shipment selected"
          description="Choose a shipment above to view its tracking history."
        />
      ) : eventsLoading ? (
        <Paper sx={{ overflow: 'hidden' }}>
          <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={4} />
        </Paper>
      ) : (
        <Paper sx={{ overflow: 'hidden' }}>
          {events.length === 0 ? (
            <EmptyState
              title="No tracking events yet"
              description="Append the first journey event for this shipment."
              actionLabel={canAddEvent ? 'Add event' : undefined}
              onAction={canAddEvent ? () => setCreateDialogOpen(true) : undefined}
            />
          ) : (
            <>
              <TableContainer sx={{ maxHeight: '60vh' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id} hover>
                        <TableCell>
                          <StatusChip value={event.status} domain="shipment" />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2">{orDash(event.location)}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{orDash(event.description)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {formatDateTime(event.timestamp)}
                          </Typography>
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
      )}

      <CreateTrackingEventDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        shipmentId={selectedShipmentId}
        onCreated={() => {
          setCreateDialogOpen(false);
          notifySuccess('Tracking event recorded.');
          loadEvents();
        }}
      />
    </>
  );
};

const CreateTrackingEventDialog = ({ open, onClose, shipmentId, onCreated }) => {
  const [formData, setFormData] = useState({ status: '', location: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the dialog is opened so stale values never leak between shipments.
  useEffect(() => {
    if (open) {
      setFormData({ status: '', location: '', description: '' });
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
      await trackingService.createEvent({
        shipmentId: Number(shipmentId),
        status: formData.status,
        location: formData.location,
        description: formData.description,
      });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create tracking event.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth disableRestoreFocus>
      <DialogTitle>Add tracking event</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} label="Status" onChange={handleChange}>
              {SHIPMENT_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {humanize(status)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            name="location"
            label="Location"
            value={formData.location}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={2}
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
          disabled={saving || !formData.status || !formData.location}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Add event'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrackingManagement;
