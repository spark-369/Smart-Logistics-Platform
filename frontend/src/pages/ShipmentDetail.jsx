import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Button,
  Divider,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Public as PublicIcon,
  ReceiptLong as DetailIcon,
} from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SectionCard, { DetailItem } from '../components/SectionCard';
import StatusChip from '../components/StatusChip';
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from '../components/StateFeedback';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFeedback } from '../components/FeedbackProvider';
import { shipmentService } from '../services/shipmentService';
import { trackingService } from '../services/trackingService';
import { useAuth } from '../context/AuthContext';
import {
  SHIPMENT_STATUSES,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  humanize,
} from '../constants';
import { formatDateTime, formatWeight, getErrorMessage, orDash, unwrapPage } from '../utils/format';

const CreateTrackingEventDialog = ({ open, onClose, shipmentId, onCreated }) => {
  const [formData, setFormData] = useState({ status: '', location: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isDispatcher } = useAuth();
  const { notifySuccess, notifyError } = useFeedback();
  const [shipment, setShipment] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);

  const loadShipment = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await shipmentService.getById(id);
      setShipment(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load shipment details'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEvents = useCallback(
    async (pageToUse = page, sizeToUse = rowsPerPage) => {
      setEventsLoading(true);
      try {
        const data = await trackingService.getByShipmentIdPage(id, pageToUse, sizeToUse);
        const { content, totalElements: total } = unwrapPage(data);
        setEvents(content);
        setTotalElements(total);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load tracking events'));
      } finally {
        setEventsLoading(false);
      }
    },
    [id, page, rowsPerPage],
  );

  useEffect(() => {
    loadShipment();
  }, [loadShipment]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await shipmentService.delete(id);
      notifySuccess('Shipment deleted.');
      navigate('/shipments');
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete shipment');
      setError(message);
      notifyError(message);
    } finally {
      setDeleteLoading(false);
      setDeleteDialog(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    loadEvents(newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
    loadEvents(0, newSize);
  };

  if (loading) {
    return (
      <>
        <PageHeader
          overline="Shipments"
          title="Shipment details"
          icon={<DetailIcon />}
          actions={
            <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate('/shipments')}>
              Back to shipments
            </Button>
          }
        />
        <LoadingState message="Loading shipment…" minHeight={320} />
      </>
    );
  }

  if (!shipment) {
    return (
      <>
        <PageHeader
          overline="Shipments"
          title="Shipment details"
          icon={<DetailIcon />}
          actions={
            <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate('/shipments')}>
              Back to shipments
            </Button>
          }
        />
        <ErrorState
          message={error || 'Shipment not found'}
          title="Could not load shipment"
          onRetry={loadShipment}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        overline="Shipments"
        title={shipment.trackingNumber}
        subtitle={`${orDash(shipment.originCity)} → ${orDash(shipment.destCity)}`}
        icon={<DetailIcon />}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate('/shipments')}>
              Back
            </Button>
            {/*
              The status is changed exclusively by recording a tracking event, so this button is the
              only status control on the page. Its role list mirrors POST /api/tracking
              (ADMIN, DISPATCHER, DRIVER) — omitting DISPATCHER here would leave dispatch staff with
              no way to progress a shipment.
            */}
            {(isAdmin() || isDispatcher() || user?.role === 'DRIVER') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateEventDialogOpen(true)}
              >
                Add event
              </Button>
            )}
            {isAdmin() && (
              <Button variant="outlined" color="error" onClick={() => setDeleteDialog(true)}>
                Delete
              </Button>
            )}
          </Stack>
        }
      />

      <ErrorState message={error} title="Something went wrong" />

      {/* Status banner */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <StatusChip value={shipment.status} domain="shipment" size="medium" />
          <Typography variant="caption" color="text.secondary">
            Created {formatDateTime(shipment.createdAt)}
          </Typography>
          {shipment.estimatedDelivery && (
            <Typography variant="caption" color="text.secondary">
              · Estimated delivery {formatDateTime(shipment.estimatedDelivery)}
            </Typography>
          )}
          {shipment.actualDelivery && (
            <Typography variant="caption" color="success.main">
              · Delivered {formatDateTime(shipment.actualDelivery)}
            </Typography>
          )}
        </Stack>
      </Paper>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Shipment information">
            <Stack spacing={1.5}>
              <DetailItem
                label="Tracking number"
                value={<span style={{ fontFamily: 'monospace' }}>{shipment.trackingNumber}</span>}
              />
              <Divider />
              <DetailItem label="Status" value={<StatusChip value={shipment.status} domain="shipment" />} />
              <Divider />
              <DetailItem label="Weight" value={formatWeight(shipment.weight)} />
              <Divider />
              <DetailItem label="Description" value={orDash(shipment.description)} />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Parties">
            <Stack spacing={1.5}>
              <DetailItem label="Sender" value={orDash(shipment.senderName)} />
              <Divider />
              <DetailItem label="Receiver" value={orDash(shipment.receiverName)} />
              <Divider />
              <DetailItem
                label="Driver"
                value={orDash(shipment.vehicleDriverName || shipment.driverName)}
              />
              <Divider />
              <DetailItem label="Vehicle" value={orDash(shipment.vehiclePlate)} />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Origin">
            <Typography variant="body1">{orDash(shipment.originStreet)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {orDash(shipment.originCity)}, {orDash(shipment.originState)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orDash(shipment.originCountry)}, {orDash(shipment.originZip)}
            </Typography>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Destination">
            <Typography variant="body1">{orDash(shipment.destStreet)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {orDash(shipment.destCity)}, {orDash(shipment.destState)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orDash(shipment.destCountry)}, {orDash(shipment.destZip)}
            </Typography>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SectionCard
            title="Tracking history"
            subtitle={`${totalElements} journey event${totalElements === 1 ? '' : 's'}`}
            action={
              <Button
                size="small"
                variant="outlined"
                startIcon={<PublicIcon />}
                component={Link}
                to={`/track/${shipment.trackingNumber}`}
              >
                Public view
              </Button>
            }
            disablePadding
          >
            {eventsLoading ? (
              <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={4} />
            ) : events.length === 0 ? (
              <EmptyState
                title="No tracking events yet"
                description="Journey events will appear here as the shipment progresses."
                minHeight={180}
              />
            ) : (
              <>
                <TableContainer sx={{ maxHeight: '50vh' }}>
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
                          <TableCell>{orDash(event.location)}</TableCell>
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
          </SectionCard>
        </Grid>
      </Grid>

      {isAdmin() && (
        <ConfirmDialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete shipment"
          content={`Delete shipment ${shipment.trackingNumber}? This action cannot be undone.`}
          loading={deleteLoading}
          confirmLabel="Delete shipment"
        />
      )}

      <CreateTrackingEventDialog
        open={createEventDialogOpen}
        onClose={() => setCreateEventDialogOpen(false)}
        shipmentId={id}
        onCreated={() => {
          setCreateEventDialogOpen(false);
          notifySuccess('Tracking event recorded.');
          loadEvents();
        }}
      />
    </>
  );
};

export default ShipmentDetail;
