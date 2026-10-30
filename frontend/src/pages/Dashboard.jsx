import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Inventory2 as ShipmentsIcon,
  PendingActions as PendingIcon,
  LocalShipping as InTransitIcon,
  CheckCircle as DeliveredIcon,
  Cancel as CancelledIcon,
  People as UsersIcon,
  DirectionsCar as DriversIcon,
  DirectionsBus as VehiclesIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  Insights as InsightsIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatusChip from '../components/StatusChip';
import { CardGridSkeleton, EmptyState, ErrorState, InlineLoading } from '../components/StateFeedback';
import { useFeedback } from '../components/FeedbackProvider';
import { dashboardService } from '../services/dashboardService';
import { humanize, SHIPMENT_STATUSES } from '../constants';
import { DOMAIN_COLORS, CHART_FALLBACK_COLORS } from '../theme/tokens';
import { getErrorMessage } from '../utils/format';

const CHART_HEIGHT = 320;

/**
 * Horizontal bar chart reads far better than vertical for these category labels.
 *
 * "In Transit" / "Delivered" / "Cancelled" are long enough that a vertical bar chart needs either
 * rotated ticks or truncated text, and rotated labels collide with each other and with the axis.
 * A horizontal layout gives every label a full line of its own, so nothing can overlap regardless
 * of how many statuses the backend returns or how narrow the viewport is.
 */
const BAR_ROW_HEIGHT = 44;
const BAR_CHART_PADDING = 72;

/**
 * Themed tooltip.
 *
 * Recharts renders its default tooltip with an inline white background, which is unreadable in dark
 * mode and clashes with the card surface in light mode. Driving it from the MUI theme keeps it
 * consistent with every other surface in the app.
 */
const StatusTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const status = entry?.payload?.status;
  const color = DOMAIN_COLORS.shipment[status] ?? CHART_FALLBACK_COLORS[0];

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.5,
        py: 1,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {entry.payload?.name ?? status}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {entry.value} shipment{entry.value === 1 ? '' : 's'}
      </Typography>
    </Paper>
  );
};

/** Extracts the value of a stat, tolerating a missing stats payload. */
const num = (value) => Number(value ?? 0);

/**
 * Renders the percentage inside a pie slice.
 *
 * Recharts' default pie label is positioned *outside* the arc with a leader line, and those labels
 * overlap each other whenever several statuses hold similar small shares — which is the common case
 * here (five statuses, often a few shipments each). Placing the text at the midpoint of the slice
 * keeps it attached to its own arc, and skipping shares under 6% avoids text in slivers too thin to
 * hold it. Recharts resolves percentage radii to pixels before invoking this, so the trigonometry is
 * safe.
 */
const RADIAN = Math.PI / 180;

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { notifySuccess, notifyError } = useFeedback();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [chartMode, setChartMode] = useState('bar');

  const loadStats = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      try {
        const data = await dashboardService.getStats();
        setStats(data);
        if (silent) {
          notifySuccess('Dashboard statistics refreshed.');
        }
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load dashboard statistics.');
        setError(message);
        if (silent) {
          notifyError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [notifyError, notifySuccess],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /*
   * Order the bars by the canonical pipeline sequence (Pending → Assigned → In Transit → Delivered
   * → Cancelled) rather than by whatever order the backend map happens to serialise in. The API
   * builds `shipmentsByStatus` from a HashMap, so its key order is not stable between requests;
   * without this sort the bars would visibly reshuffle on every refresh.
   */
  const chartData = stats?.shipmentsByStatus
    ? Object.entries(stats.shipmentsByStatus)
        .map(([status, value]) => ({
          name: humanize(status),
          status,
          value: Number(value) || 0,
        }))
        .sort((a, b) => {
          const aIndex = SHIPMENT_STATUSES.indexOf(a.status);
          const bIndex = SHIPMENT_STATUSES.indexOf(b.status);
          // Unknown statuses (added server-side but not yet mirrored in the constants) sort last
          // instead of jumping to the front.
          return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
            (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
        })
    : [];

  const totalShipments = num(stats?.totalShipments);
  const hasData = chartData.some((entry) => entry.value > 0);

  const header = (
    <PageHeader
      overline="Operations"
      title="Dashboard"
      subtitle="Operational overview across shipments, fleet and people"
      icon={<DashboardIcon />}
      actions={
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => loadStats({ silent: true })}
          disabled={refreshing || loading}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <CardGridSkeleton count={6} />
      </>
    );
  }

  return (
    <>
      {header}

      <ErrorState message={error} title="Could not load statistics" onRetry={() => loadStats()} />

      <InlineLoading active={refreshing} />

      {totalShipments === 0 && !error && (
        <Paper
          sx={{
            p: { xs: 2.5, sm: 4 },
            mb: 3,
            textAlign: 'center',
            backgroundImage: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.10)}, ${alpha(
                theme.palette.secondary.main,
                0.10,
              )})`,
          }}
        >
          <InsightsIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            No shipment activity yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 520, mx: 'auto' }}>
            Statistics appear here as soon as the first shipment is booked. Create one to get the
            operational overview started.
          </Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={() => navigate('/shipments/create')}>
              Book a shipment
            </Button>
            <Button variant="outlined" onClick={() => navigate('/shipments')}>
              View all shipments
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Shipment metrics — clickable, each drills into the matching filtered list. */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Total shipments"
            value={totalShipments}
            color={DOMAIN_COLORS.shipment.IN_TRANSIT}
            icon={<ShipmentsIcon />}
            hint="All time"
            onClick={() => navigate('/shipments')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Pending"
            value={num(stats?.pendingShipments)}
            color={DOMAIN_COLORS.shipment.PENDING}
            icon={<PendingIcon />}
            hint="Awaiting dispatch"
            onClick={() => navigate('/shipments')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="In transit"
            value={num(stats?.inTransitShipments)}
            color={DOMAIN_COLORS.shipment.IN_TRANSIT}
            icon={<InTransitIcon />}
            hint="On the road"
            onClick={() => navigate('/shipments')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="Delivered"
            value={num(stats?.deliveredShipments)}
            color={DOMAIN_COLORS.shipment.DELIVERED}
            icon={<DeliveredIcon />}
            hint="Completed"
            onClick={() => navigate('/shipments')}
          />
        </Grid>
      </Grid>

      {/* People and fleet */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            title="Users"
            value={num(stats?.totalUsers)}
            color="secondary"
            icon={<UsersIcon />}
            hint="All platform accounts"
            onClick={() => navigate('/users')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            title="Drivers"
            value={num(stats?.totalDrivers)}
            color="primary"
            icon={<DriversIcon />}
            hint="Registered driver profiles"
            onClick={() => navigate('/drivers')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <StatCard
            title="Vehicles"
            value={num(stats?.totalVehicles)}
            color="info"
            icon={<VehiclesIcon />}
            hint="Fleet size"
            onClick={() => navigate('/vehicles')}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard
            title="Shipments by status"
            subtitle="Distribution of the current shipment pipeline"
            action={
              <ToggleButtonGroup
                size="small"
                exclusive
                value={chartMode}
                onChange={(_event, next) => next && setChartMode(next)}
                aria-label="Chart type"
              >
                <ToggleButton value="bar" aria-label="Bar chart">
                  <BarChartIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="pie" aria-label="Pie chart">
                  <PieChartIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            }
            sx={{ minHeight: 440 }}
          >
            {hasData ? (
              chartMode === 'bar' ? (
                /*
                 * Horizontal bars: category labels sit in a dedicated left-hand column, so a long
                 * label such as "In Transit" can never collide with its neighbour or with the axis.
                 * Height is derived from the row count so bars keep a constant thickness.
                 */
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(CHART_HEIGHT, chartData.length * BAR_ROW_HEIGHT + BAR_CHART_PADDING)}
                >
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
                    barCategoryGap="24%"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={96}
                      tick={{ fontSize: 12, fill: theme.palette.text.primary }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip cursor={{ fill: 'rgba(128,128,128,0.08)' }} content={<StatusTooltip />} />
                    <Bar dataKey="value" name="Shipments" radius={[0, 6, 6, 0]} maxBarSize={26}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={DOMAIN_COLORS.shipment[entry.status] ?? CHART_FALLBACK_COLORS[0]}
                        />
                      ))}
                      {/* Print the count at the end of each bar so the value needs no hover. */}
                      <LabelList
                        dataKey="value"
                        position="right"
                        offset={8}
                        fill={theme.palette.text.primary}
                        fontSize={12}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="48%"
                      labelLine={false}
                      label={renderPieLabel}
                      outerRadius="72%"
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={entry.status}
                          fill={
                            DOMAIN_COLORS.shipment[entry.status] ??
                            CHART_FALLBACK_COLORS[index % CHART_FALLBACK_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<StatusTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )
            ) : (
              <EmptyState
                title="No data available"
                description="Status breakdown appears once shipments exist."
                minHeight={CHART_HEIGHT}
              />
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard
            title="Status breakdown"
            subtitle="Exact counts per pipeline stage"
            sx={{ minHeight: 440 }}
          >
            <Stack divider={<Divider flexItem />} spacing={1.5}>
              {chartData.map((entry) => {
                const share = totalShipments ? (entry.value / totalShipments) * 100 : 0;
                const color = DOMAIN_COLORS.shipment[entry.status] ?? CHART_FALLBACK_COLORS[0];
                return (
                  <Box key={entry.status}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <StatusChip value={entry.status} domain="shipment" />
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                          {entry.value}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {share.toFixed(0)}%
                        </Typography>
                      </Stack>
                    </Stack>
                    {/*
                      A track + fill meter. The fill is hidden entirely at zero so an empty stage
                      reads as empty rather than as a stray dot of colour.
                    */}
                    <Box
                      sx={{
                        mt: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        overflow: 'hidden',
                      }}
                      role="img"
                      aria-label={`${entry.name}: ${entry.value} of ${totalShipments} shipments`}
                    >
                      <Box
                        sx={{
                          width: `${share}%`,
                          height: '100%',
                          borderRadius: 3,
                          bgcolor: color,
                          transition: 'width 300ms ease',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}

              {!chartData.length && <EmptyState title="No status data" minHeight={200} />}

              {num(stats?.shipmentsByStatus?.CANCELLED) > 0 && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 1 }}>
                  <CancelledIcon fontSize="small" color="error" />
                  <Typography variant="body2" color="text.secondary">
                    {num(stats?.shipmentsByStatus?.CANCELLED)} cancelled shipment(s) require review.
                  </Typography>
                </Stack>
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;

