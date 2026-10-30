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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  LocalShipping as TrackingIcon,
  Inventory2 as ShipmentsIcon,
  Refresh as RefreshIcon,
  FilterAltOff as ClearFiltersIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import StatusChip from '../components/StatusChip';
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '../components/StateFeedback';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFeedback } from '../components/FeedbackProvider';
import { shipmentService } from '../services/shipmentService';
import {
  SHIPMENT_STATUSES,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  humanize,
} from '../constants';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, getErrorMessage, orDash, unwrapPage } from '../utils/format';

const Shipments = () => {
  const navigate = useNavigate();
  const { isAdmin, isDispatcher, isCustomer } = useAuth();
  const { notifySuccess, notifyError } = useFeedback();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const loadShipments = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const data = statusFilter
          ? await shipmentService.getByStatus(statusFilter, page, rowsPerPage)
          : await shipmentService.getAll(page, rowsPerPage);
        const { content, totalElements: total } = unwrapPage(data);
        setShipments(content);
        setTotalElements(total);
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load shipments.');
        setError(message);
        setShipments([]);
        setTotalElements(0);
        if (silent) notifyError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, rowsPerPage, statusFilter, notifyError],
  );

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async () => {
    try {
      await shipmentService.delete(deleteId);
      setDeleteId(null);
      notifySuccess('Shipment deleted.');
      // Step back a page if the last row on this page was removed.
      if (shipments.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        loadShipments();
      }
    } catch (err) {
      setDeleteId(null);
      const message = getErrorMessage(err, 'Failed to delete shipment.');
      setError(message);
      notifyError(message);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredShipments = useMemo(
    () =>
      term
        ? shipments.filter((shipment) =>
            [shipment.trackingNumber, shipment.senderName, shipment.receiverName]
              .filter(Boolean)
              .some((value) => value.toLowerCase().includes(term)),
          )
        : shipments,
    [shipments, term],
  );

  const canCreate = isAdmin() || isDispatcher() || isCustomer();
  const hasFilters = Boolean(search || statusFilter);
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(0);
  };


  return (
    <>
      <PageHeader
        overline="Operations"
        title="Shipments"
        subtitle={`${totalElements} shipment${totalElements === 1 ? '' : 's'} visible to your role`}
        icon={<ShipmentsIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadShipments({ silent: true })}
              disabled={refreshing || loading}
            >
              Refresh
            </Button>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={Link}
                to="/shipments/create"
              >
                New shipment
              </Button>
            )}
          </Stack>
        }
      />

      <ErrorState message={error} title="Could not load shipments" onRetry={() => loadShipments()} />

      <InlineLoading active={refreshing} />

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <SearchInput
              fullWidth
              label="Search"
              placeholder="Tracking number, sender or receiver"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All statuses</MenuItem>
                {SHIPMENT_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {humanize(status)}
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
          <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={7} />
        ) : filteredShipments.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No matching shipments' : 'No shipments yet'}
            description={
              hasFilters
                ? 'Try clearing the search box or selecting a different status.'
                : canCreate
                  ? 'Create your first shipment to get started.'
                  : 'Shipments assigned to you will appear here.'
            }
            actionLabel={hasFilters ? 'Clear filters' : canCreate ? 'New shipment' : undefined}
            onAction={
              hasFilters ? clearFilters : canCreate ? () => navigate('/shipments/create') : undefined
            }
          />
        ) : (
          <>
            <TableContainer sx={{ maxHeight: '65vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Tracking #</TableCell>
                    <TableCell>Sender</TableCell>
                    <TableCell>Receiver</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredShipments.map((shipment) => (
                    <TableRow key={shipment.id} hover>
                      <TableCell>
                        <Typography
                          component={Link}
                          to={`/shipments/${shipment.id}`}
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: 'primary.main',
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {shipment.trackingNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{orDash(shipment.senderName)}</TableCell>
                      <TableCell>{orDash(shipment.receiverName)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {orDash(shipment.originCity)} → {orDash(shipment.destCity)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip value={shipment.status} domain="shipment" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {formatDateTime(shipment.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View details">
                            <IconButton
                              size="small"
                              component={Link}
                              to={`/shipments/${shipment.id}`}
                              aria-label={`View shipment ${shipment.trackingNumber}`}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {/* The old link pointed at /shipments/:id/tracking, which is not a
                              registered route and rendered a blank page. */}
                          <Tooltip title="Tracking history">
                            <IconButton
                              size="small"
                              component={Link}
                              to={`/tracking?shipmentId=${shipment.id}`}
                              aria-label={`Tracking history for ${shipment.trackingNumber}`}
                            >
                              <TrackingIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isAdmin() && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteId(shipment.id)}
                                aria-label={`Delete shipment ${shipment.trackingNumber}`}
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
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete shipment"
        content="Are you sure you want to delete this shipment? This action cannot be undone."
        confirmLabel="Delete shipment"
      />
    </>
  );
};

export default Shipments;
