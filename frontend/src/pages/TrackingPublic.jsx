import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Stack,
  Link as MuiLink,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as DeliveredIcon,
  Schedule as PendingIcon,
  PlaceOutlined as LocationIcon,
} from '@mui/icons-material';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import StatusChip from '../components/StatusChip';
import { EmptyState } from '../components/StateFeedback';
import { shipmentService } from '../services/shipmentService';
import { SHIPMENT_STATUSES } from '../constants';
import { formatDateTime, orDash, getErrorMessage } from '../utils/format';
import { GRADIENTS } from '../theme/tokens';

const PublicTracking = () => {
  const { trackingNumber } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialNumber = trackingNumber ?? searchParams.get('trackingNumber') ?? '';

  const [trackingNumberInput, setTrackingNumberInput] = useState(initialNumber);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = useCallback(async (value) => {
    const number = value?.trim();
    if (!number) {
      setError('Please enter a tracking number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Public, unauthenticated endpoint returning a redacted projection.
      const data = await shipmentService.getPublicTracking(number);
      setShipment(data);
    } catch (err) {
      setShipment(null);
      setError(
        err.response?.status === 404
          ? `No shipment found for tracking number "${number}".`
          : getErrorMessage(err, 'Unable to look up this shipment right now.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Support deep links such as /track/SLP-ABC12345.
  useEffect(() => {
    if (initialNumber) {
      lookup(initialNumber);
    }
  }, [initialNumber, lookup]);

  const handleTrack = (event) => {
    event.preventDefault();
    const number = trackingNumberInput.trim();
    // Keep the URL shareable so a customer can bookmark or forward the result page.
    setSearchParams(number ? { trackingNumber: number } : {});
    lookup(number);
  };

  const currentStep = shipment ? Math.max(SHIPMENT_STATUSES.indexOf(shipment.status), 0) : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3, mb: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                width: 60,
                height: 60,
                borderRadius: 2.5,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: GRADIENTS.brand,
                color: '#ffffff',
                mb: 1.5,
              }}
            >
              <ShippingIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h5" gutterBottom>
              Track your shipment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your tracking number to see the latest status. No account required.
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleTrack}
            sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}
          >
            <TextField
              fullWidth
              label="Tracking number"
              placeholder="SLP-XXXXXXXX"
              value={trackingNumberInput}
              onChange={(event) => setTrackingNumberInput(event.target.value)}
              disabled={loading}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ minWidth: { sm: 140 } }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Track'}
            </Button>
          </Box>

          {error && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            <MuiLink component={Link} to="/login" underline="hover">
              Sign in
            </MuiLink>{' '}
            for full shipment details and history.
          </Typography>
        </Paper>

        {shipment ? (
          <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tracking number
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                  {shipment.trackingNumber}
                </Typography>
              </Box>
              <StatusChip
                value={shipment.status}
                domain="shipment"
                size="medium"
                icon={
                  shipment.status === 'DELIVERED' ? (
                    <DeliveredIcon fontSize="small" />
                  ) : (
                    <PendingIcon fontSize="small" />
                  )
                }
              />
            </Stack>

            <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4 }}>
              {SHIPMENT_STATUSES.filter((status) => status !== 'CANCELLED').map((status) => (
                <Step key={status} completed={SHIPMENT_STATUSES.indexOf(status) <= currentStep}>
                  <StepLabel>{status.replace('_', ' ')}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary">
                    Origin
                  </Typography>
                  <Typography variant="body1">
                    {orDash(shipment.originCity)}, {orDash(shipment.originCountry)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary">
                    Destination
                  </Typography>
                  <Typography variant="body1">
                    {orDash(shipment.destCity)}, {orDash(shipment.destCountry)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary">
                    Estimated delivery
                  </Typography>
                  <Typography variant="body1">{formatDateTime(shipment.estimatedDelivery)}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary">
                    Delivered at
                  </Typography>
                  <Typography variant="body1">{formatDateTime(shipment.actualDelivery)}</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Journey history
            </Typography>
            {shipment.events?.length ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>When</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shipment.events.map((event) => (
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
            ) : (
              <Alert severity="info">No journey events have been recorded yet.</Alert>
            )}
          </Paper>
        ) : (
          !loading &&
          !error && (
            <EmptyState
              title="Ready when you are"
              description="Enter a tracking number above to see the current status and journey history."
            />
          )
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 3 }}
        >
          For privacy, public tracking shows only the shipment route and journey events.
        </Typography>
      </Container>
    </Box>
  );
};

export default PublicTracking;

