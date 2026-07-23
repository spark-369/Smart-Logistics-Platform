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
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as TrackingIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { shipmentService } from '../services/shipmentService';
import { ShipmentStatus } from '../constants';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  PENDING: 'warning',
  ASSIGNED: 'info',
  IN_TRANSIT: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

const Shipments = () => {
  const { isAdmin, isDispatcher, isCustomer } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadShipments = async () => {
    try {
      setLoading(true);
      let data;
      if (statusFilter) {
        data = await shipmentService.getByStatus(statusFilter, page, rowsPerPage);
      } else {
        data = await shipmentService.getAll(page, rowsPerPage);
      }
      setShipments(data.content || []);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [page, rowsPerPage, statusFilter]);

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
      await shipmentService.delete(deleteId);
      setDeleteId(null);
      loadShipments();
    } catch (err) {
      setError('Failed to delete shipment');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredShipments = shipments.filter((s) =>
    s.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.senderName?.toLowerCase().includes(search.toLowerCase()) ||
    s.receiverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Shipments
        </Typography>
        {(isAdmin() || isDispatcher() || isCustomer()) && (
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/shipments/create">
            New Shipment
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2, boxShadow: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Search shipments..."
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
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="ASSIGNED">Assigned</MenuItem>
                <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
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
                  <TableCell>Tracking #</TableCell>
                  <TableCell>Sender</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Origin</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', fontFamily: 'monospace' }}>
                        {shipment.trackingNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{shipment.senderName}</TableCell>
                    <TableCell>{shipment.receiverName}</TableCell>
                    <TableCell>{shipment.originCity}, {shipment.originCountry}</TableCell>
                    <TableCell>{shipment.destCity}, {shipment.destCountry}</TableCell>
                    <TableCell>
                      <Chip label={shipment.status} color={STATUS_COLORS[shipment.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="View" component={Link} to={`/shipments/${shipment.id}`}>
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Track" component={Link} to={`/shipments/${shipment.id}/tracking`}>
                        <TrackingIcon fontSize="small" />
                      </IconButton>
                      {isAdmin() && (
                        <IconButton size="small" title="Delete" onClick={() => setDeleteId(shipment.id)} color="error">
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
        title="Delete Shipment"
        content="Are you sure you want to delete this shipment? This action cannot be undone."
        loading={deleteLoading}
      />
    </Container>
  );
};

export default Shipments;
